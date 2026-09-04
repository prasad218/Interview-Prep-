import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { providerColor, shortModelName } from "../lib/providerColors.js";

export default function MessageBubble({ role, content, model, streaming }) {
  const isUser = role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end items-end gap-2 animate-fadeIn">
        <div className="max-w-[75%] bg-brand-gradient text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap shadow-glow-sm">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start items-start gap-2.5 animate-fadeIn">
      <div className="w-7 h-7 rounded-lg bg-brand-gradient-soft border border-accent-dim/40 flex items-center justify-center shrink-0 mt-1">
        <span className="text-accent-soft text-xs">✦</span>
      </div>
      <div className="max-w-[80%] min-w-0">
        {model && (
          <div className="flex items-center gap-1.5 mb-1 px-1">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: providerColor(model) }}
            />
            <span className="text-[11px] font-mono text-ink-500">
              {shortModelName(model)}
            </span>
          </div>
        )}
        <div className="bg-base-800/80 border border-base-700 rounded-2xl rounded-tl-sm px-4 py-3 text-[15px] text-ink-100 shadow-card">
          <div className="prose-chat">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content || " "}
            </ReactMarkdown>
          </div>
          {streaming && (
            <span className="inline-block w-1.5 h-4 bg-accent-soft ml-0.5 align-middle animate-pulseDot" />
          )}
        </div>
      </div>
    </div>
  );
}
