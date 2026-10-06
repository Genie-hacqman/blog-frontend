import { request } from './client.js'

const slug = (value) => encodeURIComponent(value)

// ---------- categories (sections) ----------
export const listCategories = () => request('/api/categories').then((d) => d.categories)
export const getCategory = (value) => request(`/api/categories/${slug(value)}`).then((d) => d.category)

// editors and admins only (the API enforces it)
export const createCategory = (data) => request('/api/categories', { method: 'POST', body: data }).then((d) => d.category)
export const updateCategory = ({ id, ...data }) =>
  request(`/api/categories/${id}`, { method: 'PATCH', body: data }).then((d) => d.category)
export const deleteCategory = (id) => request(`/api/categories/${id}`, { method: 'DELETE' })

// ---------- tags (topics) ----------
// popular first; q narrows by prefix (for autocomplete)
export const listTags = ({ q, limit } = {}) => {
  const query = [q && `q=${encodeURIComponent(q)}`, limit && `limit=${limit}`].filter(Boolean).join('&')
  return request(`/api/tags${query ? `?${query}` : ''}`).then((d) => d.tags)
}
export const getTag = (value) => request(`/api/tags/${slug(value)}`).then((d) => d.tag)
