import { request } from './client.js'

// a list endpoint in the API's envelope: { data: { [key]: [...] }, meta: { pagination } }
const paged = (path, key) =>
  request(path, { meta: true }).then(({ data, meta }) => ({ [key]: data[key], pagination: meta.pagination }))

// ----- comments (plain text; one level of replies) -----
export const listComments = (postId, page = 1) => paged(`/api/posts/${postId}/comments?page=${page}&limit=10`, 'comments')

export const listReplies = (commentId, page = 1) => paged(`/api/comments/${commentId}/replies?page=${page}&limit=10`, 'comments')

// idempotencyKey should be generated once per submission so a double click or a retry does not post twice
export const createComment = ({ postId, idempotencyKey, ...data }) =>
  request(`/api/posts/${postId}/comments`, {
    method: 'POST',
    body: data,
    headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
  }).then((d) => d.comment)

export const editComment = ({ id, body }) => request(`/api/comments/${id}`, { method: 'PATCH', body: { body } }).then((d) => d.comment)

export const deleteComment = (id) => request(`/api/comments/${id}`, { method: 'DELETE' })

// ----- likes and bookmarks (PUT sets, DELETE clears; both are safe to repeat) -----
export const likePost = (postId) => request(`/api/posts/${postId}/like`, { method: 'PUT' })
export const unlikePost = (postId) => request(`/api/posts/${postId}/like`, { method: 'DELETE' })
export const bookmarkPost = (postId) => request(`/api/posts/${postId}/bookmark`, { method: 'PUT' })
export const unbookmarkPost = (postId) => request(`/api/posts/${postId}/bookmark`, { method: 'DELETE' })

// the signed-in reader's saved stories, and the stories of the people they follow: { posts, pagination }
export const listBookmarks = (page = 1) => paged(`/api/posts/bookmarks?page=${page}&limit=10`, 'posts')
export const getFeed = (page = 1) => paged(`/api/posts/feed?page=${page}&limit=10`, 'posts')

// ----- follows -----
const profilePath = (username) => `/api/users/${encodeURIComponent(username)}`
export const followUser = (username) => request(`${profilePath(username)}/follow`, { method: 'PUT' })
export const unfollowUser = (username) => request(`${profilePath(username)}/follow`, { method: 'DELETE' })

// kind is 'followers' or 'following': { people: [{ username, avatarUrl }], pagination }
export const listPeople = (username, kind, page = 1) => paged(`${profilePath(username)}/${kind}?page=${page}&limit=20`, 'people')
