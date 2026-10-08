import { useRef, useState, useEffect } from "react";
import { ArrowUp, Paperclip, FileText, X, Loader2 } from "lucide-react";
import * as api from "../api/client.js";

const ACCEPTED_TYPES = [
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_FILE_BYTES = 8 * 1024 * 1024; // matches the server's limit

// Sending a resume with an empty message does the work (updates it) rather
// than just reviewing it. Chips below let the user pick another intent.
const UPDATE_PROMPT =
  "Update and polish this resume: strengthen the wording, fix structure and " +
  "ATS formatting, and give me the complete updated resume.";
const QUICK_ACTIONS = [
  { label: "Update my resume", text: UPDATE_PROMPT },
  {
    label: "Review only",
    text: "Review this resume and tell me what to improve — don't rewrite it yet.",
  },
  {
    label: "Tailor to a job",
    text:
      "Tailor this resume to the job description below and give me the complete " +
      "updated resume.\n\nJob description:\n",
  },
];

export default function InputBar({ onSend, disabled, placeholder }) {
  const [value, setValue] = useState("");
  // { status: "extracting" | "ready" | "error", name, text?, error? }
  const [attachment, setAttachment] = useState(null);
  const ref = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = "auto";
    ref.current.style.height = `${Math.min(ref.current.scrollHeight, 200)}px`;
  }, [value]);

  const handleFilePick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again later
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setAttachment({
        status: "error",
        name: file.name,
        error: "Only PDF, DOCX, or TXT files are supported.",
      });
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setAttachment({
        status: "error",
        name: file.name,
        error: "That file is too large (max 8MB).",
      });
      return;
    }

    setAttachment({ status: "extracting", name: file.name });
    try {
      const { text } = await api.extractResume(file);
      setAttachment({ status: "ready", name: file.name, text });
    } catch (err) {
      setAttachment({ status: "error", name: file.name, error: err.message });
    }
  };

  const submit = () => {
    if (disabled) return;
    const trimmed = value.trim();
    const hasFile = attachment?.status === "ready";
    if (!trimmed && !hasFile) return;

    let content = trimmed;
    if (hasFile) {
      const instruction = trimmed || UPDATE_PROMPT;
      content =
        `[Attached: ${attachment.name}]\n${attachment.text}\n\n---\n\n` + instruction;
    }

    onSend(content);
    setValue("");
    setAttachment(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const canSend =
    !disabled && (value.trim() || attachment?.status === "ready") && attachment?.status !== "extracting";

  return (
    <div className="border-t border-base-700 glass-panel px-4 py-3">
      <div className="max-w-3xl mx-auto">
        {attachment && (
          <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl bg-base-800 border border-base-600 text-xs">
            {attachment.status === "extracting" ? (
              <Loader2 className="w-3.5 h-3.5 text-accent-soft animate-spin shrink-0" strokeWidth={2.25} />
            ) : (
              <FileText
                className={`w-3.5 h-3.5 shrink-0 ${
                  attachment.status === "error" ? "text-signal-rose" : "text-accent-soft"
                }`}
                strokeWidth={2.25}
              />
            )}
            <span className="text-ink-300 truncate flex-1">
              {attachment.status === "extracting" && `Reading ${attachment.name}…`}
              {attachment.status === "ready" && attachment.name}
              {attachment.status === "error" && (
                <span className="text-signal-rose">{attachment.error}</span>
              )}
            </span>
            <button
              onClick={() => setAttachment(null)}
              className="shrink-0 text-ink-500 hover:text-ink-100 p-0.5"
              aria-label="Remove attachment"
            >
              <X className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          </div>
        )}

        {attachment?.status === "ready" && !value.trim() && (
          <div className="flex flex-wrap gap-2 mb-2">
            {QUICK_ACTIONS.map((a) => (
              <button
                key={a.label}
                onClick={() => {
                  setValue(a.text);
                  ref.current?.focus();
                }}
                className="text-xs text-accent-soft border border-accent/30 hover:bg-brand-gradient-soft rounded-full px-3 py-1.5 transition-colors"
              >
                {a.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 bg-base-800 border border-base-600 focus-within:border-accent focus-within:shadow-glow-sm rounded-2xl px-3 py-2 transition-all">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFilePick}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            title="Attach your resume (PDF, DOCX, or TXT)"
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-ink-500 hover:text-ink-100 hover:bg-base-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-0.5"
          >
            <Paperclip className="w-4 h-4" strokeWidth={2.25} />
          </button>
          <textarea
            ref={ref}
            rows={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={
              attachment?.status === "ready"
                ? "Press send to update your resume, or type what you want changed…"
                : placeholder || "Message..."
            }
            className="flex-1 bg-transparent resize-none outline-none text-[15px] text-ink-100 placeholder:text-ink-500 max-h-[200px] py-1.5 disabled:opacity-50"
          />
          <button
            onClick={submit}
            disabled={!canSend}
            className="shrink-0 w-8 h-8 rounded-full bg-brand-gradient hover:opacity-90 disabled:bg-base-600 disabled:bg-none disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center text-white"
            title="Send"
          >
            <ArrowUp className="w-[18px] h-[18px]" strokeWidth={2.5} />
          </button>
        </div>
      </div>
      <p className="text-center text-[11px] text-ink-500 mt-2">
        Enter to send · Shift + Enter for a new line · attach your resume to get it reviewed
      </p>
    </div>
  );
}
