import { Router } from "express";
import * as db from "../db.js";

const router = Router();

// There's no payment gateway wired up for live-interview credit packs —
// candidates pay ₹90 via PhonePe and submit proof through a Google Form.
// This endpoint is the manual "flip the switch" step: once you've checked
// the form response (and the PhonePe payment actually landed), call this
// with the candidate's login code to top up their account.
//
// Protected by a shared secret rather than a full admin-auth system since
// this is a single-operator project. Set ADMIN_SECRET in your environment
// (Render dashboard -> Environment) before using this in production —
// without it, this route refuses every request.
//
// Example (PowerShell):
//   curl -X POST https://your-api.onrender.com/api/admin/grant-credits `
//     -H "Content-Type: application/json" `
//     -H "x-admin-secret: YOUR_SECRET" `
//     -d '{"loginCode":"ABCD-1234","credits":200}'
router.post("/grant-credits", async (req, res) => {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    return res
      .status(500)
      .json({ error: "ADMIN_SECRET is not configured on the server." });
  }
  if (req.headers["x-admin-secret"] !== adminSecret) {
    return res.status(401).json({ error: "Invalid admin secret." });
  }

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
