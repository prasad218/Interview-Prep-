import { useEffect, useState } from "react";

/** Circular progress indicator with the brand gradient. Draws itself in once
 * on mount. `children` is centered inside the ring (e.g. a percentage). */
export default function ProgressRing({ pct, size = 64, stroke = 6, id = "ring", children }) {
  const r = 32 - stroke / 2 - 1;
  const c = 2 * Math.PI * r;
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), 250);
    return () => clearTimeout(t);
  }, []);
  const clamped = Math.max(0, Math.min(100, pct));

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 64 64" width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={`${id}-grad`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#3D6BFF" />
            <stop offset="0.5" stopColor="#7C5CFF" />
            <stop offset="1" stopColor="#F857A6" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r={r} fill="none" stroke="#2A2F3D" strokeWidth={stroke} />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke={`url(#${id}-grad)`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={drawn ? c * (1 - clamped / 100) : c}
          style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
      )}
    </div>
  );
}
