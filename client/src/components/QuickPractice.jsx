import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import * as api from "../api/client.js";
import InterviewPrep from "./InterviewPrep.jsx";
import LiveInterview from "./LiveInterview.jsx";  
import logo from "../assets/logo.png";

export default function QuickPractice({ onBuildRoadmap, onBack, onOpenAgent }) {
  const [mode, setMode] = useState("interview"); // "interview" | "live"
  const [model, setModel] = useState("openrouter/free");
  const [models, setModels] = useState([
    { id: "openrouter/free", name: "Free (auto-routed)" },
  ]);

  useEffect(() => {
    api.fetchModels().then(setModels).catch(() => {});
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-base-950">
      <header className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-base-700">
        <div className="flex items-center gap-2.5 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              title="Back"
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-ink-400 hover:text-ink-100 hover:bg-base-800 transition-colors"
            >
              <ArrowLeft className="w-[18px] h-[18px]" strokeWidth={2} />
            </button>
          )}
          <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
            <img src={logo} alt="LevelUp" className="w-full h-full object-contain" />
          </div>
          <span className="font-display font-semibold text-ink-100 text-sm truncate">
            Quick practice
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center rounded-lg border border-base-600 bg-base-800/60 p-0.5">
            <button
              onClick={() => setMode("interview")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                mode === "interview"
                  ? "bg-brand-gradient text-white shadow-glow"
                  : "text-ink-400 hover:text-ink-100"
              }`}
            >
              Question bank
            </button>
            <button
              onClick={() => setMode("live")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                mode === "live"
                  ? "bg-brand-gradient text-white shadow-glow"
                  : "text-ink-400 hover:text-ink-100"
              }`}
            >
              Live mock interview
            </button>
          </div>

          {onOpenAgent && (
            <button
              onClick={onOpenAgent}
              title="Update your resume — Inbuilt Agentic AI"
              aria-label="Update your resume with the Inbuilt Agentic AI"
              className="flex items-center gap-1.5 rounded-lg border border-accent/30 bg-brand-gradient-soft hover:border-accent/60 transition-colors text-accent-soft text-xs font-medium px-2.5 sm:px-3 py-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" strokeWidth={2.25} />
              <span className="hidden sm:inline">Update resume</span>
            </button>
          )}

          <button
            onClick={onBuildRoadmap}
            className="flex items-center gap-1.5 rounded-lg border border-base-600 hover:border-brand-500/40 hover:bg-base-800 transition-colors text-ink-300 text-xs font-medium px-3 py-1.5"
          >
            Build my roadmap <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        </div>
      </header>

      {/* Mobile mode switcher */}
      <div className="sm:hidden flex items-center gap-1 px-4 py-2 border-b border-base-700 bg-base-900/40">
        <button
          onClick={() => setMode("interview")}
          className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            mode === "interview"
              ? "bg-brand-gradient text-white shadow-glow"
              : "text-ink-400 border border-base-600"
          }`}
        >
          Question bank
        </button>
        <button
          onClick={() => setMode("live")}
          className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            mode === "live"
              ? "bg-brand-gradient text-white shadow-glow"
              : "text-ink-400 border border-base-600"
          }`}
        >
          Live mock
        </button>
      </div>

      <div className="flex-1 min-h-0">
        {mode === "interview" ? (
          <InterviewPrep
            models={models}
            model={model}
            onModelChange={setModel}
            onGoLive={() => setMode("live")}
          />
        ) : (
          <LiveInterview models={models} model={model} onModelChange={setModel} />
        )}
      </div>
    </div>
  );
}
