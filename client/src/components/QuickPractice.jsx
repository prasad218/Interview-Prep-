import { useEffect, useState } from "react";
import * as api from "../api/client.js";
import InterviewPrep from "./InterviewPrep.jsx";
import LiveInterview from "./LiveInterview.jsx";
import logo from "../assets/logo.png";

export default function QuickPractice({ onBuildRoadmap }) {
  const [mode, setMode] = useState("interview"); // "interview" | "live"
  const [model, setModel] = useState("openai/gpt-4o-mini");
  const [models, setModels] = useState([
    { id: "openai/gpt-4o-mini", name: "GPT-4o mini" },
  ]);

  useEffect(() => {
    api.fetchModels().then(setModels).catch(() => {});
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-base-950">
      <header className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-base-700">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
            <img src={logo} alt="Interview Prep" className="w-full h-full object-contain" />
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

          <button
            onClick={onBuildRoadmap}
            className="rounded-lg border border-base-600 hover:border-brand-500/40 hover:bg-base-800 transition-colors text-ink-300 text-xs font-medium px-3 py-1.5"
          >
            Build my roadmap →
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
