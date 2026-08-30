import { useState } from "react";

function formatDate(iso) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
  onRename,
  open,
}) {
  const [editingId, setEditingId] = useState(null);
  const [draftTitle, setDraftTitle] = useState("");

  const startEdit = (c) => {
    setEditingId(c.id);
    setDraftTitle(c.title);
  };

  const commitEdit = () => {
    if (editingId && draftTitle.trim()) {
      onRename(editingId, draftTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <aside
      className={`${
        open ? "w-72" : "w-0"
      } shrink-0 overflow-hidden transition-[width] duration-200 bg-base-900 border-r border-base-700 flex flex-col`}
    >
      <div className="w-72 flex flex-col h-full">
        <div className="p-3">
          <button
            onClick={onNewChat}
            className="w-full flex items-center gap-2 rounded-xl border border-base-600 bg-base-800 hover:bg-base-700 transition-colors px-3 py-2.5 text-sm font-medium text-ink-100"
          >
            <span className="text-accent-soft text-base leading-none">＋</span>
            New chat
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
          {conversations.length === 0 && (
            <p className="text-ink-500 text-xs px-3 py-6 text-center">
              No conversations yet. Start one above.
            </p>
          )}

          {conversations.map((c) => (
            <div
              key={c.id}
              className={`group relative rounded-lg px-3 py-2 cursor-pointer text-sm transition-colors ${
                c.id === activeId
                  ? "bg-base-700 text-ink-100"
                  : "text-ink-300 hover:bg-base-800"
              }`}
              onClick={() => onSelect(c.id)}
            >
              {editingId === c.id ? (
                <input
                  autoFocus
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitEdit();
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full bg-base-950 border border-accent rounded px-1.5 py-0.5 text-sm outline-none"
                />
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{c.title || "New chat"}</span>
                  <span className="hidden group-hover:flex items-center gap-1 shrink-0">
                    <button
                      title="Rename"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(c);
                      }}
                      className="text-ink-500 hover:text-ink-100 px-1"
                    >
                      ✎
                    </button>
                    <button
                      title="Delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(c.id);
                      }}
                      className="text-ink-500 hover:text-signal-rose px-1"
                    >
                      ✕
                    </button>
                  </span>
                </div>
              )}
              <span className="block text-[11px] text-ink-500 mt-0.5">
                {formatDate(c.updatedAt)}
              </span>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-base-700">
          <p className="text-[11px] text-ink-500 leading-relaxed">
            Powered by <span className="text-ink-300">OpenRouter</span> — swap
            models per chat, one API key for all of them.
          </p>
        </div>
      </div>
    </aside>
  );
}
