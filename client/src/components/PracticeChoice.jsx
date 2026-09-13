import logo from "../assets/logo.png";
import { useAuth } from "../context/AuthContext.jsx";

export default function PracticeChoice({ onQuickPractice, onBuildRoadmap }) {
  const { logout } = useAuth();

  return (
    <div className="h-screen w-screen relative flex flex-col items-center justify-center text-center px-6 overflow-hidden bg-base-950">
      <div className="absolute inset-0 bg-aurora pointer-events-none" />

      <button
        onClick={logout}
        title="Log out"
        className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10 flex items-center gap-1.5 text-ink-500 hover:text-ink-100 text-xs font-medium px-3 py-1.5 rounded-lg border border-base-700 hover:border-base-600 bg-base-900/40 transition-colors"
      >
        <span>←</span> Log out
      </button>

      <div className="relative z-10 flex flex-col items-center max-w-md w-full">
        <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-glow mb-5 animate-floatSlow">
          <img src={logo} alt="Interview Prep" className="w-full h-full object-contain" />
        </div>

        <h1 className="font-display text-2xl font-bold text-ink-100 mb-2">
          How do you want to start?
        </h1>
        <p className="text-ink-500 text-sm max-w-sm mb-8 leading-relaxed">
          Jump straight into practice questions, or tell us about your target
          role so we can build you a full day-by-day prep roadmap.
        </p>

        <div className="w-full flex flex-col gap-4">
          <button
            onClick={onQuickPractice}
            className="w-full text-left rounded-2xl border border-base-600 bg-base-800/60 hover:border-signal-teal/40 hover:bg-base-800 transition-colors px-5 py-4"
          >
            <span className="flex items-center gap-3">
              <span className="w-10 h-10 shrink-0 rounded-xl bg-signal-teal/15 border border-signal-teal/30 flex items-center justify-center text-lg">
                ⚡
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-display font-semibold text-ink-100 text-sm mb-0.5">
                  Quick practice
                </span>
                <span className="block text-xs text-ink-500 leading-relaxed">
                  Skip setup and start practicing questions right away.
                </span>
              </span>
            </span>
          </button>

          <button
            onClick={onBuildRoadmap}
            className="w-full text-left rounded-2xl border border-base-600 bg-base-800/60 hover:border-brand-500/40 hover:bg-base-800 transition-colors px-5 py-4"
          >
            <span className="flex items-center gap-3">
              <span className="w-10 h-10 shrink-0 rounded-xl bg-brand-gradient shadow-glow flex items-center justify-center text-lg">
                🗺️
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-display font-semibold text-ink-100 text-sm mb-0.5">
                  Build my roadmap
                </span>
                <span className="block text-xs text-ink-500 leading-relaxed">
                  Upload your resume and get a personalized, day-by-day prep
                  plan.
                </span>
              </span>
            </span>
          </button>
        </div>

        <div className="brand-badge mt-8">
          <span className="brand-dot" />
          A product from <span className="brand-name">Aakara.AI</span>
        </div>
      </div>
    </div>
  );
}
