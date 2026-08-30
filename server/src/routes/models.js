import { Router } from "express";
import { listModels } from "../openrouter.js";

const router = Router();

// A small curated fallback list, used if the live OpenRouter fetch fails
// (e.g. no API key set yet) so the UI still has something to show.
const FALLBACK_MODELS = [
  { id: "openai/gpt-4o-mini", name: "GPT-4o mini" },
  { id: "openai/gpt-4o", name: "GPT-4o" },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet" },
  { id: "google/gemini-pro-1.5", name: "Gemini 1.5 Pro" },
  { id: "meta-llama/llama-3.1-70b-instruct", name: "Llama 3.1 70B" },
  { id: "mistralai/mistral-large", name: "Mistral Large" },
];

// GET /api/models
router.get("/", async (req, res) => {
  try {
    const models = await listModels();
    const simplified = models.map((m) => ({ id: m.id, name: m.name || m.id }));
    res.json(simplified.length ? simplified : FALLBACK_MODELS);
  } catch (err) {
    // Don't fail the whole UI just because the model list couldn't load.
    res.json(FALLBACK_MODELS);
  }
});

export default router;
