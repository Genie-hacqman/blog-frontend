import { Fragment, StrictMode } from 'react'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'
import { AuthProvider } from '../auth/AuthContext.jsx'
import LocationDisplay from './LocationDisplay.jsx'

export const jsonResponse = (status, body) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))

// a paginated list in the API's envelope: { data: { posts }, meta: { pagination } }
export const pageResponse = (posts, pagination = { page: 1, limit: 10, total: posts.length, totalPages: 1 }) =>
  jsonResponse(200, { success: true, data: { posts }, meta: { pagination } })

// the API's response envelope
export const okResponse = (status, data = null) => jsonResponse(status, { success: true, data })
export const errorResponse = (status, code, message) =>
  jsonResponse(status, { success: false, error: { code, message } })

// Routes fetch calls by "METHOD /path" to handler functions (a Response body can only be read
// once, so each call must build a fresh one). Unmocked calls fail with a 404 so a test never
// silently talks to a real server. Pass { user } to start with a remembered, restorable session:
// the refresh call then returns that user.
export const mockFetch = (routes = {}, { user, accessToken = 'test-token' } = {}) => {
  const table = { ...routes }
  if (user) {
    localStorage.setItem('blog.session', '1')
    table['POST /api/auth/refresh'] ??= () => okResponse(200, { user, accessToken })
  }
  return vi.spyOn(globalThis, 'fetch').mockImplementation((url, init = {}) => {
    const key = `${init.method ?? 'GET'} ${new URL(url, 'http://localhost').pathname}`
    const handler = table[key]
    return handler ? handler(init) : errorResponse(404, 'NOT_FOUND', `No mock for ${key}`)
  })
}

// type into the story editor (it loads on demand, so wait for it first)
export const typeInEditor = async (text) => {
  const editor = await screen.findByRole('textbox', { name: 'Content' })
  await userEvent.click(editor)
  await userEvent.keyboard(text)
}

// let pending promises (such as a session restore) finish and React flush the result
export const settle = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)))

export const readerUser = { id: 2, userName: 'bob', role: 'author', emailVerified: true }

export const renderWithProviders = (ui, { route = '/', path = '*', routes = null, strict = false } = {}) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const Wrapper = strict ? StrictMode : Fragment
  return render(
    <Wrapper>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path={path} element={ui} />
            {routes}
          </Routes>
          <LocationDisplay />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
    </Wrapper>,
  )
}
