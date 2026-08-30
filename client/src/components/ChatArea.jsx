import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble.jsx";

export default function ChatArea({ messages, streamingText, streamingModel }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streamingText]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {messages.map((m) => (
          <MessageBubble key={m.id} role={m.role} content={m.content} model={m.model} />
        ))}

        {streamingText !== null && (
          <MessageBubble
            role="assistant"
            content={streamingText}
            model={streamingModel}
            streaming
          />
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
