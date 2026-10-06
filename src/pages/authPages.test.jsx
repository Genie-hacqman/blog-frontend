import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ForgotPasswordPage from './ForgotPasswordPage.jsx'
import ResetPasswordPage from './ResetPasswordPage.jsx'
import VerifyEmailPage from './VerifyEmailPage.jsx'
import ChangePasswordPage from './ChangePasswordPage.jsx'
import NewPostPage from './NewPostPage.jsx'
import LoginPage from './LoginPage.jsx'
import VerificationBanner from '../components/VerificationBanner.jsx'
import ProtectedRoute from '../auth/ProtectedRoute.jsx'
import { errorResponse, mockFetch, okResponse, readerUser, renderWithProviders, settle } from '../test/utils.jsx'

const bodyOf = (fetchMock, path) => {
  const call = fetchMock.mock.calls.find(([url]) => url.endsWith(path))
  return call && JSON.parse(call[1].body)
}

describe('ForgotPasswordPage', () => {
  afterEach(() => vi.restoreAllMocks())

  it('sends the email and shows the same message whatever the server knows', async () => {
    const fetchMock = mockFetch({ 'POST /api/auth/forgot-password': () => okResponse(200, { message: 'x' }) })
    renderWithProviders(<ForgotPasswordPage />)

    await userEvent.type(screen.getByLabelText('Email'), 'ada@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))

    expect(await screen.findByText(/If that email has an account/)).toBeInTheDocument()
    expect(bodyOf(fetchMock, '/api/auth/forgot-password')).toEqual({ email: 'ada@example.com' })
  })

  it('validates the email before calling the API', async () => {
    const fetchMock = mockFetch()
    renderWithProviders(<ForgotPasswordPage />)

    await userEvent.type(screen.getByLabelText('Email'), 'not-an-email')
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))

    expect(await screen.findByText('Enter a valid email')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('ResetPasswordPage', () => {
  afterEach(() => vi.restoreAllMocks())

  const renderReset = (route = '/reset-password?token=abc123') =>
    renderWithProviders(<ResetPasswordPage />, {
      route,
      path: '/reset-password',
      routes: <Route path="/login" element={<LoginPage />} />,
    })

  it('takes the token out of the address bar, then posts it with the new password and goes to log in', async () => {
    const fetchMock = mockFetch({ 'POST /api/auth/reset-password': () => okResponse(200) })
    renderReset()

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/reset-password$/))

    await userEvent.type(screen.getByLabelText('New password'), 'a brand new password')
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'a brand new password')
    await userEvent.click(screen.getByRole('button', { name: 'Reset password' }))

    expect(await screen.findByText(/Your password was reset/)).toBeInTheDocument()
    expect(bodyOf(fetchMock, '/api/auth/reset-password')).toEqual({ token: 'abc123', password: 'a brand new password' })
    expect(screen.getByTestId('location')).toHaveTextContent('/login')
  })

  it('rejects mismatched passwords without calling the API', async () => {
    const fetchMock = mockFetch()
    renderReset()

    await userEvent.type(screen.getByLabelText('New password'), 'a brand new password')
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'something different')
    await userEvent.click(screen.getByRole('button', { name: 'Reset password' }))

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows the server error for an expired link', async () => {
    mockFetch({ 'POST /api/auth/reset-password': () => errorResponse(400, 'INVALID_TOKEN', 'This link is invalid or has expired') })
    renderReset()

    await userEvent.type(screen.getByLabelText('New password'), 'a brand new password')
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'a brand new password')
    await userEvent.click(screen.getByRole('button', { name: 'Reset password' }))

    expect(await screen.findByText('This link is invalid or has expired')).toBeInTheDocument()
  })

  it('explains a link that has no token', () => {
    mockFetch()
    renderReset('/reset-password')

    expect(screen.getByText(/missing its token/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reset password' })).not.toBeInTheDocument()
  })
})

describe('VerifyEmailPage', () => {
  afterEach(() => vi.restoreAllMocks())

  it('verifies once, even under StrictMode, and removes the token from the URL', async () => {
    const fetchMock = mockFetch({ 'POST /api/auth/verify-email': () => okResponse(200) })
    renderWithProviders(<VerifyEmailPage />, { route: '/verify-email?token=tok-1', path: '/verify-email', strict: true })

    expect(await screen.findByText(/Your email address is confirmed/)).toBeInTheDocument()
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/api/auth/verify-email'))).toHaveLength(1)
    expect(bodyOf(fetchMock, '/api/auth/verify-email')).toEqual({ token: 'tok-1' })
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/verify-email$/)
  })

  it('shows the server message when the link is invalid', async () => {
    mockFetch({ 'POST /api/auth/verify-email': () => errorResponse(400, 'INVALID_TOKEN', 'This link is invalid or has expired') })
    renderWithProviders(<VerifyEmailPage />, { route: '/verify-email?token=old', path: '/verify-email' })

    expect(await screen.findByText('This link is invalid or has expired')).toBeInTheDocument()
  })

  it('explains a link without a token and makes no request', () => {
    const fetchMock = mockFetch()
    renderWithProviders(<VerifyEmailPage />, { route: '/verify-email', path: '/verify-email' })

    expect(screen.getByText(/missing its token/)).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refreshes a signed-in reader so the banner and permissions update', async () => {
    const unverified = { ...readerUser, emailVerified: false }
    const fetchMock = mockFetch(
      {
        'POST /api/auth/verify-email': () => okResponse(200),
        'GET /api/auth/me': () => okResponse(200, { user: { ...unverified, emailVerified: true } }),
      },
      { user: unverified },
    )
    renderWithProviders(
      <>
        <VerificationBanner />
        <VerifyEmailPage />
      </>,
      { route: '/verify-email?token=tok-2', path: '/verify-email' },
    )

    expect(await screen.findByText(/Your email address is confirmed/)).toBeInTheDocument()
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url.endsWith('/api/auth/me'))).toBe(true))
    await waitFor(() => expect(screen.queryByText(/Confirm your email address to start writing/)).not.toBeInTheDocument())
  })
})

