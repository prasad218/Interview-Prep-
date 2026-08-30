// Thin wrapper around OpenRouter's chat completions endpoint.
// Docs: https://openrouter.ai/docs

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
    "X-Title": process.env.OPENROUTER_SITE_NAME || "Chat Startup",
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
export async function chatCompletion({ model, messages, temperature, jsonMode }) {
  const body = {
    model,
    messages,
    ...(temperature !== undefined ? { temperature } : {}),
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
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenRouter returned an empty response.");
  return text;
}

/** Fetches the list of models OpenRouter currently offers. */
export async function listModels() {
  const res = await fetch(MODELS_URL, { headers: headers() });
  if (!res.ok) throw new Error(`Failed to fetch models (${res.status})`);
  const data = await res.json();
  return data.data ?? [];
}
