// '' means same-origin: the dev server and the production host both proxy /api to the API,
// which keeps the refresh-token cookie first-party. Set VITE_API_URL to call an API directly.
const BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')

// required by the API on the cookie-based endpoints (refresh, logout); a custom header
// forces a CORS preflight, which pages on other sites cannot pass
export const CSRF_HEADER = { 'X-Requested-With': 'fetch' }

// The access token lives only in this module's memory (never localStorage), so a script
// injected into the page cannot read it from storage. It is short-lived; the HttpOnly
// refresh cookie, which scripts cannot see, mints a new one.
let accessToken = null
let onSessionLost = () => {}

export const setAccessToken = (token) => {
  accessToken = token
}

// the auth layer registers what should happen when the session cannot be recovered
export const configureClient = (options) => {
  onSessionLost = options.onUnauthorized
}

export class ApiError extends Error {
  constructor(status, message, code) {
    super(message)
    this.status = status
    this.code = code
  }
}

// the API wraps every response: { success: true, data, meta? } or { success: false, error: { code, message, details? } }
// (the string/legacy fallbacks keep this client working against an API that has not been redeployed yet; remove them once it has)
const errorMessage = (body) =>
  typeof body.error === 'string' ? body.error : (body.error?.message ?? body.message)

const friendlyMessage = (status, message) => {
  if (status === 429) return 'Too many attempts, please try again later.'
  return message || 'Something went wrong'
}

// options: { method, body, headers, meta }. A FormData body is sent as multipart (the browser adds the
// boundary header); anything else is JSON. With meta: true the result is { data, meta } instead of just data.
const send = async (path, { method = 'GET', body, headers = {}, meta = false }, token) => {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData
  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      credentials: 'include',
      headers: {
        ...(body !== undefined && !isForm && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...headers,
      },
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'Could not reach the server. Is the API running?')
  }

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new ApiError(res.status, friendlyMessage(res.status, errorMessage(data)), data.error?.code)
  }
  if (data.success !== true) return data
  return meta ? { data: data.data, meta: data.meta } : data.data
}

// Fire-and-forget: tell the server something and never wait, retry or complain (the reading statistics use this).
// `keepalive` lets the request finish while the page is being left. It carries the access token when there is one,
// so the server can leave out an author's own visits; a missing or expired token only means "anonymous".
export const beacon = (path, body) => {
  try {
    fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      keepalive: true,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(accessToken && { Authorization: `Bearer ${accessToken}` }) },
      body: JSON.stringify(body),
    }).catch(() => {})
  } catch {
    // nothing to do: statistics are never worth an error
  }
}

// One refresh at a time: when several requests find the token expired together they share a
// single refresh instead of each rotating the cookie.
let refreshing = null
export const refreshSession = () => {
  refreshing ??= send('/api/auth/refresh', { method: 'POST', headers: CSRF_HEADER }, null)
    .then((data) => {
      accessToken = data.accessToken
      return data
    })
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

// endpoints where a 401 means "wrong credentials", not "your session expired"
const NO_REFRESH_PATHS = ['/api/auth/login', '/api/auth/refresh']

export const request = async (path, options = {}) => {
  const token = accessToken
  try {
    return await send(path, options, token)
  } catch (error) {
    if (error.status !== 401 || !token || NO_REFRESH_PATHS.includes(path)) throw error

    // the access token expired or its session ended: try to recover once, then retry the request
    try {
      await refreshSession()
      return await send(path, options, accessToken)
    } catch (retryError) {
      if (retryError.status === 401 || retryError.status === 403) {
        accessToken = null
        onSessionLost()
        throw error
      }
      throw retryError
    }
  }
}
