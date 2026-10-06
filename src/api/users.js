import { request } from './client.js'

const profilePath = (username) => `/api/users/${encodeURIComponent(username)}`

export const getProfile = (username) => request(profilePath(username)).then((d) => d.user)

// resolves to { posts, pagination }
export const getProfilePosts = (username, page = 1) =>
  request(`${profilePath(username)}/posts?page=${page}&limit=10`, { meta: true }).then(({ data, meta }) => ({
    posts: data.posts,
    pagination: meta.pagination,
  }))

export const updateProfile = (changes) =>
  request('/api/users/me', { method: 'PATCH', body: changes }).then((d) => d.user)

// the file goes up as multipart; the server re-encodes it, so only the pixels matter
export const uploadAvatar = (file) => {
  const form = new FormData()
  form.append('file', file)
  return request('/api/users/me/avatar', { method: 'PUT', body: form }).then((d) => d.user)
}

export const removeAvatar = () => request('/api/users/me/avatar', { method: 'DELETE' }).then((d) => d.user)

export const deleteAccount = (password) => request('/api/users/me', { method: 'DELETE', body: { password } })
