import "dotenv/config";
import express from "express";
import cors from "cors";
import conversationsRouter from "./routes/conversations.js";
import chatRouter from "./routes/chat.js";
import modelsRouter from "./routes/models.js";
import interviewRouter from "./routes/interview.js";
import liveInterviewRouter from "./routes/liveInterview.js";
import authRouter from "./routes/auth.js";
import roadmapRouter from "./routes/roadmap.js";
import testRouter from "./routes/test.js";
import adminRouter from "./routes/admin.js";
import redeemRouter from "./routes/redeem.js";
import {
  generalLimiter,
  aiUserLimiter,
  aiIpLimiter,
  loginLimiter,
  loginIpLimiter,
  signupLimiter,
  failureLimiter,
} from "./rateLimits.js";

const app = express();
const PORT = process.env.PORT || 3001;

// The host puts a proxy in front of the app, so the visitor's real address
// comes from the X-Forwarded-For header. This is how many proxy hops to
// trust. 1 is right for most hosts; if the "ip" shown at /api/health is NOT
// your own public IP, change TRUST_PROXY_HOPS in the host's environment
// settings (try 2, then 3) — no code change needed.
app.set("trust proxy", parseInt(process.env.TRUST_PROXY_HOPS, 10) || 1);

app.use(cors());
app.use(express.json({ limit: "2mb" }));

// "ip" lets you confirm the proxy setting above: it should be YOUR public IP.
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    hasApiKey: Boolean(process.env.OPENROUTER_API_KEY),
    ip: req.ip,
  });
});

app.use("/api", generalLimiter);

// Sign-in and account creation.
app.use("/api/auth/login", loginLimiter, loginIpLimiter);
app.use("/api/auth/signup", signupLimiter);
app.use("/api/admin", failureLimiter); // wrong admin secrets/passwords
app.use("/api/redeem", failureLimiter); // wrong redemption codes

// Everything that calls the AI model.
const ai = [aiUserLimiter, aiIpLimiter];
app.use("/api/chat", ...ai);
app.use("/api/interview/generate", ...ai);
app.use("/api/live-interview", ...ai);
app.use("/api/roadmap/generate", ...ai);
app.use("/api/test/start", ...ai);

app.use("/api/conversations", conversationsRouter);
app.use("/api/chat", chatRouter);
app.use("/api/models", modelsRouter);
app.use("/api/interview", interviewRouter);
app.use("/api/live-interview", liveInterviewRouter);
app.use("/api/auth", authRouter);
app.use("/api/roadmap", roadmapRouter);
app.use("/api/test", testRouter);
app.use("/api/admin", adminRouter);
app.use("/api/redeem", redeemRouter);

const server = app.listen(PORT, () => {
  if (!process.env.OPENROUTER_API_KEY) {
    console.warn(
      "\n⚠️  OPENROUTER_API_KEY is not set. Copy server/.env.example to server/.env and add your key.\n" +
        "   Get one at https://openrouter.ai/keys\n"
    );
  }
  console.log(`Server running at http://localhost:${PORT}`);
});
// Render's proxy reuses connections for up to ~2 minutes, but Node closes idle
// ones after 5 seconds by default, which causes occasional random 502 errors.
server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 121 * 1000;

