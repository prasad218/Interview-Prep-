import { useMemo, useState } from "react";
import * as api from "../api/client.js";

function PhaseCard({ phase, completedSet, onToggle }) {
  const [open, setOpen] = useState(true);
  const total = phase.schedule?.length || 0;
  const done = (phase.schedule || []).filter((s) => completedSet.has(s.rangeLabel)).length;

  return (
    <div className="rounded-2xl border border-base-600 bg-base-900 shadow-card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-accent/40 text-accent-soft bg-brand-gradient-soft">
              Day {phase.dayStart}–{phase.dayEnd}
            </span>
            {total > 0 && (
              <span className="text-[10px] text-ink-500">
                {done}/{total} done
              </span>
            )}
          </div>
          <p className="font-display font-semibold text-sm text-ink-100">{phase.title}</p>
        </div>
        <span className="text-ink-500 text-xs shrink-0">{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <div className="border-t border-base-700 px-5 py-4 space-y-3">
          {phase.summary && (
            <p className="text-xs text-ink-500 leading-relaxed">{phase.summary}</p>
          )}
          <div className="space-y-2">
            {(phase.schedule || []).map((block, i) => {
              const isDone = completedSet.has(block.rangeLabel);
              return (
                <div
                  key={i}
                  className={`rounded-xl border px-3 py-2.5 transition-colors ${
                    isDone
                      ? "border-signal-teal/30 bg-signal-teal/5"
                      : "border-base-600 bg-base-800/50"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <button
                      onClick={() => onToggle(block.rangeLabel, !isDone)}
                      className={`shrink-0 mt-0.5 w-4 h-4 rounded border flex items-center justify-center text-[10px] transition-colors ${
                        isDone
                          ? "bg-signal-teal border-signal-teal text-base-950"
                          : "border-base-500 text-transparent hover:border-accent"
                      }`}
                      aria-label={isDone ? "Mark incomplete" : "Mark complete"}
                    >
                      ✓
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-xs font-medium text-ink-100">
                          {block.rangeLabel}
                        </span>
                        <span className="text-[11px] text-ink-500">· {block.focus}</span>
                      </div>
                      <ul className="mt-1 space-y-0.5">
                        {(block.tasks || []).map((t, ti) => (
                          <li key={ti} className="text-xs text-ink-300 flex gap-1.5">
                            <span className="text-ink-500">•</span>
                            <span className={isDone ? "line-through text-ink-500" : ""}>{t}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function CompanyTrackCard({ track, onTakeTest }) {
  return (
    <div className="rounded-2xl border border-base-600 bg-base-900 shadow-card p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="font-display font-semibold text-sm text-ink-100">{track.company}</h3>
        <button
          onClick={() => onTakeTest(track.company)}
          className="text-xs font-medium text-accent-soft hover:text-white border border-accent/40 hover:bg-brand-gradient rounded-lg px-3 py-1.5 transition-colors shrink-0"
        >
          Take {track.company} test →
        </button>
      </div>
      <div className="space-y-3">
        {(track.rounds || []).map((r, i) => (
          <div key={i} className="border-l-2 border-accent-dim pl-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-ink-100">{r.name}</span>
              {r.typicalTiming && (
                <span className="text-[10px] text-ink-500">· {r.typicalTiming}</span>
              )}
            </div>
            <p className="text-xs text-ink-300 mt-0.5 leading-relaxed">{r.description}</p>
            {r.prepTips?.length > 0 && (
              <ul className="mt-1 space-y-0.5">
                {r.prepTips.map((tip, ti) => (
                  <li key={ti} className="text-[11px] text-ink-500 flex gap-1.5">
                    <span>→</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      {track.note && (
        <p className="text-[11px] text-ink-500 italic mt-3 border-t border-base-700 pt-2">
          {track.note}
        </p>
      )}
    </div>
  );
}

export default function Roadmap({ roadmap, onRoadmapChange, onGoTest, onEditProfile }) {
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState(null);
  const completedSet = useMemo(
    () => new Set(roadmap.completedRanges || []),
    [roadmap.completedRanges]
  );

  const totalBlocks = roadmap.phases?.reduce((n, p) => n + (p.schedule?.length || 0), 0) || 0;
  const doneBlocks = completedSet.size;
  const pct = totalBlocks ? Math.round((doneBlocks / totalBlocks) * 100) : 0;

  const handleToggle = async (rangeLabel, completed) => {
    // Optimistic update
    const nextSet = new Set(completedSet);
    if (completed) nextSet.add(rangeLabel);
    else nextSet.delete(rangeLabel);
    onRoadmapChange({ ...roadmap, completedRanges: [...nextSet] });
    try {
      await api.setRoadmapProgress(rangeLabel, completed);
    } catch {
      // Non-critical — leave the optimistic state as-is rather than jarring the UI.
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    setError(null);
    try {
      const { roadmap: fresh } = await api.generateRoadmap();
      onRoadmapChange(fresh);
    } catch (e) {
      setError(e.message);
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display font-bold text-xl text-gradient-brand">
              Your Prep Roadmap
            </h1>
            <p className="text-sm text-ink-500 mt-1 max-w-xl leading-relaxed">
              {roadmap.overview}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onEditProfile}
              className="text-xs text-ink-300 hover:text-ink-100 border border-base-600 hover:border-accent-dim rounded-lg px-3 py-2 transition-colors"
            >
              Edit details
            </button>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="text-xs font-medium text-white bg-brand-gradient hover:opacity-90 disabled:opacity-50 rounded-lg px-3 py-2 transition-opacity"
            >
              {regenerating ? "Regenerating…" : "↻ Regenerate"}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-signal-rose/10 border border-signal-rose/30 text-signal-rose text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            ["Target role", roadmap.targetRole],
            ["Timeline", `${roadmap.totalDays} days`],
            ["Daily study", `${roadmap.dailyHours}h/day`],
            ["Progress", `${pct}%`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-base-600 bg-base-900 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-ink-500">{label}</p>
              <p className="text-sm font-semibold text-ink-100 truncate mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        {totalBlocks > 0 && (
          <div className="h-1.5 rounded-full bg-base-700 overflow-hidden">
            <div
              className="h-full bg-brand-gradient rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}

        {/* Phases */}
        <div className="space-y-3">
          {(roadmap.phases || []).map((phase, i) => (
            <PhaseCard key={i} phase={phase} completedSet={completedSet} onToggle={handleToggle} />
          ))}
        </div>

        {/* Company tracks */}
        {roadmap.companyTracks?.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-display font-semibold text-base text-ink-100">
              Company-specific tracks
            </h2>
            {roadmap.companyTracks.map((track, i) => (
              <CompanyTrackCard key={i} track={track} onTakeTest={(c) => onGoTest(c)} />
            ))}
          </div>
        )}

        <div className="rounded-2xl border border-accent/30 bg-brand-gradient-soft p-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-display font-semibold text-sm text-ink-100">
              Ready to test yourself?
            </p>
            <p className="text-xs text-ink-300 mt-0.5">
              Take a readiness test for {roadmap.targetRole} and earn a certificate.
            </p>
          </div>
          <button
            onClick={() => onGoTest()}
            className="rounded-xl bg-brand-gradient hover:opacity-90 shadow-glow-sm transition-opacity px-4 py-2.5 text-sm font-semibold text-white shrink-0"
          >
            Go to Test Center →
          </button>
        </div>
      </div>
    </div>
  );
}
