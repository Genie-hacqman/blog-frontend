const controlClass = {
  default:
    'w-full border-0 border-b border-ink bg-paper-2 px-3 py-2.5 font-serif text-lg text-ink placeholder:text-ink-soft/60 focus:border-b-2 focus:border-accent focus:outline-none',
  title:
    'w-full border-0 bg-transparent p-0 font-display text-4xl leading-tight font-semibold tracking-[-0.02em] text-ink placeholder:text-ink-soft/40 focus:outline-none sm:text-5xl',
  body:
    'field-sizing-content min-h-[50vh] w-full resize-none border-0 bg-transparent p-0 font-serif text-[1.1875rem] leading-[1.7] text-ink placeholder:text-ink-soft/50 focus:outline-none sm:text-xl',
}

// `variant="title"` / `"body"` render the borderless editor fields with a visually hidden label
export default function FormField({ label, error, as = 'input', variant = 'default', ...props }) {
  const Tag = as
  const quiet = variant !== 'default'
  return (
    <label className="block">
      <span className={quiet ? 'sr-only' : 'kicker mb-2 block text-ink-soft'}>{label}</span>
      <Tag className={controlClass[variant]} aria-invalid={!!error} {...props} />
      {error && (
        <span className="mt-2 flex gap-1.5 font-mono text-xs text-danger">
          <span aria-hidden="true">—</span>
          <span>{error.message}</span>
        </span>
      )}
    </label>
  )
}
