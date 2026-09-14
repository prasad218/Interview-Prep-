import { Router } from "express";
import { requireAuth } from "../auth.js";
import * as db from "../db.js";
import { sendRedemptionNotification } from "../mailer.js";
import { PAID_PACK_CREDITS, PAID_PACK_USES } from "../config/pricing.js";

const router = Router();

// POST /api/redeem  { code, name }
// Self-serve step of the payment flow: the candidate pays ₹90 via PhonePe,
// you verify it and generate a code (POST /api/admin/generate-code), email
// it to them, and they redeem it here. Grants credits immediately (no
// waiting on you) and fires an email to you so you know it happened.
router.post("/", requireAuth, async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const rawCode = String(req.body?.code || "").trim();
  const code = rawCode.toUpperCase();

  if (!name) {
    return res.status(400).json({ error: "Please enter your name." });
  }
  if (!code) {
    return res.status(400).json({ error: "Please enter the code from your email." });
  }

  const result = await db.redeemCode(code, {
    userId: req.user.id,
    name,
    loginCode: req.user.loginCode,
  });

  if (result.status === "not_found") {
    return res.status(404).json({
      error: "That code doesn't look right. Double-check the email and try again.",
    });
  }
  if (result.status === "already_used") {
    return res.status(409).json({ error: "This code has already been used." });
  }

  const currentCredits = req.user.liveInterviewCredits ?? 0;
  const updatedUser = await db.updateUser(req.user.id, {
    liveInterviewCredits: currentCredits + PAID_PACK_CREDITS,
    // Keep the latest name they've told us, in case a returning candidate
    // signed up without one.
    name: name || req.user.name,
  });

  // Never let a flaky mail server block credits already granted above —
  // the notification is best-effort.
  sendRedemptionNotification({
    name,
    code,
    loginCode: req.user.loginCode,
    creditsGranted: PAID_PACK_CREDITS,
    totalCredits: updatedUser.liveInterviewCredits,
  }).catch((err) => console.error("Redemption email failed:", err.message));

  res.json({
    liveInterviewCredits: updatedUser.liveInterviewCredits,
    sessionsUnlocked: PAID_PACK_USES,
  });
});

export default router;
