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
    <div className="min-h-screen w-full flex items-center justify-center bg-base-950 text-ink-100 p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0">
            <img src={logo} alt="Interview Prep" className="w-full h-full object-contain" />
          </div>
          <span className="font-display font-bold text-lg">Interview Prep</span>
        </div>

        <h2 className="font-display font-bold text-xl mb-1 text-center">Admin login</h2>
        <p className="text-sm text-ink-500 mb-6 text-center">
          Enter the admin secret to see who's redeemed a code.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Admin secret"
            autoFocus
            className="w-full bg-base-800 border border-base-600 rounded-lg px-3 py-2.5 text-sm text-ink-100 placeholder:text-ink-500 outline-none focus:border-accent"
          />
          {error && (
            <div className="bg-signal-rose/10 border border-signal-rose/30 text-signal-rose text-xs rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting || !secret.trim()}
            className="w-full rounded-xl bg-brand-gradient hover:opacity-90 shadow-glow-sm disabled:opacity-50 transition-opacity px-4 py-2.5 text-sm font-semibold text-white"
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
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-5 sm:py-10">
        <div className="flex items-start sm:items-center justify-between gap-3 mb-6 sm:mb-8">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0">
              <img src={logo} alt="Interview Prep" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display font-bold text-base sm:text-lg leading-tight truncate">
                Admin Dashboard
              </h1>
              <p className="text-xs text-ink-500 truncate">Payment code redemptions</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="shrink-0 text-xs font-medium text-ink-300 hover:text-ink-100 border border-base-600 hover:border-accent-dim rounded-lg px-3 py-1.5 transition-colors"
          >
            Log out
          </button>
        </div>

        {error && (
          <div className="bg-signal-rose/10 border border-signal-rose/30 text-signal-rose text-sm rounded-xl px-4 py-3 mb-5">
            {error}
          </div>
        )}

        {/* Summary + generate */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5 sm:mb-6">
          <div className="rounded-xl sm:rounded-2xl border border-base-600 bg-base-900 shadow-card p-3 sm:p-4">
            <p className="text-lg sm:text-2xl font-display font-bold text-ink-100">
              {summary.total}
            </p>
            <p className="text-[11px] sm:text-xs text-ink-500 mt-0.5">Codes generated</p>
          </div>
          <div className="rounded-xl sm:rounded-2xl border border-base-600 bg-base-900 shadow-card p-3 sm:p-4">
            <p className="text-lg sm:text-2xl font-display font-bold text-signal-teal">
              {summary.redeemed}
            </p>
            <p className="text-[11px] sm:text-xs text-ink-500 mt-0.5">Redeemed</p>
          </div>
          <div className="rounded-xl sm:rounded-2xl border border-base-600 bg-base-900 shadow-card p-3 sm:p-4">
            <p className="text-lg sm:text-2xl font-display font-bold text-signal-amber">
              {summary.unredeemed}
            </p>
            <p className="text-[11px] sm:text-xs text-ink-500 mt-0.5">Waiting</p>
          </div>
        </div>

        <div className="rounded-2xl border border-accent/30 bg-brand-gradient-soft p-4 mb-5 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink-100">Verified a payment?</p>
              <p className="text-xs text-ink-300 mt-0.5">
                Generate a code, then email it to the candidate.
              </p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full sm:w-auto rounded-xl bg-brand-gradient hover:opacity-90 shadow-glow-sm disabled:opacity-50 transition-opacity px-4 py-2.5 sm:py-2 text-sm font-semibold text-white whitespace-nowrap"
            >
              {generating ? "Generating…" : "Generate new code"}
            </button>
          </div>
          {newCode && (
            <div className="mt-3 flex items-center gap-2 bg-base-900 border border-base-600 rounded-lg px-3 py-2.5">
              <span className="font-mono text-sm tracking-wide sm:tracking-widest text-ink-100 select-all flex-1 min-w-0 truncate">
                {newCode}
              </span>
              <button
                onClick={handleCopy}
                className="text-xs font-medium text-accent-soft hover:text-ink-100 transition-colors shrink-0"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          )}
        </div>

        {/* Codes: table on sm+, stacked cards on mobile */}
        <div className="rounded-2xl border border-base-600 bg-base-900 shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-base-700">
            <h2 className="font-display font-semibold text-sm text-ink-100">
              All codes
            </h2>
          </div>
          {loading ? (
            <p className="text-sm text-ink-500 px-4 py-6 text-center">Loading…</p>
          ) : codes.length === 0 ? (
            <p className="text-sm text-ink-500 px-4 py-6 text-center">
              No codes generated yet.
            </p>
          ) : (
            <>
              {/* Mobile: stacked cards */}
              <div className="sm:hidden divide-y divide-base-700/60">
                {codes.map((c) => (
                  <div key={c.code} className="px-4 py-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-ink-300 break-all">
                        {c.code}
                      </span>
                      <span
                        className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                          c.used
                            ? "bg-signal-teal/15 text-signal-teal border-signal-teal/30"
                            : "bg-signal-amber/15 text-signal-amber border-signal-amber/30"
                        }`}
                      >
                        {c.used ? "Redeemed" : "Unused"}
                      </span>
                    </div>
                    {c.used && (
                      <div className="text-xs text-ink-500 flex flex-wrap gap-x-3 gap-y-0.5">
                        <span className="text-ink-100">{c.usedByName || "—"}</span>
                        <span className="font-mono">{c.usedByLoginCode || "—"}</span>
                        <span>{formatDate(c.usedAt)}</span>
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
                      <tr key={c.code} className="border-b border-base-700/60 last:border-0">
                        <td className="px-4 py-2.5 font-mono text-xs text-ink-300 whitespace-nowrap">
                          {c.code}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                              c.used
                                ? "bg-signal-teal/15 text-signal-teal border-signal-teal/30"
                                : "bg-signal-amber/15 text-signal-amber border-signal-amber/30"
                            }`}
                          >
                            {c.used ? "Redeemed" : "Unused"}
                          </span>
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
    return (
      <AdminLoginForm onSuccess={(s) => setSecretState(s)} onExit={onExit} />
    );
  }

  return <AdminDashboard secret={secret} onLogout={() => setSecretState(null)} />;
}
