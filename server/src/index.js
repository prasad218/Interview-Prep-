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

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, hasApiKey: Boolean(process.env.OPENROUTER_API_KEY) });
});

app.use("/api/conversations", conversationsRouter);
app.use("/api/chat", chatRouter);
app.use("/api/models", modelsRouter);
app.use("/api/interview", interviewRouter);
app.use("/api/live-interview", liveInterviewRouter);
app.use("/api/auth", authRouter);
app.use("/api/roadmap", roadmapRouter);
app.use("/api/test", testRouter);

app.listen(PORT, () => {
  if (!process.env.OPENROUTER_API_KEY) {
    console.warn(
      "\n⚠️  OPENROUTER_API_KEY is not set. Copy server/.env.example to server/.env and add your key.\n" +
        "   Get one at https://openrouter.ai/keys\n"
    );
  }
  console.log(`Server running at http://localhost:${PORT}`);
});
