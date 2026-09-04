import ModelSelector from "./ModelSelector.jsx";

export default function Header({
  title,
  sidebarOpen,
  onToggleSidebar,
  models,
  model,
  onModelChange,
  showModelSelector,
  view,
  onViewChange,
}) {
  return (
    <header className="shrink-0 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-3 sm:px-4 py-2 md:h-14 md:py-0 border-b border-base-700 glass-panel">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="text-ink-300 hover:text-ink-100 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-base-800 transition-colors shrink-0"
          title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          ☰
        </button>
        <h2 className="font-display font-semibold text-sm text-ink-100 truncate">
          {title || "Chat Startup"}
        </h2>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 min-w-0 overflow-x-auto no-scrollbar">
        {onViewChange && (
          <div className="flex items-center shrink-0 bg-base-800 border border-base-600 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => onViewChange("chat")}
              className={`px-2.5 sm:px-3 py-1.5 rounded-md whitespace-nowrap transition-all ${
                view === "chat"
                  ? "bg-brand-gradient text-white shadow-glow-sm"
                  : "text-ink-300 hover:text-ink-100"
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => onViewChange("interview")}
              className={`px-2.5 sm:px-3 py-1.5 rounded-md whitespace-nowrap transition-all ${
                view === "interview"
                  ? "bg-brand-gradient text-white shadow-glow-sm"
                  : "text-ink-300 hover:text-ink-100"
              }`}
            >
              <span className="hidden sm:inline">Interview Prep</span>
              <span className="sm:hidden">Prep</span>
            </button>
            <button
              onClick={() => onViewChange("live")}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md whitespace-nowrap transition-all ${
                view === "live"
                  ? "bg-brand-gradient text-white shadow-glow-sm"
                  : "text-ink-300 hover:text-ink-100"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  view === "live" ? "bg-white" : "bg-signal-rose"
                } animate-pulseDot`}
              />
              <span className="hidden sm:inline">Live Interview</span>
              <span className="sm:hidden">Live</span>
            </button>
          </div>
        )}
        {showModelSelector && (
          <ModelSelector models={models} value={model} onChange={onModelChange} />
        )}
      </div>
    </header>
  );
}
