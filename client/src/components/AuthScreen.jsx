import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import * as api from "../api/client.js";
import { setToken } from "../api/authToken.js";
import logo from "../assets/logo.png";

const FEATURES = [
  {
    icon: "🗺️",
    title: "Personalized roadmap",
    body: "Upload your resume once — get a day-by-day plan built around your timeline and daily study hours.",
  },
  {
    icon: "🎙️",
    title: "Live mock interviews",
    body: "Practice with an AI interviewer that asks follow-ups based on your actual answers, not a script.",
  },
  {
    icon: "🏢",
    title: "Company-specific prep",
    body: "Tell us which companies you're targeting — get their typical rounds and tailored tests.",
  },
  {
    icon: "🏅",
    title: "Certificates that prove it",
    body: "Clear a readiness test and download a certificate + badge to show your preparation.",
  },
];

function useGoogleButton(onCredential) {
  const buttonRef = useRef(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) return undefined;
    let cancelled = false;
    let attempts = 0;

    const tryInit = () => {
      if (cancelled) return;
      if (window.google?.accounts?.id && buttonRef.current) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => onCredential(response.credential),
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "filled_black",
          size: "large",
          shape: "pill",
          width: 320,
          text: "continue_with",
        });
      } else if (attempts < 30) {
        attempts += 1;
        setTimeout(tryInit, 250);
      }
    };
    tryInit();
    return () => {
      cancelled = true;
    };
  }, [clientId, onCredential]);

  return { buttonRef, clientId };
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
        <span className="text-white text-2xl">🔑</span>
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

export default function AuthScreen() {
  const { login, loginWithGoogle, setUser } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [loginCode, setLoginCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingSignup, setPendingSignup] = useState(null); // { token, user } awaiting confirmation

  const handleGoogleCredential = useCallback(
    async (credential) => {
      setError(null);
      setSubmitting(true);
      try {
        await loginWithGoogle(credential);
      } catch (e) {
        setError(e.message);
      } finally {
        setSubmitting(false);
      }
    },
    [loginWithGoogle]
  );

  const { buttonRef, clientId } = useGoogleButton(handleGoogleCredential);

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
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-aurora border-r border-base-700 flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0">
              <img src={logo} alt="Interview Prep" className="w-full h-full object-contain" />
            </div>
            <span className="font-display font-bold text-lg">Interview Prep</span>
          </div>

          <h1 className="font-display font-extrabold text-4xl xl:text-5xl leading-tight mt-14 max-w-lg">
            From <span className="text-gradient-brand">preparation</span> to
            get hired.
          </h1>
          <p className="text-ink-300 text-base mt-4 max-w-md leading-relaxed">
            One resume upload turns into a personalized roadmap, live AI mock
            interviews, and company-specific readiness tests — with a
            certificate to show for it.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 max-w-lg">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-base-600 bg-base-900/60 backdrop-blur-sm p-4"
            >
              <div className="text-xl mb-2">{f.icon}</div>
              <p className="font-display font-semibold text-sm text-ink-100 mb-1">
                {f.title}
              </p>
              <p className="text-xs text-ink-500 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>

        <div className="brand-badge w-fit">
          <span className="brand-dot" />
          A product from <span className="brand-name">Aakara.AI</span>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 justify-center mb-8">
            <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0">
              <img src={logo} alt="Interview Prep" className="w-full h-full object-contain" />
            </div>
            <span className="font-display font-bold text-lg">Interview Prep</span>
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

          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-base-700" />
            <span className="text-[11px] text-ink-500">OR</span>
            <div className="h-px flex-1 bg-base-700" />
          </div>

          <div className="flex justify-center">
            {clientId ? (
              <div ref={buttonRef} />
            ) : (
              <div className="w-full text-center text-[11px] text-ink-500 border border-dashed border-base-600 rounded-lg px-3 py-2.5">
                Google sign-in isn't configured yet — set{" "}
                <code className="text-ink-300">VITE_GOOGLE_CLIENT_ID</code>.
              </div>
            )}
          </div>

          <p className="text-[11px] text-ink-500 text-center mt-8">
            By continuing you agree this is a preparation tool — certificates
            issued here reflect practice performance and aren't official
            credentials from any company.
          </p>
        </div>
      </div>
    </div>
  );
}