import { useCallback, useEffect, useRef, useState } from "react";
import * as api from "../api/client.js";
import ModelSelector from "./ModelSelector.jsx";
import ResumeSetupForm, { INTERVIEW_CATEGORIES } from "./ResumeSetupForm.jsx";

const DIFFICULTY_STYLE = {
  Easy: "bg-signal-teal/15 text-signal-teal border-signal-teal/30",
  Medium: "bg-signal-amber/15 text-signal-amber border-signal-amber/30",
  Hard: "bg-signal-rose/15 text-signal-rose border-signal-rose/30",
};

const RATING_STYLE = {
  Excellent: "text-signal-teal",
  Good: "text-signal-teal",
  Average: "text-signal-amber",
  Weak: "text-signal-rose",
};

const FEEDBACK_DIMENSIONS = [
  ["clarity", "Clarity"],
  ["technicalDepth", "Technical Depth"],
  ["confidence", "Confidence"],
  ["pace", "Pace"],
];

const SpeechRecognitionCtor =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

function scoreColor(score) {
  if (score >= 75) return "text-signal-teal";
  if (score >= 50) return "text-signal-amber";
  return "text-signal-rose";
}

/** Builds a formatted PDF of the interview report + full transcript and triggers a download. */
async function downloadReportPdf({ report, transcript, elapsed, role, experience }) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (needed) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const addHeading = (text, size = 13) => {
    ensureSpace(size + 14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size);
    doc.setTextColor(28, 24, 40);
    doc.text(text, margin, y);
    y += size + 10;
  };

  const addParagraph = (text, size = 10, color = [70, 68, 84]) => {
    if (!text) return;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line) => {
      ensureSpace(size + 5);
      doc.text(line, margin, y);
      y += size + 5;
    });
    y += 3;
  };

  const addDivider = () => {
    ensureSpace(14);
    doc.setDrawColor(220, 218, 230);
    doc.line(margin, y, pageWidth - margin, y);
    y += 14;
  };

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(99, 60, 224);
  doc.text("Live Interview Report", margin, y);
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(130, 128, 140);
  const metaBits = [
    `Generated ${new Date().toLocaleString()}`,
    role ? `Target role: ${role}` : null,
    experience ? `Level: ${experience}` : null,
  ].filter(Boolean);
  doc.text(metaBits.join("   ·   "), margin, y);
  y += 14;
  doc.text(
    `Duration: ${formatTime(elapsed)}   ·   ${transcript.length} question(s) answered`,
    margin,
    y
  );
  y += 24;

  addHeading(`Overall score: ${Math.round(report.overallScore || 0)} / 100`, 15);
  addParagraph(report.summary || "");
  addDivider();

  const categoryScores = report.categoryScores || {};
  if (Object.keys(categoryScores).length > 0) {
    addHeading("Category breakdown");
    Object.entries(categoryScores).forEach(([cat, score]) => {
      addParagraph(`•  ${cat}:  ${Math.round(score)} / 100`);
    });
    addDivider();
  }

  if (report.strengths?.length) {
    addHeading("Strengths");
    report.strengths.forEach((s) => addParagraph(`•  ${s}`));
    addDivider();
  }

  if (report.improvements?.length) {
    addHeading("Areas to improve");
    report.improvements.forEach((s) => addParagraph(`•  ${s}`));
    addDivider();
  }

  addHeading("Full transcript", 14);
  transcript.forEach((t, i) => {
    ensureSpace(40);
    addParagraph(`Q${i + 1}  ·  ${t.category}  ·  ${t.difficulty}`, 9.5, [130, 90, 224]);
    addParagraph(t.question, 11, [24, 22, 34]);
    addParagraph(`Your answer: ${t.answer}`, 10, [70, 68, 84]);
    if (t.feedback) {
      const dims = FEEDBACK_DIMENSIONS.map(
        ([key, label]) => `${label}: ${t.feedback[key] || "—"}`
      ).join("    ");
      addParagraph(dims, 9, [130, 128, 140]);
      if (t.feedback.comment) {
        addParagraph(`"${t.feedback.comment}"`, 9, [130, 128, 140]);
      }
    }
    y += 6;
  });

  doc.save(`live-interview-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}

function AiAvatar({ speaking }) {
  return (
    <div className="relative shrink-0">
      <div
        className={`w-14 h-14 rounded-2xl bg-brand-gradient flex items-center justify-center text-white font-display font-bold text-lg shadow-glow-sm transition-transform ${
          speaking ? "scale-105" : ""
        }`}
      >
        RM
      </div>
      {speaking && (
        <span className="absolute -inset-1 rounded-2xl border-2 border-accent/50 animate-pulseDot" />
      )}
    </div>
  );
}

export default function LiveInterview({ models, model, onModelChange }) {
  const [phase, setPhase] = useState("setup"); // "setup" | "live" | "report"

  // --- Setup state ---
  const [resumeText, setResumeText] = useState("");
  const [fileName, setFileName] = useState("");
  const [role, setRole] = useState("");
  const [experience, setExperience] = useState("Fresher / Entry-level");
  const [numQuestions, setNumQuestions] = useState(8);
  const [focusAreas, setFocusAreas] = useState([...INTERVIEW_CATEGORIES]);
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(false);

  // --- Live session state ---
  const [sessionId, setSessionId] = useState(null);
  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [progress, setProgress] = useState({ current: 1, total: numQuestions });
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [lastFeedback, setLastFeedback] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [cameraError, setCameraError] = useState(null);

  // --- Report state ---
  const [report, setReport] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);

  // Timer: run while phase === "live"
  useEffect(() => {
    if (phase !== "live") return;
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  // Camera preview: acquire while live + cameraOn, release otherwise.
  useEffect(() => {
    if (phase !== "live" || !cameraOn) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      return;
    }
    let cancelled = false;
    setCameraError(null);
    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => {
        if (!cancelled) setCameraError("Camera unavailable — continuing without video.");
      });
    return () => {
      cancelled = true;
    };
  }, [phase, cameraOn]);

  // Stop camera + speech + timer entirely on unmount.
  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      clearInterval(timerRef.current);
      window.speechSynthesis?.cancel();
      recognitionRef.current?.stop?.();
    },
    []
  );

  const speak = useCallback(
    (text) => {
      if (!speakerOn || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1;
      utter.onstart = () => setSpeaking(true);
      utter.onend = () => setSpeaking(false);
      utter.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utter);
    },
    [speakerOn]
  );

  const toggleListening = useCallback(() => {
    if (!SpeechRecognitionCtor) return;
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onstart = () => setListening(true);
    recognition.onresult = (event) => {
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalText += event.results[i][0].transcript;
      }
      if (finalText.trim()) {
        setAnswer((prev) => (prev.trim() ? prev.trim() + " " : "") + finalText.trim() + " ");
      }
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  }, [listening]);

  const resetAll = () => {
    setPhase("setup");
    setSessionId(null);
    setQuestion("");
    setCategory("");
    setDifficulty("Medium");
    setProgress({ current: 1, total: numQuestions });
    setAnswer("");
    setLastFeedback(null);
    setTranscript([]);
    setElapsed(0);
    setReport(null);
    setError(null);
  };

  const handleStart = async () => {
    if (!resumeText.trim()) {
      setError("Upload a resume or paste your resume text first.");
      return;
    }
    if (focusAreas.length === 0) {
      setError("Pick at least one focus area.");
      return;
    }
    setError(null);
    setStarting(true);
    try {
      const res = await api.startLiveInterview({
        resumeText,
        role,
        experience,
        numQuestions,
        focusAreas,
        model,
      });
      setSessionId(res.sessionId);
      setQuestion(res.question);
      setCategory(res.category);
      setDifficulty(res.difficulty);
      setProgress(res.progress);
      setElapsed(0);
      setTranscript([]);
      setLastFeedback(null);
      setPhase("live");
      setTimeout(() => speak(res.question), 300);
    } catch (e) {
      setError(e.message);
    } finally {
      setStarting(false);
    }
  };

  const finishWithReport = (rep) => {
    window.speechSynthesis?.cancel();
    clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setReport(rep);
    setPhase("report");
  };

  const submitAnswer = async (skip = false) => {
    if (!sessionId || submitting) return;
    const submittedAnswer = skip ? "" : answer.trim();
    if (!skip && !submittedAnswer) return;

    setSubmitting(true);
    setError(null);
    recognitionRef.current?.stop();
    setListening(false);

    const askedQuestion = { question, category, difficulty, answer: skip ? "(skipped)" : submittedAnswer };

    try {
      const res = await api.submitLiveInterviewAnswer(sessionId, submittedAnswer);
      const entry = { ...askedQuestion, feedback: res.feedback };
      setTranscript((prev) => [...prev, entry]);
      setLastFeedback(res.feedback);
      setAnswer("");

      if (res.done) {
        finishWithReport(res.report);
      } else {
        setQuestion(res.question);
        setCategory(res.category);
        setDifficulty(res.difficulty);
        setProgress(res.progress);
        setTimeout(() => speak(res.question), 300);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnd = async () => {
    if (!sessionId || ending) return;
    setEnding(true);
    setError(null);
    try {
      const res = await api.endLiveInterview(sessionId);
      finishWithReport(res.report);
    } catch (e) {
      setError(e.message);
    } finally {
      setEnding(false);
    }
  };

  const categoryCounts = focusAreas.reduce((acc, cat) => {
    acc[cat] = transcript.filter((t) => t.category === cat).length;
    return acc;
  }, {});

  // ---------------------------------------------------------------- SETUP
  if (phase === "setup") {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          <div>
            <h1 className="font-display font-bold text-xl flex items-center gap-2">
              <span className="text-gradient-brand">Live Interview</span>
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-signal-rose bg-signal-rose/10 border border-signal-rose/30 rounded-full px-2 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-signal-rose animate-pulseDot" />
                Live
              </span>
            </h1>
            <p className="text-sm text-ink-500 mt-1">
              An AI interviewer reads your resume, then interviews you one
              question at a time — asking real-time follow-ups, scoring your
              answers as you go, and building a report at the end.
            </p>
          </div>

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
              minQuestions={3}
              maxQuestions={15}
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
                onClick={handleStart}
                disabled={starting}
                className="flex items-center gap-2 rounded-xl bg-brand-gradient hover:opacity-90 shadow-glow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-opacity px-5 py-2.5 text-sm font-semibold text-white"
              >
                {starting ? (
                  "Connecting…"
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-white/90" />
                    Start Live Interview
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-signal-rose/10 border border-signal-rose/30 text-signal-rose text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div className="rounded-xl border border-base-600 bg-base-900/60 px-4 py-3 text-xs text-ink-500 leading-relaxed">
            Uses your microphone for optional voice answers and camera for a
            self-preview only — nothing is recorded or uploaded; your typed
            or transcribed answers are sent to the model to generate
            follow-up questions and feedback.
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- REPORT
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const handleDownloadReport = async () => {
    if (!report || downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      await downloadReportPdf({ report, transcript, elapsed, role, experience });
    } catch (e) {
      setError("Couldn't generate the PDF. Please try again.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (phase === "report" && report) {
    const categoryScores = report.categoryScores || {};
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="font-display font-bold text-xl text-gradient-brand">
                Interview Report
              </h1>
              <p className="text-sm text-ink-500 mt-1">
                {transcript.length} question{transcript.length !== 1 ? "s" : ""} answered
                in {formatTime(elapsed)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadReport}
                disabled={downloadingPdf}
                className="flex items-center gap-1.5 rounded-xl bg-brand-gradient hover:opacity-90 shadow-glow-sm disabled:opacity-60 transition-opacity px-4 py-2 text-sm font-semibold text-white"
              >
                {downloadingPdf ? "Preparing PDF…" : "⬇ Download Report"}
              </button>
              <button
                onClick={resetAll}
                className="rounded-xl border border-base-600 hover:border-accent-dim px-4 py-2 text-sm text-ink-100 transition-colors"
              >
                Start New Interview
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-base-600 bg-base-900 shadow-card p-5 flex items-center gap-5">
            <div
              className={`shrink-0 w-20 h-20 rounded-full border-4 flex items-center justify-center font-display font-bold text-2xl ${scoreColor(
                report.overallScore || 0
              )} border-current/30`}
            >
              {Math.round(report.overallScore || 0)}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-ink-500 mb-1">
                Overall score
              </p>
              <p className="text-sm text-ink-100 leading-relaxed">{report.summary}</p>
            </div>
          </div>

          {Object.keys(categoryScores).length > 0 && (
            <div className="rounded-2xl border border-base-600 bg-base-900 shadow-card p-5">
              <h2 className="font-display font-semibold text-sm text-ink-100 mb-3">
                Category breakdown
              </h2>
              <div className="space-y-3">
                {Object.entries(categoryScores).map(([cat, score]) => (
                  <div key={cat}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-ink-300">{cat}</span>
                      <span className={scoreColor(score)}>{Math.round(score)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-base-700 overflow-hidden">
                      <div
                        className="h-full bg-brand-gradient rounded-full"
                        style={{ width: `${Math.max(4, Math.min(100, score))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-base-600 bg-base-900 shadow-card p-5">
              <h2 className="font-display font-semibold text-sm text-signal-teal mb-2">
                Strengths
              </h2>
              <ul className="space-y-1.5 text-sm text-ink-300 list-disc list-inside">
                {(report.strengths || []).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
                {(!report.strengths || report.strengths.length === 0) && (
                  <li className="text-ink-500 list-none">Not enough answers to judge yet.</li>
                )}
              </ul>
            </div>
            <div className="rounded-2xl border border-base-600 bg-base-900 shadow-card p-5">
              <h2 className="font-display font-semibold text-sm text-signal-amber mb-2">
                Areas to improve
              </h2>
              <ul className="space-y-1.5 text-sm text-ink-300 list-disc list-inside">
                {(report.improvements || []).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
                {(!report.improvements || report.improvements.length === 0) && (
                  <li className="text-ink-500 list-none">Nothing notable — solid round.</li>
                )}
              </ul>
            </div>
          </div>

          <div>
            <h2 className="font-display font-semibold text-sm text-ink-100 mb-2">
              Full transcript
            </h2>
            <div className="space-y-2">
              {transcript.map((t, i) => (
                <details
                  key={i}
                  className="rounded-xl border border-base-600 bg-base-800/60 overflow-hidden group"
                >
                  <summary className="cursor-pointer list-none px-4 py-3 flex items-start gap-3">
                    <span className="mt-0.5 shrink-0 w-6 h-6 rounded-full bg-base-700 text-ink-300 text-xs flex items-center justify-center font-mono">
                      {i + 1}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span
                        className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded border mb-1 ${
                          DIFFICULTY_STYLE[t.difficulty] || DIFFICULTY_STYLE.Medium
                        }`}
                      >
                        {t.category}
                      </span>
                      <span className="block text-sm text-ink-100 leading-relaxed">
                        {t.question}
                      </span>
                    </span>
                  </summary>
                  <div className="px-4 pb-4 pt-1 border-t border-base-700 space-y-2">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-ink-500 mb-1 mt-2">
                        Your answer
                      </p>
                      <p className="text-sm text-ink-300 leading-relaxed whitespace-pre-wrap">
                        {t.answer}
                      </p>
                    </div>
                    {t.feedback && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                        {FEEDBACK_DIMENSIONS.map(([key, label]) => (
                          <span key={key} className="text-xs text-ink-500">
                            {label}:{" "}
                            <span className={RATING_STYLE[t.feedback[key]] || "text-ink-300"}>
                              {t.feedback[key] || "—"}
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                    {t.feedback?.comment && (
                      <p className="text-xs text-ink-500 italic">“{t.feedback.comment}”</p>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- LIVE
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        <div className="space-y-4 min-w-0">
          {/* Status bar */}
          <div className="flex items-center justify-between rounded-xl border border-base-600 bg-base-900 px-4 py-2.5">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-signal-rose bg-signal-rose/10 border border-signal-rose/30 rounded-full px-2 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-signal-rose animate-pulseDot" />
                Live
              </span>
              <span className="text-xs text-ink-500 font-mono">{formatTime(elapsed)}</span>
            </div>
            <button
              onClick={handleEnd}
              disabled={ending}
              className="text-xs font-medium text-signal-rose hover:text-white hover:bg-signal-rose border border-signal-rose/40 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
            >
              {ending ? "Ending…" : "End Interview"}
            </button>
          </div>

          {/* Interviewer stage */}
          <div className="relative rounded-2xl border border-base-600 bg-base-900 shadow-card overflow-hidden">
            <div className="relative bg-aurora min-h-[200px] sm:min-h-[220px] flex items-center gap-4 px-4 sm:px-6 py-6 sm:py-8">
              <AiAvatar speaking={speaking} />
              <div className="min-w-0">
                <p className="text-xs text-ink-500 mb-0.5">AI Interviewer</p>
                <p className="font-display font-semibold text-sm text-ink-100">
                  Raj Malhotra
                </p>
                <p className="text-xs text-ink-500">Senior Hiring Manager</p>
              </div>

              {cameraOn && (
                <div className="absolute top-2 right-2 sm:top-3 sm:right-3 w-20 h-14 sm:w-28 sm:h-20 rounded-lg overflow-hidden border border-base-600 bg-base-800">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-1 left-1 text-[9px] bg-black/50 text-white px-1.5 py-0.5 rounded">
                    You
                  </span>
                </div>
              )}
            </div>

            <div className="border-t border-base-700 px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                        DIFFICULTY_STYLE[difficulty] || DIFFICULTY_STYLE.Medium
                      }`}
                    >
                      {difficulty}
                    </span>
                    <span className="text-[10px] text-ink-500">{category}</span>
                  </div>
                  <p className="text-sm text-ink-100 leading-relaxed">{question}</p>
                </div>
                <button
                  onClick={() => (speaking ? window.speechSynthesis.cancel() : speak(question))}
                  title={speakerOn ? "Replay question" : "Speaker muted"}
                  className="shrink-0 text-ink-500 hover:text-ink-100 transition-colors"
                >
                  {speakerOn ? "🔊" : "🔇"}
                </button>
              </div>
            </div>

            <div className="border-t border-base-700 px-5 py-3 flex flex-wrap items-center gap-2">
              <button
                onClick={() => setCameraOn((v) => !v)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  cameraOn
                    ? "border-base-600 text-ink-300 hover:border-accent-dim"
                    : "border-signal-rose/40 text-signal-rose"
                }`}
              >
                {cameraOn ? "📷 Camera On" : "📷 Camera Off"}
              </button>
              <button
                onClick={() => setSpeakerOn((v) => !v)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  speakerOn
                    ? "border-base-600 text-ink-300 hover:border-accent-dim"
                    : "border-signal-rose/40 text-signal-rose"
                }`}
              >
                {speakerOn ? "🔊 Voice On" : "🔇 Voice Off"}
              </button>
              {SpeechRecognitionCtor && (
                <button
                  onClick={toggleListening}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    listening
                      ? "border-accent bg-brand-gradient-soft text-accent-soft"
                      : "border-base-600 text-ink-300 hover:border-accent-dim"
                  }`}
                >
                  {listening ? "🎙️ Listening…" : "🎙️ Speak Answer"}
                </button>
              )}
              {cameraError && (
                <span className="text-[11px] text-ink-500">{cameraError}</span>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-signal-rose/10 border border-signal-rose/30 text-signal-rose text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {/* Answer box */}
          <div className="rounded-2xl border border-base-600 bg-base-900 shadow-card p-4 space-y-3">
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={6}
              placeholder="Type your answer here…"
              disabled={submitting}
              className="w-full bg-base-800 border border-base-600 rounded-lg px-3 py-2.5 text-sm text-ink-100 placeholder:text-ink-500 outline-none focus:border-accent resize-none disabled:opacity-60"
            />
            <div className="flex items-center justify-between">
              <button
                onClick={() => submitAnswer(true)}
                disabled={submitting}
                className="text-xs text-ink-500 hover:text-ink-100 transition-colors disabled:opacity-50"
              >
                Skip question ▸
              </button>
              <button
                onClick={() => submitAnswer(false)}
                disabled={submitting || !answer.trim()}
                className="rounded-xl bg-brand-gradient hover:opacity-90 shadow-glow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-opacity px-5 py-2.5 text-sm font-semibold text-white"
              >
                {submitting ? "Thinking…" : "Submit Answer"}
              </button>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-base-600 bg-base-900 shadow-card p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display font-semibold text-sm text-ink-100">
                Interview Progress
              </h3>
              <span className="text-xs text-ink-500">
                {progress.current} / {progress.total}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-base-700 overflow-hidden mb-3">
              <div
                className="h-full bg-brand-gradient rounded-full transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    (progress.current / Math.max(1, progress.total)) * 100
                  )}%`,
                }}
              />
            </div>
            <div className="space-y-2">
              {focusAreas.map((cat) => (
                <div key={cat} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-ink-300 truncate">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        categoryCounts[cat] > 0 ? "bg-accent" : "bg-base-600"
                      }`}
                    />
                    <span className="truncate">{cat}</span>
                  </span>
                  <span className="text-ink-500 shrink-0">{categoryCounts[cat] || 0}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-base-600 bg-base-900 shadow-card p-4">
            <h3 className="font-display font-semibold text-sm text-ink-100 mb-3">
              Live Feedback
            </h3>
            {lastFeedback ? (
              <div className="space-y-2">
                {FEEDBACK_DIMENSIONS.map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="text-ink-300">{label}</span>
                    <span className={RATING_STYLE[lastFeedback[key]] || "text-ink-500"}>
                      {lastFeedback[key] || "—"}
                    </span>
                  </div>
                ))}
                {lastFeedback.comment && (
                  <p className="text-xs text-ink-500 italic pt-2 border-t border-base-700">
                    “{lastFeedback.comment}”
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-ink-500">
                Feedback on your answers will appear here after your first response.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-base-600 bg-base-900 shadow-card p-4">
            <h3 className="font-display font-semibold text-sm text-ink-100 mb-1">
              AI Interviewer
            </h3>
            <div className="flex items-center gap-3 mt-2">
              <div className="w-10 h-10 rounded-full bg-brand-gradient flex items-center justify-center text-white text-xs font-bold shrink-0">
                RM
              </div>
              <div className="min-w-0">
                <p className="text-sm text-ink-100 truncate">Raj Malhotra</p>
                <p className="text-[11px] text-ink-500">Senior Hiring Manager</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-accent/30 bg-brand-gradient-soft p-4">
            <p className="text-xs font-medium text-accent-soft mb-1">💡 Tip</p>
            <p className="text-xs text-ink-300 leading-relaxed">
              Be specific and explain with examples from your real projects —
              the interviewer adapts its follow-ups to what you say.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
