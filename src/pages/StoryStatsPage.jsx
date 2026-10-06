import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useStoryAnalytics } from '../hooks/useAnalytics.js'
import BarChart from '../components/BarChart.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import HowWeCount from '../components/HowWeCount.jsx'
import RangeSwitch from '../components/RangeSwitch.jsx'
import { ArticleSkeleton } from '../components/Skeletons.jsx'
import SourceList from '../components/SourceList.jsx'
import StatTile from '../components/StatTile.jsx'
import { formatDuration, formatNumber, formatPercent } from '../lib/format.js'
import NotFoundPage from './NotFoundPage.jsx'

// The numbers of one story: how many came, where from, and whether they read it.
export default function StoryStatsPage() {
  const { id } = useParams()
  const [days, setDays] = useState(30)
  const { data, isPending, error } = useStoryAnalytics(id, days)

  if (error?.status === 404) return <NotFoundPage />
  if (isPending) return <ArticleSkeleton />

  return (
    <div className="mx-auto max-w-4xl px-4 pt-10 pb-16 sm:px-6 sm:pt-14">
      <ErrorMessage error={error} />
      {data && (
        <div className="space-y-8">
          <header className="flex flex-wrap items-baseline justify-between gap-4 border-b-2 border-ink pb-4">
            <div>
              <p className="kicker text-accent">
                <Link to="/me/stats" className="link-slide">← All statistics</Link>
              </p>
              <h1 className="mt-1 text-4xl leading-none font-semibold tracking-[-0.02em] break-words">{data.post.title}</h1>
              {data.post.status === 'published' && (
                <p className="kicker mt-2">
                  <Link to={`/blog/${data.post.slug}`} className="link-slide text-ink-soft hover:text-accent">Read the story</Link>
                </p>
              )}
            </div>
            <RangeSwitch days={days} onChange={setDays} />
          </header>

          <dl className="grid gap-4 sm:grid-cols-3">
            <StatTile label="Views" value={formatNumber(data.totals.views)} note="Visits to this story." />
            <StatTile label="Visitors" value={formatNumber(data.totals.visitors)} note="Counted per day and added up." />
            <StatTile label="Reads" value={formatNumber(data.totals.reads)} note={`${formatPercent(data.totals.readRate)} of visitors got most of the way through.`} />
            <StatTile label="Average time" value={formatDuration(data.totals.avgReadSeconds)} note="From readers whose browsers reported it." />
            <StatTile label="Likes" value={formatNumber(data.reactions.likes)} />
            <StatTile label="Comments · saved" value={`${formatNumber(data.reactions.comments)} · ${formatNumber(data.reactions.bookmarks)}`} />
          </dl>

          <BarChart series={data.series} metric="views" label="Views" />

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
