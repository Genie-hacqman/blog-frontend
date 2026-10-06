import { request } from './client.js'

const paged = (path) =>
  request(path, { meta: true }).then(({ data, meta }) => ({ posts: data.posts, pagination: meta.pagination }))

// published posts, public: { posts, pagination }. category and tag are slugs.
export const listPosts = ({ page = 1, category, tag } = {}) => {
  const filters = [category && `category=${encodeURIComponent(category)}`, tag && `tag=${encodeURIComponent(tag)}`].filter(Boolean)
  return paged(`/api/posts?page=${page}&limit=10${filters.map((f) => `&${f}`).join('')}`)
}

// the signed-in author's own posts in every status; status filters to one
export const listMyPosts = ({ status, page = 1 } = {}) =>
  paged(`/api/posts/mine?page=${page}&limit=10${status ? `&status=${status}` : ''}`)

// posts waiting for an editor (editors and admins)
export const listReviewQueue = (page = 1) => paged(`/api/posts/review?page=${page}&limit=10`)

export const getPost = (id) => request(`/api/posts/${id}`).then((d) => d.post)

export const getPostBySlug = (slug) => request(`/api/posts/slug/${encodeURIComponent(slug)}`).then((d) => d.post)

// idempotencyKey should be generated once per submission so retries don't duplicate posts
export const createPost = ({ idempotencyKey, ...data }) =>
  request('/api/posts', {
    method: 'POST',
    body: data,
    headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
  }).then((d) => d.post)

// content only (title, content as HTML, excerpt, slug, categoryId, tags, coverMediaId, coverAlt). Send expectedUpdatedAt
// (the updatedAt the writer started from) to be refused with EDIT_CONFLICT instead of overwriting a newer save.
// Status changes use changePostStatus.
export const updatePost = ({ id, ...data }) =>
  request(`/api/posts/${id}`, { method: 'PATCH', body: data }).then((d) => d.post)

// to: draft | pending_review | scheduled | published | rejected | archived | private
// publishAt (ISO string) for scheduled, reason for rejected
export const changePostStatus = ({ id, ...data }) =>
  request(`/api/posts/${id}/status`, { method: 'POST', body: data }).then((d) => d.post)

export const deletePost = (id) => request(`/api/posts/${id}`, { method: 'DELETE' })

export const listRevisions = (id, page = 1) =>
  request(`/api/posts/${id}/revisions?page=${page}&limit=20`, { meta: true }).then(({ data, meta }) => ({
    revisions: data.revisions,
    pagination: meta.pagination,
  }))

export const getRevision = (id, version) => request(`/api/posts/${id}/revisions/${version}`).then((d) => d.revision)

// to is a version number or "current"
export const compareRevisions = ({ id, from, to }) =>
  request(`/api/posts/${id}/revisions/compare?from=${from}&to=${to}`).then((d) => d.comparison)

export const restoreRevision = ({ id, version }) =>
  request(`/api/posts/${id}/revisions/${version}/restore`, { method: 'POST' }).then((d) => d.post)
