const RANGES = [7, 30, 90]

// "Last 7 / 30 / 90 days"
export default function RangeSwitch({ days, onChange }) {
  return (
    <div role="group" aria-label="Period" className="flex gap-2">
      {RANGES.map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={days === value}
          onClick={() => onChange(value)}
          className="border border-rule px-3 py-1 font-mono text-xs tracking-[0.1em] uppercase aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper"
        >
          {value} days
        </button>
      ))}
    </div>
  )
}
