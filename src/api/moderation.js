import { request } from './client.js'

// a reader's report: { targetType: 'comment' | 'post' | 'user', targetId (an id, or a username for 'user'), reason, details }
export const createReport = (data) => request('/api/reports', { method: 'POST', body: data }).then((d) => d.report)

// moderators: status 'open' | 'resolved'; type 'comment' | 'post' | 'user' (people are for admins)
export const listReports = ({ status = 'open', type, page = 1 } = {}) =>
  request(`/api/moderation/reports?status=${status}&page=${page}&limit=10${type ? `&type=${type}` : ''}`, { meta: true }).then(({ data, meta }) => ({
    reports: data.reports,
    pagination: meta.pagination,
  }))

export const getReport = (id) => request(`/api/moderation/reports/${id}`).then((d) => d.report)

// action: 'dismiss' | 'remove' | 'unpublish' | 'suspend'; every action but dismiss needs a note
export const resolveReport = ({ id, action, note }) =>
  request(`/api/moderation/reports/${id}/resolve`, { method: 'POST', body: { action, ...(note && { note }) } }).then((d) => d.report)
