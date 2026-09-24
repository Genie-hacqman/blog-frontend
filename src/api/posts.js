import { request } from './client.js'

export const listPosts = () => request('/api/posts').then((d) => d.posts)

export const getPost = (id) => request(`/api/posts/${id}`).then((d) => d.post)

// idempotencyKey should be generated once per submission so retries don't duplicate posts
export const createPost = ({ idempotencyKey, ...data }) =>
  request('/api/posts', {
    method: 'POST',
    body: data,
    headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
  }).then((d) => d.post)

export const updatePost = ({ id, ...data }) =>
  request(`/api/posts/${id}`, { method: 'PATCH', body: data }).then((d) => d.post)

export const deletePost = (id) => request(`/api/posts/${id}`, { method: 'DELETE' })
