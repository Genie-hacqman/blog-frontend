import { request } from './client.js'

export const register = (data) =>
  request('/api/users/register', { method: 'POST', body: data }).then((d) => d.user)

export const login = (credentials) =>
  request('/api/users/login', { method: 'POST', body: credentials })

export const logout = () => request('/api/users/logout', { method: 'POST' })
