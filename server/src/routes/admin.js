import { Router } from "express";
import { customAlphabet } from "nanoid";
import * as db from "../db.js";
import { PAID_PACK_CREDITS, PAID_PACK_USES } from "../config/pricing.js";

const router = Router();

function requireAdminSecret(req, res) {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    res.status(500).json({ error: "ADMIN_SECRET is not configured on the server." });
    return false;
  }
  if (req.headers["x-admin-secret"] !== adminSecret) {
    res.status(401).json({ error: "Invalid admin secret." });
    return false;
  }
  return true;
}

// Unambiguous uppercase alphabet — no 0/O/1/I/L — so a code is easy to
// read back over email/WhatsApp and type on another device.
const generateCodePart = customAlphabet("ABCDEFGHJKMNPQRSTUVWXYZ23456789", 4);

// POST /api/admin/login  { secret }
// Lets the admin dashboard verify a secret before switching into admin
// view, instead of silently failing on the first data fetch. Doesn't issue
// a token — the client just holds onto the secret (same as every other
// admin route here) and sends it back as the x-admin-secret header.
router.post("/login", async (req, res) => {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    return res
      .status(500)
      .json({ error: "ADMIN_SECRET is not configured on the server." });
  }
  const { secret } = req.body || {};
  if (secret !== adminSecret) {
    return res.status(401).json({ error: "Incorrect admin password." });
  }
  res.json({ ok: true });
});

// GET /api/admin/redemptions
// Powers the "who has redeemed" admin dashboard: every code ever
// generated, newest first, with who redeemed it (if anyone).
router.get("/redemptions", async (req, res) => {
  if (!requireAdminSecret(req, res)) return;
  const codes = await db.listRedemptionCodes();
  res.json({
    codes,
    summary: {
      total: codes.length,
      redeemed: codes.filter((c) => c.used).length,
      unredeemed: codes.filter((c) => !c.used).length,
    },
  });
});

// POST /api/admin/generate-code
// Call this after you've verified a candidate's ₹90 PhonePe payment (via
// their proof form / screenshot). It returns a fresh one-time code — copy
// that into the email you send them. They enter it + their name in the app
// (POST /api/redeem) to instantly unlock 4 more live-interview sessions,
// and you get an automatic email the moment they do.
//
// Example (PowerShell):
//   curl -X POST https://your-api.onrender.com/api/admin/generate-code `
//     -H "x-admin-secret: YOUR_SECRET"
router.post("/generate-code", async (req, res) => {
  if (!requireAdminSecret(req, res)) return;

  let code;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = `PAY-${generateCodePart()}-${generateCodePart()}`;
    if (!(await db.findRedemptionCode(candidate))) {
      code = candidate;
      break;
    }
  }
  if (!code) {
    return res.status(500).json({ error: "Could not generate a unique code. Try again." });
  }

  await db.createRedemptionCode(code);
  res.status(201).json({
    code,
    creditsOnRedeem: PAID_PACK_CREDITS,
    sessionsOnRedeem: PAID_PACK_USES,
  });
});

// Fallback / manual override: tops up a specific account directly by its
// login code, bypassing the redemption-code flow entirely. The normal path
// is now POST /generate-code (above) + the candidate self-serving through
// POST /api/redeem — use this one only if you need to grant credits by
// hand (e.g. a code got lost, or a one-off goodwill top-up).
//
// Example (PowerShell):
//   curl -X POST https://your-api.onrender.com/api/admin/grant-credits `
//     -H "Content-Type: application/json" `
//     -H "x-admin-secret: YOUR_SECRET" `
//     -d '{"loginCode":"ABCD-1234","credits":200}'
router.post("/grant-credits", async (req, res) => {
  if (!requireAdminSecret(req, res)) return;

  const { loginCode, credits } = req.body || {};
  const amount = Number(credits);
  if (!loginCode || !Number.isFinite(amount) || amount <= 0) {
    return res
      .status(400)
      .json({ error: "loginCode and a positive credits amount are required." });
  }

  const user = await db.findUserByLoginCode(String(loginCode).trim().toUpperCase());
  if (!user) {
    return res.status(404).json({ error: "No account found with that login code." });
  }

  const updated = await db.updateUser(user.id, {
    liveInterviewCredits: (user.liveInterviewCredits ?? 0) + amount,
  });

  res.json({
    loginCode: updated.loginCode,
    liveInterviewCredits: updated.liveInterviewCredits,
  });
});

export default router;
