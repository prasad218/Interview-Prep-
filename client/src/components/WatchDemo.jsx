import { useEffect, useState } from "react";
import { Play, X } from "lucide-react";

const VIDEO_URL = "/LevelUp-demo.mp4";
const POSTER_URL = "/LevelUp-demo-poster.jpg";

/**
 * "Watch demo" link that opens the promo video in a pop-up player.
 * The video file only downloads when the pop-up is opened.
 */
export default function WatchDemo({ className = "" }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center justify-center gap-1.5 text-xs font-medium text-accent-soft hover:text-ink-100 transition-colors ${className}`}
      >
        <Play className="w-3.5 h-3.5" strokeWidth={2.25} fill="currentColor" />
        Watch the 30-second demo
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="LevelUp demo video"
        >
          <div
            className="relative h-full max-h-[90vh] aspect-[9/16] max-w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <video
              src={VIDEO_URL}
              poster={POSTER_URL}
              controls
              autoPlay
              playsInline
              preload="metadata"
              className="w-full h-full rounded-2xl bg-black object-contain shadow-glow"
            />
            <button
              onClick={() => setOpen(false)}
              aria-label="Close video"
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-base-800 border border-base-600 text-ink-100 hover:bg-base-700 flex items-center justify-center"
            >
              <X className="w-4 h-4" strokeWidth={2.25} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
