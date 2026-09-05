import { Router } from "express";
import { nanoid } from "nanoid";
import * as db from "../db.js";
import { requireAuth } from "../auth.js";
import { chatCompletion } from "../openrouter.js";

const router = Router();
const PASS_THRESHOLD = 70; // percent

// In-memory test sessions: correct answers/explanations never touch the
// client (or db.json) until after grading, so they can't leak or be replayed.
const sessions = new Map();
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

setInterval(() => {
  const cutoff = Date.now() - SESSION_TTL_MS;
  for (const [id, s] of sessions) {
    if (s.createdAt < cutoff) sessions.delete(id);
  }
}, 30 * 60 * 1000).unref?.();

function safeParseJSON(raw) {
  let cleaned = (raw || "").trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Model response was not valid JSON.");
    return JSON.parse(match[0]);
  }
}

// POST /api/test/start  { mode: "role" | "company", company? }
router.post("/start", requireAuth, async (req, res) => {
  const user = req.user;
  if (!user.profile) {
    return res.status(400).json({
      error: "Complete your prep profile (resume, role, timeline) before taking a test.",
    });
  }
  const { mode = "role", company } = req.body || {};
  if (mode === "company" && !company) {
    return res.status(400).json({ error: "Specify which company this test is for." });
  }

  const role = user.profile.targetRole;
  const styleLine =
    mode === "company"
      ? `Style the questions and topic mix after ${company}'s commonly reported interview process for a ` +
        `${role} role (mix of technical, aptitude/logical, and behavioral questions in roughly the ` +
        `proportions ${company} is known for). Keep it a general, publicly-reasoned approximation — do not ` +
        `claim insider knowledge of ${company}'s actual question bank.`
      : `Cover the general skills expected for a ${role} role: core technical/domain knowledge, ` +
        `problem-solving, and a couple of behavioral/situational questions.`;

  try {
    const messages = [
      {
        role: "system",
        content:
          "You are an assessment designer creating multiple-choice interview-readiness tests. Respond " +
          "with ONLY a single valid JSON object — no markdown fences, no commentary.",
      },
      {
        role: "user",
        content:
          `Create an 8-question multiple-choice test for a candidate targeting a "${role}" role.\n` +
          `${styleLine}\n\n` +
          `Each question needs exactly 4 options. Vary difficulty from easy to moderately hard.\n\n` +
          `Return JSON exactly of the form: {"questions": [{"id": "q1", "prompt": string, ` +
          `"options": [{"id": "a", "text": string}, {"id": "b", "text": string}, ` +
          `{"id": "c", "text": string}, {"id": "d", "text": string}], "correctOptionId": "a"|"b"|"c"|"d", ` +
          `"explanation": string (1-2 sentences)}, ... 8 items total, ids q1..q8]}`,
      },
    ];
    const model = process.env.DEFAULT_MODEL || "openai/gpt-4o-mini";
    const raw = await chatCompletion({ model, messages, temperature: 0.7, jsonMode: true });
    const parsed = safeParseJSON(raw);
    const questions = Array.isArray(parsed.questions) ? parsed.questions : [];
    if (questions.length === 0) throw new Error("Model returned no questions.");

    const testId = nanoid();
    sessions.set(testId, {
      userId: user.id,
      mode,
      company: mode === "company" ? company : null,
      role,
      questions,
      createdAt: Date.now(),
    });

    res.json({
      testId,
      mode,
      company: mode === "company" ? company : null,
      role,
      questions: questions.map(({ id, prompt, options }) => ({ id, prompt, options })),
    });
  } catch (err) {
    console.error("Test generation error:", err.message);
    res.status(500).json({ error: err.message || "Failed to generate the test." });
  }
});

// POST /api/test/submit  { testId, answers: { [questionId]: optionId } }
router.post("/submit", requireAuth, async (req, res) => {
  const { testId, answers = {} } = req.body || {};
  const session = sessions.get(testId);
  if (!session) {
    return res.status(404).json({ error: "Test session not found or has expired." });
  }
  if (session.userId !== req.user.id) {
    return res.status(403).json({ error: "This test belongs to a different account." });
  }

  const breakdown = session.questions.map((q) => {
    const yourAnswer = answers[q.id] || null;
    const correct = yourAnswer === q.correctOptionId;
    return {
      id: q.id,
      prompt: q.prompt,
      options: q.options,
      yourAnswer,
      correctOptionId: q.correctOptionId,
      correct,
      explanation: q.explanation,
    };
  });

  const score = breakdown.filter((b) => b.correct).length;
  const total = breakdown.length;
  const percent = Math.round((score / total) * 100);
  const passed = percent >= PASS_THRESHOLD;

  const result = {
    id: nanoid(),
    mode: session.mode,
    company: session.company,
    role: session.role,
    score,
    total,
    percent,
    passed,
    takenAt: new Date().toISOString(),
  };

  await db.addTestResult(req.user.id, result);
  sessions.delete(testId);

  const certificate = passed
    ? {
        id: result.id,
        name: req.user.name,
        role: session.role,
        mode: session.mode,
        company: session.company,
        percent,
        issuedAt: result.takenAt,
      }
    : null;

  res.json({ score, total, percent, passed, breakdown, certificate });
});

// GET /api/test/results
router.get("/results", requireAuth, (req, res) => {
  res.json({ results: req.user.testResults || [] });
});

export default router;
