import { useCallback, useEffect, useState } from "react";
import * as api from "../api/client.js";
import { getAdminSecret, setAdminSecret } from "../api/adminAuth.js";
import logo from "../assets/logo.png";

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// ------------------------------------------------------------------ Icons
// Small inline strokes (no icon library needed) — consistent 1.75 stroke,
// currentColor so they inherit whatever text color they sit in.

function IconTicket(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Z" />
      <path d="M13 5v2M13 17v2M13 10.5v3" />
    </svg>
  );
}

function IconCheckCircle(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.3 2.3L15.5 10" />
    </svg>
  );
}

function IconClock(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.2 2" />
    </svg>
  );
}

function IconSparkle(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
    </svg>
  );
}

function IconCopy(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

function IconLogout(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

function IconInbox(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 12h4.5l1.5 3h6l1.5-3H21" />
      <path d="M5.5 6h13a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

function IconLock(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

// ------------------------------------------------------------------ Login

function AdminLoginForm({ onSuccess, onExit }) {
  const [secret, setSecret] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!secret.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.adminLogin(secret.trim());
      setAdminSecret(secret.trim());
      onSuccess(secret.trim());
    } catch (e2) {
      setError(e2.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex items-center justify-center bg-base-950 text-ink-100 p-6">
      <div className="absolute inset-0 bg-aurora opacity-60 pointer-events-none" />

      <div className="relative w-full max-w-sm animate-fadeIn">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-gradient shadow-glow flex items-center justify-center mb-4">
            <IconLock className="w-6 h-6 text-white" />
          </div>
          <h2 className="font-display font-bold text-xl">Admin access</h2>
          <p className="text-sm text-ink-500 mt-1.5 max-w-[26ch]">
            Enter the admin password to see redemptions and generate codes.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-base-600 bg-base-900 shadow-card p-5 space-y-3.5"
        >
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="••••••••••"
              autoFocus
              className="w-full bg-base-800 border border-base-600 rounded-lg px-3 py-2.5 text-sm text-ink-100 placeholder:text-ink-500 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-shadow"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-signal-rose/10 border border-signal-rose/30 text-signal-rose text-xs rounded-lg px-3 py-2.5">
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !secret.trim()}
            className="w-full rounded-xl bg-brand-gradient hover:opacity-90 shadow-glow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-opacity px-4 py-2.5 text-sm font-semibold text-white"
          >
            {submitting ? "Checking…" : "Sign in"}
          </button>
        </form>

        <button
          onClick={onExit}
          className="w-full text-center text-xs text-ink-500 hover:text-ink-100 transition-colors mt-6"
        >
          ← Back to candidate sign in
        </button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------- Dashboard

function StatCard({ icon, value, label, tone }) {
  const toneClasses = {
    ink: "bg-base-800 text-ink-100",
    teal: "bg-signal-teal/15 text-signal-teal",
    amber: "bg-signal-amber/15 text-signal-amber",
  };
  return (
    <div className="rounded-xl sm:rounded-2xl border border-base-600 bg-base-900 shadow-card p-3.5 sm:p-4 flex items-start gap-3">
      <div className={`shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center ${toneClasses[tone]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-lg sm:text-2xl font-display font-bold text-ink-100 leading-none">
          {value}
        </p>
        <p className="text-[11px] sm:text-xs text-ink-500 mt-1 leading-tight">{label}</p>
      </div>
    </div>
  );
}

function StatusPill({ used }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
        used
          ? "bg-signal-teal/15 text-signal-teal border-signal-teal/30"
          : "bg-signal-amber/15 text-signal-amber border-signal-amber/30"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${used ? "bg-signal-teal" : "bg-signal-amber"}`} />
      {used ? "Redeemed" : "Unused"}
    </span>
  );
}

function SkeletonRow() {
  return (
    <div className="px-4 py-3.5 flex items-center gap-3">
      <div className="h-3.5 w-28 rounded bg-base-700 animate-pulse" />
      <div className="h-4 w-16 rounded-full bg-base-700 animate-pulse" />
      <div className="h-3.5 flex-1 rounded bg-base-700 animate-pulse" />
    </div>
  );
}

function AdminDashboard({ secret, onLogout }) {
  const [codes, setCodes] = useState([]);
  const [summary, setSummary] = useState({ total: 0, redeemed: 0, unredeemed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [newCode, setNewCode] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.fetchRedemptions(secret);
      setCodes(res.codes);
      setSummary(res.summary);
    } catch (e) {
      if (e.status === 401) {
        setAdminSecret(null);
        onLogout();
        return;
      }
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [secret, onLogout]);

  useEffect(() => {
    load();
  }, [load]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await api.adminGenerateCode(secret);
      setNewCode(res.code);
      setCopied(false);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!newCode) return;
    try {
      await navigator.clipboard.writeText(newCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — code is still selectable on screen.
    }
  };

  const handleLogout = () => {
    setAdminSecret(null);
    onLogout();
  };

  return (
    <div className="min-h-screen w-full bg-base-950 text-ink-100">
      {/* Top bar */}
      <div className="sticky top-0 z-10 border-b border-base-700 bg-base-950/85 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 ring-1 ring-base-600">
              <img src={logo} alt="Interview Prep" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display font-bold text-sm sm:text-base leading-tight truncate">
                Admin Dashboard
              </h1>
              <p className="text-[11px] sm:text-xs text-ink-500 truncate">
                Payment code redemptions
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-ink-300 hover:text-ink-100 border border-base-600 hover:border-accent-dim rounded-lg px-2.5 sm:px-3 py-1.5 transition-colors"
          >
            <IconLogout className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-5 sm:py-8 animate-fadeIn">
        {error && (
          <div className="bg-signal-rose/10 border border-signal-rose/30 text-signal-rose text-sm rounded-xl px-4 py-3 mb-5">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5 sm:mb-6">
          <StatCard
            icon={<IconTicket className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />}
            value={summary.total}
            label="Codes generated"
            tone="ink"
          />
          <StatCard
            icon={<IconCheckCircle className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />}
            value={summary.redeemed}
            label="Redeemed"
            tone="teal"
          />
          <StatCard
            icon={<IconClock className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />}
            value={summary.unredeemed}
            label="Waiting"
            tone="amber"
          />
        </div>

        {/* Generate code */}
        <div className="relative overflow-hidden rounded-2xl border border-accent/30 bg-brand-gradient-soft p-4 sm:p-5 mb-5 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-9 h-9 rounded-lg bg-base-900/60 border border-accent/30 flex items-center justify-center text-accent-soft">
                <IconSparkle className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink-100">Verified a payment?</p>
                <p className="text-xs text-ink-300 mt-0.5">
                  Generate a code, then email it to the candidate.
                </p>
              </div>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full sm:w-auto shrink-0 rounded-xl bg-brand-gradient hover:opacity-90 shadow-glow-sm disabled:opacity-50 transition-opacity px-4 py-2.5 sm:py-2 text-sm font-semibold text-white whitespace-nowrap"
            >
              {generating ? "Generating…" : "Generate new code"}
            </button>
          </div>
          {newCode && (
            <div className="mt-3.5 flex items-center gap-2 bg-base-900 border border-base-600 rounded-xl px-3.5 py-3 animate-fadeIn">
              <span className="font-mono text-sm sm:text-base tracking-wide sm:tracking-widest text-ink-100 select-all flex-1 min-w-0 truncate">
                {newCode}
              </span>
              <button
                onClick={handleCopy}
                className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-accent-soft hover:text-ink-100 border border-base-600 hover:border-accent-dim rounded-lg px-2.5 py-1.5 transition-colors"
              >
                <IconCopy className="w-3.5 h-3.5" />
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          )}
        </div>

        {/* Codes list */}
        <div className="rounded-2xl border border-base-600 bg-base-900 shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-base-700 flex items-center justify-between">
            <h2 className="font-display font-semibold text-sm text-ink-100">All codes</h2>
            {!loading && codes.length > 0 && (
              <span className="text-xs text-ink-500">{codes.length} total</span>
            )}
          </div>

          {loading ? (
            <div className="divide-y divide-base-700/60">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          ) : codes.length === 0 ? (
            <div className="flex flex-col items-center text-center px-4 py-10">
              <div className="w-11 h-11 rounded-full bg-base-800 flex items-center justify-center text-ink-500 mb-3">
                <IconInbox className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-ink-100">No codes yet</p>
              <p className="text-xs text-ink-500 mt-1 max-w-[28ch]">
                Codes you generate after verifying a payment will show up here.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile: stacked cards */}
              <div className="sm:hidden divide-y divide-base-700/60">
                {codes.map((c) => (
                  <div key={c.code} className="px-4 py-3.5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-ink-300 break-all">{c.code}</span>
                      <StatusPill used={c.used} />
                    </div>
                    {c.used && (
                      <div className="text-xs text-ink-500 space-y-0.5">
                        <p>
                          <span className="text-ink-100 font-medium">{c.usedByName || "—"}</span>
                          {c.usedByLoginCode && (
                            <span className="font-mono text-ink-500"> · {c.usedByLoginCode}</span>
                          )}
                        </p>
                        <p>{formatDate(c.usedAt)}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* sm+: table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-ink-500 border-b border-base-700">
                      <th className="px-4 py-2.5 font-medium">Code</th>
                      <th className="px-4 py-2.5 font-medium">Status</th>
                      <th className="px-4 py-2.5 font-medium">Redeemed by</th>
                      <th className="px-4 py-2.5 font-medium">Login code</th>
                      <th className="px-4 py-2.5 font-medium">Redeemed at</th>
                    </tr>
                  </thead>
                  <tbody>
                    {codes.map((c) => (
                      <tr
                        key={c.code}
                        className="border-b border-base-700/60 last:border-0 hover:bg-base-800/40 transition-colors"
                      >
                        <td className="px-4 py-2.5 font-mono text-xs text-ink-300 whitespace-nowrap">
                          {c.code}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <StatusPill used={c.used} />
                        </td>
                        <td className="px-4 py-2.5 text-ink-100">{c.usedByName || "—"}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-ink-500">
                          {c.usedByLoginCode || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-ink-500 whitespace-nowrap">
                          {formatDate(c.usedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Top-level admin gate: shows the login form until a valid secret is held, then the dashboard. */
export default function AdminPanel({ onExit }) {
  const [secret, setSecretState] = useState(() => getAdminSecret());

  if (!secret) {
    return <AdminLoginForm onSuccess={(s) => setSecretState(s)} onExit={onExit} />;
  }

  return <AdminDashboard secret={secret} onLogout={() => setSecretState(null)} />;
}
