import { Router } from "express";
import { nanoid } from "nanoid";
import { requireAuth } from "../auth.js";
import {
  listConversations,
  getConversation,
  createConversation,
  renameConversation,
  deleteConversation,
  truncateMessagesFrom,
} from "../db.js";

const router = Router();

// Chats hold personal data (resumes), so every route here requires a login
// and only ever touches the signed-in user's own chats.
router.use(requireAuth);

/**
 * Loads :id and checks it belongs to the signed-in user. Someone else's chat
 * (or an old one that belongs to nobody) gets the same "not found" as a chat
 * that doesn't exist, so nothing reveals that an id is real.
 */
async function loadOwned(req, res) {
  const convo = await getConversation(req.params.id);
  if (!convo || convo.userId !== req.user.id) {
    res.status(404).json({ error: "Conversation not found" });
    return null;
  }
  return convo;
}

// GET /api/conversations — the signed-in user's chats (no message bodies)
router.get("/", async (req, res) => {
  const conversations = await listConversations(req.user.id);
  res.json(conversations);
});

// GET /api/conversations/:id — full conversation with messages
router.get("/:id", async (req, res) => {
  const convo = await loadOwned(req, res);
  if (!convo) return;
  res.json(convo);
});

// POST /api/conversations — create a new empty conversation
router.post("/", async (req, res) => {
  const { model } = req.body || {};
  const now = new Date().toISOString();
  const convo = {
    id: nanoid(),
    userId: req.user.id,
    title: "New chat",
    model: model || process.env.DEFAULT_MODEL || "openrouter/free",
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
  if (!(await loadOwned(req, res))) return;
  const convo = await renameConversation(req.params.id, title.trim());
  if (!convo) return res.status(404).json({ error: "Conversation not found" });
  res.json(convo);
});

// POST /api/conversations/:id/truncate  { messageId }
// Drops the given message and everything after it. Used when the user
// edits an earlier message: the client calls this, then resends the
// edited text as a new message so the conversation continues from there.
router.post("/:id/truncate", async (req, res) => {
  const { messageId } = req.body || {};
  if (!messageId) return res.status(400).json({ error: "messageId is required" });
  if (!(await loadOwned(req, res))) return;
  const convo = await truncateMessagesFrom(req.params.id, messageId);
  if (!convo) return res.status(404).json({ error: "Conversation not found" });
  res.json(convo);
});

// DELETE /api/conversations/:id
router.delete("/:id", async (req, res) => {
  if (!(await loadOwned(req, res))) return;
  const ok = await deleteConversation(req.params.id);
  if (!ok) return res.status(404).json({ error: "Conversation not found" });
  res.status(204).end();
});

export default router;
