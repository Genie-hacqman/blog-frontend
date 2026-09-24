const tones = {
  ok: { bar: 'border-ok bg-ok/5', label: 'text-ok' },
  neutral: { bar: 'border-ink-soft bg-paper-2', label: 'text-ink-soft' },
}

export default function Notice({ tone = 'neutral', label = 'Notice', children }) {
  const t = tones[tone]
  return (
    <div role="status" className={`border-l-2 px-4 py-3 ${t.bar}`}>
      <p className={`kicker ${t.label}`}>{label}</p>
      <p className="mt-1 text-base text-ink">{children}</p>
    </div>
  )
}
