import { useState } from 'react'
import { useChangePostStatus } from '../hooks/usePosts.js'
import Button from './Button.jsx'
import ErrorMessage from './ErrorMessage.jsx'
import FormField from './FormField.jsx'
import { ACTION_LABELS, ACTION_ORDER } from './postStatus.js'

const MIN_LEAD_MS = 2 * 60 * 1000

// the soonest schedulable time as a local "YYYY-MM-DDTHH:mm", for the datetime-local input's min attribute
const earliestScheduleInput = () => {
  const date = new Date(Date.now() + MIN_LEAD_MS)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// The status moves open to the viewer. The server decides what is allowed and sends it as
// post.actions, so this never offers a button the API would refuse (and the API still checks).
export default function PostActions({ post }) {
  const change = useChangePostStatus()
  const [panel, setPanel] = useState(null) // 'scheduled' | 'rejected'
  const [publishAt, setPublishAt] = useState('')
  const [reason, setReason] = useState('')
  const [problem, setProblem] = useState(null)
  const [earliest, setEarliest] = useState('') // the soonest time that can be picked, fixed when the panel opens

  const available = ACTION_ORDER.filter((to) => post.actions?.includes(to))
  if (available.length === 0) return null

  const run = (to, extra) =>
    change.mutate(
      { id: post.id, to, ...extra },
      {
        onSuccess: () => {
          setPanel(null)
          setPublishAt('')
          setReason('')
        },
      },
    )

  const choose = (to) => {
    setProblem(null)
    change.reset()
    if (to === 'scheduled') setEarliest(earliestScheduleInput())
    if (to === 'scheduled' || to === 'rejected') setPanel(panel === to ? null : to)
    else run(to)
  }

  const confirmSchedule = (event) => {
    event.preventDefault()
    const when = new Date(publishAt)
    if (!publishAt || Number.isNaN(when.getTime())) return setProblem('Choose a date and time.')
    if (when.getTime() < Date.now() + MIN_LEAD_MS) return setProblem('Choose a time at least a couple of minutes from now.')
    setProblem(null)
    run('scheduled', { publishAt: when.toISOString() })
  }

  const confirmReject = (event) => {
    event.preventDefault()
    if (!reason.trim()) return setProblem('Tell the author what to fix.')
    if (reason.trim().length > 500) return setProblem('Keep the reason under 500 characters.')
    setProblem(null)
    run('rejected', { reason: reason.trim() })
  }

  const variantOf = (to, index) => (to === 'rejected' ? 'danger' : index === 0 ? 'primary' : 'secondary')

  return (
    <section aria-label="Post actions" className="space-y-4 border-t border-ink pt-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="kicker mr-auto text-ink-soft">Next steps</span>
        {available.map((to, index) => (
          <Button
            key={to}
            type="button"
            variant={variantOf(to, index)}
            onClick={() => choose(to)}
            disabled={change.isPending}
            aria-expanded={to === 'scheduled' || to === 'rejected' ? panel === to : undefined}
          >
            {ACTION_LABELS[to](post.status)}
          </Button>
        ))}
      </div>

      {panel === 'scheduled' && (
        <form onSubmit={confirmSchedule} className="space-y-4 border border-rule p-4" noValidate>
          <FormField
            label="Publish at"
            type="datetime-local"
            value={publishAt}
            min={earliest}
            onChange={(event) => setPublishAt(event.target.value)}
            hint="In your local time. The post stays hidden until then."
          />
          <Button type="submit" disabled={change.isPending}>
            {change.isPending ? 'Scheduling…' : 'Confirm schedule'}
          </Button>
        </form>
      )}

      {panel === 'rejected' && (
        <form onSubmit={confirmReject} className="space-y-4 border border-rule p-4" noValidate>
          <FormField
            label="Reason for rejection"
            as="textarea"
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            hint="The author sees this. Be specific about what to change."
          />
          <Button type="submit" variant="danger" disabled={change.isPending}>
            {change.isPending ? 'Rejecting…' : 'Reject post'}
          </Button>
        </form>
      )}

      <ErrorMessage error={problem ?? change.error} />
    </section>
  )
}
