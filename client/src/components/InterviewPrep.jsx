import { useCallback, useRef, useState } from "react";
import * as api from "../api/client.js";
import ModelSelector from "./ModelSelector.jsx";

const CATEGORIES = [
  "Resume & Projects",
  "Technical Knowledge",
  "DSA & Problem Solving",
  "System Design",
  "Behavioral (HR)",
];

const DIFFICULTY_STYLE = {
  Easy: "bg-signal-teal/15 text-signal-teal border-signal-teal/30",
  Medium: "bg-signal-amber/15 text-signal-amber border-signal-amber/30",
  Hard: "bg-signal-rose/15 text-signal-rose border-signal-rose/30",
};

function QuestionCard({ q, index }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-base-600 bg-base-800/60 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-4 py-3 flex items-start gap-3"
      >
        <span className="mt-0.5 shrink-0 w-6 h-6 rounded-full bg-base-700 text-ink-300 text-xs flex items-center justify-center font-mono">
          {index + 1}
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-2 mb-1">
            <span
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                DIFFICULTY_STYLE[q.difficulty] || DIFFICULTY_STYLE.Medium
              }`}
            >
              {q.difficulty}
            </span>
          </span>
          <span className="block text-sm text-ink-100 leading-relaxed">
            {q.question}
          </span>
        </span>
        <span className="shrink-0 text-ink-500 text-xs mt-1">
          {open ? "Hide answer ▾" : "Show answer ▸"}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-base-700 animate-fadeIn">
          <p className="text-[11px] uppercase tracking-wide text-ink-500 mb-1 mt-2">
            Model answer
          </p>
          <p className="text-sm text-ink-300 leading-relaxed whitespace-pre-wrap">
            {q.idealAnswer}
          </p>
          {q.followUp && (
            <>
              <p className="text-[11px] uppercase tracking-wide text-ink-500 mb-1 mt-3">
                Likely follow-up
              </p>
              <p className="text-sm text-ink-300 leading-relaxed">{q.followUp}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function InterviewPrep({ models, model, onModelChange }) {
  const fileInputRef = useRef(null);
  const [resumeText, setResumeText] = useState("");
  const [fileName, setFileName] = useState("");
  const [role, setRole] = useState("");
  const [experience, setExperience] = useState("Fresher / Entry-level");
  const [numQuestions, setNumQuestions] = useState(10);
  const [focusAreas, setFocusAreas] = useState([...CATEGORIES]);
  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const toggleFocus = (cat) => {
    setFocusAreas((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const { text, filename } = await api.extractResume(file);
      setResumeText(text);
      setFileName(filename || file.name);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleGenerate = useCallback(async () => {
    if (!resumeText.trim()) {
      setError("Upload a resume or paste your resume text first.");
      return;
    }
    if (focusAreas.length === 0) {
      setError("Pick at least one focus area.");
      return;
    }
    setError(null);
    setLoading(true);
    setQuestions(null);
    try {
      const { questions } = await api.generateInterviewQuestions({
        resumeText,
        role,
        experience,
        numQuestions,
        focusAreas,
        model,
      });
      setQuestions(questions);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [resumeText, role, experience, numQuestions, focusAreas, model]);

  const grouped = questions
    ? questions.reduce((acc, q) => {
        (acc[q.category] ||= []).push(q);
        return acc;
      }, {})
    : null;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="font-display font-bold text-xl text-ink-100">
            Resume-based Interview Prep
          </h1>
          <p className="text-sm text-ink-500 mt-1">
            Upload your resume — an AI interviewer agent reads it and builds a
            technical interview question set tailored to your projects and
            stack, with model answers.
          </p>
        </div>

        {/* Upload + config panel */}
        <div className="rounded-2xl border border-base-600 bg-base-900 p-4 space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
              dragOver
                ? "border-accent bg-accent/5"
                : "border-base-600 hover:border-base-500"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            {uploading ? (
              <p className="text-sm text-ink-300">Reading resume…</p>
            ) : fileName ? (
              <p className="text-sm text-ink-100">
                ✓ {fileName}{" "}
                <span className="text-ink-500">— click to replace</span>
              </p>
            ) : (
              <p className="text-sm text-ink-300">
                Drop your resume here (PDF / DOCX / TXT), or click to browse
              </p>
            )}
          </div>

          <div>
            <label className="text-xs text-ink-500 block mb-1">
              …or paste your resume text
            </label>
            <textarea
              value={resumeText}
              onChange={(e) => {
                setResumeText(e.target.value);
                setFileName("");
              }}
              rows={5}
              placeholder="Paste resume content here"
              className="w-full bg-base-800 border border-base-600 rounded-lg px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500 outline-none focus:border-accent resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-ink-500 block mb-1">
                Target role (optional)
              </label>
              <input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Full Stack Developer"
                className="w-full bg-base-800 border border-base-600 rounded-lg px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500 outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs text-ink-500 block mb-1">
                Experience level
              </label>
              <select
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                className="w-full bg-base-800 border border-base-600 rounded-lg px-3 py-2 text-sm text-ink-100 outline-none focus:border-accent"
              >
                <option>Fresher / Entry-level</option>
                <option>1–3 years</option>
                <option>3–5 years</option>
                <option>5+ years</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-ink-500 block mb-1">
                Number of questions: {numQuestions}
              </label>
              <input
                type="range"
                min={5}
                max={20}
                value={numQuestions}
                onChange={(e) => setNumQuestions(Number(e.target.value))}
                className="w-full accent-accent"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-ink-500 block mb-2">
              Focus areas
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => toggleFocus(cat)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    focusAreas.includes(cat)
                      ? "bg-accent/15 border-accent text-accent-soft"
                      : "border-base-600 text-ink-500 hover:text-ink-300"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            {models && (
              <ModelSelector models={models} value={model} onChange={onModelChange} />
            )}
            <button
              onClick={handleGenerate}
              disabled={loading || uploading}
              className="rounded-xl bg-accent hover:bg-accent-soft disabled:opacity-50 disabled:cursor-not-allowed transition-colors px-5 py-2.5 text-sm font-medium text-white"
            >
              {loading ? "Generating…" : "Generate interview questions"}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-signal-rose/10 border border-signal-rose/30 text-signal-rose text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center text-ink-500 text-sm py-8">
            The AI interviewer is reading your resume and drafting questions…
          </div>
        )}

        {grouped && (
          <div className="space-y-6">
            {Object.entries(grouped).map(([category, qs]) => (
              <div key={category}>
                <h2 className="font-display font-semibold text-sm text-ink-100 mb-2 flex items-center gap-2">
                  {category}
                  <span className="text-ink-500 font-normal text-xs">
                    {qs.length} question{qs.length !== 1 ? "s" : ""}
                  </span>
                </h2>
                <div className="space-y-2">
                  {qs.map((q, i) => (
                    <QuestionCard key={q.id} q={q} index={i} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
