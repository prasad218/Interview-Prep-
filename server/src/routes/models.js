import { Router } from "express";
import { listModels } from "../openrouter.js";

const router = Router();

// Only free models are exposed to the UI. Set ALLOW_PAID_MODELS=true in
// server/.env if you ever want the full OpenRouter catalogue back.
const ALLOW_PAID_MODELS = process.env.ALLOW_PAID_MODELS === "true";

// A small curated fallback list, used if the live OpenRouter fetch fails
// (e.g. no API key set yet) so the UI still has something to show.
// "openrouter/free" is OpenRouter's free-model router: it picks an available
// zero-cost model per request. The ":free" ids below are pinned alternatives.
const FALLBACK_MODELS = [
  { id: "openrouter/free", name: "Free (auto-routed)" },
];

// An OpenRouter model is free when both prompt and completion prices are 0.
function isFree(m) {
  if (m?.id === "openrouter/free") return true;
  const prompt = Number(m?.pricing?.prompt);
  const completion = Number(m?.pricing?.completion);
  return prompt === 0 && completion === 0;
}

// GET /api/models
router.get("/", async (req, res) => {
  try {
    const models = await listModels();

    const usable = ALLOW_PAID_MODELS ? models : models.filter(isFree);

    const simplified = usable.map((m) => ({
      id: m.id,
      name: m.name || m.id,
    }));

    // Always keep the free router pinned at the top as a safe default.
    const withRouter = simplified.some((m) => m.id === "openrouter/free")
      ? simplified
      : [...FALLBACK_MODELS, ...simplified];

    res.json(withRouter.length ? withRouter : FALLBACK_MODELS);
  } catch (err) {
    // Don't fail the whole UI just because the model list couldn't load.
    res.json(FALLBACK_MODELS);
  }
});

export default router;
