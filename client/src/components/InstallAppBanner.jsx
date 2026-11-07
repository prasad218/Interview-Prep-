import { useState } from "react";
import { Smartphone, Download, X } from "lucide-react";
import logo from "../assets/logo.png";

// The APK sits in client/public/, so the site serves it at this URL.
const APK_URL = "/LevelUp.apk";
const DISMISS_KEY = "levelup_install_banner_dismissed";

// True when this page is running INSIDE the Android app (Capacitor wrapper).
// The banner would be pointless there, so it hides itself.
function isInsideApp() {
  try {
    return Boolean(window.Capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
}

// An APK only installs on Android. Hide on iPhone/iPad.
function isApple() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent || "");
}

function wasDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Small "Get the Android app" promo card. Add it anywhere; it renders nothing
 * inside the app, on iOS, or after the visitor has closed it.
 */
export default function InstallAppBanner({ className = "" }) {
  const [hidden, setHidden] = useState(
    () => isInsideApp() || isApple() || wasDismissed()
  );
  if (hidden) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // storage blocked — just hide for this visit
    }
    setHidden(true);
  };

  return (
    <div
      className={`flex items-center gap-2.5 rounded-2xl border border-accent/30 bg-brand-gradient-soft pl-4 pr-2 py-3 ${className}`}
    >
      <div className="w-10 h-10 shrink-0 rounded-xl overflow-hidden shadow-glow-sm bg-base-900">
        <img src={logo} alt="" className="w-full h-full object-contain" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="flex items-center gap-1.5 font-display font-semibold text-[13px] text-ink-100">
          <Smartphone className="w-3.5 h-3.5 text-accent-soft" strokeWidth={2.25} />
          Get the LevelUp Android app
        </p>
        <p className="text-[11px] text-ink-500 leading-snug mt-0.5">
          Practice anywhere, right from your phone.
        </p>
      </div>

      <a
        href={APK_URL}
        download="LevelUp.apk"
        className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-brand-gradient hover:opacity-90 shadow-glow-sm transition-opacity px-3 py-2 text-xs font-semibold text-white"
      >
        <Download className="w-3.5 h-3.5" strokeWidth={2.5} />
        Install
      </a>

      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 p-1.5 rounded-md text-ink-500 hover:text-ink-100 hover:bg-white/5 transition-colors"
      >
        <X className="w-3.5 h-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}
