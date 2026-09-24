import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from './AuthContext.jsx'
import { useAuth } from './useAuth.js'
import { jsonResponse, setSession } from '../test/utils.jsx'

let auth
function Probe() {
  auth = useAuth()
  return <span>{auth.isAuthenticated ? `in:${auth.user.userName}` : 'out'}</span>
}

const renderAuth = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  )

describe('AuthProvider', () => {
  afterEach(() => vi.restoreAllMocks())

  it('logs in and persists the session to localStorage', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(
      jsonResponse(200, { user: { id: 1, userName: 'ada' }, token: 'abc' }),
    )
    renderAuth()
    expect(screen.getByText('out')).toBeInTheDocument()

    await act(() => auth.login({ email: 'ada@example.com', password: 'password1' }))

    expect(screen.getByText('in:ada')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('blog.auth')).token).toBe('abc')
  })

  it('restores a session from localStorage', () => {
    setSession({ id: 1, userName: 'ada' })
    renderAuth()
    expect(screen.getByText('in:ada')).toBeInTheDocument()
  })

  it('clears the session on logout even if the API call fails', async () => {
    setSession({ id: 1, userName: 'ada' })
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('network down'))
    renderAuth()

    await act(() => auth.logout())

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer test-token')
    expect(screen.getByText('out')).toBeInTheDocument()
    expect(localStorage.getItem('blog.auth')).toBeNull()
  })

  it('surfaces the API error message on failed login', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(jsonResponse(401, { error: 'Invalid email or password' }))
    renderAuth()
    await expect(auth.login({ email: 'a@b.co', password: 'wrongpass' })).rejects.toThrow('Invalid email or password')
  })
})
