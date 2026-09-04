import { useCallback, useRef, useState } from "react";
import * as api from "../api/client.js";

export const INTERVIEW_CATEGORIES = [
  "Resume & Projects",
  "Technical Knowledge",
  "DSA & Problem Solving",
  "System Design",
  "Behavioral (HR)",
];

/**
 * Controlled resume + interview-config form. Shared by InterviewPrep (static
 * Q&A generator) and LiveInterview (live conversational mock interview) so
 * both features collect the same inputs the same way.
 */
export default function ResumeSetupForm({
  resumeText,
  setResumeText,
  fileName,
  setFileName,
  role,
  setRole,
  experience,
  setExperience,
  numQuestions,
  setNumQuestions,
  minQuestions = 5,
  maxQuestions = 20,
  focusAreas,
  setFocusAreas,
  error,
  setError,
}) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const toggleFocus = (cat) => {
    setFocusAreas((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleFile = useCallback(
    async (file) => {
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
    },
    [setError, setResumeText, setFileName]
  );

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="space-y-4">
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
            min={minQuestions}
            max={maxQuestions}
            value={numQuestions}
            onChange={(e) => setNumQuestions(Number(e.target.value))}
            className="w-full accent-accent"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-ink-500 block mb-2">Focus areas</label>
        <div className="flex flex-wrap gap-2">
          {INTERVIEW_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => toggleFocus(cat)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                focusAreas.includes(cat)
                  ? "bg-brand-gradient-soft border-accent text-accent-soft"
                  : "border-base-600 text-ink-500 hover:text-ink-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
