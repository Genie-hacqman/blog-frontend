import { CSRF_HEADER, request } from './client.js'

export const register = (data) =>
  request('/api/auth/register', { method: 'POST', body: data }).then((d) => d.user)

// resolves to { user, accessToken }; the refresh token arrives as an HttpOnly cookie
export const login = (credentials) =>
  request('/api/auth/login', { method: 'POST', body: credentials })

export const logout = () => request('/api/auth/logout', { method: 'POST', headers: CSRF_HEADER })

export const me = () => request('/api/auth/me').then((d) => d.user)

export const verifyEmail = (token) =>
  request('/api/auth/verify-email', { method: 'POST', body: { token } })

export const resendVerification = () => request('/api/auth/resend-verification', { method: 'POST' })

export const forgotPassword = (email) =>
  request('/api/auth/forgot-password', { method: 'POST', body: { email } })

export const resetPassword = ({ token, password }) =>
  request('/api/auth/reset-password', { method: 'POST', body: { token, password } })

export const changePassword = (data) =>
  request('/api/auth/change-password', { method: 'POST', body: data })

export const becomeAuthor = () =>
  request('/api/users/me/become-author', { method: 'POST' }).then((d) => d.user)
