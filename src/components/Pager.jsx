import Button from './Button.jsx'

// Older / Newer controls for a paginated list; renders nothing when there is only one page
export default function Pager({ pagination, onPage, label = 'Pages' }) {
  if (!pagination || pagination.totalPages <= 1) return null
  const { page, totalPages } = pagination
  return (
    <nav aria-label={label} className="mt-6 flex items-center justify-between gap-4 border-t border-rule pt-5">
      <Button variant="secondary" onClick={() => onPage(page - 1)} disabled={page <= 1}>
        ← Newer
      </Button>
      <span className="kicker text-ink-soft">
        Page {page} of {totalPages}
      </span>
      <Button variant="secondary" onClick={() => onPage(page + 1)} disabled={page >= totalPages}>
        Older →
      </Button>
    </nav>
  )
}
