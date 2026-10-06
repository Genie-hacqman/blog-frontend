import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SessionsSection from '../components/SessionsSection.jsx'
import ChangePasswordPage from '../pages/ChangePasswordPage.jsx'
import LoginPage from '../pages/LoginPage.jsx'
import RegisterPage from '../pages/RegisterPage.jsx'
import SettingsPage from '../pages/SettingsPage.jsx'
import { safeRedirect } from '../lib/safeRedirect.js'
import { PASSWORD_HINT } from '../lib/passwordHint.js'
import { errorResponse, mockFetch, okResponse, readerUser, renderWithProviders } from '../test/utils.jsx'

const read = (file) => readFileSync(resolve(process.cwd(), file), 'utf8')
const reader = { ...readerUser, id: 2, userName: 'bob', role: 'user' }

afterEach(() => vi.restoreAllMocks())

describe('safeRedirect', () => {
  it('keeps a path on this site, with its query and fragment', () => {
    for (const path of ['/', '/blog/a-story', '/posts/7/edit', '/search?q=cats&page=2', '/u/ada_l#top']) expect(safeRedirect(path)).toBe(path)
  })

  it('sends everything that could lead somewhere else to the front page', () => {
    for (const bad of [
      '//evil.example',
      '//evil.example/path',
      '/\\evil.example',
      '\\\\evil.example',
      'https://evil.example',
      'http://localhost:5173/x',
      'javascript:alert(1)',
      'data:text/html,hi',
      '/%2Fevil.example',
      '/%5Cevil.example',
      '/ok\nHeader: injected',
      '/ok\u0000',
      'evil.example',
      '',
      null,
      undefined,
      42,
      {},
    ]) {
      expect(safeRedirect(bad), String(bad)).toBe('/')
    }
  })

  it('refuses a malformed encoding and an absurdly long value, and honours another fallback', () => {
    expect(safeRedirect('/%E0%A4%A')).toBe('/')
    expect(safeRedirect(`/${'a'.repeat(2500)}`)).toBe('/')
    expect(safeRedirect('//evil.example', '/home')).toBe('/home')
  })
})

