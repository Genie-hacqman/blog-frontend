import { useState } from 'react'
import { Link } from 'react-router'
import { useAuditLogs } from '../hooks/useAdmin.js'
import ErrorMessage from '../components/ErrorMessage.jsx'
import Pager from '../components/Pager.jsx'
import { timeAgo } from '../components/formatDate.js'
import { AUDIT_ENTITY_TYPES, describeAudit } from '../lib/audit.js'

// The record of what staff did, newest first. Each line is readable; the exact action is shown beside it.
export default function AuditLogPage() {
  const [entityType, setEntityType] = useState('')
  const [action, setAction] = useState('')
  const [actorId, setActorId] = useState('')
  const [page, setPage] = useState(1)
  const params = { entityType: entityType || undefined, action: action || undefined, actorId: /^\d+$/.test(actorId) ? Number(actorId) : undefined, page }
  const { data, isPending, error } = useAuditLogs(params)

  const filter = (setter) => (event) => {
    setter(event.target.value)
    setPage(1)
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pt-10 pb-16 sm:px-6 sm:pt-14">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-4 border-b-2 border-ink pb-4">
        <h1 className="text-4xl leading-none font-semibold tracking-[-0.02em]">Audit log</h1>
        <Link to="/admin" className="link-slide kicker text-accent">← Overview</Link>
      </header>

      <div role="search" className="mb-4 flex flex-wrap items-end gap-3">
        <label>
          <span className="kicker mb-1 block text-ink-soft">About</span>
          <select value={entityType} onChange={filter(setEntityType)} className="border border-rule bg-paper-2 px-2 py-2 font-sans text-sm">
            <option value="">Anything</option>
            {AUDIT_ENTITY_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="kicker mb-1 block text-ink-soft">Action (exact)</span>
          <input value={action} onChange={filter(setAction)} placeholder="user.suspended" className="border border-rule bg-paper-2 px-2 py-2 font-mono text-sm" />
        </label>
        <label>
          <span className="kicker mb-1 block text-ink-soft">Done by (user id)</span>
          <input value={actorId} onChange={filter(setActorId)} inputMode="numeric" className="w-28 border border-rule bg-paper-2 px-2 py-2 font-mono text-sm" />
        </label>
      </div>

      <ErrorMessage error={error} />
      {isPending ? (
        <p role="status" className="py-8 text-ink-soft">Loading the log…</p>
      ) : !data ? null : data.logs.length === 0 ? (
        <p className="py-10 font-serif text-xl text-ink-soft italic">Nothing matches.</p>
      ) : (
        <ul className="divide-y divide-rule border-y border-rule">
          {data.logs.map((entry) => (
            <li key={entry.id} className="space-y-1 py-3">
              <p className="font-serif text-lg break-words">{describeAudit(entry)}</p>
              {entry.metadata?.reason && <p className="font-serif break-words whitespace-pre-wrap text-ink-soft">Reason: {entry.metadata.reason}</p>}
              {entry.metadata?.note && <p className="font-serif break-words whitespace-pre-wrap text-ink-soft">Note: {entry.metadata.note}</p>}
              <p className="kicker text-ink-soft">
                <code>{entry.action}</code> · <time dateTime={entry.createdAt}>{timeAgo(entry.createdAt)}</time>
                {entry.ip && <> · {entry.ip}</>}
              </p>
            </li>
          ))}
        </ul>
      )}
      <Pager pagination={data?.pagination} onPage={setPage} label="Audit log pages" />
    </div>
  )
}
