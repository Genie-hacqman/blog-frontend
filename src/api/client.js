const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

// the auth layer registers these so the client can attach the token and react to 401s
let getToken = () => null
let onUnauthorized = () => {}

export const configureClient = (options) => {
  getToken = options.getToken
  onUnauthorized = options.onUnauthorized
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const friendlyMessage = (status, message) => {
  if (status === 429) return 'Too many attempts, please try again later.'
  return message || 'Something went wrong'
}

export const request = async (path, { method = 'GET', body, headers = {} } = {}) => {
  const token = getToken()
  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Could not reach the server. Is the API running?')
  }

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    // a 401 on an authenticated request means the token is expired or revoked
    if (res.status === 401 && token) onUnauthorized()
    throw new ApiError(res.status, friendlyMessage(res.status, data.error ?? data.message))
  }
  return data
}
