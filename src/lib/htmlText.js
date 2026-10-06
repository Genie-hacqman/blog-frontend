// The readable text of an HTML post body, for word counts and checks. The parser builds an inert
// document: nothing in it runs or loads.
const BLOCK_END = /<\/(?:p|h[1-6]|li|blockquote|pre|div|ul|ol)>|<br\s*\/?>|<hr\s*\/?>/gi

export const htmlToText = (html) => {
  if (!html) return ''
  const doc = new DOMParser().parseFromString(String(html).replace(BLOCK_END, ' $&'), 'text/html')
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim()
}
