// Thin wrapper around OpenRouter's chat completions endpoint.
// Docs: https://openrouter.ai/docs

import { parseModelJSON } from "./lib/modelJson.js";

// OPENROUTER_BASE_URL exists so tests can point at a fake server.
const BASE_URL = (process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/$/, "");
const OPENROUTER_URL = `${BASE_URL}/chat/completions`;
const MODELS_URL = `${BASE_URL}/models`;

// Every limit can be changed in the host's environment settings.
const num = (name, fallback) => {
  const n = parseInt(process.env[name], 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};
const timeoutDefault = () => num("AI_TIMEOUT_MS", 120000); // one attempt
const budgetDefault = () => num("AI_BUDGET_MS", 200000); // all attempts together
const tokenCap = () => num("AI_MAX_TOKENS_CAP", 16000); // retries never ask for more than this

/** What users see. No provider names or technical detail. */
const MSG = {
  timeout: "The AI took too long to respond. Please try again.",
  network: "Couldn't reach the AI service. Please try again.",
  empty: "The AI returned an empty answer. Please try again.",
  truncated:
    "The AI's answer got cut off before it finished. Please try again, or ask for a little less at once.",
};

function aiError(message, flags = {}) {
  return Object.assign(new Error(message), flags);
}

/**
 * Turns a failed OpenRouter response into an error with a message that is safe
 * and understandable to show a user. The raw details (which can be long,
 * technical provider errors) go to the server log for the owner instead.
 * `noRetry` marks failures where asking again straight away can't help and
 * would only burn more of the daily free quota.
 */
function upstreamError(status, errText, statusText) {
  console.error(`[openrouter] ${status}: ${(errText || statusText || "").slice(0, 400)}`);
  let err;
  if (status === 429) {
    err = new Error(
      "The AI is at its usage limit right now. Please try again in a little while."
    );
    err.rateLimited = true;
    err.noRetry = true;
  } else if (status >= 500) {
    err = new Error("The AI service is having trouble right now. Please try again.");
  } else {
    err = new Error("The AI service is unavailable right now. Please try again later.");
    err.noRetry = true;
  }
  err.status = status;
  return err;
}

function headers() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    console.error(
      "[openrouter] OPENROUTER_API_KEY is not set. Add it in the host's environment settings (or server/.env locally)."
    );
    throw aiError("The AI service isn't set up yet. Please contact the site owner.", {
      status: 500,
      noRetry: true,
    });
  }
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    // Optional but recommended by OpenRouter for attribution on their site.
    "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:5173",
    "X-Title": process.env.OPENROUTER_SITE_NAME || "LevelUp",
  };
}

/**
 * "Thinking" tokens count against the same output limit as the answer. A
 * model that spends its whole budget thinking returns an empty or cut-off
 * reply, so we ask for little thinking. AI_REASONING_EFFORT=off stops the
 * setting being sent at all. (Values: max, high, medium, low, minimal, none.)
 */
function reasoningParam(level) {
  const v = String(level || process.env.AI_REASONING_EFFORT || "low").toLowerCase();
  return v === "off" ? undefined : { effort: v };
}

/** POSTs a request. If a model rejects the reasoning setting, asks again without it. */
async function send(payload, signal) {
  const post = (body) =>
    fetch(OPENROUTER_URL, {
      method: "POST",
      headers: headers(),
      signal,
      body: JSON.stringify(body),
    });
  let res = await post(payload);
  if (res.status === 400 && payload.reasoning) {
    const detail = await res.text().catch(() => "");
    console.error(
      `[openrouter] 400 with a reasoning setting; retrying without it: ${detail.slice(0, 200)}`
    );
    const { reasoning, ...rest } = payload; // eslint-disable-line no-unused-vars
    res = await post(rest);
  }
  return res;
}

