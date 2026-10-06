import { request } from './client.js'

// { notifications, pagination, unreadCount }; unread: only the ones not read yet
export const listNotifications = ({ page = 1, unread = false } = {}) =>
  request(`/api/notifications?page=${page}&limit=20${unread ? '&unread=1' : ''}`, { meta: true }).then(({ data, meta }) => ({
    notifications: data.notifications,
    pagination: meta.pagination,
    unreadCount: meta.unreadCount,
  }))

// the number on the bell
export const getUnreadCount = () => request('/api/notifications/unread-count').then((d) => d.unreadCount)

// ids: some notifications; all: every one of them
export const markRead = ({ ids, all }) => request('/api/notifications/read', { method: 'POST', body: all ? { all: true } : { ids } })

export const dismissNotification = (id) => request(`/api/notifications/${id}`, { method: 'DELETE' })

// [{ type, label, inApp, email }]
export const getPreferences = () => request('/api/notifications/preferences').then((d) => d.preferences)

export const savePreferences = (preferences) =>
  request('/api/notifications/preferences', { method: 'PUT', body: { preferences } }).then((d) => d.preferences)

// the token from the link in an email; resolves to { scope, label }
export const unsubscribe = (token) => request('/api/notifications/unsubscribe', { method: 'POST', body: { token } })
