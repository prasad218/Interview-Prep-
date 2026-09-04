import { Router } from "express";
import { nanoid } from "nanoid";
import { chatCompletion } from "../openrouter.js";

const router = Router();

// Live interviews are short-lived, stateful conversations — kept in memory
// per session rather than in db.json (nothing here needs to survive a
// server restart). Sessions older than 3 hours are swept periodically so
// this doesn't grow unbounded on a long-running server.
const sessions = new Map();
const SESSION_TTL_MS = 3 * 60 * 60 * 1000;

setInterval(() => {
  const cutoff = Date.now() - SESSION_TTL_MS;
  for (const [id, s] of sessions) {
    if (new Date(s.startedAt).getTime() < cutoff) sessions.delete(id);
  }
}, 30 * 60 * 1000).unref?.();

const CATEGORY_LIST = [
  "Resume & Projects",
  "Technical Knowledge",
  "DSA & Problem Solving",
  "System Design",
  "Behavioral (HR)",
];

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

function systemPersona() {
  return (
    "You are Raj Malhotra, a senior hiring manager with 10+ years of experience running live " +
    "mock interviews for a job-prep platform. You ask exactly one question at a time, listen to the " +
    "candidate's answer, and adapt what you ask next based on both their resume and what they just said. " +
    "You are encouraging but honest — you don't inflate weak answers. You never ask more than one " +
    "question in a single turn, and you never repeat a question already asked in this session. " +
    'Respond with ONLY a single valid JSON object — no markdown code fences, no commentary before or after it.'
  );
}

function resumeContext(session) {
  return (
    `Candidate resume:\n"""\n${session.resumeText.slice(0, 6000)}\n"""\n\n` +
    `Target role: ${session.role || "the role implied by the resume"}\n` +
    `Candidate experience level: ${session.experience || "infer from resume"}\n` +
    `Interview focus areas selected by the candidate: ${session.focusAreas.join(", ")}\n` +
    `Total questions planned for this interview: ${session.numQuestions}\n`
  );
}

function transcriptSummary(session) {
  if (session.transcript.length === 0) return "(no questions asked yet)";
  return session.transcript
    .map(
      (t, i) =>
        `Q${i + 1} [${t.category}]: ${t.question}\nCandidate's answer: ${
          t.answer || "(skipped)"
        }`
    )
    .join("\n\n");
}

const FEEDBACK_SCHEMA =
  '"feedback": {"clarity": "Weak"|"Average"|"Good"|"Excellent", ' +
  '"technicalDepth": "Weak"|"Average"|"Good"|"Excellent", ' +
  '"confidence": "Weak"|"Average"|"Good"|"Excellent", ' +
  '"pace": "Weak"|"Average"|"Good"|"Excellent", ' +
  '"comment": string (one short spoken-style sentence reacting to the answer)}';

async function askFirstQuestion(session) {
  const messages = [
    { role: "system", content: systemPersona() },
    {
      role: "user",
      content:
        resumeContext(session) +
        `\nThis is the start of the interview. Ask the FIRST question — a relatively easy, ` +
        `welcoming opener that references something specific from the candidate's resume ` +
        `(a named project, role, or technology).\n\n` +
        `Return JSON exactly of the form: {"question": string, "category": one of ${JSON.stringify(
          CATEGORY_LIST
        )}, "difficulty": "Easy"|"Medium"|"Hard"}`,
    },
  ];
  const raw = await chatCompletion({
    model: session.model,
    messages,
    temperature: 0.7,
    jsonMode: true,
  });
  const parsed = safeParseJSON(raw);
  return {
    question:
      parsed.question ||
      "To start, walk me through your resume and the project you're most proud of.",
    category: parsed.category || "Resume & Projects",
    difficulty: parsed.difficulty || "Easy",
  };
}

async function askNextOrFinish(session) {
  const askedCount = session.transcript.length;
  const isLast = askedCount >= session.numQuestions;

  const messages = [
    { role: "system", content: systemPersona() },
    {
      role: "user",
      content:
        resumeContext(session) +
        `\nInterview so far (${askedCount}/${session.numQuestions} question(s) answered):\n` +
        transcriptSummary(session) +
        `\n\nFirst, evaluate ONLY the candidate's most recent answer (the last Q&A above) on the four ` +
        `dimensions below.\n\n` +
        (isLast
          ? `This was the FINAL question — do not ask another one. Instead produce a wrap-up report.\n` +
            `Return JSON exactly of the form: {${FEEDBACK_SCHEMA}, "done": true, "report": ` +
            `{"overallScore": number (0-100), "summary": string (3-4 sentences, direct and specific), ` +
            `"strengths": [string, string, string], "improvements": [string, string, string], ` +
            `"categoryScores": {"<category name>": number (0-100), ... one entry per category actually asked about} } }`
          : `Then ask the NEXT question. Build naturally on their last answer or move to a fresh, relevant ` +
            `topic from the resume or the selected focus areas. Never repeat a question already asked above. ` +
            `Vary difficulty sensibly given how they've been doing.\n` +
            `Return JSON exactly of the form: {${FEEDBACK_SCHEMA}, "done": false, "nextQuestion": string, ` +
            `"category": one of ${JSON.stringify(
              CATEGORY_LIST
            )}, "difficulty": "Easy"|"Medium"|"Hard"}`),
    },
  ];

  const raw = await chatCompletion({
    model: session.model,
    messages,
    temperature: 0.65,
    jsonMode: true,
  });
  return safeParseJSON(raw);
}

