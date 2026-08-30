import { Router } from "express";
import multer from "multer";
import { chatCompletion } from "../openrouter.js";

const router = Router();

// Resumes only — keep it small and in-memory (no disk writes needed).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    const ok = [
      "application/pdf",
      "text/plain",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ].includes(file.mimetype);
    cb(ok ? null : new Error("Only PDF, DOCX, or TXT resumes are supported."), ok);
  },
});

// POST /api/interview/extract  (multipart/form-data, field: "resume")
// Pulls raw text out of an uploaded resume file so the client can preview it
// and send it on to /generate.
router.post("/extract", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });

    const { mimetype, buffer, originalname } = req.file;
    let text = "";

    if (mimetype === "application/pdf") {
      // Lazy-import: pdf-parse touches the filesystem on import in some
      // versions, so only load it when actually needed.
      // Import the inner lib directly (not the package's `index.js`),
      // which avoids a known pdf-parse bug: its index.js runs a
      // self-test on import when `module.parent` is falsy (always true
      // under ESM), trying to read a bundled sample PDF that isn't
      // guaranteed to exist relative to your cwd.
      const { default: pdfParse } = await import("pdf-parse/lib/pdf-parse.js");
      const parsed = await pdfParse(buffer);
      text = parsed.text;
    } else if (mimetype === "text/plain") {
      text = buffer.toString("utf-8");
    } else if (
      mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      // Minimal, dependency-free DOCX text extraction (docx is just a zip
      // of XML files — pull the text nodes out of word/document.xml).
      const { extractDocxText } = await import("../docxText.js");
      text = await extractDocxText(buffer);
    }

    text = (text || "").trim();
    if (!text) {
      return res.status(422).json({
        error:
          "Couldn't extract any text from that file. Try pasting your resume text instead.",
      });
    }

    res.json({ text, filename: originalname });
  } catch (err) {
    console.error("Resume extract error:", err.message);
    res.status(500).json({ error: err.message || "Failed to read resume." });
  }
});

const CATEGORY_LIST = [
  "Resume & Projects",
  "Technical Knowledge",
  "DSA & Problem Solving",
  "System Design",
  "Behavioral (HR)",
];

function buildPrompt({ resumeText, role, experience, numQuestions, focusAreas }) {
  const focus =
    focusAreas && focusAreas.length
      ? focusAreas.join(", ")
      : CATEGORY_LIST.join(", ");

  return [
    {
      role: "system",
      content:
        "You are an experienced technical interviewer and hiring manager. " +
        "You read a candidate's resume closely and design a realistic technical " +
        "interview question set tailored to their actual projects, tech stack, " +
        "and stated experience level — not generic questions. For every question " +
        "you also provide a strong model answer a well-prepared candidate could give, " +
        "written in first person where natural. Respond with ONLY valid JSON, no " +
        "markdown fences, no commentary.",
    },
    {
      role: "user",
      content: `Here is the candidate's resume text:\n"""\n${resumeText.slice(
        0,
        12000
      )}\n"""\n\nTarget role: ${role || "the role implied by the resume"}\n` +
        `Candidate experience level: ${experience || "infer from resume"}\n` +
        `Generate exactly ${numQuestions} interview questions covering these categories: ${focus}.\n` +
        `Reference specific technologies, projects, or claims from the resume by name wherever possible ` +
        `(e.g. ask them to explain a specific project's architecture, a tradeoff they made, or a technology ` +
        `listed in their skills).\n\n` +
        `Return a JSON object of the form:\n` +
        `{"questions": [{"category": one of ${JSON.stringify(
          CATEGORY_LIST
        )}, "difficulty": "Easy"|"Medium"|"Hard", "question": string, ` +
        `"idealAnswer": string (4-8 sentences, specific and technically correct), ` +
        `"followUp": string (one likely interviewer follow-up question)}]}`,
    },
  ];
}

function safeParseQuestions(raw) {
  let cleaned = raw.trim();
  // Strip ```json ... ``` fences if the model added them anyway.
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Some models wrap the object in extra prose — try to grab the first
    // {...} block.
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Model response was not valid JSON.");
    parsed = JSON.parse(match[0]);
  }

  const questions = Array.isArray(parsed) ? parsed : parsed.questions;
  if (!Array.isArray(questions)) {
    throw new Error("Model response didn't include a questions array.");
  }
  return questions.map((q, i) => ({
    id: `q-${i + 1}`,
    category: q.category || "Technical Knowledge",
    difficulty: q.difficulty || "Medium",
    question: q.question || "",
    idealAnswer: q.idealAnswer || q.answer || "",
    followUp: q.followUp || "",
  }));
}

// POST /api/interview/generate
// body: { resumeText, role, experience, numQuestions, focusAreas, model }
router.post("/generate", async (req, res) => {
  const {
    resumeText,
    role,
    experience,
    numQuestions = 10,
    focusAreas = [],
    model,
  } = req.body || {};

  if (!resumeText || !resumeText.trim()) {
    return res.status(400).json({ error: "resumeText is required." });
  }

  const useModel = model || process.env.DEFAULT_MODEL || "openai/gpt-4o-mini";
  const clampedCount = Math.max(3, Math.min(20, Number(numQuestions) || 10));

  try {
    const messages = buildPrompt({
      resumeText,
      role,
      experience,
      numQuestions: clampedCount,
      focusAreas,
    });

    const raw = await chatCompletion({
      model: useModel,
      messages,
      temperature: 0.6,
      jsonMode: true,
    });

    const questions = safeParseQuestions(raw);
    res.json({ questions, model: useModel });
  } catch (err) {
    console.error("Interview generate error:", err.message);
    res.status(500).json({ error: err.message || "Failed to generate questions." });
  }
});

export default router;
