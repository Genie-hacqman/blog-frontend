import { Link } from 'react-router'
import { useStats } from '../hooks/useAdmin.js'
import ErrorMessage from '../components/ErrorMessage.jsx'
import { timeAgo } from '../components/formatDate.js'
import { describeAudit } from '../lib/audit.js'

const Tile = ({ label, value, to, hint }) => {
  const body = (
    <>
      <dt className="kicker text-ink-soft">{label}</dt>
      <dd className="mt-1 font-display text-4xl leading-none font-semibold tabular-nums">{value}</dd>
      {hint && <p className="kicker mt-2 text-ink-soft">{hint}</p>}
    </>
  )
  return to ? (
    <Link to={to} className="block border border-rule p-4 hover:border-ink focus-visible:outline-2 focus-visible:outline-accent">
      {body}
    </Link>
  ) : (
    <div className="border border-rule p-4">{body}</div>
  )
}

// Counts and recent activity: how the site is doing, and where something needs a person.
export default function AdminDashboardPage() {
  const { data: stats, isPending, error } = useStats()

  return (
    <div className="mx-auto max-w-5xl px-4 pt-10 pb-16 sm:px-6 sm:pt-14">
      <header className="mb-8 flex flex-wrap items-baseline justify-between gap-4 border-b-2 border-ink pb-4">
        <div>
          <p className="kicker text-accent">Administration</p>
          <h1 className="mt-1 text-4xl leading-none font-semibold tracking-[-0.02em]">Overview</h1>
        </div>
        <nav aria-label="Administration" className="flex gap-5">
          <Link to="/admin/analytics" className="link-slide kicker text-accent">Analytics</Link>
          <Link to="/admin/users" className="link-slide kicker text-accent">People</Link>
          <Link to="/admin/audit" className="link-slide kicker text-accent">Audit log</Link>
          <Link to="/moderation" className="link-slide kicker text-accent">Moderation</Link>
        </nav>
      </header>

      <ErrorMessage error={error} />
      {isPending ? (
        <p role="status" className="py-8 text-ink-soft">Loading the numbers…</p>
      ) : !stats ? null : (
        <>
          <section aria-label="Needs attention" className="mb-10">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Tile label="Reports waiting" value={stats.reports.openTargets} to="/moderation" hint="things reported, not yet decided" />
              <Tile label="Stories waiting for review" value={stats.reviewQueue} to="/review" />
            </dl>
          </section>

          <section aria-label="People" className="mb-10">
            <h2 className="kicker mb-3 text-ink">People</h2>
            <dl className="grid gap-4 sm:grid-cols-4">
              <Tile label="Accounts" value={stats.users.total} />
              <Tile label="Suspended" value={stats.users.suspended} to="/admin/users" />
              <Tile label="New this week" value={stats.users.newLast7Days} />
              <Tile label="New this month" value={stats.users.newLast30Days} />
            </dl>
            <p className="kicker mt-3 text-ink-soft">
              {Object.entries(stats.users.byRole).map(([role, count]) => `${count} ${role}${count === 1 ? '' : 's'}`).join(' · ')}
            </p>
          </section>

          <section aria-label="Stories and comments" className="mb-10">
            <h2 className="kicker mb-3 text-ink">Stories and comments</h2>
            <dl className="grid gap-4 sm:grid-cols-4">
              <Tile label="Stories" value={stats.posts.total} />
              <Tile label="Published this month" value={stats.posts.publishedLast30Days} />
              <Tile label="Comments" value={stats.comments.total} />
              <Tile label="Comments this week" value={stats.comments.last7Days} />
            </dl>
            <p className="kicker mt-3 text-ink-soft">
              {Object.entries(stats.posts.byStatus).map(([status, count]) => `${count} ${status.replace('_', ' ')}`).join(' · ')}
            </p>
          </section>

          <section aria-label="Recent activity">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="kicker text-ink">Recent activity</h2>
              <Link to="/admin/audit" className="link-slide kicker text-accent">See all</Link>
            </div>
            {stats.recentActivity.length === 0 ? (
              <p className="font-serif text-ink-soft italic">Nothing recorded yet.</p>
            ) : (
              <ul className="divide-y divide-rule border-y border-rule">
                {stats.recentActivity.map((entry) => (
                  <li key={entry.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2 font-serif">
                    <span className="break-words">{describeAudit(entry)}</span>
                    <time className="kicker text-ink-soft" dateTime={entry.createdAt}>{timeAgo(entry.createdAt)}</time>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
