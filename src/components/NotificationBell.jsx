import { Link } from 'react-router'
import { useAuth } from '../auth/useAuth.js'
import { useUnreadCount } from '../hooks/useNotifications.js'

const strip = 'link-slide kicker text-ink hover:text-accent'

// The link to the inbox, with the number of unread notifications. Nothing for a signed-out visitor.
export default function NotificationBell({ onNavigate }) {
  const { isAuthenticated } = useAuth()
  const { data: unread = 0 } = useUnreadCount()
  if (!isAuthenticated) return null

  return (
    <Link
      to="/notifications"
      onClick={onNavigate}
      className={`${strip} inline-flex items-center gap-1.5`}
      aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
    >
      <span aria-hidden="true">Alerts</span>
      {unread > 0 && (
        <span aria-hidden="true" className="min-w-5 bg-accent px-1.5 py-0.5 text-center text-[0.65rem] leading-none text-paper tabular-nums">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  )
}
