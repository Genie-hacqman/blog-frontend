import { request } from './client.js'

// Upload an image for a post. purpose: 'inline' (inside the text) or 'cover' (the picture above the title).
// Resolves to { id, url, width, height, purpose, size }.
export const uploadImage = (file, purpose) => {
  const form = new FormData()
  form.append('purpose', purpose)
  form.append('file', file)
  return request('/api/media', { method: 'POST', body: form }).then((d) => d.media)
}
