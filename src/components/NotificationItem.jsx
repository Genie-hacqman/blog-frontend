import { Link } from 'react-router'
import { timeAgo } from './formatDate.js'

// What each kind of notification says and where it leads. The names and titles come from the server as plain
// text and are rendered as text.
const describe = (n) => {
  const who = n.actor?.username ?? 'Someone'
  const title = n.post?.title ?? 'a story'
  switch (n.type) {
    case 'comment_on_post':
      return { text: `${who} commented on “${title}”`, to: `/blog/${n.post?.slug}#comments`, detail: n.comment?.excerpt }
    case 'comment_reply':
      return { text: `${who} replied to your comment on “${title}”`, to: `/blog/${n.post?.slug}#comments`, detail: n.comment?.excerpt }
    case 'new_follower':
      return { text: `${who} started following you`, to: `/u/${encodeURIComponent(n.actor?.username ?? '')}` }
    case 'post_submitted':
      return { text: `${who} submitted “${title}” for review`, to: '/review' }
    case 'post_published':
      return { text: `“${title}” is now published`, to: `/blog/${n.post?.slug}` }
    case 'post_rejected':
      return { text: `“${title}” was sent back for changes`, to: `/posts/${n.post?.id}/edit`, detail: n.reason }
    case 'comment_removed':
      return { text: `Your comment on “${title}” was removed`, to: `/blog/${n.post?.slug}#comments`, detail: n.note }
    case 'post_unpublished':
      return { text: `“${title}” was taken down`, to: `/posts/${n.post?.id}`, detail: n.note }
    default:
      return { text: 'Something happened', to: '/notifications' }
  }
}

// One row of the inbox. Opening it (the link) marks it read; "Dismiss" removes it.
export default function NotificationItem({ notification, onOpen, onDismiss }) {
  const { text, to, detail } = describe(notification)
  const unread = !notification.readAt

  return (
    <li className={`flex items-start gap-3 py-4 ${unread ? 'bg-paper-2/60' : ''}`}>
      <span aria-hidden="true" className={`mt-2 h-2 w-2 shrink-0 rounded-full ${unread ? 'bg-accent' : 'bg-transparent'}`} />
      <div className="min-w-0 flex-1">
        <Link to={to} onClick={() => unread && onOpen(notification)} className="link-slide font-serif text-lg leading-snug break-words hover:text-accent">
          {unread && <span className="sr-only">Unread: </span>}
          {text}
        </Link>
        {detail && <p className="mt-1 font-serif break-words whitespace-pre-line text-ink-soft">{detail}</p>}
        <p className="kicker mt-1 text-ink-soft">
          <time dateTime={notification.createdAt}>{timeAgo(notification.createdAt)}</time>
        </p>
      </div>
      <button type="button" onClick={() => onDismiss(notification)} className="kicker shrink-0 text-ink-soft hover:text-danger" aria-label={`Dismiss: ${text}`}>
        Dismiss
      </button>
    </li>
  )
}