describe('signing in', () => {
  it('goes back to the page the person came from', async () => {
    mockFetch({ 'POST /api/auth/login': () => okResponse(200, { user: reader, accessToken: 't' }) })
    renderWithProviders(<LoginPage />, { route: { pathname: '/login', state: { from: '/blog/a-story' } }, path: '/login', routes: <Route path="/blog/:slug" element={<p>the story</p>} /> })
    await userEvent.type(screen.getByLabelText('Email'), 'bob@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'secret-secret-1')
    await userEvent.click(screen.getByRole('button', { name: /log in/i }))
    expect(await screen.findByText('the story')).toBeInTheDocument()
  })

  it('never follows a "from" that leads off the site', async () => {
    mockFetch({ 'POST /api/auth/login': () => okResponse(200, { user: reader, accessToken: 't' }) })
    renderWithProviders(<LoginPage />, { route: { pathname: '/login', state: { from: '//evil.example/steal' } }, path: '/login', routes: <Route path="/" element={<p>front page</p>} /> })
    await userEvent.type(screen.getByLabelText('Email'), 'bob@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'secret-secret-1')
    await userEvent.click(screen.getByRole('button', { name: /log in/i }))
    expect(await screen.findByText('front page')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/')
  })
})

describe('passwords', () => {
  it('tells people up front what is accepted, wherever a new password is chosen', async () => {
    mockFetch({})
    const register = renderWithProviders(<RegisterPage />, { route: '/register', path: '/register' })
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(PASSWORD_HINT)
    register.unmount()

    mockFetch({}, { user: reader })
    renderWithProviders(<ChangePasswordPage />, { route: '/account/password', path: '/account/password' })
    expect(screen.getByLabelText('New password')).toHaveAccessibleDescription(PASSWORD_HINT)
  })

  it('shows the API’s reason when it refuses a new password', async () => {
    mockFetch({ 'POST /api/auth/change-password': () => errorResponse(400, 'VALIDATION_ERROR', 'that password is too common: choose one that is harder to guess') }, { user: reader })
    renderWithProviders(<ChangePasswordPage />, { route: '/account/password', path: '/account/password' })
    await userEvent.type(screen.getByLabelText('Current password'), 'old-password-1')
    await userEvent.type(screen.getByLabelText('New password'), 'sunshine99')
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'sunshine99')
    await userEvent.click(screen.getByRole('button', { name: /change password/i }))
    expect(await screen.findByText(/too common/)).toBeInTheDocument()
  })
})

describe('where you are signed in', () => {
  const session = (id, device, overrides = {}) => ({ id, current: false, device, ipArea: '203.0.113.0/24', createdAt: '2026-10-01T10:00:00.000Z', lastUsedAt: '2026-10-05T10:00:00.000Z', ...overrides })
  const sessions = [session('a'.repeat(32), 'Safari on iOS', { current: true }), session('b'.repeat(32), 'Firefox on Linux'), session('c'.repeat(32), 'Chrome on macOS')]
  const render = () => renderWithProviders(<SessionsSection />, { route: '/settings', path: '/settings' })

  it('lists the devices, marks this one and offers to sign out only the others', async () => {
    mockFetch({ 'GET /api/auth/sessions': () => okResponse(200, { sessions }) }, { user: reader })
    render()

    expect(await screen.findByText('Safari on iOS')).toBeInTheDocument()
    expect(screen.getByText('This device')).toBeInTheDocument()
    expect(screen.getAllByText(/203\.0\.113\.0\/24/)).toHaveLength(3)
    expect(screen.queryByRole('button', { name: 'Sign out Safari on iOS' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign out Firefox on Linux' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign out Chrome on macOS' })).toBeInTheDocument()
  })

  it('removes a session at once and asks the server to end it', async () => {
    let ended = false
    const fetchMock = mockFetch(
      {
        'GET /api/auth/sessions': () => okResponse(200, { sessions: ended ? sessions.filter((s) => !s.id.startsWith('b')) : sessions }),
        [`DELETE /api/auth/sessions/${'b'.repeat(32)}`]: () => {
          ended = true
          return okResponse(200, { endedCurrent: false })
        },
      },
      { user: reader },
    )
    render()
    await userEvent.click(await screen.findByRole('button', { name: 'Sign out Firefox on Linux' }))

    await waitFor(() => expect(screen.queryByText('Firefox on Linux')).not.toBeInTheDocument())
    expect(fetchMock.mock.calls.some(([url, init]) => init?.method === 'DELETE' && url.endsWith(`/api/auth/sessions/${'b'.repeat(32)}`))).toBe(true)
    expect(screen.getByText('Chrome on macOS')).toBeInTheDocument()
  })

  it('puts the session back, with the reason, when the server refuses', async () => {
    mockFetch(
      {
        'GET /api/auth/sessions': () => okResponse(200, { sessions }),
        [`DELETE /api/auth/sessions/${'b'.repeat(32)}`]: () => errorResponse(404, 'NOT_FOUND', 'Session not found'),
      },
      { user: reader },
    )
    render()
    await userEvent.click(await screen.findByRole('button', { name: 'Sign out Firefox on Linux' }))

    expect(await screen.findByText('Session not found')).toBeInTheDocument()
    expect(screen.getByText('Firefox on Linux')).toBeInTheDocument()
  })

  it('renders hostile text as text', async () => {
    const hostile = '<img src=x onerror=alert(1)>'
    mockFetch({ 'GET /api/auth/sessions': () => okResponse(200, { sessions: [session('d'.repeat(32), hostile, { current: true })] }) }, { user: reader })
    const { container } = render()
    expect(await screen.findByText(hostile)).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
  })

  it('shows an error instead of a blank section when the list cannot be loaded', async () => {
    mockFetch({ 'GET /api/auth/sessions': () => errorResponse(500, 'INTERNAL_ERROR', 'Something went wrong') }, { user: reader })
    render()
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong')
    expect(screen.getByRole('button', { name: 'Sign out everywhere' })).toBeInTheDocument()
  })

  it('signs out of every device and leaves the settings page', async () => {
    const fetchMock = mockFetch({ 'GET /api/auth/sessions': () => okResponse(200, { sessions }), 'POST /api/auth/logout-all': () => okResponse(200) }, { user: reader })
    renderWithProviders(<SettingsPage />, { route: '/settings', path: '/settings' })
    await userEvent.click(await screen.findByRole('button', { name: 'Sign out everywhere' }))
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url.endsWith('/api/auth/logout-all'))).toBe(true))
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Where you are signed in' })).not.toBeInTheDocument())
  })
})

