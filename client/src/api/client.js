const BASE = "/api";

async function json(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function fetchModels() {
  const res = await fetch(`${BASE}/models`);
  return json(res);
}

export async function fetchConversations() {
  const res = await fetch(`${BASE}/conversations`);
  return json(res);
}

export async function fetchConversation(id) {
  const res = await fetch(`${BASE}/conversations/${id}`);
  return json(res);
}

export async function createConversation(model) {
  const res = await fetch(`${BASE}/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model }),
  });
  return json(res);
}

export async function renameConversation(id, title) {
  const res = await fetch(`${BASE}/conversations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  return json(res);
}

export async function deleteConversation(id) {
  const res = await fetch(`${BASE}/conversations/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
}

/** Uploads a resume file (PDF/DOCX/TXT) and returns its extracted text. */
export async function extractResume(file) {
  const form = new FormData();
  form.append("resume", file);
  const res = await fetch(`${BASE}/interview/extract`, {
    method: "POST",
    body: form,
  });
  return json(res);
}

/**
 * Generates a resume-tailored interview question set (with model answers).
 * payload: { resumeText, role, experience, numQuestions, focusAreas, model }
 */
export async function generateInterviewQuestions(payload) {
  const res = await fetch(`${BASE}/interview/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return json(res);
}

/**
 * Sends a message and streams the assistant's reply.
 * Parses the server's text/event-stream response manually (fetch + reader)
 * since EventSource doesn't support POST bodies.
 *
 * callbacks: { onToken(text), onDone(message), onError(message) }
 */
export async function sendMessageStream({ conversationId, content, model }, callbacks) {
  const res = await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversationId, content, model }),
  });

  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const chunk of events) {
      const lines = chunk.split("\n");
      let event = "message";
      let data = "";
      for (const line of lines) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (!data) continue;

      let parsed;
      try {
        parsed = JSON.parse(data);
      } catch {
        continue;
      }

      if (event === "token") callbacks.onToken?.(parsed.text);
      if (event === "done") callbacks.onDone?.(parsed.message);
      if (event === "error") callbacks.onError?.(parsed.message);
    }
  }
}
