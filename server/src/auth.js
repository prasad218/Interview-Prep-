import { Router } from "express";
import { nanoid, customAlphabet } from "nanoid";
import { OAuth2Client } from "google-auth-library";
import * as db from "../db.js";
import {
  hashPassword,
  comparePassword,
  signToken,
  sanitizeUser,
  requireAuth,
} from "../auth.js";

const router = Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

// Login codes use an alphabet with ambiguous characters (0/O, 1/I/L) removed
// so they're easy to read back and type in, e.g. "7F3K-9XQR".
const genCodeChars = customAlphabet("23456789ABCDEFGHJKMNPQRSTUVWXYZ", 8);
function formatLoginCode(raw) {
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}
async function generateUniqueLoginCode() {
  for (let i = 0; i < 10; i++) {
    const code = formatLoginCode(genCodeChars());
    // eslint-disable-next-line no-await-in-loop
    const existing = await db.findUserByLoginCode(code);
    if (!existing) return code;
  }
  throw new Error("Couldn't generate a unique login code — please try again.");
}

const ALLOWED_VIEWS = ["roadmap", "test", "interview", "live", "chat"];

// POST /api/auth/signup  { password }
// Creates a password-only account. No email/name required — the server
// generates a unique login code that the client must show the user once,
// since it's the only way (besides staying signed in on this browser) to
// get back into the account.
router.post("/signup", async (req, res) => {
  const { password } = req.body || {};
  if (!password || password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  }

  let loginCode;
  try {
    loginCode = await generateUniqueLoginCode();
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

  const user = {
    id: nanoid(),
    loginCode,
    name: null,
    email: null,
    passwordHash: await hashPassword(password),
    googleId: null,
    profile: null,
    roadmap: null,
    testResults: [],
    lastLocation: null,
    createdAt: new Date().toISOString(),
  };

  await db.createUser(user);
  const token = signToken(user);
  res.status(201).json({ token, user: sanitizeUser(user) });
});

// POST /api/auth/login  { loginCode, password }
router.post("/login", async (req, res) => {
  const { loginCode, password } = req.body || {};
  if (!loginCode || !password) {
    return res.status(400).json({ error: "Enter your login code and password." });
  }
  const user = await db.findUserByLoginCode(String(loginCode).trim().toUpperCase());
  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: "Incorrect login code or password." });
  }
  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Incorrect login code or password." });
  }
  const token = signToken(user);
  res.json({ token, user: sanitizeUser(user) });
});

// POST /api/auth/google  { credential }  -- credential is the Google ID token
router.post("/google", async (req, res) => {
  const { credential } = req.body || {};
  if (!googleClient) {
    return res.status(501).json({
      error:
        "Google sign-in isn't configured on this server yet. Set GOOGLE_CLIENT_ID in server/.env.",
    });
  }
  if (!credential) {
    return res.status(400).json({ error: "Missing Google credential." });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) {
      return res.status(400).json({ error: "Google account has no email." });
    }

    let user = await db.findUserByEmail(payload.email);
    if (!user) {
      user = {
        id: nanoid(),
        name: payload.name || payload.email.split("@")[0],
        email: payload.email.toLowerCase(),
        passwordHash: null,
        googleId: payload.sub,
        profile: null,
        roadmap: null,
        testResults: [],
        createdAt: new Date().toISOString(),
      };
      await db.createUser(user);
    } else if (!user.googleId) {
      user = await db.updateUser(user.id, { googleId: payload.sub });
    }

    const token = signToken(user);
    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error("Google sign-in error:", err.message);
    res.status(401).json({ error: "Google sign-in failed. Please try again." });
  }
});

// GET /api/auth/me
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

// PATCH /api/auth/location  { view, activeId? }
// Remembers which screen the user was last on so the app can drop them
// back there next time they sign in, instead of always starting fresh.
router.patch("/location", requireAuth, async (req, res) => {
  const { view, activeId = null } = req.body || {};
  if (!ALLOWED_VIEWS.includes(view)) {
    return res.status(400).json({ error: "Invalid view." });
  }
  const lastLocation = {
    view,
    activeId: activeId || null,
    updatedAt: new Date().toISOString(),
  };
  const user = await db.updateUser(req.user.id, { lastLocation });
  res.json({ user: sanitizeUser(user) });
});

// PATCH /api/auth/profile  { resumeText, targetRole, daysToPlacement, dailyHours, targetCompanies }
router.patch("/profile", requireAuth, async (req, res) => {
  const {
    resumeText,
    targetRole,
    daysToPlacement,
    dailyHours,
    targetCompanies = [],
  } = req.body || {};

  if (!resumeText || !resumeText.trim()) {
    return res.status(400).json({ error: "resumeText is required." });
  }
  if (!targetRole || !targetRole.trim()) {
    return res.status(400).json({ error: "targetRole is required." });
  }
  const days = Math.max(3, Math.min(365, Number(daysToPlacement) || 30));
  const hours = Math.max(0.5, Math.min(16, Number(dailyHours) || 2));

  const profile = {
    resumeText: resumeText.trim(),
    targetRole: targetRole.trim(),
    daysToPlacement: days,
    dailyHours: hours,
    targetCompanies: Array.isArray(targetCompanies)
      ? targetCompanies.filter(Boolean).map((c) => String(c).trim()).slice(0, 8)
      : [],
    updatedAt: new Date().toISOString(),
  };

  // Changing the prep profile invalidates any previously generated roadmap.
  const user = await db.updateUser(req.user.id, { profile, roadmap: null });
  res.json({ user: sanitizeUser(user) });
});

export default router;