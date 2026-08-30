import { Router } from "express";
import { nanoid } from "nanoid";
import { getConversation, addMessage, renameConversation } from "../db.js";
import { streamChatCompletion } from "../openrouter.js";

const router = Router();

// POST /api/chat  { conversationId, content, model }
// Streams the assistant's reply back as Server-Sent Events:
//   event: token   data: {"text": "..."}       (repeated)
//   event: done    data: {"message": {...}}
//   event: error   data: {"message": "..."}
router.post("/", async (req, res) => {
  const { conversationId, content, model } = req.body || {};

  if (!conversationId || !content?.trim()) {
    return res.status(400).json({ error: "conversationId and content are required" });
  }

  const convo = await getConversation(conversationId);
  if (!convo) return res.status(404).json({ error: "Conversation not found" });

  const useModel = model || convo.model;

  const userMessage = {
    id: nanoid(),
    role: "user",
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };
  await addMessage(conversationId, userMessage);

  // Auto-title new conversations from the first message.
  if (convo.messages.length === 0) {
    const title = content.trim().slice(0, 60);
    await renameConversation(conversationId, title || "New chat");
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const send = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const controller = new AbortController();
  req.on("close", () => controller.abort());

  try {
    const history = [...convo.messages, userMessage].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const fullText = await streamChatCompletion({
      model: useModel,
      messages: history,
      signal: controller.signal,
      onToken: (text) => send("token", { text }),
    });

    const assistantMessage = {
      id: nanoid(),
      role: "assistant",
      content: fullText,
      model: useModel,
      createdAt: new Date().toISOString(),
    };
    await addMessage(conversationId, assistantMessage);

    send("done", { message: assistantMessage });
    res.end();
  } catch (err) {
    console.error("Chat stream error:", err.message);
    send("error", { message: err.message });
    res.end();
  }
});

export default router;
