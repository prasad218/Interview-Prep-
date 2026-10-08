// Storage router.
//
// Set DATABASE_URL (e.g. a free Neon Postgres connection string) and every
// route in this app persists to Postgres — see README "Database setup".
// With no DATABASE_URL, falls back to the flat-file JSON store in
// db.file.js so local dev still runs with zero setup. That fallback does
// NOT persist across redeploys on hosts with an ephemeral filesystem
// (Render free tier, etc.) — do not rely on it in production.

if (!process.env.DATABASE_URL) {
  console.warn(
    "[db] DATABASE_URL not set — using flat-file storage (server/data/db.json). " +
      "This does NOT survive redeploys/restarts on Render's free tier. " +
      "Set DATABASE_URL to a Postgres connection string (e.g. from Neon) before real users sign up."
  );
}

const impl = process.env.DATABASE_URL
  ? await import("./db.pg.js")
  : await import("./db.file.js");

export const listConversations = impl.listConversations;
export const getConversation = impl.getConversation;
export const createConversation = impl.createConversation;
export const renameConversation = impl.renameConversation;
export const deleteConversation = impl.deleteConversation;
export const addMessage = impl.addMessage;
export const truncateMessagesFrom = impl.truncateMessagesFrom;
export const findUserByEmail = impl.findUserByEmail;
export const findUserByLoginCode = impl.findUserByLoginCode;
export const findUserById = impl.findUserById;
export const createUser = impl.createUser;
export const updateUser = impl.updateUser;
export const createRedemptionCode = impl.createRedemptionCode;
export const findRedemptionCode = impl.findRedemptionCode;
export const listRedemptionCodes = impl.listRedemptionCodes;
export const redeemCode = impl.redeemCode;
export const addTestResult = impl.addTestResult;
