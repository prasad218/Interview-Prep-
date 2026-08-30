import { useRef, useState, useEffect } from "react";

export default function InputBar({ onSend, disabled, placeholder }) {
  const [value, setValue] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = "auto";
    ref.current.style.height = `${Math.min(ref.current.scrollHeight, 200)}px`;
  }, [value]);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="border-t border-base-700 bg-base-900 px-4 py-3">
      <div className="max-w-3xl mx-auto flex items-end gap-2 bg-base-800 border border-base-600 focus-within:border-accent rounded-2xl px-3 py-2 transition-colors">
        <textarea
          ref={ref}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder || "Message..."}
          className="flex-1 bg-transparent resize-none outline-none text-[15px] text-ink-100 placeholder:text-ink-500 max-h-[200px] py-1.5 disabled:opacity-50"
        />
        <button
          onClick={submit}
          disabled={disabled || !value.trim()}
          className="shrink-0 w-8 h-8 rounded-full bg-accent hover:bg-accent-soft disabled:bg-base-600 disabled:cursor-not-allowed transition-colors flex items-center justify-center text-white"
          title="Send"
        >
          ↑
        </button>
      </div>
      <p className="text-center text-[11px] text-ink-500 mt-2">
        Enter to send · Shift + Enter for a new line
      </p>
    </div>
  );
}
