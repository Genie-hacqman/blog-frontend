import { useState } from 'react'
import { Link } from 'react-router'
import { useMyAnalytics } from '../hooks/useAnalytics.js'
import BarChart from '../components/BarChart.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import HowWeCount from '../components/HowWeCount.jsx'
import RangeSwitch from '../components/RangeSwitch.jsx'
import SourceList from '../components/SourceList.jsx'
import StatTile from '../components/StatTile.jsx'
import { formatDuration, formatNumber, formatPercent } from '../lib/format.js'

const METRICS = [
  ['views', 'Views'],
  ['visitors', 'Visitors'],
  ['reads', 'Reads'],
]

// An author's numbers: how their stories are doing, and which ones.
export default function MyStatsPage() {
  const [days, setDays] = useState(30)
  const [metric, setMetric] = useState('views')
  const { data, isPending, error } = useMyAnalytics(days)

  return (
    <div className="mx-auto max-w-4xl px-4 pt-10 pb-16 sm:px-6 sm:pt-14">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-4 border-b-2 border-ink pb-4">
        <div>
          <p className="kicker text-accent">Your readers</p>
          <h1 className="mt-1 text-4xl leading-none font-semibold tracking-[-0.02em]">Statistics</h1>
        </div>
        <RangeSwitch days={days} onChange={setDays} />
      </header>

      <ErrorMessage error={error} />
      {isPending ? (
        <p role="status" className="py-8 text-ink-soft">Loading your numbers…</p>
      ) : !data ? null : (
        <div className="space-y-8">
          <dl className="grid gap-4 sm:grid-cols-3">
            <StatTile label="Views" value={formatNumber(data.totals.views)} note="Visits to your stories." />
            <StatTile label="Visitors" value={formatNumber(data.totals.visitors)} note="Counted per day and added up: a person on three days counts three times." />
            <StatTile label="Reads" value={formatNumber(data.totals.reads)} note={`${formatPercent(data.totals.readRate)} of visitors got most of the way through.`} />
            <StatTile label="Average time" value={formatDuration(data.totals.avgReadSeconds)} note="From readers whose browsers reported it." />
            <StatTile label="Likes" value={formatNumber(data.reactions.likes)} note="On all your stories, so far." />
            <StatTile label="Comments" value={formatNumber(data.reactions.comments)} note="On all your stories, so far." />
          </dl>

          <section aria-label="Views over time" className="space-y-3">
            <div role="group" aria-label="Show" className="flex gap-2">
              {METRICS.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={metric === key}
                  onClick={() => setMetric(key)}
                  className="kicker border border-rule px-3 py-1 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper"
                >
                  {label}
                </button>
              ))}
            </div>
            <BarChart series={data.series} metric={metric} label={METRICS.find(([key]) => key === metric)[1]} />
          </section>

          <section aria-labelledby="stories-heading">
            <h2 id="stories-heading" className="kicker mb-3 border-t-2 border-ink pt-3 text-ink">Your stories</h2>
            {data.stories.length === 0 ? (
              <p className="font-serif text-xl text-ink-soft italic">You have no published stories yet.</p>
            ) : (
              <table className="w-full text-left font-serif">
                <caption className="sr-only">Your published stories, most viewed first</caption>
                <thead>
                  <tr className="kicker text-ink-soft">
                    <th scope="col" className="pb-2 font-normal">Story</th>
                    <th scope="col" className="pb-2 text-right font-normal">Views</th>
                    <th scope="col" className="pb-2 text-right font-normal">Visitors</th>
                    <th scope="col" className="pb-2 text-right font-normal">Reads</th>
                    <th scope="col" className="pb-2 text-right font-normal">Avg time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule">
                  {data.stories.map((story) => (
                    <tr key={story.id}>
                      <th scope="row" className="py-2 pr-3 font-normal">
                        <Link to={`/posts/${story.id}/stats`} className="link-slide text-accent">
                          {story.title}
                        </Link>
                      </th>
                      <td className="py-2 text-right tabular-nums">{formatNumber(story.views)}</td>
                      <td className="py-2 text-right tabular-nums">{formatNumber(story.visitors)}</td>
                      <td className="py-2 text-right tabular-nums">{formatNumber(story.reads)}</td>
                      <td className="py-2 text-right tabular-nums">{formatDuration(story.avgReadSeconds)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section aria-labelledby="sources-heading">
            <h2 id="sources-heading" className="kicker mb-3 border-t-2 border-ink pt-3 text-ink">Where readers came from</h2>
            <SourceList sources={data.sources} />
          </section>

          <HowWeCount />
        </div>
      )}
    </div>
  )
}
