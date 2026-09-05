export default function EmptyState({ onNewChat }) {
  return (
    <div className="flex-1 relative flex flex-col items-center justify-center text-center px-6 overflow-hidden">
      <div className="absolute inset-0 bg-aurora pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-brand-gradient shadow-glow flex items-center justify-center mb-5 animate-floatSlow">
          <span className="text-white text-2xl font-bold">✦</span>
        </div>
        <h1 className="font-display text-2xl font-bold text-ink-100 mb-2">
          Start a new conversation
        </h1>
        <p className="text-ink-500 text-sm max-w-sm mb-6 leading-relaxed">
          Pick any model routed through OpenRouter — OpenAI, Anthropic, Google,
          Meta, and more — and switch between them mid-project.
        </p>
        <button
          onClick={onNewChat}
          className="rounded-xl bg-brand-gradient hover:opacity-90 transition-opacity shadow-glow text-white text-sm font-semibold px-5 py-2.5"
        >
          New chat
        </button>

        <div className="brand-badge mt-8">
          <span className="brand-dot" />
          A product from <span className="brand-name">Aakara.AI</span>
        </div>
      </div>
    </div>
  );
}
