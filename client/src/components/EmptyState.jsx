export default function EmptyState({ onNewChat }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
      <div className="w-12 h-12 rounded-2xl bg-accent/15 border border-accent-dim flex items-center justify-center mb-4">
        <span className="w-2.5 h-2.5 rounded-full bg-accent-soft" />
      </div>
      <h1 className="font-display text-xl font-bold text-ink-100 mb-1.5">
        Start a new conversation
      </h1>
      <p className="text-ink-500 text-sm max-w-sm mb-5">
        Pick any model routed through OpenRouter — OpenAI, Anthropic, Google,
        Meta, and more — and switch between them mid-project.
      </p>
      <button
        onClick={onNewChat}
        className="rounded-xl bg-accent hover:bg-accent-soft transition-colors text-white text-sm font-medium px-4 py-2"
      >
        New chat
      </button>
    </div>
  );
}
