import { useState } from 'react'
import { Link } from 'react-router'
import { useReportDetail, useResolveReport } from '../hooks/useModeration.js'
import { MAX_NOTE_LENGTH, MODERATION_ACTIONS, TARGET_LABEL } from '../lib/moderation.js'
import Button from './Button.jsx'
import ErrorMessage from './ErrorMessage.jsx'
import { formatDate } from './formatDate.js'

// What was reported, as plain text, with a link to see it where it lives.
function Target({ item }) {
  const { target } = item
  if (!target) return <p className="font-serif text-ink-soft italic">This no longer exists.</p>
  if (item.targetType === 'comment') {
    return (
      <div>
        {target.removed ? (
          <p className="font-serif text-ink-soft italic">This comment was already removed.</p>
        ) : (
          <p className="font-serif text-lg break-words whitespace-pre-wrap">“{target.excerpt}”</p>
        )}
        <p className="kicker mt-2 text-ink-soft">
          by {target.author?.username ?? 'unknown'}
          {target.post && (
            <>
              {' on '}
              <Link to={`/blog/${target.post.slug}#comments`} className="link-slide text-accent">
                {target.post.title}
              </Link>
            </>
          )}
        </p>
      </div>
    )
  }
  if (item.targetType === 'post') {
    return (
      <p className="font-serif text-lg">
        <Link to={`/blog/${target.slug}`} className="link-slide text-accent">
          {target.title}
        </Link>
        <span className="kicker ml-3 text-ink-soft">
          {target.status} · by {target.author?.username ?? 'unknown'}
        </span>
      </p>
    )
  }
  return (
    <p className="font-serif text-lg">
      <Link to={`/u/${encodeURIComponent(target.username)}`} className="link-slide text-accent">
        {target.username}
      </Link>
      <span className="kicker ml-3 text-ink-soft">
        {target.role} · {target.status}
      </span>
    </p>
  )
}

// who filed the reports and what they wrote, loaded when a moderator asks for it
function Reporters({ id }) {
  const { data, isPending, error } = useReportDetail(id, true)
  if (isPending) return <p role="status" className="py-2 text-ink-soft">Loading…</p>
  if (error) return <ErrorMessage error={error} />
  return (
    <ul className="mt-2 divide-y divide-rule border-t border-rule">
      {data.reports.map((report) => (
        <li key={report.id} className="py-2 font-serif">
          <span className="kicker text-ink-soft">
            {report.reporter?.username ?? 'someone'} · {report.label} · {formatDate(report.createdAt)}
          </span>
          {report.details && <p className="mt-1 break-words whitespace-pre-wrap">{report.details}</p>}
        </li>
      ))}
    </ul>
  )
}

// One reported thing and the decision about it. A decision with consequences asks for a note and a confirmation.
export default function ModerationCard({ item }) {
  const resolve = useResolveReport()
  const [action, setAction] = useState(null)
  const [note, setNote] = useState('')
  const [showReporters, setShowReporters] = useState(false)
  const choices = MODERATION_ACTIONS[item.targetType]
  const chosen = choices.find(([name]) => name === action)
  const open = item.status === 'open'

  const confirm = (event) => {
    event.preventDefault()
    resolve.mutate({ id: item.id, action, note: note.trim() })
  }

  return (
    <li className="space-y-4 py-6">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="kicker bg-ink px-2 py-1 text-paper">{TARGET_LABEL[item.targetType]}</span>
        <span className="kicker text-ink-soft">
          {item.reportCount} {item.reportCount === 1 ? 'report' : 'reports'} · last {formatDate(item.lastReportedAt)}
        </span>
      </div>

      <Target item={item} />

      <ul className="flex flex-wrap gap-2" aria-label="Reasons given">
        {item.reasons.map((reason) => (
          <li key={reason.reason} className="kicker border border-rule px-2 py-1 text-ink-soft">
            {reason.label} ×{reason.count}
          </li>
        ))}
      </ul>

      <div>
        <button type="button" className="kicker text-accent hover:underline" aria-expanded={showReporters} onClick={() => setShowReporters((value) => !value)}>
          {showReporters ? 'Hide who reported' : 'Who reported this'}
        </button>
        {showReporters && <Reporters id={item.id} />}
      </div>

      {open ? (
        <div>
          {!action ? (
            <div role="group" aria-label="Decide" className="flex flex-wrap gap-3">
              {choices.map(([name, label]) => (
                <Button key={name} variant={name === 'dismiss' ? 'secondary' : 'danger'} onClick={() => setAction(name)}>
                  {label}
                </Button>
              ))}
            </div>
          ) : (
            <form onSubmit={confirm} noValidate className="space-y-3 border border-rule bg-paper-2 p-4">
              <p className="font-serif text-lg">{chosen[1]}?</p>
              {chosen[2] && (
                <>
                  <label htmlFor={`note-${item.id}`} className="kicker block text-ink-soft">
                    {chosen[2]}
                  </label>
                  <textarea
                    id={`note-${item.id}`}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    maxLength={MAX_NOTE_LENGTH}
                    rows={3}
                    className="w-full border-0 border-b border-ink bg-paper px-3 py-2 font-serif text-lg focus:border-b-2 focus:border-accent focus:outline-none"
                  />
                </>
              )}
              <ErrorMessage error={resolve.error} />
              <div className="flex gap-3">
                <Button type="submit" variant={action === 'dismiss' ? 'primary' : 'danger'} disabled={resolve.isPending || (Boolean(chosen[2]) && !note.trim())}>
                  {resolve.isPending ? 'Working…' : `Confirm: ${chosen[1]}`}
                </Button>
                <Button type="button" variant="secondary" onClick={() => { setAction(null); setNote('') }} disabled={resolve.isPending}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      ) : (
        item.handled && (
          <p className="kicker text-ink-soft">
            {item.handled.outcome === 'dismissed' ? 'Dismissed' : 'Action taken'} by {item.handled.by ?? 'a moderator'} · {formatDate(item.handled.at)}
            {item.handled.note && <span className="mt-1 block font-serif text-base break-words whitespace-pre-wrap text-ink normal-case">{item.handled.note}</span>}
          </p>
        )
      )}
    </li>
  )
}
