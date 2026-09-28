import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import * as api from "../api/client.js";
import { setToken } from "../api/authToken.js";
import logo from "../assets/logo.png";
import ProgressRing from "./ProgressRing.jsx";
import { Map, Mic, Building2, Award, KeyRound, Check } from "lucide-react";

const FEATURES = [
  {
    icon: Map,
    title: "Personalized roadmap",
    short: "Day-by-day plan from your resume",
    body: "Upload your resume once — get a day-by-day plan built around your timeline and daily study hours.",
  },
  {
    icon: Mic,
    title: "Live mock interviews",
    short: "An AI interviewer that asks follow-ups",
    body: "Practice with an AI interviewer that asks follow-ups based on your actual answers, not a script.",
  },
  {
    icon: Building2,
    title: "Company-specific prep",
    short: "Rounds and tests for your targets",
    body: "Tell us which companies you're targeting — get their typical rounds and tailored tests.",
  },
  {
    icon: Award,
    title: "Certificates that prove it",
    short: "Earn one when you pass a test",
    body: "Clear a readiness test and download a certificate + badge to show your preparation.",
  },
];

/** Static illustration of the real product, shown beside the sign-in form. */
function ProductPreview() {
  const rows = [
    { range: "Days 1–7", label: "Data structures", state: "done" },
    { range: "Days 8–14", label: "System design basics", state: "current" },
    { range: "Days 15–21", label: "Mock interviews", state: "next" },
  ];
  return (
    <div aria-hidden="true" className="relative w-full max-w-md h-[310px] select-none">
      <div className="absolute left-0 top-0 w-[88%] rounded-2xl border border-base-600 bg-base-900/90 backdrop-blur shadow-card p-4">
        <div className="flex items-center gap-4">
          <ProgressRing pct={64} id="preview">
            <span className="font-display font-bold text-[13px] text-ink-100">64%</span>
          </ProgressRing>
          <div className="min-w-0">
            <p className="text-[11px] text-ink-500">Your roadmap</p>
            <p className="font-display font-semibold text-sm text-ink-100 truncate">
              Backend Engineer · 30 days
            </p>
          </div>
        </div>
        <ul className="mt-4 space-y-2.5">
          {rows.map((r) => (
            <li key={r.range} className="flex items-center gap-2.5 text-xs">
              {r.state === "done" && (
                <span className="w-4 h-4 rounded-full bg-signal-teal flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 text-base-950" strokeWidth={3.5} />
                </span>
              )}
              {r.state === "current" && (
                <span className="w-4 h-4 rounded-full bg-brand-gradient shadow-glow-sm shrink-0" />
              )}
              {r.state === "next" && (
                <span className="w-4 h-4 rounded-full border border-base-500 shrink-0" />
              )}
              <span className={r.state === "next" ? "text-ink-500" : "text-ink-100"}>
                {r.label}
              </span>
              <span className="ml-auto text-ink-500 tabular-nums">{r.range}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="absolute right-0 bottom-0 w-[80%] rounded-2xl border border-accent/30 bg-base-850/95 backdrop-blur shadow-glow p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-signal-rose animate-pulseDot" />
          <p className="text-[11px] text-ink-500">Live interview</p>
        </div>
        <p className="text-[13px] text-ink-100 leading-snug">
          Walk me through a time you had to scale a slow service.
        </p>
        <div className="mt-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] text-accent-soft">
            <Mic className="w-3.5 h-3.5" strokeWidth={2.25} /> Listening…
          </span>
          <span className="text-[11px] font-semibold text-signal-teal bg-signal-teal/10 border border-signal-teal/30 rounded-full px-2 py-0.5">
            Clarity 82
          </span>
        </div>
      </div>
    </div>
  );
}

/** Shown once, right after signup, so the user can save the only credential
 * that gets them back into their (email-less) account from another device. */
function SavedCodeScreen({ code, onContinue }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — the code is still selectable/visible.
    }
  };

  return (
    <div className="w-full max-w-sm text-center">
      <div className="w-14 h-14 rounded-2xl bg-brand-gradient shadow-glow mx-auto mb-5 flex items-center justify-center">
        <KeyRound className="w-6 h-6 text-white" strokeWidth={2.25} />
      </div>
      <h2 className="font-display font-bold text-xl mb-2">Save your login code</h2>
      <p className="text-sm text-ink-500 mb-6 leading-relaxed">
        This code plus your password is how you'll sign back in — from this
        browser or any other device. We don't collect an email, so if you
        lose the code, there's no way to recover the account.
      </p>
      <div className="bg-base-800 border border-base-600 rounded-xl px-4 py-4 mb-4">
        <p className="font-mono text-2xl tracking-widest text-gradient-brand font-bold select-all">
          {code}
        </p>
      </div>
      <button
        onClick={handleCopy}
        className="w-full rounded-xl border border-base-600 hover:border-accent transition-colors px-4 py-2.5 text-sm font-semibold text-ink-100 mb-3"
      >
        {copied ? "Copied!" : "Copy code"}
      </button>
      <button
        onClick={onContinue}
        className="w-full rounded-xl bg-brand-gradient hover:opacity-90 shadow-glow-sm transition-opacity px-4 py-2.5 text-sm font-semibold text-white"
      >
        I've saved it — continue
      </button>
    </div>
  );
}

export default function AuthScreen({ onAdminLogin }) {
  const { login, setUser } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [loginCode, setLoginCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingSignup, setPendingSignup] = useState(null); // { token, user } awaiting confirmation

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signup") {
        if (password !== confirmPassword) {
          throw new Error("Passwords don't match.");
        }
        const { token, user } = await api.signup({ password });
        setPendingSignup({ token, user });
      } else {
        await login({ loginCode: loginCode.trim(), password });
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const finishSignup = () => {
    if (!pendingSignup) return;
    setToken(pendingSignup.token);
    setUser(pendingSignup.user);
  };

  if (pendingSignup) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-base-950 text-ink-100 p-6">
        <SavedCodeScreen code={pendingSignup.user.loginCode} onContinue={finishSignup} />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex bg-base-950 text-ink-100">
      {/* Hero panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-aurora border-r border-base-700 flex-col justify-between gap-10 p-12 xl:p-14">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 shadow-glow-sm">
            <img src={logo} alt="LevelUp" className="w-full h-full object-contain" />
          </div>
          <span className="font-display font-extrabold text-2xl tracking-tight">
            <span className="text-ink-100">Level</span>
            <span className="text-gradient-brand">Up</span>
          </span>
        </div>

        <div>
          <h1 className="font-display font-extrabold text-5xl xl:text-6xl leading-[1.05] max-w-lg text-ink-100">
            Make your move.
          </h1>
          <p className="text-ink-300 text-base mt-5 max-w-md leading-relaxed">
            Upload your resume once. Get a day-by-day roadmap, live AI mock
            interviews and company-specific tests, plus a certificate when
            you're ready.
          </p>
          <div className="mt-10">
            <ProductPreview />
          </div>
        </div>

        <div>
          <ul className="grid grid-cols-2 gap-x-8 gap-y-4 max-w-lg">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-start gap-2.5">
                <f.icon className="w-4 h-4 mt-0.5 text-accent-soft shrink-0" strokeWidth={2.25} />
                <span className="text-xs text-ink-500 leading-snug">
                  <span className="block font-semibold text-ink-100 text-[13px]">{f.title}</span>
                  {f.short}
                </span>
              </li>
            ))}
          </ul>
          <div className="brand-badge w-fit mt-8">
            <span className="brand-dot" />
            A product from <span className="brand-name">Aakara.AI</span>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex flex-col items-center gap-1.5 mb-8">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 shadow-glow-sm">
                <img src={logo} alt="LevelUp" className="w-full h-full object-contain" />
              </div>
              <span className="font-display font-extrabold text-2xl tracking-tight">
                <span className="text-ink-100">Level</span>
                <span className="text-gradient-brand">Up</span>
              </span>
            </div>
            <p className="text-sm text-ink-500">Make your move.</p>
          </div>

          <div className="flex items-center bg-base-800 border border-base-600 rounded-xl p-1 mb-6 text-sm">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                mode === "login"
                  ? "bg-brand-gradient text-white shadow-glow-sm"
                  : "text-ink-300 hover:text-ink-100"
              }`}
            >
              Sign in
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                mode === "signup"
                  ? "bg-brand-gradient text-white shadow-glow-sm"
                  : "text-ink-300 hover:text-ink-100"
              }`}
            >
              Create account
            </button>
          </div>

          <h2 className="font-display font-bold text-xl mb-1">
            {mode === "login" ? "Welcome back" : "Start your prep"}
          </h2>
          <p className="text-sm text-ink-500 mb-6">
            {mode === "login"
              ? "Enter your login code and password to pick up where you left off."
              : "Just set a password — no email needed. You'll get a login code to save."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "login" && (
              <div>
                <label className="text-xs text-ink-500 block mb-1">Login code</label>
                <input
                  value={loginCode}
                  onChange={(e) => setLoginCode(e.target.value.toUpperCase())}
                  required
                  placeholder="XXXX-XXXX"
                  autoCapitalize="characters"
                  className="w-full bg-base-800 border border-base-600 rounded-lg px-3 py-2.5 text-sm text-ink-100 placeholder:text-ink-500 outline-none focus:border-accent font-mono tracking-widest"
                />
              </div>
            )}
            <div>
              <label className="text-xs text-ink-500 block mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
                className="w-full bg-base-800 border border-base-600 rounded-lg px-3 py-2.5 text-sm text-ink-100 placeholder:text-ink-500 outline-none focus:border-accent"
              />
            </div>
            {mode === "signup" && (
              <div>
                <label className="text-xs text-ink-500 block mb-1">Confirm password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Type it again"
                  className="w-full bg-base-800 border border-base-600 rounded-lg px-3 py-2.5 text-sm text-ink-100 placeholder:text-ink-500 outline-none focus:border-accent"
                />
              </div>
            )}

            {error && (
              <div className="bg-signal-rose/10 border border-signal-rose/30 text-signal-rose text-xs rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-brand-gradient hover:opacity-90 shadow-glow-sm disabled:opacity-50 transition-opacity px-4 py-2.5 text-sm font-semibold text-white"
            >
              {submitting
                ? "Please wait…"
                : mode === "login"
                ? "Sign in"
                : "Create my account"}
            </button>
          </form>

          <p className="text-[11px] text-ink-500 text-center mt-8">
            By continuing you agree this is a preparation tool — certificates
            issued here reflect practice performance and aren't official
            credentials from any company.
          </p>

          {onAdminLogin && (
            <button
              onClick={onAdminLogin}
              className="w-full text-center text-xs text-ink-500 hover:text-ink-100 transition-colors mt-4"
            >
              Admin login →
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 