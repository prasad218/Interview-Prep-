import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

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

export default function AuthScreen() {
  const { login, signup, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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
        await signup({ name, email, password });
      } else {
        await login({ email, password });
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-base-950 text-ink-100">
      {/* Hero panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-aurora border-r border-base-700 flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-gradient shadow-glow-sm flex items-center justify-center shrink-0">
              <span className="text-white text-base font-bold">✦</span>
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
            <div className="w-8 h-8 rounded-xl bg-brand-gradient shadow-glow-sm flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-bold">✦</span>
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
              ? "Sign in to pick up your roadmap where you left off."
              : "Create a free account — takes under a minute."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <div>
                <label className="text-xs text-ink-500 block mb-1">Full name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Priya Sharma"
                  className="w-full bg-base-800 border border-base-600 rounded-lg px-3 py-2.5 text-sm text-ink-100 placeholder:text-ink-500 outline-none focus:border-accent"
                />
              </div>
            )}
            <div>
              <label className="text-xs text-ink-500 block mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full bg-base-800 border border-base-600 rounded-lg px-3 py-2.5 text-sm text-ink-100 placeholder:text-ink-500 outline-none focus:border-accent"
              />
            </div>
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
