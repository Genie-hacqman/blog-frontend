import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { configureClient, refreshSession, setAccessToken } from '../api/client.js'
import * as authApi from '../api/auth.js'
import { AuthContext } from './authContextObject.js'

// A non-secret hint that this browser has had a session, so signed-out visitors do not
// call /refresh on every page load. The credentials themselves are the HttpOnly cookie
// (invisible to scripts) and the access token (memory only).
const SESSION_HINT = 'blog.session'

const hasHint = () => {
  try {
    return localStorage.getItem(SESSION_HINT) === '1'
  } catch {
    return false
  }
}

const setHint = (on) => {
  try {
    if (on) localStorage.setItem(SESSION_HINT, '1')
    else localStorage.removeItem(SESSION_HINT)
  } catch {
    // storage unavailable: the session just will not be restored on reload
  }
}

export function AuthProvider({ children }) {
  const queryClient = useQueryClient()
  // 'loading' only while a remembered session is being restored
  const [state, setState] = useState(() => ({ status: hasHint() ? 'loading' : 'anonymous', user: null }))

  // endedBy records why a session ended on purpose ('deleted' = the account was removed), so a
  // protected page can send the visitor somewhere sensible instead of to the login form
  const clearSession = useCallback((endedBy = null) => {
    setAccessToken(null)
    setHint(false)
    // nothing fetched for the previous user may linger in memory
    queryClient.clear()
    setState({ status: 'anonymous', user: null, endedBy })
  }, [queryClient])

  useEffect(() => {
    configureClient({ onUnauthorized: () => clearSession() })
  }, [clearSession])

  // restore the session after a reload: the cookie mints a fresh access token
  useEffect(() => {
    if (!hasHint()) return
    let cancelled = false
    refreshSession()
      .then(({ user }) => {
        if (!cancelled) setState({ status: 'authenticated', user })
      })
      .catch((error) => {
        if (cancelled) return
        // only a rejected session forgets the hint; an unreachable server may recover on the next load
        if (error.status === 401 || error.status === 403) setHint(false)
        setState({ status: 'anonymous', user: null })
      })
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (credentials) => {
    const { user, accessToken } = await authApi.login(credentials)
    setAccessToken(accessToken)
    setHint(true)
    setState({ status: 'authenticated', user, endedBy: null })
    return user
  }, [])

  const logout = useCallback(async ({ endedBy } = {}) => {
    try {
      await authApi.logout()
    } catch {
      // the local session is cleared regardless of whether the server call succeeded
    }
    clearSession(endedBy)
  }, [clearSession])

  // ends every session of this account, this one included
  const logoutEverywhere = useCallback(async () => {
    await authApi.logoutAll()
    clearSession()
  }, [clearSession])

  const updateUser = useCallback((user) => setState((s) => (s.status === 'authenticated' ? { ...s, user } : s)), [])

  const reloadUser = useCallback(async () => updateUser(await authApi.me()), [updateUser])

  const value = useMemo(
    () => ({
      user: state.user,
      isAuthenticated: state.status === 'authenticated',
      isLoading: state.status === 'loading',
      endedBy: state.endedBy ?? null,
      login,
      logout,
      logoutEverywhere,
      updateUser,
      reloadUser,
    }),
    [state, login, logout, logoutEverywhere, updateUser, reloadUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
