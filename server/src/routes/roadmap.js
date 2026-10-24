import { Router } from "express";
import * as db from "../db.js";
import { requireAuth } from "../auth.js";
import { chatCompletionJSON } from "../openrouter.js";
import { getModel } from "../config/model.js";

const router = Router();

function buildPrompt(profile) {
  const { resumeText, targetRole, daysToPlacement, dailyHours, targetCompanies } = profile;
  const granularity =
    daysToPlacement <= 21
      ? "day-by-day (one schedule block per single day)"
      : daysToPlacement <= 60
      ? "weekly blocks (one schedule block per ~7 days)"
      : "biweekly blocks (one schedule block per ~14 days)";

  return (
    `Candidate resume:\n"""\n${resumeText.slice(0, 6000)}\n"""\n\n` +
    `Target role: ${targetRole}\n` +
    `Days until their placement/deadline: ${daysToPlacement}\n` +
    `Time they can study per day: ${dailyHours} hour(s)\n` +
    `Target companies: ${targetCompanies.length ? targetCompanies.join(", ") : "none specified"}\n\n` +
    `Build a personalized interview-prep roadmap that fits inside ${daysToPlacement} day(s) at ` +
    `${dailyHours} hour(s)/day, tailored to this candidate's actual resume (reference specific gaps or ` +
    `strengths you notice) and the target role. Organize it into a small number of PHASES (e.g. ` +
    `Foundations, Core Topics, Mock Practice, Final Revision) covering the full day range with no gaps ` +
    `or overlaps. Within each phase, break time into ${granularity} — each block should list 2-5 concrete, ` +
    `time-boxed tasks that realistically fit in the daily hours available.\n\n` +
    (targetCompanies.length
      ? `Also include a "companyTracks" entry for EACH target company listing that company's typical, ` +
        `publicly-known interview process/rounds for this role (e.g. online assessment, phone screen, ` +
        `technical rounds, system design, HR/managerial round) with a short description and 2-4 prep tips ` +
        `per round. Note that exact processes vary by team/year, so keep it clearly framed as a general guide.\n\n`
      : "") +
    `Return ONLY valid JSON, no markdown fences, in exactly this shape:\n` +
    `{\n` +
    `  "overview": string (2-3 sentences, personalized, mentioning something specific from their resume),\n` +
    `  "phases": [\n` +
    `    {\n` +
    `      "title": string,\n` +
    `      "dayStart": number,\n` +
    `      "dayEnd": number,\n` +
    `      "summary": string,\n` +
    `      "schedule": [\n` +
    `        {"rangeLabel": string (e.g. "Day 3" or "Week 2"), "dayStart": number, "dayEnd": number, ` +
    `"focus": string, "tasks": [string, ...]}\n` +
    `      ]\n` +
    `    }\n` +
    `  ]` +
    (targetCompanies.length
      ? `,\n  "companyTracks": [\n` +
        `    {"company": string, "rounds": [{"name": string, "typicalTiming": string, "description": string, ` +
        `"prepTips": [string, ...]}], "note": string}\n  ]\n`
      : "\n") +
    `}`
  );
}

// Generating a roadmap can take a minute or more on a slow model. Holding one
// HTTP request open that long gets cut off by the host or the browser (the
// user sees "Failed to fetch"). So /generate only STARTS the work and answers
// at once; the page then checks /status every few seconds. Job state is kept
// in memory (one per user); if the server restarts mid-job the page is told
// to try again.
const jobs = new Map(); // userId -> { status, startedAt, error? }
const JOB_MAX_MS = 6 * 60 * 1000;

async function runRoadmapJob(user) {
  try {
    const messages = [
      {
        role: "system",
        content:
          "You are an expert technical career coach who builds realistic, personalized interview-prep " +
          "roadmaps. You respond with ONLY a single valid JSON object — no markdown fences, no commentary.",
      },
      { role: "user", content: buildPrompt(user.profile) },
    ];
    const parsed = await chatCompletionJSON({
      model: getModel(),
      messages,
      temperature: 0.6,
      maxTokens: 6500,
      retries: 2,
      reasoningEffort: "minimal",
    });

    const roadmap = {
      ...parsed,
      targetRole: user.profile.targetRole,
      targetCompanies: user.profile.targetCompanies,
      totalDays: user.profile.daysToPlacement,
      dailyHours: user.profile.dailyHours,
      generatedAt: new Date().toISOString(),
      completedRanges: [],
    };
    await db.updateUser(user.id, { roadmap });
    jobs.set(user.id, { status: "done", startedAt: jobs.get(user.id)?.startedAt });
  } catch (err) {
    console.error("Roadmap generation error:", err.message);
    jobs.set(user.id, {
      status: "error",
      startedAt: jobs.get(user.id)?.startedAt,
      error: err.message || "Failed to generate the roadmap.",
    });
  }
}

// POST /api/roadmap/generate  -> starts a job, returns immediately
router.post("/generate", requireAuth, (req, res) => {
  const user = req.user;
  if (!user.profile) {
    return res.status(400).json({
      error: "Complete your prep profile (resume, role, timeline) before generating a roadmap.",
    });
  }
  const existing = jobs.get(user.id);
  const stillRunning =
    existing?.status === "running" && Date.now() - existing.startedAt < JOB_MAX_MS;
  if (!stillRunning) {
    jobs.set(user.id, { status: "running", startedAt: Date.now() });
    runRoadmapJob(user); // deliberately not awaited
  }
  res.status(202).json({ status: "running" });
});

// GET /api/roadmap/status  -> { status: "running" | "done" | "error" | "none", error? }
router.get("/status", requireAuth, (req, res) => {
  const job = jobs.get(req.user.id);
  if (!job) return res.json({ status: "none" });
  if (job.status === "running" && Date.now() - job.startedAt > JOB_MAX_MS) {
    jobs.delete(req.user.id);
    return res.json({ status: "error", error: "The roadmap took too long. Please try again." });
  }
  res.json({ status: job.status, ...(job.error ? { error: job.error } : {}) });
});

// GET /api/roadmap
router.get("/", requireAuth, (req, res) => {
  res.json({ roadmap: req.user.roadmap || null });
});

// PATCH /api/roadmap/progress  { rangeLabel, completed }
router.patch("/progress", requireAuth, async (req, res) => {
  const { rangeLabel, completed } = req.body || {};
  const user = req.user;
  if (!user.roadmap) {
    return res.status(400).json({ error: "No roadmap to update yet." });
  }
  const set = new Set(user.roadmap.completedRanges || []);
  if (completed) set.add(rangeLabel);
  else set.delete(rangeLabel);

  const roadmap = { ...user.roadmap, completedRanges: [...set] };
  const updated = await db.updateUser(user.id, { roadmap });
  res.json({ roadmap: updated.roadmap });
});

export default router;
