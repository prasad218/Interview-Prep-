import { useState } from "react";
import { FileText, Download, Copy, Check, Loader2 } from "lucide-react";
import {
  buildDocx,
  buildPdf,
  downloadBlob,
  fileBaseName,
  resumeTitle,
} from "../lib/resumeDoc.js";

/** Placeholder shown while the model is still writing the resume block. */
export function ResumeDocWriting() {
  return (
    <div className="my-3 rounded-xl border border-accent/30 bg-brand-gradient-soft px-4 py-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-brand-gradient flex items-center justify-center shrink-0">
        <FileText className="w-4 h-4 text-white" strokeWidth={2.25} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink-100">Writing your updated resume…</p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-soft animate-typingDot [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-accent-soft animate-typingDot [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-accent-soft animate-typingDot [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

export default function ResumeDocCard({ text }) {
  const [busy, setBusy] = useState(null); // "docx" | "pdf" | null
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const base = fileBaseName(text);

  const download = async (kind) => {
    if (busy) return;
    setBusy(kind);
    setError(null);
    try {
      const blob = kind === "docx" ? await buildDocx(text) : await buildPdf(text);
      downloadBlob(blob, `${base}.${kind}`);
    } catch (e) {
      setError(`Couldn't create the ${kind === "docx" ? "Word" : "PDF"} file. ${e.message || ""}`);
    } finally {
      setBusy(null);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be unavailable (permissions / insecure context).
    }
  };

  return (
    <div className="my-3 rounded-xl border border-accent/30 bg-base-900/60 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-base-700 bg-brand-gradient-soft">
        <div className="w-9 h-9 rounded-lg bg-brand-gradient flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4 text-white" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink-100 truncate">Updated resume</p>
          <p className="text-[11px] text-ink-500 truncate">{resumeTitle(text)} · ready to download</p>
        </div>
      </div>

      <pre className="px-4 py-3 text-[12px] leading-relaxed text-ink-300 whitespace-pre-wrap font-sans max-h-64 overflow-y-auto">
        {text}
      </pre>

      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-t border-base-700">
        <button
          onClick={() => download("docx")}
          disabled={!!busy}
          className="flex items-center gap-1.5 rounded-lg bg-brand-gradient hover:opacity-90 disabled:opacity-60 text-white text-xs font-semibold px-3 py-2 transition-opacity"
        >
          {busy === "docx" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2.25} />
          ) : (
            <Download className="w-3.5 h-3.5" strokeWidth={2.25} />
          )}
          Word (.docx)
        </button>
        <button
          onClick={() => download("pdf")}
          disabled={!!busy}
          className="flex items-center gap-1.5 rounded-lg border border-base-600 hover:border-accent-dim disabled:opacity-60 text-ink-100 text-xs font-medium px-3 py-2 transition-colors"
        >
          {busy === "pdf" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2.25} />
          ) : (
            <Download className="w-3.5 h-3.5" strokeWidth={2.25} />
          )}
          PDF
        </button>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 rounded-lg text-ink-500 hover:text-ink-100 text-xs px-2.5 py-2 transition-colors"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-signal-teal" strokeWidth={2.5} />
          ) : (
            <Copy className="w-3.5 h-3.5" strokeWidth={2} />
          )}
          {copied ? "Copied" : "Copy text"}
        </button>
        {error && <p className="w-full text-xs text-signal-rose">{error}</p>}
      </div>
    </div>
  );
}
