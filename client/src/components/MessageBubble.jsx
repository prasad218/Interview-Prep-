import ReactMarkdown from "react-markdown";
import { Sparkles, FileText } from "lucide-react";
import remarkGfm from "remark-gfm";

// Messages sent with a resume attached are prefixed with
// "[Attached: name]\n<extracted text>\n\n---\n\n<instruction>" so the model
// gets full context. Showing that raw wall of text back to the user as
// their own chat bubble would be unreadable, so this pulls out just the
// filename and the instruction for display.
function parseAttachment(content) {
  const match = content.match(/^\[Attached:\s*([^\]]+)\]\n[\s\S]*?\n\n---\n\n([\s\S]*)$/);
  if (!match) return null;
  return { filename: match[1], instruction: match[2] };
}

export default function MessageBubble({ role, content, streaming }) {
  const isUser = role === "user";

  if (isUser) {
    const attachment = parseAttachment(content);
    return (
      <div className="flex justify-end items-end gap-2 animate-fadeIn">
        <div className="max-w-[75%] bg-brand-gradient text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap shadow-glow-sm">
          {attachment && (
            <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-white/20 text-[13px] text-white/90">
              <FileText className="w-3.5 h-3.5 shrink-0" strokeWidth={2.25} />
              <span className="truncate">{attachment.filename}</span>
            </div>
          )}
          {attachment ? attachment.instruction : content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start items-start gap-2.5 animate-fadeIn">
      <div className="w-7 h-7 rounded-lg bg-brand-gradient-soft border border-accent-dim/40 flex items-center justify-center shrink-0 mt-1">
        <Sparkles className="w-3.5 h-3.5 text-accent-soft" strokeWidth={2.25} />
      </div>
      <div className="max-w-[80%] min-w-0">
        <div className="bg-base-800/80 border border-base-700 rounded-2xl rounded-tl-sm px-4 py-3 text-[15px] text-ink-100 shadow-card">
          {streaming && !content?.trim() ? (
            <div className="flex items-center gap-1.5 py-1" aria-label="Thinking">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-soft animate-typingDot [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-accent-soft animate-typingDot [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-accent-soft animate-typingDot [animation-delay:300ms]" />
            </div>
          ) : (
            <div className="prose-chat">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || " "}</ReactMarkdown>
              {streaming && (
                <span className="inline-block w-1.5 h-4 bg-accent-soft ml-0.5 align-middle animate-pulseDot" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