/** An abort signal that fires after `ms`, and also when the caller's signal does. */
function timeoutController(ms, outerSignal) {
  const ctrl = new AbortController();
  let timedOut = false;
  const timer = ms
    ? setTimeout(() => {
        timedOut = true;
        ctrl.abort();
      }, ms)
    : null;
  const onAbort = () => ctrl.abort();
  if (outerSignal) {
    if (outerSignal.aborted) ctrl.abort();
    else outerSignal.addEventListener("abort", onAbort, { once: true });
  }
  return {
    signal: ctrl.signal,
    timedOut: () => timedOut,
    clear() {
      if (timer) clearTimeout(timer);
      outerSignal?.removeEventListener("abort", onAbort);
    },
  };
}

/** Maps a network/abort failure to a user-safe error. */
function fetchFailure(err, wasTimeout, callerSignal) {
  if (wasTimeout) return aiError(MSG.timeout, { transient: true });
  if (err?.name === "AbortError" && callerSignal?.aborted) return err; // the user cancelled
  console.error(`[openrouter] network error: ${err?.message}`);
  return aiError(MSG.network, { transient: true });
}

/**
 * Streams a chat completion from OpenRouter.
 * Calls onToken(text) for every text chunk as it arrives, and resolves with
 * the full assembled text when the stream ends. Gives up if nothing at all
 * (not even a keep-alive) arrives for AI_STREAM_IDLE_MS.
 */
export async function streamChatCompletion({ model, messages, onToken, signal }) {
  const idleMs = num("AI_STREAM_IDLE_MS", 60000);
  const ctrl = new AbortController();
  let timedOut = false;
  let idleTimer;
  const arm = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      timedOut = true;
      ctrl.abort();
    }, idleMs);
  };
  const onAbort = () => ctrl.abort();
  if (signal) {
    if (signal.aborted) ctrl.abort();
    else signal.addEventListener("abort", onAbort, { once: true });
  }
  const cleanup = () => {
    clearTimeout(idleTimer);
    signal?.removeEventListener("abort", onAbort);
  };

  try {
    arm();
    const body = { model, messages, stream: true };
    const reasoning = reasoningParam();
    if (reasoning) body.reasoning = reasoning;
    const res = await send(body, ctrl.signal);

    if (!res.ok || !res.body) {
      const errText = await res.text().catch(() => "");
      throw upstreamError(res.status, errText, res.statusText);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let full = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      arm();
      buffer += decoder.decode(value, { stream: true });

      // OpenRouter streams OpenAI-style SSE: lines starting with "data: ".
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") continue;

        try {
          const parsed = JSON.parse(payload);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            full += delta;
            onToken(delta);
          }
        } catch {
          // Ignore malformed/partial JSON lines (can happen at chunk boundaries).
        }
      }
    }

    // A model that only "thought" and never answered would otherwise be saved
    // as a blank reply.
    if (!full.trim()) throw aiError(MSG.empty, { empty: true });
    return full;
  } catch (err) {
    if (err.status !== undefined || err.empty) throw err; // already user-safe
    throw fetchFailure(err, timedOut, signal);
  } finally {
    cleanup();
  }
}

/**
 * Non-streaming chat completion. Used for one-shot generation tasks (like
 * building an interview question set) where we want the full JSON body
 * back at once rather than a token stream.
 */
export async function chatCompletion({
  model,
  messages,
  temperature,
  jsonMode,
  maxTokens,
  timeoutMs,
  reasoningEffort,
}) {
  const body = {
    model,
    messages,
    ...(temperature !== undefined ? { temperature } : {}),
    ...(maxTokens !== undefined ? { max_tokens: maxTokens } : {}),
  };
  const reasoning = reasoningParam(reasoningEffort);
  if (reasoning) body.reasoning = reasoning;
  if (jsonMode) body.response_format = { type: "json_object" };

  const tc = timeoutController(timeoutMs ?? timeoutDefault());
  let data;
  try {
    const res = await send(body, tc.signal);
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw upstreamError(res.status, errText, res.statusText);
    }
    data = await res.json();
  } catch (err) {
    if (err.status !== undefined) throw err; // already user-safe
    throw fetchFailure(err, tc.timedOut());
  } finally {
    tc.clear();
  }

  // Some providers report a failure inside a 200 response.
  if (data?.error) {
    throw upstreamError(Number(data.error.code) || 502, JSON.stringify(data.error));
  }

  const choice = data.choices?.[0];
  const text = choice?.message?.content;

  // Running out of output room is the most common failure with free models,
  // and it also happens with an EMPTY reply when the model spent its whole
  // budget "thinking". Both mean: give it more room next time.
  if (choice?.finish_reason === "length") {
    throw aiError(MSG.truncated, { truncated: true, rawText: text });
  }
  if (!text || !String(text).trim()) {
    console.error(`[openrouter] empty reply (finish_reason=${choice?.finish_reason ?? "none"})`);
    throw aiError(MSG.empty, { empty: true });
  }
  return text;
}

