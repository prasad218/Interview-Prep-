import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Maximize2, X } from "lucide-react";

const VIDEO_URL = "/LevelUp-demo.mp4";
const POSTER_URL = "/LevelUp-demo-poster.jpg";

/**
 * Marketing video card. Plays automatically (muted, looping) right on the
 * page. Browsers block autoplay WITH sound, so the viewer taps the speaker
 * button to turn sound on. "Full screen" opens a bigger player with the
 * normal controls (volume slider, seek, pause).
 */
export default function WatchDemo({ className = "", variant = "card" }) {
  const videoRef = useRef(null);
  const [muted, setMuted] = useState(true);
  const [open, setOpen] = useState(false);

  // Respect "reduce motion": don't autoplay for people who turned it off.
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const toggleSound = () => {
    const v = videoRef.current;
    if (!v) return;
    const next = !muted;
    v.muted = next;
    if (!next) {
      v.currentTime = 0; // start from the beginning once sound is on
      v.play().catch(() => {});
    }
    setMuted(next);
  };

  const openFull = () => {
    videoRef.current?.pause();
    setOpen(true);
  };

  const closeFull = () => {
    setOpen(false);
    videoRef.current?.play().catch(() => {});
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && closeFull();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const modal = open && (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={closeFull}
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
          className="w-full h-full rounded-2xl bg-black object-contain shadow-glow"
        />
        <button
          onClick={closeFull}
          aria-label="Close video"
          className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-base-800 border border-base-600 text-ink-100 hover:bg-base-700 flex items-center justify-center"
        >
          <X className="w-4 h-4" strokeWidth={2.25} />
        </button>
      </div>
    </div>
  );

  // Big version for the sign-in hero panel: just the video + two buttons.
  if (variant === "hero") {
    return (
      <>
        <div
          className={`relative w-[150px] 2xl:w-[194px] shrink-0 aspect-[9/16] rounded-2xl overflow-hidden bg-black border border-accent/30 shadow-glow ${className}`}
        >
          <video
            ref={videoRef}
            src={VIDEO_URL}
            poster={POSTER_URL}
            autoPlay={!reduceMotion}
            muted
            loop
            playsInline
            preload="metadata"
            className="w-full h-full object-cover"
          />
          <button
            onClick={openFull}
            aria-label="Full screen"
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 backdrop-blur border border-white/20 text-white hover:bg-black/80 flex items-center justify-center transition-colors"
          >
            <Maximize2 className="w-4 h-4" strokeWidth={2.25} />
          </button>
          <button
            onClick={toggleSound}
            aria-label={muted ? "Turn sound on" : "Turn sound off"}
            className="absolute bottom-2 left-2 right-2 h-9 rounded-full bg-black/60 backdrop-blur border border-white/20 text-white text-xs font-semibold hover:bg-black/80 flex items-center justify-center gap-1.5 transition-colors"
          >
            {muted ? (
              <VolumeX className="w-4 h-4" strokeWidth={2.25} />
            ) : (
              <Volume2 className="w-4 h-4" strokeWidth={2.25} />
            )}
            {muted ? "Tap for sound" : "Sound on"}
          </button>
        </div>
        {modal}
      </>
    );
  }

  return (
    <>
      <div
        className={`flex items-center gap-4 rounded-2xl border border-base-600 bg-base-850/80 p-3 ${className}`}
      >
        <div className="relative w-[104px] shrink-0 aspect-[9/16] rounded-xl overflow-hidden bg-black shadow-card">
          <video
            ref={videoRef}
            src={VIDEO_URL}
            poster={POSTER_URL}
            autoPlay={!reduceMotion}
            muted
            loop
            playsInline
            preload="metadata"
            className="w-full h-full object-cover"
          />
          <button
            onClick={toggleSound}
            aria-label={muted ? "Turn sound on" : "Turn sound off"}
            className="absolute bottom-1.5 right-1.5 w-8 h-8 rounded-full bg-black/60 backdrop-blur border border-white/20 text-white hover:bg-black/80 flex items-center justify-center transition-colors"
          >
            {muted ? (
              <VolumeX className="w-4 h-4" strokeWidth={2.25} />
            ) : (
              <Volume2 className="w-4 h-4" strokeWidth={2.25} />
            )}
          </button>
        </div>

        <div className="min-w-0 text-left">
          <p className="font-display font-semibold text-sm text-ink-100">
            See LevelUp in action
          </p>
          <p className="text-[11px] text-ink-500 leading-snug mt-1">
            30 seconds: AI resume rewrite, live mock interview and more.
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3">
            <button
              onClick={toggleSound}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-soft hover:text-ink-100 transition-colors"
            >
              {muted ? (
                <Volume2 className="w-3.5 h-3.5" strokeWidth={2.25} />
              ) : (
                <VolumeX className="w-3.5 h-3.5" strokeWidth={2.25} />
              )}
              {muted ? "Play with sound" : "Mute"}
            </button>
            <button
              onClick={openFull}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-100 transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" strokeWidth={2.25} />
              Full screen
            </button>
          </div>
        </div>
      </div>

      {modal}
    </>
  );
}
