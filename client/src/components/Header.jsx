import ModelSelector from "./ModelSelector.jsx";

const TABS = [
  { key: "roadmap", label: "Roadmap", short: "Roadmap" },
  { key: "interview", label: "Question Bank", short: "Bank" },
  { key: "live", label: "Live Interview", short: "Live", dot: true },
  { key: "test", label: "Test Center", short: "Test" },
  { key: "chat", label: "Chat", short: "Chat" },
];

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
          {title || "Interview Prep"}
        </h2>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 min-w-0 overflow-x-auto no-scrollbar">
        {onViewChange && (
          <div className="flex items-center shrink-0 bg-base-800 border border-base-600 rounded-lg p-0.5 text-xs">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => onViewChange(tab.key)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md whitespace-nowrap transition-all ${
                  view === tab.key
                    ? "bg-brand-gradient text-white shadow-glow-sm"
                    : "text-ink-300 hover:text-ink-100"
                }`}
              >
                {tab.dot && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      view === tab.key ? "bg-white" : "bg-signal-rose"
                    } animate-pulseDot`}
                  />
                )}
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.short}</span>
              </button>
            ))}
          </div>
        )}
        {showModelSelector && (
          <ModelSelector models={models} value={model} onChange={onModelChange} />
        )}
      </div>
    </header>
  );
}
