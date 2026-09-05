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
    await writeFile(
      DB_FILE,
      JSON.stringify({ conversations: [], users: [] }, null, 2)
    );
  }
}

// Backfills missing top-level collections on older db.json files (e.g. ones
// created before the "users" table existed) so reads never crash.
function withDefaults(db) {
  if (!Array.isArray(db.conversations)) db.conversations = [];
  if (!Array.isArray(db.users)) db.users = [];
  return db;
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
  return withDefaults(JSON.parse(raw));
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

// ---------------------------------------------------------------- Users
//
// Accounts, onboarding profile, generated roadmap, and test result history
// all live on the user record. Same flat-JSON-file approach as
// conversations above — fine for getting started, but note this file lives
// on local disk: if you deploy to a host with an ephemeral filesystem (e.g.
// Render's free tier without a persistent disk), accounts will be wiped on
// every redeploy/restart. Add a persistent disk (Render) or migrate to a
// real database before relying on this for real users.

export function findUserByEmail(email) {
  return withLock(async () => {
    const db = await readDb();
    return (
      db.users.find(
        (u) => u.email.toLowerCase() === String(email).toLowerCase()
      ) || null
    );
  });
}

export function findUserById(id) {
  return withLock(async () => {
    const db = await readDb();
    return db.users.find((u) => u.id === id) || null;
  });
}

export function createUser(user) {
  return withLock(async () => {
    const db = await readDb();
    db.users.push(user);
    await writeDb(db);
    return user;
  });
}

// Shallow-merges `patch` into the user record. Pass a full object for
// nested fields like `profile` or `roadmap` to replace them wholesale.
export function updateUser(id, patch) {
  return withLock(async () => {
    const db = await readDb();
    const user = db.users.find((u) => u.id === id);
    if (!user) return null;
    Object.assign(user, patch, { updatedAt: new Date().toISOString() });
    await writeDb(db);
    return user;
  });
}

export function addTestResult(userId, result) {
  return withLock(async () => {
    const db = await readDb();
    const user = db.users.find((u) => u.id === userId);
    if (!user) return null;
    if (!Array.isArray(user.testResults)) user.testResults = [];
    user.testResults.unshift(result);
    user.updatedAt = new Date().toISOString();
    await writeDb(db);
    return user;
  });
}
