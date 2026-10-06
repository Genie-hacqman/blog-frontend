const CONTEXT = 3

// Collapse long unchanged stretches so a small edit in a long story is easy to see.
const withCollapsedRuns = (parts) => {
  const lines = parts.flatMap((part) =>
    part.value
      .replace(/\n$/, '')
      .split('\n')
      .map((text) => ({ type: part.type, text })),
  )
  const keep = new Set()
  lines.forEach((line, i) => {
    if (line.type === 'same') return
    for (let j = Math.max(0, i - CONTEXT); j <= Math.min(lines.length - 1, i + CONTEXT); j += 1) keep.add(j)
  })
  const rows = []
  let skipped = 0
  lines.forEach((line, i) => {
    if (line.type !== 'same' || keep.has(i) || keep.size === 0) {
      if (skipped) rows.push({ type: 'gap', text: `${skipped} unchanged ${skipped === 1 ? 'line' : 'lines'}` })
      skipped = 0
      rows.push(line)
    } else skipped += 1
  })
  if (skipped) rows.push({ type: 'gap', text: `${skipped} unchanged ${skipped === 1 ? 'line' : 'lines'}` })
  return rows
}

const styles = {
  add: { mark: '+', label: 'Added', row: 'bg-ok/10' },
  remove: { mark: '−', label: 'Removed', row: 'bg-danger/10 line-through decoration-danger/40' },
  same: { mark: ' ', label: '', row: '' },
}

// A line-by-line comparison. Additions and removals carry a symbol and a hidden label, not only a colour.
export default function DiffView({ comparison }) {
  const rows = withCollapsedRuns(comparison.content)
  const unchanged = comparison.stats.added === 0 && comparison.stats.removed === 0

  return (
    <div className="space-y-4">
      {comparison.title.changed && (
        <p className="font-serif">
          <span className="kicker text-ink-soft">Title · </span>
          <span className="bg-danger/10 line-through decoration-danger/40">{comparison.title.from}</span>
          {' → '}
          <span className="bg-ok/10">{comparison.title.to}</span>
        </p>
      )}
      {comparison.excerpt.changed && (
        <p className="font-serif">
          <span className="kicker text-ink-soft">Excerpt changed</span>
        </p>
      )}
      <p className="kicker text-ink-soft" aria-live="polite">
        {unchanged ? 'The text is the same.' : `${comparison.stats.added} added · ${comparison.stats.removed} removed`}
      </p>
      {!unchanged && (
        <pre className="overflow-x-auto border border-rule p-3 font-mono text-sm leading-relaxed whitespace-pre-wrap">
          {rows.map((row, i) =>
            row.type === 'gap' ? (
              <span key={i} className="block py-1 text-center text-ink-soft italic">
                … {row.text} …
              </span>
            ) : (
              <span key={i} className={`block ${styles[row.type].row}`}>
                <span aria-hidden="true" className="mr-2 inline-block w-3 text-ink-soft select-none">
                  {styles[row.type].mark}
                </span>
                {styles[row.type].label && <span className="sr-only">{styles[row.type].label}: </span>}
                {row.text || ' '}
              </span>
            ),
          )}
        </pre>
      )}
    </div>
  )
}
