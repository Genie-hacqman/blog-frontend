import { beacon, request } from './client.js'

// ----- what a reader's browser reports (fire and forget) -----
export const sendView = (postId, referrer) => beacon('/api/analytics/view', { postId, ...(referrer && { referrer }) })
export const sendReading = (postId, seconds, depth) => beacon('/api/analytics/reading', { postId, seconds, depth })

// ----- the numbers (days: 7, 30 or 90) -----
export const getMyAnalytics = (days = 30) => request(`/api/analytics/me?days=${days}`).then((d) => d.analytics)
export const getStoryAnalytics = (id, days = 30) => request(`/api/analytics/posts/${id}?days=${days}`).then((d) => d.analytics)
export const getSiteAnalytics = (days = 30) => request(`/api/admin/analytics?days=${days}`).then((d) => d.analytics)
