import { Router } from "express";
import { nanoid } from "nanoid";
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

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""));
}

// POST /api/auth/signup  { name, email, password }
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Name is required." });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  }

  const existing = await db.findUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: "An account with that email already exists." });
  }

  const user = {
    id: nanoid(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash: await hashPassword(password),
    googleId: null,
    profile: null,
    roadmap: null,
    testResults: [],
    createdAt: new Date().toISOString(),
  };

  await db.createUser(user);
  const token = signToken(user);
  res.status(201).json({ token, user: sanitizeUser(user) });
});

// POST /api/auth/login  { email, password }
router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  const user = await db.findUserByEmail(email || "");
  if (!user || !user.passwordHash) {
    return res.status(401).json({
      error: user
        ? "This account uses Google sign-in — use the Google button instead."
        : "No account found with that email.",
    });
  }
  const ok = await comparePassword(password || "", user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Incorrect email or password." });
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
