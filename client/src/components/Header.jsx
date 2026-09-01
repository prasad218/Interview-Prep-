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
    <header className="h-14 shrink-0 flex items-center justify-between gap-3 px-4 border-b border-base-700 glass-panel">
      <div className="flex items-center gap-3 min-w-0">
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

      <div className="flex items-center gap-3">
        {onViewChange && (
          <div className="flex items-center bg-base-800 border border-base-600 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => onViewChange("chat")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                view === "chat"
                  ? "bg-brand-gradient text-white shadow-glow-sm"
                  : "text-ink-300 hover:text-ink-100"
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => onViewChange("interview")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                view === "interview"
                  ? "bg-brand-gradient text-white shadow-glow-sm"
                  : "text-ink-300 hover:text-ink-100"
              }`}
            >
              Interview Prep
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
