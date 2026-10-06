import { request } from './client.js'

export const getStats = () => request('/api/admin/stats').then((d) => d.stats)

// params: q, role, status ('active' | 'suspended'), verified (boolean), page
export const listUsers = ({ q, role, status, verified, page = 1 } = {}) => {
  const params = new URLSearchParams({ page: String(page), limit: '20' })
  if (q) params.set('q', q)
  if (role) params.set('role', role)
  if (status) params.set('status', status)
  if (verified !== undefined && verified !== '') params.set('verified', String(verified))
  return request(`/api/admin/users?${params}`, { meta: true }).then(({ data, meta }) => ({ users: data.users, pagination: meta.pagination }))
}

export const suspendUser = ({ id, reason }) => request(`/api/admin/users/${id}/suspend`, { method: 'POST', body: { reason } }).then((d) => d.user)
export const unsuspendUser = (id) => request(`/api/admin/users/${id}/unsuspend`, { method: 'POST' }).then((d) => d.user)
export const signOutUser = (id) => request(`/api/admin/users/${id}/sign-out`, { method: 'POST' })
export const setUserRole = ({ id, role }) => request(`/api/admin/users/${id}/role`, { method: 'PATCH', body: { role } }).then((d) => d.user)

// params: action, entityType, actorId, page
export const listAuditLogs = ({ action, entityType, actorId, page = 1 } = {}) => {
  const params = new URLSearchParams({ page: String(page), limit: '25' })
  if (action) params.set('action', action)
  if (entityType) params.set('entityType', entityType)
  if (actorId) params.set('actorId', String(actorId))
  return request(`/api/admin/audit-logs?${params}`, { meta: true }).then(({ data, meta }) => ({ logs: data.logs, pagination: meta.pagination }))
}
