import { useId, useState } from 'react'
import { formatDay, formatNumber } from '../lib/format.js'

const WIDTH = 600
const HEIGHT = 140

// A day-by-day bar chart in plain SVG (no library). It is described in words for a screen reader, and "Show as
// table" shows the very same numbers as a table, so nothing depends on seeing the picture or telling colours apart.
// series: [{ day, ...numbers }], metric: which number to draw, label: its name.
export default function BarChart({ series, metric, label }) {
  const id = useId()
  const [table, setTable] = useState(false)
  const values = series.map((point) => point[metric] ?? 0)
  const max = Math.max(1, ...values)
  const total = values.reduce((sum, value) => sum + value, 0)
  const best = values.indexOf(Math.max(...values))
  const barWidth = WIDTH / Math.max(1, series.length)
  const summary =
    total === 0
      ? `${label}: none in these ${series.length} days.`
      : `${label}: ${formatNumber(total)} in these ${series.length} days, most on ${formatDay(series[best].day)} (${formatNumber(values[best])}).`

  return (
    <figure className="border border-rule p-4">
      <figcaption className="kicker mb-3 flex items-baseline justify-between gap-4 text-ink-soft">
        <span id={`${id}-caption`}>{label} per day</span>
        <button type="button" className="text-accent hover:underline" aria-pressed={table} onClick={() => setTable((value) => !value)}>
          {table ? 'Show as chart' : 'Show as table'}
        </button>
      </figcaption>

      {table ? (
        <table className="w-full text-left font-serif">
          <caption className="sr-only">{summary}</caption>
          <thead>
            <tr className="kicker text-ink-soft">
              <th scope="col" className="pb-1 font-normal">Day</th>
              <th scope="col" className="pb-1 text-right font-normal">{label}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {series.map((point) => (
              <tr key={point.day}>
                <th scope="row" className="py-1 font-normal">{formatDay(point.day)}</th>
                <td className="py-1 text-right tabular-nums">{formatNumber(point[metric])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <>
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-labelledby={`${id}-summary`} className="h-36 w-full text-accent">
            <title id={`${id}-summary`}>{summary}</title>
            {values.map((value, index) => {
              const height = value === 0 ? 1 : Math.max(2, (value / max) * (HEIGHT - 4))
              return (
                <rect key={series[index].day} x={index * barWidth + barWidth * 0.12} y={HEIGHT - height} width={barWidth * 0.76} height={height} fill="currentColor" opacity={value === 0 ? 0.25 : 1}>
                  <title>{`${formatDay(series[index].day)}: ${formatNumber(value)}`}</title>
                </rect>
              )
            })}
          </svg>
          <p className="kicker mt-2 flex justify-between text-ink-soft" aria-hidden="true">
            <span>{formatDay(series[0].day)}</span>
            <span>most in a day: {formatNumber(max === 1 && total === 0 ? 0 : max)}</span>
            <span>{formatDay(series.at(-1).day)}</span>
          </p>
        </>
      )}
      <p className="mt-2 font-serif text-sm text-ink-soft">{summary}</p>
    </figure>
  )
}
