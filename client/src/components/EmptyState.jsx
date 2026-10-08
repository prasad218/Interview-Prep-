import { Sparkles } from "lucide-react";

export default function EmptyState({ onNewChat }) {
  return (
    <div className="flex-1 relative flex flex-col items-center justify-center text-center px-6 overflow-hidden">
      <div className="absolute inset-0 bg-aurora pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-brand-gradient shadow-glow flex items-center justify-center mb-5 animate-floatSlow">
          <Sparkles className="w-7 h-7 text-white" strokeWidth={2.25} />
        </div>
        <h1 className="font-display text-2xl font-bold text-ink-100 mb-2">
          Your inbuilt agentic AI
        </h1>
        <p className="text-ink-500 text-sm max-w-sm mb-6 leading-relaxed">
          Attach your resume and it updates it for you, then hands back a
          ready-to-download Word or PDF file. Ask it about interviews and your
          career too.
        </p>
        <button
          onClick={onNewChat}
          className="rounded-xl bg-brand-gradient hover:opacity-90 transition-opacity shadow-glow text-white text-sm font-semibold px-5 py-2.5"
        >
          Start
        </button>

        <div className="brand-badge mt-8">
          <span className="brand-dot" />
          A product from <span className="brand-name">Aakara.AI</span>
        </div>
      </div>
    </div>
  );
}
