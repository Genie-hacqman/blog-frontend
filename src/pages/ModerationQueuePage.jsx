import { useState } from 'react'
import { useAuth } from '../auth/useAuth.js'
import { useReports } from '../hooks/useModeration.js'
import ErrorMessage from '../components/ErrorMessage.jsx'
import ModerationCard from '../components/ModerationCard.jsx'
import Pager from '../components/Pager.jsx'

const TABS = [
  ['open', 'Open'],
  ['resolved', 'Resolved'],
]

// The reports waiting for a decision. Editors see comments and stories; admins also see reports about people.
export default function ModerationQueuePage() {
  const { user } = useAuth()
  const [status, setStatus] = useState('open')
  const [type, setType] = useState('')
  const [page, setPage] = useState(1)
  const { data, isPending, error } = useReports({ status, type: type || undefined, page })
  const types = [['', 'Everything'], ['comment', 'Comments'], ['post', 'Stories'], ...(user?.role === 'admin' ? [['user', 'People']] : [])]

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 pb-16 sm:px-6 sm:pt-14">
      <header className="mb-6 border-b-2 border-ink pb-4">
        <p className="kicker text-accent">Moderation</p>
        <h1 className="mt-1 text-4xl leading-none font-semibold tracking-[-0.02em]">Reports</h1>
        <p className="mt-3 font-serif text-lg text-ink-soft">Nothing here acts on its own. Each report waits for a person to decide.</p>
      </header>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-rule pb-3">
        <nav aria-label="Report status" className="flex gap-5">
          {TABS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-current={value === status ? 'true' : undefined}
              onClick={() => { setStatus(value); setPage(1) }}
              className={`kicker ${value === status ? 'border-b-2 border-accent text-ink' : 'text-ink-soft hover:text-accent'}`}
            >
              {label}
            </button>
          ))}
        </nav>
        <label className="flex items-center gap-2">
          <span className="kicker text-ink-soft">Show</span>
          <select
            value={type}
            onChange={(event) => { setType(event.target.value); setPage(1) }}
            className="border border-rule bg-paper-2 px-2 py-1 font-sans text-sm"
          >
            {types.map(([value, label]) => (
              <option key={value || 'all'} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ErrorMessage error={error} />
      {isPending ? (
        <p role="status" className="py-8 text-ink-soft">
          Loading reports…
        </p>
      ) : !data ? null : data.reports.length === 0 ? (
        <p className="py-10 font-serif text-xl text-ink-soft italic">{status === 'open' ? 'Nothing is waiting. The queue is clear.' : 'Nothing has been resolved yet.'}</p>
      ) : (
        <ul className="divide-y divide-rule">
          {data.reports.map((item) => (
            <ModerationCard key={item.id} item={item} />
          ))}
        </ul>
      )}
      <Pager pagination={data?.pagination} onPage={setPage} label="Report pages" />
    </div>
  )
}
