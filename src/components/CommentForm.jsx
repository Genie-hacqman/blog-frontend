import { useId, useRef, useState } from 'react'
import Button from './Button.jsx'
import ErrorMessage from './ErrorMessage.jsx'

export const MAX_COMMENT_LENGTH = 2000

// A text box and a button, for a new comment, a reply or an edit. The caller supplies
// onSubmit(text, idempotencyKey): it may be async, and throwing shows the message under the box.
// The same text sent twice (double click, retry after a network error) carries the same key, so the
// server stores it once. The text is cleared only after a successful send.
export default function CommentForm({ label, submitLabel = 'Post comment', initialBody = '', onSubmit, onCancel, autoFocus = false }) {
  const id = useId()
  const [text, setText] = useState(initialBody)
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(false)
  const attempt = useRef(null)
  const trimmed = text.trim()
  const left = MAX_COMMENT_LENGTH - text.length

  const submit = async (event) => {
    event.preventDefault()
    if (!trimmed) {
      setError('Write something first.')
      return
    }
    if (attempt.current?.text !== trimmed) attempt.current = { text: trimmed, key: crypto.randomUUID() }
    setError(null)
    setPending(true)
    try {
      await onSubmit(trimmed, attempt.current.key)
      attempt.current = null
      if (!initialBody) setText('')
    } catch (failure) {
      setError(failure)
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <label htmlFor={id} className="kicker block text-ink-soft">
        {label}
      </label>
      <textarea
        id={id}
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={3}
        maxLength={MAX_COMMENT_LENGTH}
        autoFocus={autoFocus}
        aria-describedby={`${id}-count`}
        className="field-sizing-content min-h-24 w-full border-0 border-b border-ink bg-paper-2 px-3 py-2.5 font-serif text-lg text-ink placeholder:text-ink-soft/60 focus:border-b-2 focus:border-accent focus:outline-none"
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Sending…' : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
        )}
        <span id={`${id}-count`} className={`kicker ml-auto ${left < 100 ? 'text-danger' : 'text-ink-soft'}`}>
          {left} characters left
        </span>
      </div>
      {typeof error === 'string' ? (
        <p role="alert" className="font-mono text-xs text-danger">
          {error}
        </p>
      ) : (
        <ErrorMessage error={error} />
      )}
    </form>
  )
}
