import { useEffect, useState } from "react";
import * as api from "../api/client.js";
import Certificate from "./Certificate.jsx";

export default function TestCenter({ user, preselectedCompany, onConsumePreselect }) {
  const [stage, setStage] = useState("select"); // "select" | "quiz" | "result"
  const [mode, setMode] = useState("role");
  const [company, setCompany] = useState(preselectedCompany || "");
  const [test, setTest] = useState(null); // { testId, questions, role, mode, company }
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (preselectedCompany) {
      setMode("company");
      setCompany(preselectedCompany);
      onConsumePreselect?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedCompany]);

  const targetCompanies = user?.profile?.targetCompanies || [];

  const startTest = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.startTest({ mode, company: mode === "company" ? company : undefined });
      setTest(res);
      setAnswers({});
      setStage("quiz");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const allAnswered = test && test.questions.every((q) => answers[q.id]);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.submitTest(test.testId, answers);
      setResult(res);
      setStage("result");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const restart = () => {
    setStage("select");
    setTest(null);
    setResult(null);
    setAnswers({});
  };

  // -------------------------------------------------------------- SELECT
  if (stage === "select") {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          <div>
            <h1 className="font-display font-bold text-xl text-gradient-brand">Test Center</h1>
            <p className="text-sm text-ink-500 mt-1">
              Take a readiness test — pass to earn a certificate you can download.
            </p>
          </div>

          <div className="rounded-2xl border border-base-600 bg-base-900 shadow-card p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => setMode("role")}
                className={`text-left rounded-xl border p-4 transition-colors ${
                  mode === "role"
                    ? "border-accent bg-brand-gradient-soft"
                    : "border-base-600 hover:border-accent-dim"
                }`}
              >
                <p className="text-sm font-semibold text-ink-100">General role test</p>
                <p className="text-xs text-ink-500 mt-1">
                  Covers what's typically expected for {user?.profile?.targetRole || "your target role"}.
                </p>
              </button>
              <button
                onClick={() => setMode("company")}
                disabled={targetCompanies.length === 0}
                className={`text-left rounded-xl border p-4 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  mode === "company"
                    ? "border-accent bg-brand-gradient-soft"
                    : "border-base-600 hover:border-accent-dim"
                }`}
              >
                <p className="text-sm font-semibold text-ink-100">Company-specific test</p>
                <p className="text-xs text-ink-500 mt-1">
                  {targetCompanies.length
                    ? "Styled after a target company's typical process."
                    : "Add a target company in your profile to unlock this."}
                </p>
              </button>
            </div>

            {mode === "company" && targetCompanies.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {targetCompanies.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCompany(c)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      company === c
                        ? "bg-brand-gradient text-white border-transparent"
                        : "border-base-600 text-ink-300 hover:border-accent-dim"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            {error && (
              <div className="bg-signal-rose/10 border border-signal-rose/30 text-signal-rose text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              onClick={startTest}
              disabled={loading || (mode === "company" && !company)}
              className="w-full rounded-xl bg-brand-gradient hover:opacity-90 shadow-glow-sm disabled:opacity-50 transition-opacity px-4 py-2.5 text-sm font-semibold text-white"
            >
              {loading ? "Preparing questions…" : "Start test →"}
            </button>
            <p className="text-[11px] text-ink-500 text-center">
              8 multiple-choice questions · pass at 70% or higher
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- QUIZ
  if (stage === "quiz" && test) {
    const answeredCount = Object.keys(answers).length;
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
          <div className="flex items-center justify-between">
            <h1 className="font-display font-bold text-lg text-ink-100">
              {test.mode === "company" ? `${test.company} — ${test.role}` : `${test.role} readiness test`}
            </h1>
            <span className="text-xs text-ink-500">
              {answeredCount}/{test.questions.length} answered
            </span>
          </div>

          <div className="h-1.5 rounded-full bg-base-700 overflow-hidden">
            <div
              className="h-full bg-brand-gradient rounded-full transition-all"
              style={{ width: `${(answeredCount / test.questions.length) * 100}%` }}
            />
          </div>

          <div className="space-y-4">
            {test.questions.map((q, i) => (
              <div key={q.id} className="rounded-2xl border border-base-600 bg-base-900 shadow-card p-4">
                <p className="text-sm text-ink-100 mb-3">
                  <span className="text-ink-500 mr-1.5">{i + 1}.</span>
                  {q.prompt}
                </p>
                <div className="space-y-2">
                  {q.options.map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
                        answers[q.id] === opt.id
                          ? "border-accent bg-brand-gradient-soft text-ink-100"
                          : "border-base-600 text-ink-300 hover:border-accent-dim"
                      }`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        className="accent-accent"
                        checked={answers[q.id] === opt.id}
                        onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.id }))}
                      />
                      {opt.text}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="bg-signal-rose/10 border border-signal-rose/30 text-signal-rose text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={!allAnswered || loading}
            className="w-full rounded-xl bg-brand-gradient hover:opacity-90 shadow-glow-sm disabled:opacity-50 transition-opacity px-4 py-3 text-sm font-semibold text-white"
          >
            {loading ? "Grading…" : "Submit test"}
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------- RESULT
  if (stage === "result" && result) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="font-display font-bold text-xl text-gradient-brand">Test Results</h1>
              <p className="text-sm text-ink-500 mt-1">
                {result.score}/{result.total} correct
              </p>
            </div>
            <button
              onClick={restart}
              className="rounded-xl border border-base-600 hover:border-accent-dim px-4 py-2 text-sm text-ink-100 transition-colors"
            >
              Take another test
            </button>
          </div>

          <div
            className={`rounded-2xl border p-5 flex items-center gap-5 ${
              result.passed
                ? "border-signal-teal/30 bg-signal-teal/5"
                : "border-signal-rose/30 bg-signal-rose/5"
            }`}
          >
            <div
              className={`shrink-0 w-20 h-20 rounded-full border-4 flex items-center justify-center font-display font-bold text-2xl border-current/30 ${
                result.passed ? "text-signal-teal" : "text-signal-rose"
              }`}
            >
              {result.percent}%
            </div>
            <div>
              <p className="font-display font-semibold text-sm text-ink-100">
                {result.passed ? "You passed! 🎉" : "Not quite there yet"}
              </p>
              <p className="text-xs text-ink-500 mt-1">
                {result.passed
                  ? "Your certificate is ready below."
                  : "70% is the pass mark — review the explanations below and try again."}
              </p>
            </div>
          </div>

          {result.certificate && <Certificate certificate={result.certificate} />}

          <div className="space-y-2">
            <h2 className="font-display font-semibold text-sm text-ink-100">Answer review</h2>
            {result.breakdown.map((b, i) => (
              <div
                key={b.id}
                className={`rounded-xl border px-4 py-3 ${
                  b.correct ? "border-base-600 bg-base-800/60" : "border-signal-rose/30 bg-signal-rose/5"
                }`}
              >
                <p className="text-sm text-ink-100 mb-1.5">
                  {i + 1}. {b.prompt}
                </p>
                <p className="text-xs text-ink-300">
                  Your answer:{" "}
                  <span className={b.correct ? "text-signal-teal" : "text-signal-rose"}>
                    {b.options.find((o) => o.id === b.yourAnswer)?.text || "—"}
                  </span>
                </p>
                {!b.correct && (
                  <p className="text-xs text-ink-500 mt-0.5">
                    Correct answer:{" "}
                    <span className="text-signal-teal">
                      {b.options.find((o) => o.id === b.correctOptionId)?.text}
                    </span>
                  </p>
                )}
                <p className="text-[11px] text-ink-500 italic mt-1.5">{b.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
