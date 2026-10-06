import { useState } from 'react'
import { useDismissNotification, useMarkRead, useNotifications, useUnreadCount } from '../hooks/useNotifications.js'
import Button from '../components/Button.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import NotificationItem from '../components/NotificationItem.jsx'

const FILTERS = [
  { key: 'all', label: 'All', unread: false },
  { key: 'unread', label: 'Unread', unread: true },
]

export default function NotificationsPage() {
  const [filter, setFilter] = useState('all')
  const unreadOnly = FILTERS.find((f) => f.key === filter).unread
  const list = useNotifications({ unread: unreadOnly })
  const { data: unreadCount = 0 } = useUnreadCount()
  const markRead = useMarkRead()
  const dismiss = useDismissNotification()
  const items = list.data?.pages.flatMap((page) => page.notifications) ?? []

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 pb-16 sm:px-6 sm:pt-14">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-4 border-b-2 border-ink pb-4">
        <h1 className="text-4xl leading-none font-semibold tracking-[-0.02em]">Notifications</h1>
        <Button variant="secondary" disabled={unreadCount === 0 || markRead.isPending} onClick={() => markRead.mutate({ all: true })}>
          Mark all as read
        </Button>
      </header>

      <nav aria-label="Filter notifications" className="mb-4 flex gap-5 border-b border-rule pb-3">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            aria-current={f.key === filter ? 'true' : undefined}
            className={`kicker ${f.key === filter ? 'border-b-2 border-accent text-ink' : 'text-ink-soft hover:text-accent'}`}
          >
            {f.label}
            {f.key === 'unread' && unreadCount > 0 && <span> ({unreadCount})</span>}
          </button>
        ))}
      </nav>

      <ErrorMessage error={list.error ?? markRead.error ?? dismiss.error} />
      {list.isPending ? (
        <p role="status" className="py-8 text-ink-soft">
          Loading notifications…
        </p>
      ) : items.length === 0 ? (
        <p className="py-10 font-serif text-xl text-ink-soft italic">{unreadOnly ? 'You are all caught up.' : 'Nothing yet. When someone replies, follows you or reviews your story, it shows up here.'}</p>
      ) : (
        <ul className="divide-y divide-rule">
          {items.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onOpen={(n) => markRead.mutate({ ids: [n.id] })}
              onDismiss={(n) => dismiss.mutate(n.id)}
            />
          ))}
        </ul>
      )}
      {list.hasNextPage && (
        <Button variant="secondary" className="mt-4" disabled={list.isFetchingNextPage} onClick={() => list.fetchNextPage()}>
          {list.isFetchingNextPage ? 'Loading…' : 'Load more'}
        </Button>
      )}
    </div>
  )
}