describe('the page and its headers', () => {
  it('has no inline script and no inline event handler, so a strict script policy works', () => {
    const html = read('index.html')
    const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    expect(scripts.length).toBeGreaterThan(0)
    for (const [, attributes, body] of scripts) {
      expect(attributes, 'every script is loaded from a file').toMatch(/\bsrc=/)
      expect(body.trim()).toBe('')
    }
    expect(html).not.toMatch(/\son[a-z]+\s*=/i)
    expect(html).not.toMatch(/javascript:/i)
    expect(html).toContain('src="/theme-init.js"')
  })

  describe('theme-init.js', () => {
    beforeEach(() => {
      delete document.documentElement.dataset.theme
      localStorage.clear()
    })
    const run = () => new Function(read('public/theme-init.js'))()

    it('applies a saved theme', () => {
      localStorage.setItem('blog.theme', 'dark')
      run()
      expect(document.documentElement.dataset.theme).toBe('dark')
    })

    it('ignores anything else, including markup', () => {
      for (const value of ['purple', '<script>', '', 'DARK']) {
        localStorage.setItem('blog.theme', value)
        run()
        expect(document.documentElement.dataset.theme).toBeUndefined()
      }
    })

    it('does nothing, and does not throw, when storage is blocked', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('blocked')
      })
      expect(run).not.toThrow()
      expect(document.documentElement.dataset.theme).toBeUndefined()
    })
  })

  describe('vercel.json', () => {
    const config = JSON.parse(read('vercel.json'))
    const headers = Object.fromEntries(config.headers.find((rule) => rule.source === '/(.*)').headers.map(({ key, value }) => [key, value]))
    const directives = Object.fromEntries(
      headers['Content-Security-Policy-Report-Only'].split(';').map((part) => {
        const [name, ...values] = part.trim().split(/\s+/)
        return [name, values]
      }),
    )

    it('sends the protective headers on every page', () => {
      expect(headers['X-Content-Type-Options']).toBe('nosniff')
      expect(headers['X-Frame-Options']).toBe('DENY')
      expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
      expect(headers['Strict-Transport-Security']).toMatch(/max-age=\d{8,}/)
      expect(headers['Cross-Origin-Opener-Policy']).toBe('same-origin')
      for (const feature of ['camera', 'microphone', 'geolocation', 'payment', 'usb']) expect(headers['Permissions-Policy']).toContain(`${feature}=()`)
    })

    it('has a strict content policy, reported before it is enforced', () => {
      expect(directives['default-src']).toEqual(["'self'"])
      expect(directives['script-src']).toEqual(["'self'"])
      expect(directives['object-src']).toEqual(["'none'"])
      expect(directives['base-uri']).toEqual(["'self'"])
      expect(directives['form-action']).toEqual(["'self'"])
      expect(directives['frame-ancestors']).toEqual(["'none'"])
      expect(directives['report-uri']).toEqual(['/api/security/csp-report'])
      const all = Object.values(directives).flat()
      expect(all).not.toContain("'unsafe-eval'")
      expect(all).not.toContain('*')
      expect(directives['script-src']).not.toContain("'unsafe-inline'")
      expect(headers).not.toHaveProperty('Content-Security-Policy')
    })

    it('allows what the page really loads: its own files, the font host and the pictures people upload', () => {
      expect(directives['style-src']).toEqual(expect.arrayContaining(["'self'", 'https://fonts.googleapis.com']))
      expect(directives['font-src']).toEqual(expect.arrayContaining(["'self'", 'https://fonts.gstatic.com']))
      expect(directives['img-src']).toEqual(expect.arrayContaining(["'self'", 'https:']))
      const html = read('index.html')
      for (const [, host] of html.matchAll(/https:\/\/([a-z.]+)/g)) {
        if (host.endsWith('.googleapis.com') || host.endsWith('.gstatic.com')) continue
        expect.fail(`index.html loads from ${host}, which the policy does not allow`)
      }
    })

    it('still sends every page to the app', () => {
      expect(config.rewrites.at(-1)).toEqual({ source: '/(.*)', destination: '/index.html' })
    })
  })
})