describe('VerificationBanner', () => {
  afterEach(() => vi.restoreAllMocks())

  it('lets an unverified reader resend the link', async () => {
    mockFetch(
      { 'POST /api/auth/resend-verification': () => okResponse(200) },
      { user: { ...readerUser, emailVerified: false, email: 'bob@example.com' } },
    )
    renderWithProviders(<VerificationBanner />)

    await userEvent.click(await screen.findByRole('button', { name: 'Resend email' }))

    expect(await screen.findByText(/Sent. Check your inbox/)).toBeInTheDocument()
  })

  it('stays out of the way for verified readers and visitors', async () => {
    mockFetch({}, { user: readerUser })
    renderWithProviders(<VerificationBanner />)
    await settle()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})

describe('ChangePasswordPage', () => {
  afterEach(() => vi.restoreAllMocks())

  it('sends the current and new password and confirms', async () => {
    const fetchMock = mockFetch({ 'POST /api/auth/change-password': () => okResponse(200) }, { user: readerUser })
    renderWithProviders(<ChangePasswordPage />)

    await userEvent.type(screen.getByLabelText('Current password'), 'old password')
    await userEvent.type(screen.getByLabelText('New password'), 'new password 123')
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'new password 123')
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }))

    expect(await screen.findByText(/Password changed/)).toBeInTheDocument()
    expect(bodyOf(fetchMock, '/api/auth/change-password')).toEqual({ currentPassword: 'old password', newPassword: 'new password 123' })
    expect(screen.getByLabelText('Current password')).toHaveValue('')
  })

  it('shows "current password is incorrect" without ending the session', async () => {
    mockFetch(
      { 'POST /api/auth/change-password': () => errorResponse(400, 'INVALID_PASSWORD', 'Current password is incorrect') },
      { user: readerUser },
    )
    renderWithProviders(
      <ProtectedRoute>
        <ChangePasswordPage />
      </ProtectedRoute>,
    )

    await userEvent.type(await screen.findByLabelText('Current password'), 'wrong')
    await userEvent.type(screen.getByLabelText('New password'), 'new password 123')
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'new password 123')
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }))

    expect(await screen.findByText('Current password is incorrect')).toBeInTheDocument()
    expect(screen.getByLabelText('Current password')).toBeInTheDocument()
  })
})

describe('NewPostPage for readers', () => {
  afterEach(() => vi.restoreAllMocks())

  it('offers a verified reader the upgrade, then shows the editor', async () => {
    mockFetch(
      { 'POST /api/users/me/become-author': () => okResponse(200, { user: { ...readerUser, role: 'author' } }) },
      { user: { ...readerUser, role: 'user' } },
    )
    renderWithProviders(<NewPostPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Become an author' }))

    expect(await screen.findByRole('button', { name: 'Save draft' })).toBeInTheDocument()
  })

  it('asks an unverified reader to confirm their email first', async () => {
    mockFetch({}, { user: { ...readerUser, role: 'user', emailVerified: false } })
    renderWithProviders(<NewPostPage />)

    expect(await screen.findByRole('button', { name: 'Become an author' })).toBeDisabled()
    expect(screen.getByText(/Confirm your email address first/)).toBeInTheDocument()
  })

  it('shows the editor straight away to authors', async () => {
    mockFetch({}, { user: readerUser })
    renderWithProviders(<NewPostPage />)

    expect(await screen.findByRole('button', { name: 'Save draft' })).toBeInTheDocument()
  })
})

describe('ProtectedRoute', () => {
  afterEach(() => vi.restoreAllMocks())

  it('waits for a remembered session instead of bouncing to /login', async () => {
    let finishRefresh
    mockFetch(
      {
        'POST /api/auth/refresh': () =>
          new Promise((resolve) => {
            finishRefresh = () => resolve(new Response(JSON.stringify({ success: true, data: { user: readerUser, accessToken: 't' } }), { status: 200 }))
          }),
      },
      { user: readerUser },
    )
    renderWithProviders(
      <ProtectedRoute>
        <p>secret page</p>
      </ProtectedRoute>,
      { route: '/secret', path: '/secret', routes: <Route path="/login" element={<p>login page</p>} /> },
    )

    expect(screen.queryByText('login page')).not.toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument()

    finishRefresh()

    expect(await screen.findByText('secret page')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/secret')
  })
})
