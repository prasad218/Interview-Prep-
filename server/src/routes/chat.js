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

  // Auto-title new conversations from the first message. A message that
  // opens with an attached resume would otherwise title the chat with the
  // first 60 characters of the resume text itself — use a clean label for
  // that case instead.
  if (convo.messages.length === 0) {
    const trimmedContent = content.trim();
    const attachMatch = trimmedContent.match(/^\[Attached:\s*([^\]]+)\]/);
    const title = attachMatch
      ? `Resume review — ${attachMatch[1]}`
      : trimmedContent.slice(0, 60);
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
    const systemMessage = {
      role: "system",
      content:
        "You are LevelUp's built-in agentic AI assistant, helping job " +
        "candidates with resumes, interview preparation, and career " +
        "questions. Be direct, specific, and practical.\n\n" +
        "RESUMES. When a message includes an attached resume (a line like " +
        "\"[Attached: filename]\" followed by its text), treat it as the " +
        "candidate's current resume.\n" +
        "- If they only want feedback or ask what to improve: give specific " +
        "points (weak phrasing, missing metrics, structure, ATS " +
        "formatting) with example rewritten lines.\n" +
        "- If they ask you to update, rewrite, improve, polish, tailor, or " +
        "fix the resume (or ask for the complete/updated/final resume), " +
        "DO THE WORK: output the ENTIRE updated resume from start to " +
        "finish with your improvements applied everywhere. Never output " +
        "only the changed parts or a list of suggestions in that case. " +
        "Keep every real fact (employers, dates, degrees, project names, " +
        "numbers) unless asked to change it; never invent experience or " +
        "metrics — if a number would help but is unknown, write a " +
        "placeholder like [add %] instead of making one up.\n" +
        "- Put the complete resume inside ONE fenced block that starts " +
        "with ```resume on its own line and ends with ``` on its own " +
        "line. Inside it use only this simple format: first line " +
        "\"# Full Name\"; second line the contact details separated by " +
        "\" | \"; section headings as \"## SECTION NAME\"; bullets as " +
        "\"- text\"; for jobs/projects/education a plain line such as " +
        "\"**Role or Project** | Company or Tech | Dates\" followed by its " +
        "bullets. No tables, no HTML, no emojis inside the block.\n" +
        "- Outside the block add at most a short summary of what you " +
        "changed (a few bullets). If they later ask for tweaks, apply them " +
        "and output the complete updated resume again in a new ```resume " +
        "block.\n\n" +
        "Never include internal classifier, moderation, or safety-check " +
        "output (e.g. lines like \"User Safety: safe\") in a reply — those " +
        "are not meant to be shown to the user.",
    };
    const history = [
      systemMessage,
      ...[...convo.messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ];

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
