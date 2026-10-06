import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useAuth } from '../auth/useAuth.js'
import ReportForm from './ReportForm.jsx'

// "Report" under a comment, a story or a profile. A signed-out visitor is sent to log in; the form itself
// opens in place. Callers do not show it for the reader's own content (the API refuses that anyway).
export default function ReportButton({ targetType, targetId, noun, className = '' }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const style = 'kicker text-ink-soft hover:text-accent focus-visible:outline-2 focus-visible:outline-accent'

  if (!isAuthenticated) {
    return (
      <Link to="/login" state={{ from: location.pathname }} className={`${style} ${className}`}>
        Report
      </Link>
    )
  }
  return (
    <span className={className}>
      <button type="button" className={style} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        Report
        <span className="sr-only"> this {noun}</span>
      </button>
      {open && (
        <div className="mt-3 block">
          <ReportForm targetType={targetType} targetId={targetId} noun={noun} onDone={() => setOpen(false)} />
        </div>
      )}
    </span>
  )
}
