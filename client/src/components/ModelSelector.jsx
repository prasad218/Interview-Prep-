import { providerColor, shortModelName } from "../lib/providerColors.js";

export default function ModelSelector({ models, value, onChange }) {
  return (
    <div className="relative inline-flex items-center">
      <span
        className="absolute left-2.5 w-2 h-2 rounded-full"
        style={{ backgroundColor: providerColor(value) }}
      />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-base-800 border border-base-600 hover:border-accent-dim text-ink-100 text-xs rounded-lg pl-6 pr-7 py-1.5 outline-none cursor-pointer transition-colors focus:border-accent focus:shadow-glow-sm"
      >
        {models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name || shortModelName(m.id)}
          </option>
        ))}
      </select>
      <span className="absolute right-2 text-ink-500 text-[10px] pointer-events-none">▾</span>
    </div>
  );
}
