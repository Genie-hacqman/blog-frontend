import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, configureClient, request, setAccessToken } from './client.js'
import { errorResponse, jsonResponse, okResponse } from '../test/utils.jsx'

const urlOf = ([url]) => url

describe('api client', () => {
  const onUnauthorized = vi.fn()

  beforeEach(() => {
    onUnauthorized.mockClear()
    configureClient({ onUnauthorized })
  })
  afterEach(() => vi.restoreAllMocks())

  it('unwraps the data of a success envelope', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(okResponse(200, { post: { id: 1 } }))

    await expect(request('/api/posts/1')).resolves.toEqual({ post: { id: 1 } })
  })

  it('throws an ApiError carrying the envelope error message and code', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(errorResponse(404, 'NOT_FOUND', 'Post not found'))

    await expect(request('/api/posts/9')).rejects.toMatchObject({ status: 404, message: 'Post not found', code: 'NOT_FOUND' })
  })

  it('still understands the legacy { error: string } shape', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(jsonResponse(409, { error: 'Email is already taken' }))

    await expect(request('/api/auth/register', { method: 'POST', body: {} })).rejects.toMatchObject({
      message: 'Email is already taken',
    })
  })

  it('always includes credentials so the refresh cookie can travel', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockReturnValue(okResponse(200))

    await request('/api/posts')

    expect(fetchMock.mock.calls[0][1].credentials).toBe('include')
  })

  it('sends the in-memory access token as a bearer header', async () => {
    setAccessToken('tok')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockReturnValue(okResponse(200))

    await request('/api/posts')

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer tok')
  })

  it('refreshes once on a 401 and retries the request with the new token', async () => {
    setAccessToken('expired')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((url, init) => {
      if (url.endsWith('/api/auth/refresh')) return okResponse(200, { user: { id: 1 }, accessToken: 'fresh' })
      return init.headers.Authorization === 'Bearer fresh'
        ? okResponse(200, { ok: true })
        : errorResponse(401, 'UNAUTHORIZED', 'Invalid or expired token')
    })

    await expect(request('/api/posts/1')).resolves.toEqual({ ok: true })

    expect(fetchMock.mock.calls.map(urlOf)).toEqual(['/api/posts/1', '/api/auth/refresh', '/api/posts/1'])
    const refreshInit = fetchMock.mock.calls[1][1]
    expect(refreshInit.method).toBe('POST')
    expect(refreshInit.headers['X-Requested-With']).toBe('fetch')
    expect(refreshInit.headers.Authorization).toBeUndefined()
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('shares one refresh between requests that expire together', async () => {
    setAccessToken('expired')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((url, init) => {
      if (url.endsWith('/api/auth/refresh')) return okResponse(200, { user: { id: 1 }, accessToken: 'fresh' })
      return init.headers.Authorization === 'Bearer fresh'
        ? okResponse(200, { ok: true })
        : errorResponse(401, 'UNAUTHORIZED', 'Invalid or expired token')
    })

    await Promise.all([request('/api/posts/1'), request('/api/posts/2'), request('/api/auth/me')])

    expect(fetchMock.mock.calls.filter((call) => urlOf(call).endsWith('/api/auth/refresh'))).toHaveLength(1)
  })

  it('gives up and ends the session when the refresh is rejected', async () => {
    setAccessToken('expired')
    vi.spyOn(globalThis, 'fetch').mockImplementation((url) =>
      errorResponse(401, 'UNAUTHORIZED', url.endsWith('/refresh') ? 'Session has ended' : 'Invalid or expired token'),
    )

    await expect(request('/api/posts/1')).rejects.toMatchObject({ status: 401, message: 'Invalid or expired token' })

    expect(onUnauthorized).toHaveBeenCalledOnce()
  })

  it('keeps the session when the refresh fails because the server is unreachable', async () => {
    setAccessToken('expired')
    vi.spyOn(globalThis, 'fetch').mockImplementation((url) =>
      url.endsWith('/refresh') ? Promise.reject(new TypeError('network down')) : errorResponse(401, 'UNAUTHORIZED', 'Invalid or expired token'),
    )

    await expect(request('/api/posts/1')).rejects.toMatchObject({ status: 0 })

    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('does not treat a failed login (401) as an expired session', async () => {
    setAccessToken('some-token')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockReturnValue(errorResponse(401, 'UNAUTHORIZED', 'Invalid email or password'))

    await expect(request('/api/auth/login', { method: 'POST', body: {} })).rejects.toMatchObject({
      message: 'Invalid email or password',
    })

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('does not try to refresh when no token was ever sent', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockReturnValue(errorResponse(401, 'UNAUTHORIZED', 'Bearer token is required'))

    await expect(request('/api/posts/1')).rejects.toBeInstanceOf(ApiError)

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('sends a FormData body as multipart, without forcing a JSON content type', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockReturnValue(okResponse(200))
    const form = new FormData()
    form.append('file', new Blob(['x'], { type: 'image/png' }), 'a.png')

    await request('/api/users/me/avatar', { method: 'PUT', body: form })

    const init = fetchMock.mock.calls[0][1]
    expect(init.body).toBe(form)
    expect(init.headers['Content-Type']).toBeUndefined()
  })

  it('returns { data, meta } when asked, so pagination is available', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(
      jsonResponse(200, { success: true, data: { posts: [] }, meta: { pagination: { page: 2, totalPages: 3 } } }),
    )

    await expect(request('/api/posts', { meta: true })).resolves.toEqual({
      data: { posts: [] },
      meta: { pagination: { page: 2, totalPages: 3 } },
    })
  })

  it('replaces the message of a 429 with a friendly one', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(errorResponse(429, 'RATE_LIMITED', 'Too many login attempts.'))

    await expect(request('/api/auth/login', { method: 'POST', body: {} })).rejects.toMatchObject({
      status: 429,
      message: 'Too many attempts, please try again later.',
    })
  })

  it('reports a network failure as status 0', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('network down'))

    await expect(request('/api/posts')).rejects.toMatchObject({ status: 0 })
  })
})
