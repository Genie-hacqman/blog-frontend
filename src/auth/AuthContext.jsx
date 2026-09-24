import { useCallback, useEffect, useMemo, useState } from 'react'
import { configureClient } from '../api/client.js'
import * as authApi from '../api/auth.js'
import { AuthContext } from './authContextObject.js'

const STORAGE_KEY = 'blog.auth'

const loadSession = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? { user: null, token: null }
  } catch {
    return { user: null, token: null }
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(loadSession)

  const saveSession = useCallback((next) => {
    setSession(next)
    if (next.token) localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    else localStorage.removeItem(STORAGE_KEY)
  }, [])

  const clearSession = useCallback(() => saveSession({ user: null, token: null }), [saveSession])

  useEffect(() => {
    configureClient({ getToken: () => session.token, onUnauthorized: clearSession })
  }, [session.token, clearSession])

  const login = useCallback(
    async (credentials) => {
      const { user, token } = await authApi.login(credentials)
      // configure immediately so requests fired before the effect runs are authenticated
      configureClient({ getToken: () => token, onUnauthorized: clearSession })
      saveSession({ user, token })
      return user
    },
    [saveSession, clearSession],
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // the local session is cleared regardless of whether the server call succeeded
    }
    clearSession()
  }, [clearSession])

  const value = useMemo(
    () => ({ user: session.user, token: session.token, isAuthenticated: !!session.token, login, logout }),
    [session, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
