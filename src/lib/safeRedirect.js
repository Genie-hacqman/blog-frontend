// Where to go after signing in. The place comes from the page the person was sent from, so it is only used when it
// is an address on this site: one slash, then a path. Anything that could lead elsewhere ("//evil.example",
// "/\evil.example", "https://...", "javascript:...", control characters, encoded tricks) becomes the front page.
const FALLBACK = '/'

// control characters and backslashes (browsers treat "\" like "/")
const hasUnsafeCharacter = (text) =>
  [...text].some((character) => {
    const code = character.codePointAt(0)
    return code < 32 || code === 127 || character === '\\'
  })

export const safeRedirect = (target, fallback = FALLBACK) => {
  if (typeof target !== 'string' || target.length === 0 || target.length > 2000) return fallback
  if (!target.startsWith('/') || target.startsWith('//') || target.startsWith('/\\')) return fallback
  if (hasUnsafeCharacter(target)) return fallback
  // decode once: "/%2F/evil.example" and "/%5Cevil.example" must not slip through
  let decoded
  try {
    decoded = decodeURIComponent(target)
  } catch {
    return fallback
  }
  if (decoded.startsWith('//') || decoded.startsWith('/\\') || hasUnsafeCharacter(decoded)) return fallback
  return target
}
