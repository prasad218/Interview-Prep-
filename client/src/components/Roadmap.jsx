import { useMemo, useState } from "react";
import * as api from "../api/client.js";
import ProgressRing from "./ProgressRing.jsx";
import {
  Check,
  ChevronDown,
  RefreshCw,
  ArrowRight,
  Target,
  CalendarDays,
  Clock,
  Pencil,
} from "lucide-react";

/** One phase of the roadmap, drawn as a stop on a vertical timeline. */
function PhaseCard({ phase, index, status, isLast, completedSet, onToggle }) {
  const [open, setOpen] = useState(status === "current");
  const total = phase.schedule?.length || 0;
  const done = (phase.schedule || []).filter((s) => completedSet.has(s.rangeLabel)).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const node =
    status === "complete"
      ? "bg-signal-teal text-base-950"
      : status === "current"
      ? "bg-brand-gradient text-white shadow-glow-sm"
      : "bg-base-900 border border-base-500 text-ink-500";

  return (
    <div className="relative pl-12 pb-4 last:pb-0">
      {!isLast && (
        <span
          aria-hidden="true"
          className={`absolute left-[15px] top-9 bottom-0 w-px ${
            status === "complete" ? "bg-signal-teal/40" : "bg-base-600"
          }`}
        />
      )}
      <span
        className={`absolute left-0 top-3 w-8 h-8 rounded-full flex items-center justify-center text-xs font-display font-bold ${node}`}
      >
        {status === "complete" ? <Check className="w-4 h-4" strokeWidth={3} /> : index + 1}
      </span>

      <div
        className={`rounded-2xl border bg-base-900 shadow-card overflow-hidden transition-colors ${
          status === "current" ? "border-accent/40" : "border-base-600"
        }`}
      >
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
          aria-expanded={open}
        >
          <div className="min-w-0">
            <p className="text-[11px] text-ink-500 mb-0.5">
              Days {phase.dayStart}–{phase.dayEnd}
              {status === "current" && <span className="text-accent-soft"> · In progress</span>}
            </p>
            <p className="font-display font-semibold text-[15px] text-ink-100">{phase.title}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {total > 0 && (
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-16 h-1.5 rounded-full bg-base-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand-gradient transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[11px] text-ink-500 tabular-nums w-8 text-right">
                  {done}/{total}
                </span>
              </div>
            )}
            <ChevronDown
              className={`w-4 h-4 text-ink-500 transition-transform ${open ? "rotate-180" : ""}`}
              strokeWidth={2}
            />
          </div>
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
                    className={`rounded-xl border px-3.5 py-3 transition-colors ${
                      isDone
                        ? "border-signal-teal/30 bg-signal-teal/5"
                        : "border-base-600 bg-base-800/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => onToggle(block.rangeLabel, !isDone)}
                        className={`shrink-0 mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          isDone
                            ? "bg-signal-teal border-signal-teal text-base-950"
                            : "border-base-500 text-transparent hover:border-accent"
                        }`}
                        aria-label={isDone ? "Mark incomplete" : "Mark complete"}
                      >
                        {isDone && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2 flex-wrap mb-1">
                          <span className="text-xs font-semibold text-ink-100">
                            {block.rangeLabel}
                          </span>
                          <span className="text-[11px] text-ink-500">{block.focus}</span>
                        </div>
                        <ul className="space-y-1">
                          {(block.tasks || []).map((t, ti) => (
                            <li key={ti} className="text-xs text-ink-300 flex gap-2 leading-relaxed">
                              <span className="mt-[7px] w-1 h-1 rounded-full bg-ink-500 shrink-0" />
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
    </div>
  );
}

function CompanyTrackCard({ track, onTakeTest }) {
  return (
    <div className="rounded-2xl border border-base-600 bg-base-900 shadow-card p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="font-display font-semibold text-[15px] text-ink-100">{track.company}</h3>
        <button
          onClick={() => onTakeTest(track.company)}
          className="flex items-center gap-1.5 text-xs font-medium text-accent-soft hover:text-white border border-accent/40 hover:bg-brand-gradient rounded-lg px-3 py-1.5 transition-colors shrink-0"
        >
          Take {track.company} test <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
      </div>
      <div className="space-y-4">
        {(track.rounds || []).map((r, i) => (
          <div key={i} className="border-l-2 border-accent-dim pl-3.5">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-sm font-semibold text-ink-100">{r.name}</span>
              {r.typicalTiming && (
                <span className="text-[11px] text-ink-500">{r.typicalTiming}</span>
              )}
            </div>
            <p className="text-xs text-ink-300 mt-1 leading-relaxed">{r.description}</p>
            {r.prepTips?.length > 0 && (
              <ul className="mt-2 space-y-1">
                {r.prepTips.map((tip, ti) => (
                  <li key={ti} className="text-[11px] text-ink-500 flex gap-1.5 leading-relaxed">
                    <ArrowRight className="w-3 h-3 mt-0.5 shrink-0" strokeWidth={2} />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      {track.note && (
        <p className="text-[11px] text-ink-500 italic mt-4 border-t border-base-700 pt-3">
          {track.note}
        </p>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 min-w-0">
      <span className="w-9 h-9 rounded-lg bg-brand-gradient-soft border border-accent/20 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-accent-soft" strokeWidth={2.25} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] text-ink-500">{label}</p>
        <p className="text-sm font-semibold text-ink-100 truncate">{value}</p>
      </div>
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

  const phases = roadmap.phases || [];
  const totalBlocks = phases.reduce((n, p) => n + (p.schedule?.length || 0), 0);
  const doneBlocks = completedSet.size;
  const pct = totalBlocks ? Math.round((doneBlocks / totalBlocks) * 100) : 0;

  // A phase is complete when all its blocks are ticked; the first phase that
  // isn't complete is the one the learner is "in".
  const statuses = useMemo(() => {
    let currentAssigned = false;
    return phases.map((p) => {
      const total = p.schedule?.length || 0;
      const done = (p.schedule || []).filter((s) => completedSet.has(s.rangeLabel)).length;
      if (total > 0 && done === total) return "complete";
      if (!currentAssigned) {
        currentAssigned = true;
        return "current";
      }
      return "upcoming";
    });
  }, [phases, completedSet]);

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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="font-display font-bold text-2xl text-ink-100">Your roadmap</h1>
            <p className="text-sm text-ink-500 mt-2 max-w-xl leading-relaxed">
              {roadmap.overview}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onEditProfile}
              className="flex items-center gap-1.5 text-xs text-ink-300 hover:text-ink-100 border border-base-600 hover:border-accent-dim rounded-lg px-3 py-2 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" strokeWidth={2} /> Edit details
            </button>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="flex items-center gap-1.5 text-xs font-medium text-white bg-brand-gradient hover:opacity-90 disabled:opacity-50 rounded-lg px-3 py-2 transition-opacity"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${regenerating ? "animate-spin" : ""}`}
                strokeWidth={2}
              />
              {regenerating ? "Regenerating…" : "Regenerate"}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-signal-rose/10 border border-signal-rose/30 text-signal-rose text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* Summary */}
        <div className="rounded-2xl border border-base-600 bg-base-900 bg-aurora shadow-card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex items-center gap-5">
            <ProgressRing pct={pct} size={112} stroke={8} id="roadmap">
              <span className="font-display font-extrabold text-2xl text-ink-100 leading-none">
                {pct}%
              </span>
              <span className="text-[10px] text-ink-500 mt-1">complete</span>
            </ProgressRing>
            <div className="sm:hidden">
              <p className="text-sm font-semibold text-ink-100">
                {doneBlocks} of {totalBlocks}
              </p>
              <p className="text-[11px] text-ink-500">study blocks done</p>
            </div>
          </div>
          <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Stat icon={Target} label="Target role" value={roadmap.targetRole} />
            <Stat icon={CalendarDays} label="Timeline" value={`${roadmap.totalDays} days`} />
            <Stat icon={Clock} label="Daily study" value={`${roadmap.dailyHours}h a day`} />
          </div>
        </div>

        {/* Phases */}
        <section>
          <h2 className="font-display font-semibold text-base text-ink-100 mb-4">
            Your plan{totalBlocks > 0 && (
              <span className="text-ink-500 font-normal text-sm">
                {" "}
                · {doneBlocks} of {totalBlocks} blocks done
              </span>
            )}
          </h2>
          <div>
            {phases.map((phase, i) => (
              <PhaseCard
                key={i}
                phase={phase}
                index={i}
                status={statuses[i]}
                isLast={i === phases.length - 1}
                completedSet={completedSet}
                onToggle={handleToggle}
              />
            ))}
          </div>
        </section>

        {/* Company tracks */}
        {roadmap.companyTracks?.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display font-semibold text-base text-ink-100">
              Company-specific tracks
            </h2>
            {roadmap.companyTracks.map((track, i) => (
              <CompanyTrackCard key={i} track={track} onTakeTest={(c) => onGoTest(c)} />
            ))}
          </section>
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
            className="flex items-center gap-2 rounded-xl bg-brand-gradient hover:opacity-90 shadow-glow-sm transition-opacity px-4 py-2.5 text-sm font-semibold text-white shrink-0"
          >
            Go to Test Center <ArrowRight className="w-4 h-4" strokeWidth={2.25} />
          </button>
        </div>
      </div>
    </div>
  );
}
