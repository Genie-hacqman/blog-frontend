import { STATUS_LABELS } from './postStatus.js'

const tones = {
  draft: 'border-ink-soft text-ink-soft',
  pending_review: 'border-accent text-accent',
  scheduled: 'border-ink text-ink',
  published: 'border-ok text-ok',
  rejected: 'border-danger text-danger',
  archived: 'border-ink-soft text-ink-soft',
  private: 'border-ink-soft text-ink-soft',
}

// the word is always shown, so the badge never relies on colour alone
export default function StatusBadge({ status }) {
  return <span className={`kicker inline-block border px-1.5 py-0.5 ${tones[status] ?? tones.draft}`}>{STATUS_LABELS[status] ?? status}</span>
}