// POST /api/live-interview/start
// body: { resumeText, role, experience, numQuestions, focusAreas, model }
router.post("/start", async (req, res) => {
  const {
    resumeText,
    role,
    experience,
    numQuestions = 8,
    focusAreas = [],
    model,
  } = req.body || {};

  if (!resumeText || !resumeText.trim()) {
    return res.status(400).json({ error: "resumeText is required." });
  }

  const useModel = model || process.env.DEFAULT_MODEL || "openai/gpt-4o-mini";
  const clampedCount = Math.max(3, Math.min(15, Number(numQuestions) || 8));
  const areas = focusAreas.length ? focusAreas : CATEGORY_LIST;

  const session = {
    id: nanoid(),
    resumeText: resumeText.trim(),
    role: (role || "").trim(),
    experience: experience || "",
    focusAreas: areas,
    numQuestions: clampedCount,
    model: useModel,
    transcript: [],
    pending: null,
    startedAt: new Date().toISOString(),
    done: false,
    report: null,
  };

  try {
    const first = await askFirstQuestion(session);
    session.pending = first;
    sessions.set(session.id, session);
    res.json({
      sessionId: session.id,
      question: first.question,
      category: first.category,
      difficulty: first.difficulty,
      progress: { current: 1, total: session.numQuestions },
    });
  } catch (err) {
    console.error("Live interview start error:", err.message);
    res.status(500).json({ error: err.message || "Failed to start the interview." });
  }
});

// POST /api/live-interview/answer  { sessionId, answer }
router.post("/answer", async (req, res) => {
  const { sessionId, answer } = req.body || {};
  const session = sessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: "Interview session not found or has expired." });
  }
  if (session.done) {
    return res.status(400).json({ error: "This interview has already ended." });
  }
  if (!session.pending) {
    return res.status(400).json({ error: "No question is currently pending." });
  }

  session.transcript.push({
    question: session.pending.question,
    category: session.pending.category,
    difficulty: session.pending.difficulty,
    answer: (answer || "").trim() || "(skipped)",
  });
  session.pending = null;

  try {
    const result = await askNextOrFinish(session);
    const feedback = result.feedback || {};
    session.transcript[session.transcript.length - 1].feedback = feedback;

    if (result.done) {
      session.done = true;
      session.report = result.report || null;
      return res.json({
        done: true,
        feedback,
        report: session.report,
        progress: {
          current: session.transcript.length,
          total: session.numQuestions,
        },
      });
    }

    session.pending = {
      question: result.nextQuestion,
      category: result.category || "Technical Knowledge",
      difficulty: result.difficulty || "Medium",
    };

    res.json({
      done: false,
      feedback,
      question: session.pending.question,
      category: session.pending.category,
      difficulty: session.pending.difficulty,
      progress: {
        current: session.transcript.length + 1,
        total: session.numQuestions,
      },
    });
  } catch (err) {
    console.error("Live interview answer error:", err.message);
    // Put the question back so the candidate can retry instead of getting stuck.
    session.pending = session.transcript[session.transcript.length - 1]
      ? {
          question: session.transcript[session.transcript.length - 1].question,
          category: session.transcript[session.transcript.length - 1].category,
          difficulty: session.transcript[session.transcript.length - 1].difficulty,
        }
      : session.pending;
    res.status(500).json({ error: err.message || "Failed to process your answer." });
  }
});

// POST /api/live-interview/end  { sessionId }
// Lets the candidate stop early and still get a report from whatever was covered.
router.post("/end", async (req, res) => {
  const { sessionId } = req.body || {};
  const session = sessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: "Interview session not found or has expired." });
  }

  if (session.done && session.report) {
    return res.json({ report: session.report });
  }

  if (session.transcript.length === 0) {
    session.done = true;
    return res.json({
      report: {
        overallScore: 0,
        summary: "The interview ended before any questions were answered.",
        strengths: [],
        improvements: ["Start a new session and answer at least a few questions to get feedback."],
        categoryScores: {},
      },
    });
  }

  try {
    const messages = [
      { role: "system", content: systemPersona() },
      {
        role: "user",
        content:
          resumeContext(session) +
          `\nThe candidate ended the interview early after ${session.transcript.length} question(s):\n` +
          transcriptSummary(session) +
          `\n\nProduce a wrap-up report based on what was actually covered.\n` +
          `Return JSON exactly of the form: {"overallScore": number (0-100), "summary": string ` +
          `(3-4 sentences, direct and specific), "strengths": [string, string, string], ` +
          `"improvements": [string, string, string], "categoryScores": {"<category name>": number (0-100), ` +
          `... one entry per category actually asked about} }`,
      },
    ];
    const raw = await chatCompletion({
      model: session.model,
      messages,
      temperature: 0.5,
      jsonMode: true,
    });
    const report = safeParseJSON(raw);
    session.done = true;
    session.report = report;
    res.json({ report });
  } catch (err) {
    console.error("Live interview end error:", err.message);
    res.status(500).json({ error: err.message || "Failed to generate the report." });
  }
});

export default router;
