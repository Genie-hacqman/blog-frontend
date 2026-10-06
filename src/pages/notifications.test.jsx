import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import NotificationsPage from './NotificationsPage.jsx'
import UnsubscribePage from './UnsubscribePage.jsx'
import NotificationBell from '../components/NotificationBell.jsx'
import NotificationPreferences from '../components/NotificationPreferences.jsx'
import { errorResponse, jsonResponse, mockFetch, okResponse, readerUser, renderWithProviders } from '../test/utils.jsx'

const reader = { ...readerUser, id: 2, userName: 'bob' }

const note = (id, type, extra = {}) => ({
  id,
  type,
  actor: { id: 5, username: 'cy', avatarUrl: null },
  post: { id: 7, slug: 'my-post', title: 'My post' },
  comment: null,
  readAt: null,
  createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  ...extra,
})

const listResponse = (notifications, { page = 1, totalPages = 1, unreadCount = notifications.filter((n) => !n.readAt).length } = {}) =>
  jsonResponse(200, { success: true, data: { notifications }, meta: { pagination: { page, limit: 20, total: notifications.length, totalPages }, unreadCount } })

const calls = (fetchMock, method, suffix) =>
  fetchMock.mock.calls.filter(([url, init]) => new URL(url, 'http://x').pathname.endsWith(suffix) && (init?.method ?? 'GET') === method)
const lastBody = (fetchMock, method, suffix) => JSON.parse(calls(fetchMock, method, suffix).at(-1)[1].body)

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('the bell', () => {
  const renderBell = () => renderWithProviders(<NotificationBell />)

  it('shows nothing to a signed-out visitor, and does not ask the server for a count', async () => {
    const fetchMock = mockFetch()
    renderBell()

    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(screen.queryByRole('link', { name: /Notifications/ })).not.toBeInTheDocument()
    expect(calls(fetchMock, 'GET', '/unread-count')).toHaveLength(0)
  })

  it('links to the inbox, and names the number of unread notifications', async () => {
    mockFetch({ 'GET /api/notifications/unread-count': () => okResponse(200, { unreadCount: 3 }) }, { user: reader })
    renderBell()

    const link = await screen.findByRole('link', { name: 'Notifications, 3 unread' })
    expect(link).toHaveAttribute('href', '/notifications')
    expect(within(link).getByText('3')).toBeInTheDocument()
  })

  it('has no number when there is nothing unread, and caps a long one', async () => {
    mockFetch({ 'GET /api/notifications/unread-count': () => okResponse(200, { unreadCount: 0 }) }, { user: reader })
    const { unmount } = renderBell()
    const link = await screen.findByRole('link', { name: 'Notifications' })
    expect(link).toHaveTextContent(/^Alerts$/)
    unmount()

    mockFetch({ 'GET /api/notifications/unread-count': () => okResponse(200, { unreadCount: 250 }) }, { user: reader })
    renderBell()
    expect(await screen.findByRole('link', { name: 'Notifications, 250 unread' })).toHaveTextContent('99+')
  })

  it('asks again every minute', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
    let count = 1
    mockFetch({ 'GET /api/notifications/unread-count': () => okResponse(200, { unreadCount: count }) }, { user: reader })
    renderBell()
    await screen.findByRole('link', { name: 'Notifications, 1 unread' })

    count = 4
    await act(async () => {
      await vi.advanceTimersByTimeAsync(61 * 1000)
    })

    expect(await screen.findByRole('link', { name: 'Notifications, 4 unread' })).toBeInTheDocument()
  })
})

