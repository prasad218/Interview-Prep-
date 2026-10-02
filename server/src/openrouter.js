// Thin wrapper around OpenRouter's chat completions endpoint.
// Docs: https://openrouter.ai/docs

import { parseModelJSON } from "./lib/modelJson.js";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODELS_URL = "https://openrouter.ai/api/v1/models";

function headers() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error(
      "OPENROUTER_API_KEY is not set. Add it to server/.env — see server/.env.example."
    );
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
 * Streams a chat completion from OpenRouter.
 * Calls onToken(text) for every text chunk as it arrives, and resolves with
 * the full assembled text when the stream ends.
 */
export async function streamChatCompletion({ model, messages, onToken, signal }) {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: headers(),
    signal,
    body: JSON.stringify({
      model,
      messages,
      stream: true,
    }),
  });

  if (!res.ok || !res.body) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `OpenRouter request failed (${res.status}): ${errText || res.statusText}`
    );
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
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

  return full;
}

/**
 * Non-streaming chat completion. Used for one-shot generation tasks (like
 * building an interview question set) where we want the full JSON body
 * back at once rather than a token stream.
 */
export async function chatCompletion({ model, messages, temperature, jsonMode, maxTokens }) {
  const body = {
    model,
    messages,
    ...(temperature !== undefined ? { temperature } : {}),
    ...(maxTokens !== undefined ? { max_tokens: maxTokens } : {}),
  };
  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `OpenRouter request failed (${res.status}): ${errText || res.statusText}`
    );
  }

  const data = await res.json();
  const choice = data.choices?.[0];
  const text = choice?.message?.content;
  if (!text) throw new Error("OpenRouter returned an empty response.");

  // A response cut off by the token limit is the single most common cause
  // of "invalid JSON" errors with free/shared models — the object is well
  // formed, it just never got its closing braces. Surface this distinctly
  // so callers (and the retry logic below) can tell it apart from the
  // model simply ignoring the "respond with JSON" instruction.
  if (choice?.finish_reason === "length") {
    const err = new Error(
      "The model's response was cut off before it finished (it hit the output length limit)."
    );
    err.truncated = true;
    err.rawText = text;
    throw err;
  }

  return text;
}

/**
 * Like chatCompletion, but requests JSON mode and parses the result,
 * automatically retrying (with a corrective follow-up message) if the
 * model's first attempt isn't valid JSON or got cut off. This is what
 * makes structured generation (roadmaps, questions, feedback) reliable
 * enough to use with an auto-routed free model, which is inconsistent
 * about following "respond with only JSON" instructions on the first try.
 */
export async function chatCompletionJSON({
  model,
  messages,
  temperature,
  maxTokens,
  retries = 1,
}) {
  let lastError;
  let attemptMessages = messages;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Lower temperature a bit on each retry — more deterministic output
      // tends to follow "respond with only JSON" instructions more reliably.
      const attemptTemp =
        temperature !== undefined
          ? Math.max(0.1, temperature - attempt * 0.15)
          : undefined;
      const raw = await chatCompletion({
        model,
        messages: attemptMessages,
        temperature: attemptTemp,
        maxTokens,
        jsonMode: true,
      });
      return parseModelJSON(raw);
    } catch (err) {
      lastError = err;
      if (attempt === retries) break;
      // Ask again, more insistently, and give the model back whatever it
      // produced last time so it can pick up where it left off rather than
      // starting from scratch (helps most when the issue was truncation).
      const correction = err.truncated
        ? "Your previous response was cut off before it finished. Respond again " +
          "with the COMPLETE JSON object from the start — be more concise in any " +
          "free-text fields if needed so the whole thing fits. Output ONLY the " +
          "JSON object, no markdown fences, no commentary."
        : "Your previous response could not be parsed as JSON. Respond again with " +
          "ONLY a single valid JSON object — no markdown fences, no commentary " +
          "before or after it.";
      attemptMessages = [...messages, { role: "user", content: correction }];
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