import { useId, useState } from 'react'
import { useCreateReport } from '../hooks/useModeration.js'
import { MAX_DETAILS_LENGTH, REPORT_REASONS } from '../lib/moderation.js'
import Button from './Button.jsx'
import ErrorMessage from './ErrorMessage.jsx'
import Notice from './Notice.jsx'

// The form behind a "Report" button: why, and optionally what the moderator should know. Reports never act
// by themselves, so this says what happens next.
export default function ReportForm({ targetType, targetId, noun, onDone }) {
  const id = useId()
  const create = useCreateReport()
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [missing, setMissing] = useState(false)

  if (create.isSuccess) {
    return (
      <Notice tone="ok" label="Reported">
        Thank you. A moderator will look at it. Nothing changes until they have.
      </Notice>
    )
  }

  const already = create.error?.status === 409

  const submit = (event) => {
    event.preventDefault()
    if (!reason) {
      setMissing(true)
      return
    }
    setMissing(false)
    create.mutate({ targetType, targetId, reason, ...(details.trim() && { details: details.trim() }) })
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4 border border-rule bg-paper-2 p-4">
      <p className="font-serif text-lg">Report this {noun}</p>
      <label htmlFor={`${id}-reason`} className="kicker block text-ink-soft">
        What is wrong?
      </label>
      <select
        id={`${id}-reason`}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        aria-invalid={missing}
        className="w-full border-0 border-b border-ink bg-paper px-3 py-2 font-serif text-lg focus:border-b-2 focus:border-accent focus:outline-none"
      >
        <option value="">Choose a reason…</option>
        {REPORT_REASONS.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      {missing && (
        <p role="alert" className="font-mono text-xs text-danger">
          Choose a reason first.
        </p>
      )}
      <label htmlFor={`${id}-details`} className="kicker block text-ink-soft">
        Anything else a moderator should know? (optional)
      </label>
      <textarea
        id={`${id}-details`}
        value={details}
        onChange={(event) => setDetails(event.target.value)}
        maxLength={MAX_DETAILS_LENGTH}
        rows={3}
        className="w-full border-0 border-b border-ink bg-paper px-3 py-2 font-serif text-lg focus:border-b-2 focus:border-accent focus:outline-none"
      />
      <p className="kicker text-ink-soft">{MAX_DETAILS_LENGTH - details.length} characters left</p>
      {already ? (
        <Notice label="Already reported">You have already reported this. A moderator will look at it.</Notice>
      ) : (
        <ErrorMessage error={create.error} />
      )}
      <div className="flex gap-3">
        <Button type="submit" disabled={create.isPending || already}>
          {create.isPending ? 'Sending…' : 'Send report'}
        </Button>
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