describe('the inbox', () => {
  // path '*': following a notification's link must not unmount the page the test is looking at
  const renderInbox = () => renderWithProviders(<NotificationsPage />, { route: '/notifications', path: '*' })
  const unreadButton = () => screen.getByRole('button', { name: /^Unread/ })
  const kinds = [
    note(1, 'comment_on_post', { comment: { id: 11, parentId: null, excerpt: 'Lovely piece' } }),
    note(2, 'comment_reply', { comment: { id: 12, parentId: 11, excerpt: 'Agreed' } }),
    note(3, 'new_follower', { post: null }),
    note(4, 'post_submitted', { actor: { id: 6, username: 'writer', avatarUrl: null } }),
    note(5, 'post_published'),
    note(6, 'post_rejected', { reason: 'Needs a stronger ending.' }),
  ]

  it('says what each kind of notification means, and where it leads', async () => {
    mockFetch({ 'GET /api/notifications': () => listResponse(kinds) }, { user: reader })
    renderInbox()

    const row = async (text) => (await screen.findByRole('link', { name: new RegExp(text) })).closest('li')
    expect(await row('cy commented on “My post”')).toHaveTextContent('Lovely piece')
    expect(await screen.findByRole('link', { name: /cy commented on/ })).toHaveAttribute('href', '/blog/my-post#comments')
    expect(await row('cy replied to your comment on “My post”')).toHaveTextContent('Agreed')
    expect(screen.getByRole('link', { name: /cy started following you/ })).toHaveAttribute('href', '/u/cy')
    expect(screen.getByRole('link', { name: /writer submitted “My post” for review/ })).toHaveAttribute('href', '/review')
    expect(screen.getByRole('link', { name: /“My post” is now published/ })).toHaveAttribute('href', '/blog/my-post')
    expect(await row('“My post” was sent back for changes')).toHaveTextContent('Needs a stronger ending.')
    expect(screen.getByRole('link', { name: /sent back for changes/ })).toHaveAttribute('href', '/posts/7/edit')
  })

  it('shows names, titles and comments as plain text', async () => {
    const hostile = note(1, 'comment_on_post', {
      actor: { id: 5, username: 'cy', avatarUrl: null },
      post: { id: 7, slug: 'p', title: '<img src=x onerror="window.__pwned = true">' },
      comment: { id: 11, parentId: null, excerpt: '<script>window.__pwned = true</script>' },
    })
    mockFetch({ 'GET /api/notifications': () => listResponse([hostile]) }, { user: reader })
    renderInbox()

    expect(await screen.findByText(/<script>window.__pwned = true<\/script>/)).toBeInTheDocument()
    expect(document.querySelector('main img, li img, li script')).toBeNull()
    expect(window.__pwned).toBeUndefined()
  })

  it('marks an unread notification, and only an unread one, as read when it is opened, lowering the count at once', async () => {
    let answer
    let unread = 1
    const fetchMock = mockFetch(
      {
        'GET /api/notifications': () => listResponse([note(1, 'new_follower', { post: null }), note(2, 'post_published', { readAt: '2026-01-01T00:00:00.000Z' })], { unreadCount: unread }),
        'GET /api/notifications/unread-count': () => okResponse(200, { unreadCount: unread }),
        'POST /api/notifications/read': () => new Promise((resolve) => (answer = resolve)),
      },
      { user: reader },
    )
    renderInbox()

    await waitFor(() => expect(unreadButton()).toHaveTextContent('Unread (1)'))
    await userEvent.click(screen.getByRole('link', { name: /started following you/ }))
    // the count went at once, before the server answered
    await waitFor(() => expect(unreadButton()).toHaveTextContent(/^Unread$/))
    unread = 0
    answer(await okResponse(200, { updated: 1, unreadCount: 0 }))
    await waitFor(() => expect(calls(fetchMock, 'POST', '/read')).toHaveLength(1))
    expect(lastBody(fetchMock, 'POST', '/read')).toEqual({ ids: [1] })

    // an already-read one sends nothing
    await userEvent.click(screen.getByRole('link', { name: /is now published/ }))
    expect(calls(fetchMock, 'POST', '/read')).toHaveLength(1)
  })

  it('puts the count back and says what went wrong when marking fails', async () => {
    mockFetch(
      {
        'GET /api/notifications': () => listResponse([note(1, 'new_follower', { post: null }), note(2, 'post_published')], { unreadCount: 2 }),
        'GET /api/notifications/unread-count': () => okResponse(200, { unreadCount: 2 }),
        'POST /api/notifications/read': () => errorResponse(500, 'INTERNAL_ERROR', 'Something went wrong'),
      },
      { user: reader },
    )
    renderInbox()

    await userEvent.click(await screen.findByRole('link', { name: /started following you/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong')
    await waitFor(() => expect(unreadButton()).toHaveTextContent('Unread (2)'))
  })

  it('marks everything as read', async () => {
    let unread = 2
    const fetchMock = mockFetch(
      {
        'GET /api/notifications': () => listResponse([note(1, 'new_follower', { post: null }), note(2, 'post_published')], { unreadCount: unread }),
        'GET /api/notifications/unread-count': () => okResponse(200, { unreadCount: unread }),
        'POST /api/notifications/read': () => {
          unread = 0
          return okResponse(200, { updated: 2, unreadCount: 0 })
        },
      },
      { user: reader },
    )
    renderInbox()
    await waitFor(() => expect(unreadButton()).toHaveTextContent('Unread (2)'))

    await userEvent.click(screen.getByRole('button', { name: 'Mark all as read' }))

    await waitFor(() => expect(calls(fetchMock, 'POST', '/read')).toHaveLength(1))
    expect(lastBody(fetchMock, 'POST', '/read')).toEqual({ all: true })
    await waitFor(() => expect(unreadButton()).toHaveTextContent(/^Unread$/))
  })

  it('has nothing to mark when everything is read', async () => {
    mockFetch(
      { 'GET /api/notifications': () => listResponse([note(1, 'post_published', { readAt: '2026-01-01T00:00:00.000Z' })], { unreadCount: 0 }), 'GET /api/notifications/unread-count': () => okResponse(200, { unreadCount: 0 }) },
      { user: reader },
    )
    renderInbox()

    await screen.findByRole('link', { name: /is now published/ })
    expect(screen.getByRole('button', { name: 'Mark all as read' })).toBeDisabled()
  })

  it('dismisses a notification', async () => {
    let dismissed = false
    const fetchMock = mockFetch(
      {
        'GET /api/notifications': () => listResponse(dismissed ? [note(2, 'post_published')] : [note(1, 'new_follower', { post: null }), note(2, 'post_published')]),
        'GET /api/notifications/unread-count': () => okResponse(200, { unreadCount: dismissed ? 1 : 2 }),
        'DELETE /api/notifications/1': () => {
          dismissed = true
          return okResponse(200)
        },
      },
      { user: reader },
    )
    renderInbox()

    await userEvent.click(await screen.findByRole('button', { name: /Dismiss: cy started following you/ }))

    await waitFor(() => expect(screen.queryByRole('link', { name: /started following you/ })).not.toBeInTheDocument())
    expect(screen.getByRole('link', { name: /is now published/ })).toBeInTheDocument()
    expect(calls(fetchMock, 'DELETE', '/notifications/1')).toHaveLength(1)
    await waitFor(() => expect(unreadButton()).toHaveTextContent('Unread (1)'))
  })

  it('filters to the unread ones', async () => {
    const fetchMock = mockFetch({ 'GET /api/notifications': () => listResponse([note(1, 'post_published')]) }, { user: reader })
    renderInbox()
    await screen.findByRole('link', { name: /is now published/ })

    await userEvent.click(screen.getByRole('button', { name: /^Unread/ }))

    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url.includes('unread=1'))).toBe(true))
    expect(screen.getByRole('button', { name: /^Unread/ })).toHaveAttribute('aria-current', 'true')
  })

  it('loads more a page at a time', async () => {
    const fetchMock = mockFetch({ 'GET /api/notifications': () => listResponse([note(1, 'post_published')], { totalPages: 2 }) }, { user: reader })
    renderInbox()
    await screen.findByRole('link', { name: /is now published/ })

    fetchMock.mockImplementation(() => listResponse([note(2, 'new_follower', { post: null })], { page: 2, totalPages: 2 }))
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }))

    expect(await screen.findByRole('link', { name: /started following you/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /is now published/ })).toBeInTheDocument()
    expect(fetchMock.mock.calls.at(-1)[0]).toContain('page=2')
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument()
  })

  it('shows kind empty states and an error', async () => {
    mockFetch({ 'GET /api/notifications': () => listResponse([]) }, { user: reader })
    const { unmount } = renderInbox()
    expect(await screen.findByText(/Nothing yet/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^Unread/ }))
    expect(await screen.findByText('You are all caught up.')).toBeInTheDocument()
    unmount()

    mockFetch({ 'GET /api/notifications': () => errorResponse(500, 'INTERNAL_ERROR', 'The inbox is unavailable') }, { user: reader })
    renderInbox()
    expect(await screen.findByRole('alert')).toHaveTextContent('The inbox is unavailable')
  })
})

