// Postgres-backed database (e.g. a free Neon instance) — used automatically
// whenever DATABASE_URL is set. See README "Database setup" for how to get
// a free connection string.
//
// Design note: rather than fully normalizing into many tables, each row
// keeps most of its data in a JSONB `data` column. This mirrors the shape
// the app already reads/writes (user.profile, user.roadmap,
// user.testResults, conversation.messages, etc.) so every route and
// function signature in the rest of the app is unchanged — only this file
// and db.file.js differ. `id`/`email`/`code` are pulled into real columns
// so they can be indexed and queried directly.

import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Neon (and most hosted Postgres free tiers) require SSL.
  ssl: { rejectUnauthorized: false },
});

let ready = null;
function init() {
  if (!ready) {
    ready = pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        login_code TEXT UNIQUE,
        data JSONB NOT NULL
      );
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        data JSONB NOT NULL
      );
      -- Upgrade path for databases created before chats belonged to an
      -- account. Old rows keep user_id = NULL, so they belong to nobody and
      -- are never shown to anyone.
      ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_id TEXT;
      CREATE INDEX IF NOT EXISTS conversations_user_idx
        ON conversations (user_id, updated_at DESC);
      CREATE TABLE IF NOT EXISTS redemption_codes (
        code TEXT PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        data JSONB NOT NULL
      );
    `);
  }
  return ready;
}

async function q(text, params) {
  await init();
  return pool.query(text, params);
}

// ---------------------------------------------------------- Conversations

// Only ever lists the given user's chats — never "all" chats.
export async function listConversations(userId) {
  if (!userId) return [];
  const { rows } = await q(
    `SELECT data FROM conversations WHERE user_id = $1 ORDER BY updated_at DESC`,
    [userId]
  );
  return rows.map(({ data }) => ({
    id: data.id,
    title: data.title,
    model: data.model,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }));
}

export async function getConversation(id) {
  const { rows } = await q(`SELECT data FROM conversations WHERE id = $1`, [id]);
  return rows[0]?.data || null;
}

export async function createConversation(conversation) {
  if (!conversation.userId) {
    throw new Error("A conversation must belong to a user.");
  }
  await q(
    `INSERT INTO conversations (id, user_id, updated_at, data) VALUES ($1, $2, $3, $4)`,
    [
      conversation.id,
      conversation.userId,
      conversation.updatedAt || new Date().toISOString(),
      conversation,
    ]
  );
  return conversation;
}

export async function renameConversation(id, title) {
  const convo = await getConversation(id);
  if (!convo) return null;
  convo.title = title;
  convo.updatedAt = new Date().toISOString();
  await q(`UPDATE conversations SET data = $2, updated_at = $3 WHERE id = $1`, [
    id,
    convo,
    convo.updatedAt,
  ]);
  return convo;
}

export async function deleteConversation(id) {
  const { rowCount } = await q(`DELETE FROM conversations WHERE id = $1`, [id]);
  return rowCount > 0;
}

export async function addMessage(conversationId, message) {
  const convo = await getConversation(conversationId);
  if (!convo) return null;
  convo.messages.push(message);
  convo.updatedAt = new Date().toISOString();
  await q(`UPDATE conversations SET data = $2, updated_at = $3 WHERE id = $1`, [
    conversationId,
    convo,
    convo.updatedAt,
  ]);
  return convo;
}

// Used by "edit message": drops the given message and everything that came
// after it, so the client can resend an edited version as a fresh message.
export async function truncateMessagesFrom(conversationId, messageId) {
  const convo = await getConversation(conversationId);
  if (!convo) return null;
  const idx = convo.messages.findIndex((m) => m.id === messageId);
  if (idx === -1) return convo;
  convo.messages = convo.messages.slice(0, idx);
  convo.updatedAt = new Date().toISOString();
  await q(`UPDATE conversations SET data = $2, updated_at = $3 WHERE id = $1`, [
    conversationId,
    convo,
    convo.updatedAt,
  ]);
  return convo;
}

// ---------------------------------------------------------------- Users

export async function findUserByEmail(email) {
  if (!email) return null;
  const { rows } = await q(`SELECT data FROM users WHERE email = $1`, [
    String(email).toLowerCase(),
  ]);
  return rows[0]?.data || null;
}

export async function findUserByLoginCode(loginCode) {
  if (!loginCode) return null;
  const { rows } = await q(`SELECT data FROM users WHERE login_code = $1`, [loginCode]);
  return rows[0]?.data || null;
}

export async function findUserById(id) {
  const { rows } = await q(`SELECT data FROM users WHERE id = $1`, [id]);
  return rows[0]?.data || null;
}

export async function createUser(user) {
  await q(
    `INSERT INTO users (id, email, login_code, data) VALUES ($1, $2, $3, $4)`,
    [
      user.id,
      user.email ? user.email.toLowerCase() : null,
      user.loginCode || null,
      user,
    ]
  );
  return user;
}

// Shallow-merges `patch` into the user record, same contract as the
// file-backed version. Pass a full object for nested fields like `profile`
// or `roadmap` to replace them wholesale.
export async function updateUser(id, patch) {
  const user = await findUserById(id);
  if (!user) return null;
  Object.assign(user, patch, { updatedAt: new Date().toISOString() });
  await q(
    `UPDATE users SET data = $2, email = $3, login_code = $4 WHERE id = $1`,
    [id, user, user.email ? user.email.toLowerCase() : null, user.loginCode || null]
  );
  return user;
}

// ---------------------------------------------------------- Redemption codes

export async function createRedemptionCode(code) {
  const record = {
    code,
    used: false,
    usedByUserId: null,
    usedByName: null,
    usedByLoginCode: null,
    usedAt: null,
    createdAt: new Date().toISOString(),
  };
  await q(`INSERT INTO redemption_codes (code, created_at, data) VALUES ($1, $2, $3)`, [
    code,
    record.createdAt,
    record,
  ]);
  return record;
}

export async function findRedemptionCode(code) {
  const { rows } = await q(`SELECT data FROM redemption_codes WHERE code = $1`, [code]);
  return rows[0]?.data || null;
}

export async function listRedemptionCodes() {
  const { rows } = await q(
    `SELECT data FROM redemption_codes ORDER BY created_at DESC`
  );
  return rows.map((r) => r.data);
}

// Atomically checks-and-marks a code used via a single UPDATE ... WHERE
// used = false, so two simultaneous requests with the same code can't both
// succeed (Postgres row locking replaces the old in-process write queue).
export async function redeemCode(code, { userId, name, loginCode }) {
  const existing = await findRedemptionCode(code);
  if (!existing) return { status: "not_found" };
  if (existing.used) return { status: "already_used", record: existing };

  const record = {
    ...existing,
    used: true,
    usedByUserId: userId,
    usedByName: name,
    usedByLoginCode: loginCode || null,
    usedAt: new Date().toISOString(),
  };
  const { rowCount } = await q(
    `UPDATE redemption_codes SET data = $2 WHERE code = $1 AND (data->>'used')::boolean = false`,
    [code, record]
  );
  if (rowCount === 0) {
    // Someone else redeemed it in the race window between our two queries.
    const latest = await findRedemptionCode(code);
    return { status: "already_used", record: latest };
  }
  return { status: "ok", record };
}

export async function addTestResult(userId, result) {
  const user = await findUserById(userId);
  if (!user) return null;
  if (!Array.isArray(user.testResults)) user.testResults = [];
  user.testResults.unshift(result);
  user.updatedAt = new Date().toISOString();
  await q(`UPDATE users SET data = $2 WHERE id = $1`, [userId, user]);
  return user;
}
