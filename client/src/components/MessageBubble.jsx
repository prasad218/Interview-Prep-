import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Sparkles, FileText, Copy, Check, Pencil } from "lucide-react";
import remarkGfm from "remark-gfm";
import ResumeDocCard, { ResumeDocWriting } from "./ResumeDocCard.jsx";
import { splitMessage } from "../lib/resumeDoc.js";

// Messages sent with a resume attached are prefixed with
// "[Attached: name]\n<extracted text>\n\n---\n\n<instruction>" so the model
// gets full context. Showing that raw wall of text back to the user as
// their own chat bubble would be unreadable, so this pulls out just the
// filename and the instruction for display.
function parseAttachment(content) {
  const match = content.match(
    /^(\[Attached:\s*([^\]]+)\]\n[\s\S]*?\n\n---\n\n)([\s\S]*)$/
  );
  if (!match) return null;
  // `prefix` is the attachment block (marker + extracted text + separator),
  // kept intact when the user edits only their question.
  return { prefix: match[1], filename: match[2], instruction: match[3] };
}

// While a reply is streaming, a ```resume block that hasn't closed yet would
// show as raw half-written text. Detect that so a "writing…" card can stand
// in for it until the block is complete.
function openResumeFence(content) {
  const open = content.search(/```resume[ \t]*\n/i);
  if (open === -1) return null;
  if (/```resume[ \t]*\n[\s\S]*?```/i.test(content.slice(open))) return null;
  return { before: content.slice(0, open) };
}

function Markdown({ children }) {
  return (
    <div className="prose-chat">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children || " "}</ReactMarkdown>
    </div>
  );
}

export default function MessageBubble({ role, content, streaming, canEdit, onEdit }) {
  const isUser = role === "user";
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can fail (permissions, insecure context) — not
      // worth surfacing an error for a convenience action.
    }
  };

  if (isUser) {
    const attachment = parseAttachment(content);
    const editableText = attachment ? attachment.instruction : content;

    const startEdit = () => {
      setDraft(editableText);
      setEditing(true);
    };
    const saveEdit = () => {
      const text = draft.trim();
      if (!text) return;
      setEditing(false);
      if (text === editableText.trim()) return; // nothing changed
      onEdit?.(attachment ? attachment.prefix + text : text);
    };

    if (editing) {
      return (
        <div className="flex justify-end animate-fadeIn">
          <div className="w-full max-w-[75%] rounded-2xl border border-accent/40 bg-base-800 p-3">
            {attachment && (
              <div className="flex items-center gap-1.5 mb-2 text-xs text-ink-500">
                <FileText className="w-3.5 h-3.5 shrink-0" strokeWidth={2.25} />
                <span className="truncate">{attachment.filename} stays attached</span>
              </div>
            )}
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  saveEdit();
                } else if (e.key === "Escape") {
                  setEditing(false);
                }
              }}
              rows={Math.min(8, Math.max(2, draft.split("\n").length))}
              className="w-full bg-transparent resize-none outline-none text-[15px] text-ink-100"
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setEditing(false)}
                className="text-xs text-ink-500 hover:text-ink-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={!draft.trim()}
                className="text-xs font-semibold text-white bg-brand-gradient hover:opacity-90 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-opacity"
              >
                Save &amp; send
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="group flex justify-end items-end gap-2 animate-fadeIn">
        {canEdit && onEdit && (
          <button
            onClick={startEdit}
            title="Edit message"
            aria-label="Edit message"
            className="mb-1 p-1.5 rounded-lg text-ink-500 hover:text-ink-100 hover:bg-base-800 opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-opacity"
          >
            <Pencil className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        )}
        <div className="max-w-[75%] bg-brand-gradient text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap shadow-glow-sm">
          {attachment && (
            <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-white/20 text-[13px] text-white/90">
              <FileText className="w-3.5 h-3.5 shrink-0" strokeWidth={2.25} />
              <span className="truncate">{attachment.filename}</span>
            </div>
          )}
          {editableText}
        </div>
      </div>
    );
  }

  // ---- Assistant message ----
  const showCopy = !streaming && content?.trim();
  const waiting = streaming && !content?.trim();
  const pending = streaming ? openResumeFence(content || "") : null;
  const segments = pending ? [{ type: "text", text: pending.before }] : splitMessage(content || "");

  return (
    <div className="flex justify-start items-start gap-2.5 animate-fadeIn">
      <div className="w-7 h-7 rounded-lg bg-brand-gradient-soft border border-accent-dim/40 flex items-center justify-center shrink-0 mt-1">
        <Sparkles className="w-3.5 h-3.5 text-accent-soft" strokeWidth={2.25} />
      </div>
      <div className="max-w-[80%] min-w-0">
        <div className="bg-base-800/80 border border-base-700 rounded-2xl rounded-tl-sm px-4 py-3 text-[15px] text-ink-100 shadow-card">
          {waiting ? (
            <div className="flex items-center gap-1.5 py-1" aria-label="Thinking">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-soft animate-typingDot [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-accent-soft animate-typingDot [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-accent-soft animate-typingDot [animation-delay:300ms]" />
            </div>
          ) : (
            <>
              {segments.map((seg, i) =>
                seg.type === "resume" ? (
                  <ResumeDocCard key={i} text={seg.text} />
                ) : seg.text.trim() ? (
                  <Markdown key={i}>{seg.text}</Markdown>
                ) : null
              )}
              {pending && <ResumeDocWriting />}
              {streaming && !pending && (
                <span className="inline-block w-1.5 h-4 bg-accent-soft ml-0.5 align-middle animate-pulseDot" />
              )}
            </>
          )}
        </div>
        {showCopy && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-[11px] text-ink-500 hover:text-ink-100 mt-1.5 px-1 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-signal-teal" strokeWidth={2.5} />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" strokeWidth={2} />
                Copy
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
