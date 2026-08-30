// Minimal file-backed JSON "database".
//
// This is intentionally simple so the project runs anywhere with zero setup
// (no Postgres/SQLite install, no native builds). Swap this out for a real
// database once you have users — see README.md "Next steps".

import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

async function ensureDb() {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true });
  if (!existsSync(DB_FILE)) {
    await writeFile(DB_FILE, JSON.stringify({ conversations: [] }, null, 2));
  }
}

// Very small write queue so concurrent requests don't clobber each other's
// writes when reading + modifying + saving the whole file.
let queue = Promise.resolve();
function withLock(fn) {
  const result = queue.then(fn);
  queue = result.catch(() => {});
  return result;
}

async function readDb() {
  await ensureDb();
  const raw = await readFile(DB_FILE, "utf-8");
  return JSON.parse(raw);
}

async function writeDb(data) {
  await writeFile(DB_FILE, JSON.stringify(data, null, 2));
}

export function listConversations() {
  return withLock(async () => {
    const db = await readDb();
    return db.conversations
      .map(({ id, title, model, createdAt, updatedAt }) => ({
        id,
        title,
        model,
        createdAt,
        updatedAt,
      }))
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  });
}

export function getConversation(id) {
  return withLock(async () => {
    const db = await readDb();
    return db.conversations.find((c) => c.id === id) || null;
  });
}

export function createConversation(conversation) {
  return withLock(async () => {
    const db = await readDb();
    db.conversations.push(conversation);
    await writeDb(db);
    return conversation;
  });
}

export function renameConversation(id, title) {
  return withLock(async () => {
    const db = await readDb();
    const convo = db.conversations.find((c) => c.id === id);
    if (!convo) return null;
    convo.title = title;
    convo.updatedAt = new Date().toISOString();
    await writeDb(db);
    return convo;
  });
}

export function deleteConversation(id) {
  return withLock(async () => {
    const db = await readDb();
    const before = db.conversations.length;
    db.conversations = db.conversations.filter((c) => c.id !== id);
    await writeDb(db);
    return db.conversations.length < before;
  });
}

export function addMessage(conversationId, message) {
  return withLock(async () => {
    const db = await readDb();
    const convo = db.conversations.find((c) => c.id === conversationId);
    if (!convo) return null;
    convo.messages.push(message);
    convo.updatedAt = new Date().toISOString();
    await writeDb(db);
    return convo;
  });
}
