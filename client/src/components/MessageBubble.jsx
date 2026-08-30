import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { providerColor, shortModelName } from "../lib/providerColors.js";

export default function MessageBubble({ role, content, model, streaming }) {
  const isUser = role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end animate-fadeIn">
        <div className="max-w-[75%] bg-accent text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start animate-fadeIn">
      <div className="max-w-[80%]">
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
        <div className="bg-base-800 border border-base-700 rounded-2xl rounded-bl-sm px-4 py-3 text-[15px] text-ink-100">
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
