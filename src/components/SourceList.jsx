// Where readers came from (hostnames only, as plain text) with how many views each sent
export default function SourceList({ sources }) {
  if (sources.length === 0) return <p className="font-serif text-ink-soft italic">No views yet in this period.</p>
  const total = sources.reduce((sum, source) => sum + source.views, 0)
  return (
    <ul className="divide-y divide-rule border-y border-rule">
      {sources.map((source) => (
        <li key={source.host} className="flex items-baseline justify-between gap-4 py-2 font-serif">
          <span className="break-all">{source.host}</span>
          <span className="kicker text-ink-soft tabular-nums">
            {source.views.toLocaleString()} ({Math.round((source.views / total) * 100)}%)
          </span>
        </li>
      ))}
    </ul>
  )
}
