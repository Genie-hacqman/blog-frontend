import { act, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from './AuthContext.jsx'
import { useAuth } from './useAuth.js'
import { request } from '../api/client.js'
import { errorResponse, mockFetch, okResponse, settle } from '../test/utils.jsx'

let auth
function Probe() {
  const value = useAuth()
  // the tests call login/logout through this handle
  auth = value
  return <span>{value.isLoading ? 'loading' : value.isAuthenticated ? `in:${value.user.userName}` : 'out'}</span>
}

const renderAuth = (queryClient = new QueryClient()) =>
  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  )

const ada = { id: 1, userName: 'ada', role: 'author', emailVerified: true }

describe('AuthProvider', () => {
  afterEach(() => vi.restoreAllMocks())

  it('logs in, keeps the token out of storage, and sends it on later requests', async () => {
    const fetchMock = mockFetch({
      'POST /api/auth/login': () => okResponse(200, { user: ada, accessToken: 'abc' }),
      'GET /api/posts': () => okResponse(200, { posts: [] }),
    })
    renderAuth()
    expect(screen.getByText('out')).toBeInTheDocument()

    await act(() => auth.login({ email: 'ada@example.com', password: 'password1' }))

    expect(screen.getByText('in:ada')).toBeInTheDocument()
    expect(JSON.stringify({ ...localStorage })).not.toContain('abc')
    expect(localStorage.getItem('blog.session')).toBe('1')

    await request('/api/posts')
    const call = fetchMock.mock.calls.find(([url]) => url.endsWith('/api/posts'))
    expect(call[1].headers.Authorization).toBe('Bearer abc')
    expect(call[1].credentials).toBe('include')
  })

  it('restores a remembered session through the refresh cookie, showing loading meanwhile', async () => {
    mockFetch({}, { user: ada })
    renderAuth()
    expect(screen.getByText('loading')).toBeInTheDocument()

    await settle()

    expect(screen.getByText('in:ada')).toBeInTheDocument()
  })

  it('forgets the hint when the server rejects the remembered session', async () => {
    mockFetch({ 'POST /api/auth/refresh': () => errorResponse(401, 'UNAUTHORIZED', 'Session has ended') })
    localStorage.setItem('blog.session', '1')
    renderAuth()

    await settle()

    expect(screen.getByText('out')).toBeInTheDocument()
    expect(localStorage.getItem('blog.session')).toBeNull()
  })

  it('keeps the hint when the server is merely unreachable, so the next load can retry', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('network down'))
    localStorage.setItem('blog.session', '1')
    renderAuth()

    await settle()

    expect(screen.getByText('out')).toBeInTheDocument()
    expect(localStorage.getItem('blog.session')).toBe('1')
  })

  it('clears the session and cached data on logout, even if the API call fails', async () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(['posts', 7], { title: 'private story' })
    mockFetch({ 'POST /api/auth/logout': () => Promise.reject(new TypeError('network down')) }, { user: ada })
    renderAuth(queryClient)
    await settle()

    await act(() => auth.logout())

    expect(screen.getByText('out')).toBeInTheDocument()
    expect(localStorage.getItem('blog.session')).toBeNull()
    expect(queryClient.getQueryData(['posts', 7])).toBeUndefined()
  })

  it('sends the CSRF header with logout', async () => {
    const fetchMock = mockFetch({ 'POST /api/auth/logout': () => okResponse(200) }, { user: ada })
    renderAuth()
    await settle()

    await act(() => auth.logout())

    const call = fetchMock.mock.calls.find(([url]) => url.endsWith('/api/auth/logout'))
    expect(call[1].headers['X-Requested-With']).toBe('fetch')
  })

  it('ends the session when a request fails with 401 and the refresh is rejected too', async () => {
    mockFetch(
      {
        'GET /api/auth/me': () => errorResponse(401, 'UNAUTHORIZED', 'Session has ended'),
      },
      { user: ada },
    )
    renderAuth()
    await settle()
    // after boot the refresh route now rejects
    globalThis.fetch.mockImplementation((url) =>
      errorResponse(401, 'UNAUTHORIZED', url.includes('refresh') ? 'Session has ended' : 'Invalid or expired token'),
    )

    await expect(request('/api/auth/me')).rejects.toThrow('Invalid or expired token')
    await settle()

    expect(screen.getByText('out')).toBeInTheDocument()
  })

  it('surfaces the API error message on failed login', async () => {
    mockFetch({ 'POST /api/auth/login': () => errorResponse(401, 'UNAUTHORIZED', 'Invalid email or password') })
    renderAuth()
    await expect(auth.login({ email: 'a@b.co', password: 'wrongpass' })).rejects.toThrow('Invalid email or password')
  })
})
