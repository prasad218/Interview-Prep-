import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import conversationsRouter from "./routes/conversations.js";
import chatRouter from "./routes/chat.js";
import modelsRouter from "./routes/models.js";
import interviewRouter from "./routes/interview.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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

// In production, serve the built client (client/dist) from this same
// server so the whole app is a single deployable process. Locally, Vite's
// dev server handles the UI instead (see client/vite.config.js proxy), so
// this only kicks in once client/dist actually exists (after `npm run build`).
const clientDist = path.join(__dirname, "../../client/dist");
app.use(express.static(clientDist));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(clientDist, "index.html"), (err) => {
    if (err) next();
  });
});

app.listen(PORT, () => {
  if (!process.env.OPENROUTER_API_KEY) {
    console.warn(
      "\n⚠️  OPENROUTER_API_KEY is not set. Copy server/.env.example to server/.env and add your key.\n" +
        "   Get one at https://openrouter.ai/keys\n"
    );
  }
  console.log(`Server running at http://localhost:${PORT}`);
});