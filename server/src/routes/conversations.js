import { Router } from "express";
import { nanoid } from "nanoid";
import {
  listConversations,
  getConversation,
  createConversation,
  renameConversation,
  deleteConversation,
} from "../db.js";

const router = Router();

// GET /api/conversations — sidebar list (no message bodies, keeps it light)
router.get("/", async (req, res) => {
  const conversations = await listConversations();
  res.json(conversations);
});

// GET /api/conversations/:id — full conversation with messages
router.get("/:id", async (req, res) => {
  const convo = await getConversation(req.params.id);
  if (!convo) return res.status(404).json({ error: "Conversation not found" });
  res.json(convo);
});

// POST /api/conversations — create a new empty conversation
router.post("/", async (req, res) => {
  const { model } = req.body || {};
  const now = new Date().toISOString();
  const convo = {
    id: nanoid(),
    title: "New chat",
    model: model || process.env.DEFAULT_MODEL || "openai/gpt-4o-mini",
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
  await createConversation(convo);
  res.status(201).json(convo);
});

// PATCH /api/conversations/:id — rename
router.patch("/:id", async (req, res) => {
  const { title } = req.body || {};
  if (!title || !title.trim()) {
    return res.status(400).json({ error: "title is required" });
  }
  const convo = await renameConversation(req.params.id, title.trim());
  if (!convo) return res.status(404).json({ error: "Conversation not found" });
  res.json(convo);
});

// DELETE /api/conversations/:id
router.delete("/:id", async (req, res) => {
  const ok = await deleteConversation(req.params.id);
  if (!ok) return res.status(404).json({ error: "Conversation not found" });
  res.status(204).end();
});

export default router;