describe('notification choices', () => {
  const prefs = [
    { type: 'comment_on_post', label: 'Comments on your stories', inApp: true, email: true },
    { type: 'new_follower', label: 'New followers', inApp: true, email: false },
  ]

  it('shows each kind with its current choices, and saves exactly what is chosen', async () => {
    const fetchMock = mockFetch(
      {
        'GET /api/notifications/preferences': () => okResponse(200, { preferences: prefs }),
        'PUT /api/notifications/preferences': () => okResponse(200, { preferences: [prefs[0], { ...prefs[1], email: true, inApp: false }] }),
      },
      { user: reader },
    )
    renderWithProviders(<NotificationPreferences />)

    const emailBox = await screen.findByRole('checkbox', { name: 'New followers: by email' })
    expect(emailBox).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Comments on your stories: by email' })).toBeChecked()

    await userEvent.click(emailBox)
    await userEvent.click(screen.getByRole('checkbox', { name: 'New followers: in the inbox' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save choices' }))

    expect(await screen.findByText('Your notification choices are saved.')).toBeInTheDocument()
    expect(lastBody(fetchMock, 'PUT', '/preferences')).toEqual({
      preferences: [
        { type: 'comment_on_post', inApp: true, email: true },
        { type: 'new_follower', inApp: false, email: true },
      ],
    })
  })

  it('says when saving fails and keeps the choices', async () => {
    mockFetch(
      { 'GET /api/notifications/preferences': () => okResponse(200, { preferences: prefs }), 'PUT /api/notifications/preferences': () => errorResponse(400, 'VALIDATION_ERROR', 'Unknown notification type') },
      { user: reader },
    )
    renderWithProviders(<NotificationPreferences />)

    await userEvent.click(await screen.findByRole('checkbox', { name: 'New followers: by email' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save choices' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Unknown notification type')
    expect(screen.getByRole('checkbox', { name: 'New followers: by email' })).toBeChecked()
  })

  it('shows a loading message, and an error if the choices cannot be read', async () => {
    mockFetch({ 'GET /api/notifications/preferences': () => errorResponse(500, 'INTERNAL_ERROR', 'Cannot read your choices') }, { user: reader })
    renderWithProviders(<NotificationPreferences />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading your choices…')
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot read your choices')
  })
})

describe('the unsubscribe page', () => {
  const renderPage = (query = '?token=abc.def.ghi') => renderWithProviders(<UnsubscribePage />, { route: `/unsubscribe${query}`, path: '/unsubscribe' })

  it('explains an incomplete link', () => {
    mockFetch()
    renderPage('')

    expect(screen.getByText(/This link is incomplete/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Unsubscribe' })).not.toBeInTheDocument()
  })

  it('changes nothing until the button is pressed, then confirms what was turned off', async () => {
    const fetchMock = mockFetch({ 'POST /api/notifications/unsubscribe': () => okResponse(200, { scope: 'comment_reply', label: 'Replies to your comments' }) })
    renderPage()

    expect(screen.getByRole('heading', { name: 'Stop these emails?' })).toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(calls(fetchMock, 'POST', '/unsubscribe')).toHaveLength(0)

    await userEvent.click(screen.getByRole('button', { name: 'Unsubscribe' }))

    expect(await screen.findByText(/no longer get emails about “Replies to your comments”/)).toBeInTheDocument()
    expect(lastBody(fetchMock, 'POST', '/unsubscribe')).toEqual({ token: 'abc.def.ghi' })
    expect(screen.getByRole('link', { name: 'Change my choices' })).toHaveAttribute('href', '/settings')
  })

  it('says so when every kind was turned off', async () => {
    mockFetch({ 'POST /api/notifications/unsubscribe': () => okResponse(200, { scope: 'all', label: 'All notification' }) })
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Unsubscribe' }))

    expect(await screen.findByText(/will not get any notification emails/)).toBeInTheDocument()
  })

  it('explains an invalid or expired link, and lets the reader try again', async () => {
    mockFetch({ 'POST /api/notifications/unsubscribe': () => errorResponse(400, 'VALIDATION_ERROR', 'This unsubscribe link is not valid or has expired') })
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Unsubscribe' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('not valid or has expired')
    expect(screen.getByRole('button', { name: 'Unsubscribe' })).toBeEnabled()
  })
})
