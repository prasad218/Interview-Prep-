import { useCallback, useRef, useState } from "react";
import * as api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

function CompanyChips({ companies, setCompanies }) {
  const [draft, setDraft] = useState("");

  const commit = () => {
    const value = draft.trim();
    if (value && !companies.includes(value) && companies.length < 8) {
      setCompanies([...companies, value]);
    }
    setDraft("");
  };

  const remove = (name) => setCompanies(companies.filter((c) => c !== name));

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {companies.map((c) => (
          <span
            key={c}
            className="inline-flex items-center gap-1.5 text-xs bg-brand-gradient-soft border border-accent/40 text-accent-soft rounded-full px-3 py-1"
          >
            {c}
            <button
              type="button"
              onClick={() => remove(c)}
              className="hover:text-white"
              aria-label={`Remove ${c}`}
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          }
        }}
        onBlur={commit}
        placeholder="Type a company and press Enter (e.g. Google, TCS)…"
        className="w-full bg-base-800 border border-base-600 rounded-lg px-3 py-2.5 text-sm text-ink-100 placeholder:text-ink-500 outline-none focus:border-accent"
      />
      <p className="text-[11px] text-ink-500 mt-1">
        Optional — leave blank for a general prep roadmap. Add up to 8 companies.
      </p>
    </div>
  );
}

export default function OnboardingWizard({ onDone, initialProfile, onCancel }) {
  const { setUser } = useAuth();
  const fileInputRef = useRef(null);

  const [resumeText, setResumeText] = useState(initialProfile?.resumeText || "");
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const [targetRole, setTargetRole] = useState(initialProfile?.targetRole || "");
  const [daysToPlacement, setDaysToPlacement] = useState(
    initialProfile?.daysToPlacement || 30
  );
  const [dailyHours, setDailyHours] = useState(initialProfile?.dailyHours || 2);
  const [companies, setCompanies] = useState(initialProfile?.targetCompanies || []);

  const [error, setError] = useState(null);
  const [stage, setStage] = useState("form"); // "form" | "generating"

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

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resumeText.trim()) {
      setError("Upload your resume or paste its text first.");
      return;
    }
    if (!targetRole.trim()) {
      setError("Tell us the role you're targeting.");
      return;
    }
    setError(null);
    setStage("generating");
    try {
      const { user: userAfterProfile } = await api.saveProfile({
        resumeText,
        targetRole,
        daysToPlacement,
        dailyHours,
        targetCompanies: companies,
      });
      const { roadmap } = await api.generateRoadmap();
      // Set both together — updating user.profile alone would flip the
      // parent app out of onboarding before the roadmap call finishes.
      setUser({ ...userAfterProfile, roadmap });
      onDone?.();
    } catch (e) {
      setError(e.message);
      setStage("form");
    }
  };

  if (stage === "generating") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-950 bg-aurora p-6">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-brand-gradient shadow-glow mx-auto mb-6 flex items-center justify-center animate-floatSlow">
            <span className="text-white text-2xl">🗺️</span>
          </div>
          <h2 className="font-display font-bold text-lg mb-2">
            Building your roadmap…
          </h2>
          <p className="text-sm text-ink-500 leading-relaxed">
            Reading your resume, mapping out {daysToPlacement} days at{" "}
            {dailyHours}h/day{companies.length ? `, and researching ${companies.join(", ")}'s process` : ""}.
            This can take up to a minute.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-950 bg-aurora flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8 relative">
          {onCancel && (
            <button
              onClick={onCancel}
              className="absolute left-0 top-1 text-xs text-ink-500 hover:text-ink-100"
            >
              ← Back
            </button>
          )}
          <h1 className="font-display font-bold text-2xl">
            {initialProfile ? (
              <>Update your <span className="text-gradient-brand">prep details</span></>
            ) : (
              <>Let's build your <span className="text-gradient-brand">prep roadmap</span></>
            )}
          </h1>
          <p className="text-sm text-ink-500 mt-2">
            {initialProfile
              ? "Changing these will regenerate your roadmap."
              : "A few details and we'll generate a personalized, day-by-day plan."}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-base-600 bg-base-900 shadow-card p-5 sm:p-6 space-y-6"
        >
          {/* Resume */}
          <div>
            <p className="text-sm font-semibold text-ink-100 mb-2">1. Your resume</p>
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
                  ? "border-accent bg-brand-gradient-soft"
                  : "border-base-600 hover:border-accent-dim"
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
                  ✓ {fileName} <span className="text-ink-500">— click to replace</span>
                </p>
              ) : (
                <p className="text-sm text-ink-300">
                  Drop your resume (PDF / DOCX / TXT), or click to browse
                </p>
              )}
            </div>
            <textarea
              value={resumeText}
              onChange={(e) => {
                setResumeText(e.target.value);
                setFileName("");
              }}
              rows={3}
              placeholder="…or paste your resume text here"
              className="w-full mt-2 bg-base-800 border border-base-600 rounded-lg px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500 outline-none focus:border-accent resize-none"
            />
          </div>

          {/* Role + timeline */}
          <div>
            <p className="text-sm font-semibold text-ink-100 mb-2">2. Your target & timeline</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-3">
                <label className="text-xs text-ink-500 block mb-1">Target role</label>
                <input
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  required
                  placeholder="e.g. Full Stack Developer, Data Analyst"
                  className="w-full bg-base-800 border border-base-600 rounded-lg px-3 py-2.5 text-sm text-ink-100 placeholder:text-ink-500 outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="text-xs text-ink-500 block mb-1">
                  Days until placement: {daysToPlacement}
                </label>
                <input
                  type="range"
                  min={7}
                  max={180}
                  value={daysToPlacement}
                  onChange={(e) => setDaysToPlacement(Number(e.target.value))}
                  className="w-full accent-accent mt-3"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-ink-500 block mb-1">
                  Study time per day: {dailyHours}h
                </label>
                <input
                  type="range"
                  min={0.5}
                  max={10}
                  step={0.5}
                  value={dailyHours}
                  onChange={(e) => setDailyHours(Number(e.target.value))}
                  className="w-full accent-accent mt-3"
                />
              </div>
            </div>
          </div>

          {/* Companies */}
          <div>
            <p className="text-sm font-semibold text-ink-100 mb-2">
              3. Target companies (optional)
            </p>
            <CompanyChips companies={companies} setCompanies={setCompanies} />
          </div>

          {error && (
            <div className="bg-signal-rose/10 border border-signal-rose/30 text-signal-rose text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-brand-gradient hover:opacity-90 shadow-glow-sm transition-opacity px-4 py-3 text-sm font-semibold text-white"
          >
            {initialProfile ? "Save & regenerate roadmap →" : "Generate my roadmap →"}
          </button>
        </form>
      </div>
    </div>
  );
}