/**
 * Like chatCompletion, but requests JSON mode and parses the result,
 * automatically retrying if the model's attempt isn't valid JSON, ran out of
 * room, came back empty, or timed out. When it ran out of room, the next
 * attempt gets 1.6x the output limit and is asked to think less. Retrying
 * with the SAME limit would just fail the same way. All attempts together
 * stay within `budgetMs`, so a user is never left waiting indefinitely.
 */
export async function chatCompletionJSON({
  model,
  messages,
  temperature,
  maxTokens,
  retries = 1,
  timeoutMs,
  budgetMs,
}) {
  const started = Date.now();
  const budget = budgetMs ?? budgetDefault();
  const perAttempt = timeoutMs ?? timeoutDefault();
  const cap = tokenCap();

  let lastError;
  let attemptMessages = messages;
  let tokens = maxTokens;
  let effort;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const remaining = budget - (Date.now() - started);
    // Don't start another attempt without enough time left to finish one.
    if (attempt > 0 && remaining < 15000) break;

    try {
      // Lower temperature a bit on each retry — more deterministic output
      // tends to follow "respond with only JSON" instructions more reliably.
      const attemptTemp =
        temperature !== undefined ? Math.max(0.1, temperature - attempt * 0.15) : undefined;
      const raw = await chatCompletion({
        model,
        messages: attemptMessages,
        temperature: attemptTemp,
        maxTokens: tokens,
        jsonMode: true,
        timeoutMs: Math.max(10000, Math.min(perAttempt, remaining)),
        reasoningEffort: effort,
      });
      return parseModelJSON(raw);
    } catch (err) {
      lastError = err;
      console.warn(
        `[ai] attempt ${attempt + 1}/${retries + 1} failed: ${err.message}` +
          (err.truncated ? " (ran out of room)" : err.empty ? " (empty)" : "")
      );
      if (attempt === retries || err.noRetry) break;

      if (err.truncated || err.empty) {
        // Ran out of room, usually by "thinking": allow more, think less.
        if (tokens !== undefined) tokens = Math.min(Math.ceil(tokens * 1.6), cap);
        effort = "minimal";
      }

      if (err.transient || err.status !== undefined) {
        attemptMessages = messages; // a timeout or server error: just ask again
      } else {
        const correction = err.truncated
          ? "Your previous response was cut off before it finished. Respond again " +
            "with the COMPLETE JSON object from the start — keep every free-text " +
            "field short so the whole thing fits. Output ONLY the JSON object, no " +
            "markdown fences, no commentary."
          : err.empty
          ? "Your previous response was empty. Respond with ONLY the JSON object " +
            "described above — no markdown fences, no commentary."
          : "Your previous response could not be parsed as JSON. Respond again with " +
            "ONLY a single valid JSON object — no markdown fences, no commentary " +
            "before or after it.";
        attemptMessages = [...messages, { role: "user", content: correction }];
      }
    }
  }

  throw lastError;
}

/** Fetches the list of models OpenRouter currently offers. */
export async function listModels() {
  const res = await fetch(MODELS_URL, { headers: headers() });
  if (!res.ok) throw new Error(`Failed to fetch models (${res.status})`);
  const data = await res.json();
  return data.data ?? [];
}
