import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import * as db from "./db.js";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "30d";

if (!JWT_SECRET) {
  console.warn(
    "\n⚠️  JWT_SECRET is not set — using an insecure development fallback.\n" +
      "   Set a long random JWT_SECRET in server/.env before deploying.\n"
  );
}

const SECRET = JWT_SECRET || "dev-only-insecure-secret-change-me";

export function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function signToken(user) {
  return jwt.sign({ sub: user.id }, SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

/** Strips sensitive fields before a user record ever goes to the client. */
export function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

/** Express middleware: requires a valid `Authorization: Bearer <token>` header. */
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Not signed in." });
  }
  try {
    const payload = verifyToken(token);
    const user = await db.findUserById(payload.sub);
    if (!user) return res.status(401).json({ error: "Account no longer exists." });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Your session has expired. Please sign in again." });
  }
}
