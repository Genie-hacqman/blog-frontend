import { request } from './client.js'

// resolves to { posts, pagination, query } where query is the tidied text the server searched for
export const searchPosts = ({ q, category, tag, sort, page = 1 }) => {
  const params = new URLSearchParams({ q, page: String(page), limit: '10' })
  if (category) params.set('category', category)
  if (tag) params.set('tag', tag)
  if (sort) params.set('sort', sort)
  return request(`/api/search?${params}`, { meta: true }).then(({ data, meta }) => ({
    posts: data.posts,
    pagination: meta.pagination,
    query: meta.query,
  }))
}
