import { useId } from 'react'

const controlClass = {
  default:
    'w-full border-0 border-b border-ink bg-paper-2 px-3 py-2.5 font-serif text-lg text-ink placeholder:text-ink-soft/60 focus:border-b-2 focus:border-accent focus:outline-none',
  title:
    'w-full border-0 bg-transparent p-0 font-display text-4xl leading-tight font-semibold tracking-[-0.02em] text-ink placeholder:text-ink-soft/40 focus:outline-none sm:text-5xl',
  body:
    'field-sizing-content min-h-[50vh] w-full resize-none border-0 bg-transparent p-0 font-serif text-[1.1875rem] leading-[1.7] text-ink placeholder:text-ink-soft/50 focus:outline-none sm:text-xl',
}

// `variant="title"` / `"body"` render the borderless editor fields with a visually hidden label.
// The hint and the error sit next to the label, not inside it, and are tied to the control with
// aria-describedby, so a screen reader announces the field's name and then its description.
export default function FormField({ label, error, hint, as = 'input', variant = 'default', id, ...props }) {
  const Tag = as
  const quiet = variant !== 'default'
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const hintId = `${fieldId}-hint`
  const errorId = `${fieldId}-error`
  const describedBy = [hint && !error && hintId, error && errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className="block">
      <label htmlFor={fieldId} className={quiet ? 'sr-only' : 'kicker mb-2 block text-ink-soft'}>
        {label}
      </label>
      <Tag id={fieldId} className={controlClass[variant]} aria-invalid={!!error} aria-describedby={describedBy} {...props} />
      {hint && !error && (
        <span id={hintId} className="mt-2 block font-mono text-xs text-ink-soft">
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className="mt-2 flex gap-1.5 font-mono text-xs text-danger">
          <span aria-hidden="true">—</span>
          <span>{error.message}</span>
        </span>
      )}
    </div>
  )
}
