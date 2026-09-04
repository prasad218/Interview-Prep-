import { useState } from "react";
import * as api from "../api/client.js";
import ModelSelector from "./ModelSelector.jsx";
import ResumeSetupForm, { INTERVIEW_CATEGORIES } from "./ResumeSetupForm.jsx";

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

export default function InterviewPrep({ models, model, onModelChange, onGoLive }) {
  const [resumeText, setResumeText] = useState("");
  const [fileName, setFileName] = useState("");
  const [role, setRole] = useState("");
  const [experience, setExperience] = useState("Fresher / Entry-level");
  const [numQuestions, setNumQuestions] = useState(10);
  const [focusAreas, setFocusAreas] = useState([...INTERVIEW_CATEGORIES]);
  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
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
  };

  const grouped = questions
    ? questions.reduce((acc, q) => {
        (acc[q.category] ||= []).push(q);
        return acc;
      }, {})
    : null;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display font-bold text-xl">
              <span className="text-gradient-brand">Resume-based Interview Prep</span>
            </h1>
            <p className="text-sm text-ink-500 mt-1">
              Upload your resume — an AI interviewer agent reads it and builds a
              technical interview question set tailored to your projects and
              stack, with model answers.
            </p>
          </div>
          {onGoLive && (
            <button
              onClick={onGoLive}
              className="shrink-0 flex items-center gap-2 rounded-xl border border-accent/40 bg-brand-gradient-soft hover:bg-brand-gradient hover:text-white transition-colors px-4 py-2.5 text-sm font-semibold text-accent-soft"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-signal-rose animate-pulseDot" />
              Try Live Interview
            </button>
          )}
        </div>

        {/* Upload + config panel */}
        <div className="rounded-2xl border border-base-600 bg-base-900 shadow-card p-4 space-y-4">
          <ResumeSetupForm
            resumeText={resumeText}
            setResumeText={setResumeText}
            fileName={fileName}
            setFileName={setFileName}
            role={role}
            setRole={setRole}
            experience={experience}
            setExperience={setExperience}
            numQuestions={numQuestions}
            setNumQuestions={setNumQuestions}
            focusAreas={focusAreas}
            setFocusAreas={setFocusAreas}
            error={error}
            setError={setError}
          />

          <div className="flex items-center justify-between pt-1">
            {models && (
              <ModelSelector models={models} value={model} onChange={onModelChange} />
            )}
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="rounded-xl bg-brand-gradient hover:opacity-90 shadow-glow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-opacity px-5 py-2.5 text-sm font-semibold text-white"
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
