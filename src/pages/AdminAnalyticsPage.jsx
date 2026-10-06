import { useState } from 'react'
import { Link } from 'react-router'
import { useSiteAnalytics } from '../hooks/useAnalytics.js'
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
  ['signups', 'New accounts'],
  ['comments', 'Comments'],
  ['published', 'Stories published'],
]

// The whole site over time: reading, growth, and what leads.
export default function AdminAnalyticsPage() {
  const [days, setDays] = useState(30)
  const [metric, setMetric] = useState('views')
  const { data, isPending, error } = useSiteAnalytics(days)

  return (
    <div className="mx-auto max-w-5xl px-4 pt-10 pb-16 sm:px-6 sm:pt-14">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-4 border-b-2 border-ink pb-4">
        <div>
          <p className="kicker text-accent">
            <Link to="/admin" className="link-slide">← Overview</Link>
          </p>
          <h1 className="mt-1 text-4xl leading-none font-semibold tracking-[-0.02em]">Site analytics</h1>
        </div>
        <RangeSwitch days={days} onChange={setDays} />
      </header>

      <ErrorMessage error={error} />
      {isPending ? (
        <p role="status" className="py-8 text-ink-soft">Loading the numbers…</p>
      ) : !data ? null : (
        <div className="space-y-8">
          <dl className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <StatTile label="Views" value={formatNumber(data.totals.views)} />
            <StatTile label="Visitors" value={formatNumber(data.totals.visitors)} note="Per day, added up." />
            <StatTile label="Reads" value={formatNumber(data.totals.reads)} note={`${formatPercent(data.totals.readRate)} of visitors`} />
            <StatTile label="Average time" value={formatDuration(data.totals.avgReadSeconds)} />
            <StatTile label="New accounts" value={formatNumber(data.totals.signups)} />
            <StatTile label="Comments" value={formatNumber(data.totals.comments)} />
            <StatTile label="Stories published" value={formatNumber(data.totals.published)} />
          </dl>

          <section aria-label="Over time" className="space-y-3">
            <div role="group" aria-label="Show" className="flex flex-wrap gap-2">
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

          <div className="grid gap-8 lg:grid-cols-2">
            <section aria-labelledby="top-stories">
              <h2 id="top-stories" className="kicker mb-3 border-t-2 border-ink pt-3 text-ink">Most read stories</h2>
              {data.stories.length === 0 ? (
                <p className="font-serif text-ink-soft italic">Nothing read in this period.</p>
              ) : (
                <ol className="divide-y divide-rule border-y border-rule">
                  {data.stories.map((story) => (
                    <li key={story.id} className="flex items-baseline justify-between gap-4 py-2 font-serif">
                      <Link to={`/posts/${story.id}/stats`} className="link-slide text-accent">{story.title}</Link>
                      <span className="kicker text-ink-soft tabular-nums">{formatNumber(story.views)} views</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
            <section aria-labelledby="top-authors">
              <h2 id="top-authors" className="kicker mb-3 border-t-2 border-ink pt-3 text-ink">Most read authors</h2>
              {data.authors.length === 0 ? (
                <p className="font-serif text-ink-soft italic">Nothing read in this period.</p>
              ) : (
                <ol className="divide-y divide-rule border-y border-rule">
                  {data.authors.map((author) => (
                    <li key={author.id} className="flex items-baseline justify-between gap-4 py-2 font-serif">
                      <Link to={`/u/${encodeURIComponent(author.username)}`} className="link-slide text-accent">{author.username}</Link>
                      <span className="kicker text-ink-soft tabular-nums">{formatNumber(author.views)} views</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>

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
