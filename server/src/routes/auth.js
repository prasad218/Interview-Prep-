import { Router } from "express";
import { nanoid, customAlphabet } from "nanoid";
import * as db from "../db.js";
import {
  hashPassword,
  comparePassword,
  signToken,
  sanitizeUser,
  requireAuth,
} from "../auth.js";

const router = Router();

// Unambiguous uppercase alphabet for login codes — no 0/O/1/I/L so codes
// are easy to read back and type on another device.
const generateCodePart = customAlphabet("ABCDEFGHJKMNPQRSTUVWXYZ23456789", 4);

async function generateUniqueLoginCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = `${generateCodePart()}-${generateCodePart()}`;
    if (!(await db.findUserByLoginCode(code))) return code;
  }
  throw new Error("Could not generate a login code. Please try again.");
}

// POST /api/auth/signup  { password }
router.post("/signup", async (req, res) => {
  const { password } = req.body || {};
  if (!password || password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  }

  let loginCode;
  try {
    loginCode = await generateUniqueLoginCode();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  const user = {
    id: nanoid(),
    loginCode,
    passwordHash: await hashPassword(password),
    profile: null,
    roadmap: null,
    testResults: [],
    createdAt: new Date().toISOString(),
  };

  await db.createUser(user);
  const token = signToken(user);
  res.status(201).json({ token, user: sanitizeUser(user) });
});

// POST /api/auth/login  { loginCode, password }
router.post("/login", async (req, res) => {
  const { loginCode, password } = req.body || {};
  const user = await db.findUserByLoginCode(String(loginCode || "").trim().toUpperCase());
  if (!user) {
    return res.status(401).json({ error: "No account found with that login code." });
  }
  const ok = await comparePassword(password || "", user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Incorrect login code or password." });
  }
  const token = signToken(user);
  res.json({ token, user: sanitizeUser(user) });
});

// GET /api/auth/me
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

// PATCH /api/auth/location  { view, activeId }
router.patch("/location", requireAuth, async (req, res) => {
  const { view, activeId = null } = req.body || {};
  const user = await db.updateUser(req.user.id, {
    lastLocation: { view: view || null, activeId },
  });
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

  const user = await db.updateUser(req.user.id, { profile, roadmap: null });
  res.json({ user: sanitizeUser(user) });
});

export default router;