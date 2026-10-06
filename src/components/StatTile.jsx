// One number with its name and a plain-words note on what it means. Tiles live inside a <dl>.
export default function StatTile({ label, value, note }) {
  return (
    <div className="border border-rule p-4">
      <dt className="kicker text-ink-soft">{label}</dt>
      <dd className="mt-1 font-display text-4xl leading-none font-semibold tabular-nums">{value}</dd>
      {note && <p className="mt-2 font-serif text-sm text-ink-soft">{note}</p>}
    </div>
  )
}
