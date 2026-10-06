import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ModerationQueuePage from './ModerationQueuePage.jsx'
import ReportButton from '../components/ReportButton.jsx'
import NotificationItem from '../components/NotificationItem.jsx'
import { errorResponse, jsonResponse, mockFetch, okResponse, readerUser, renderWithProviders } from '../test/utils.jsx'

const reader = { ...readerUser, id: 2, userName: 'bob' }
const editor = { ...readerUser, id: 3, userName: 'ed', role: 'editor' }
const admin = { ...readerUser, id: 4, userName: 'root', role: 'admin' }

const calls = (fetchMock, method, suffix) =>
  fetchMock.mock.calls.filter(([url, init]) => new URL(url, 'http://x').pathname.endsWith(suffix) && (init?.method ?? 'GET') === method)
const lastBody = (fetchMock, method, suffix) => JSON.parse(calls(fetchMock, method, suffix).at(-1)[1].body)

afterEach(() => {
  vi.restoreAllMocks()
})

describe('reporting', () => {
  const renderButton = (props = {}) => renderWithProviders(<ReportButton targetType="comment" targetId={12} noun="comment" {...props} />)

  it('sends a signed-out visitor to log in instead of showing a form', () => {
    mockFetch()
    renderButton()

    expect(screen.getByRole('link', { name: 'Report' })).toHaveAttribute('href', '/login')
  })

  it('opens a form with the reasons, and will not send without one', async () => {
    const fetchMock = mockFetch({}, { user: reader })
    renderButton()

    await userEvent.click(await screen.findByRole('button', { name: /Report/ }))
    expect(screen.getByRole('option', { name: 'Spam or advertising' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Send report' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Choose a reason first.')
    expect(calls(fetchMock, 'POST', '/reports')).toHaveLength(0)
  })

  it('sends the reason and the details, trimmed, and says what happens next', async () => {
    const fetchMock = mockFetch({ 'POST /api/reports': () => okResponse(201, { report: { id: 1, status: 'open' } }) }, { user: reader })
    renderButton()

    await userEvent.click(await screen.findByRole('button', { name: /Report/ }))
    await userEvent.selectOptions(screen.getByLabelText('What is wrong?'), 'harassment')
    await userEvent.type(screen.getByLabelText(/Anything else/), '  They keep doing it.  ')
    await userEvent.click(screen.getByRole('button', { name: 'Send report' }))

    expect(await screen.findByText(/A moderator will look at it. Nothing changes until they have./)).toBeInTheDocument()
    expect(lastBody(fetchMock, 'POST', '/reports')).toEqual({ targetType: 'comment', targetId: 12, reason: 'harassment', details: 'They keep doing it.' })
  })

  it('sends a person by username', async () => {
    const fetchMock = mockFetch({ 'POST /api/reports': () => okResponse(201, { report: { id: 1 } }) }, { user: reader })
    renderWithProviders(<ReportButton targetType="user" targetId="ada_l" noun="person" />)

    await userEvent.click(await screen.findByRole('button', { name: /Report/ }))
    await userEvent.selectOptions(screen.getByLabelText('What is wrong?'), 'spam')
    await userEvent.click(screen.getByRole('button', { name: 'Send report' }))

    await waitFor(() => expect(calls(fetchMock, 'POST', '/reports')).toHaveLength(1))
    expect(lastBody(fetchMock, 'POST', '/reports')).toEqual({ targetType: 'user', targetId: 'ada_l', reason: 'spam' })
  })

  it('counts the characters left in the details', async () => {
    mockFetch({}, { user: reader })
    renderButton()

    await userEvent.click(await screen.findByRole('button', { name: /Report/ }))
    expect(screen.getByText('500 characters left')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(/Anything else/), 'abc')

    expect(screen.getByText('497 characters left')).toBeInTheDocument()
  })

  it('says kindly when the same thing was reported before, and shows other failures as they are', async () => {
    mockFetch({ 'POST /api/reports': () => errorResponse(409, 'ALREADY_REPORTED', 'You have already reported this') }, { user: reader })
    const { unmount } = renderButton()
    await userEvent.click(await screen.findByRole('button', { name: /Report/ }))
    await userEvent.selectOptions(screen.getByLabelText('What is wrong?'), 'spam')
    await userEvent.click(screen.getByRole('button', { name: 'Send report' }))
    expect(await screen.findByText(/You have already reported this. A moderator will look at it./)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send report' })).toBeDisabled()
    unmount()

    mockFetch({ 'POST /api/reports': () => errorResponse(403, 'EMAIL_NOT_VERIFIED', 'Confirm your email address first') }, { user: reader })
    renderButton()
    await userEvent.click(await screen.findByRole('button', { name: /Report/ }))
    await userEvent.selectOptions(screen.getByLabelText('What is wrong?'), 'spam')
    await userEvent.click(screen.getByRole('button', { name: 'Send report' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Confirm your email address first')
  })

  it('can be cancelled without sending anything', async () => {
    const fetchMock = mockFetch({}, { user: reader })
    renderButton()

    await userEvent.click(await screen.findByRole('button', { name: /Report/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByLabelText('What is wrong?')).not.toBeInTheDocument()
    expect(calls(fetchMock, 'POST', '/reports')).toHaveLength(0)
  })
})

describe('the moderation queue', () => {
  const pagination = (page = 1, totalPages = 1, total = 3) => ({ page, limit: 10, total, totalPages })
  const queue = (reports, p = pagination()) => jsonResponse(200, { success: true, data: { reports }, meta: { pagination: p } })
  const commentItem = (overrides = {}) => ({
    id: 11,
    targetType: 'comment',
    status: 'open',
    reportCount: 3,
    reasons: [{ reason: 'spam', label: 'Spam or advertising', count: 2 }, { reason: 'harassment', label: 'Harassment or bullying', count: 1 }],
    lastReportedAt: '2026-02-01T00:00:00.000Z',
    target: { id: 5, removed: false, excerpt: 'Buy things now', author: { id: 9, username: 'spammer' }, post: { id: 1, slug: 'a-story', title: 'A story' } },
    ...overrides,
  })
  const postItem = { id: 12, targetType: 'post', status: 'open', reportCount: 1, reasons: [{ reason: 'copyright', label: 'Copyright', count: 1 }], lastReportedAt: '2026-02-01T00:00:00.000Z', target: { id: 1, slug: 'a-story', title: 'A story', status: 'published', author: { id: 8, username: 'ada' } } }
  const personItem = { id: 13, targetType: 'user', status: 'open', reportCount: 1, reasons: [{ reason: 'harassment', label: 'Harassment or bullying', count: 1 }], lastReportedAt: '2026-02-01T00:00:00.000Z', target: { id: 9, username: 'spammer', status: 'active', role: 'user' } }

  const renderQueue = () => renderWithProviders(<ModerationQueuePage />, { route: '/moderation', path: '/moderation' })

  it('shows each reported thing with what it is, how many reported it and why', async () => {
    mockFetch({ 'GET /api/moderation/reports': () => queue([commentItem(), postItem, personItem]) }, { user: admin })
    renderQueue()

    const card = (await screen.findByText(/“Buy things now”/)).closest('li')
    expect(within(card).getByText('3 reports', { exact: false })).toBeInTheDocument()
    expect(within(card).getByText('Spam or advertising ×2')).toBeInTheDocument()
    expect(within(card).getByText('Harassment or bullying ×1')).toBeInTheDocument()
    expect(within(card).getByRole('link', { name: 'A story' })).toHaveAttribute('href', '/blog/a-story#comments')
    const people = screen.getByRole('link', { name: 'spammer' })
    expect(people).toHaveAttribute('href', '/u/spammer')
  })

  it('shows what was reported, and what reporters wrote, as plain text', async () => {
    const hostile = commentItem({ target: { id: 5, removed: false, excerpt: '<img src=x onerror="window.__pwned = true">', author: { id: 9, username: 'spammer' }, post: null } })
    mockFetch(
      {
        'GET /api/moderation/reports': () => queue([hostile]),
        'GET /api/moderation/reports/11': () =>
          okResponse(200, { report: { ...hostile, reports: [{ id: 1, reporter: { id: 2, username: 'bob' }, reason: 'spam', label: 'Spam or advertising', details: '<script>window.__pwned = true</script>', createdAt: '2026-02-01T00:00:00.000Z' }] } }),
      },
      { user: editor },
    )
    renderQueue()

    expect(await screen.findByText(/<img src=x onerror=/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Who reported this' }))
    expect(await screen.findByText(/<script>window.__pwned = true<\/script>/)).toBeInTheDocument()
    expect(screen.getByText(/bob · Spam or advertising/)).toBeInTheDocument()
    expect(document.querySelector('li img, li script')).toBeNull()
    expect(window.__pwned).toBeUndefined()
  })

  it('offers editors comments and stories only, and admins people as well', async () => {
    mockFetch({ 'GET /api/moderation/reports': () => queue([]) }, { user: editor })
    const { unmount } = renderQueue()
    await screen.findByText('Nothing is waiting. The queue is clear.')
    expect(screen.queryByRole('option', { name: 'People' })).not.toBeInTheDocument()
    unmount()

    mockFetch({ 'GET /api/moderation/reports': () => queue([]) }, { user: admin })
    renderQueue()
    expect(await screen.findByRole('option', { name: 'People' })).toBeInTheDocument()
  })

  it('asks for the open or the resolved ones, by kind, and pages', async () => {
    const fetchMock = mockFetch({ 'GET /api/moderation/reports': () => queue([commentItem()], pagination(1, 2, 12)) }, { user: admin })
    renderQueue()
    await screen.findByText(/“Buy things now”/)

    await userEvent.selectOptions(screen.getByLabelText('Show'), 'comment')
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url.includes('type=comment'))).toBe(true))
    await userEvent.click(screen.getByRole('button', { name: 'Resolved' }))
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url.includes('status=resolved'))).toBe(true))
    expect(screen.getByRole('button', { name: 'Resolved' })).toHaveAttribute('aria-current', 'true')
  })

  it('dismisses with no note, after a confirmation step', async () => {
    let done = false
    const fetchMock = mockFetch(
      {
        'GET /api/moderation/reports': () => queue(done ? [] : [commentItem()]),
        'POST /api/moderation/reports/11/resolve': () => {
          done = true
          return okResponse(200, { report: { ...commentItem(), status: 'dismissed', reports: [] } })
        },
      },
      { user: editor },
    )
    renderQueue()

    await userEvent.click(await screen.findByRole('button', { name: 'Dismiss' }))
    expect(calls(fetchMock, 'POST', '/resolve')).toHaveLength(0)
    await userEvent.click(screen.getByRole('button', { name: 'Confirm: Dismiss' }))

    await waitFor(() => expect(lastBody(fetchMock, 'POST', '/resolve')).toEqual({ action: 'dismiss' }))
    expect(await screen.findByText('Nothing is waiting. The queue is clear.')).toBeInTheDocument()
  })

  it('will not remove a comment without a note, then sends it', async () => {
    const fetchMock = mockFetch(
      { 'GET /api/moderation/reports': () => queue([commentItem()]), 'POST /api/moderation/reports/11/resolve': () => okResponse(200, { report: { ...commentItem(), status: 'actioned', reports: [] } }) },
      { user: editor },
    )
    renderQueue()

    await userEvent.click(await screen.findByRole('button', { name: 'Remove comment' }))
    const confirm = screen.getByRole('button', { name: 'Confirm: Remove comment' })
    expect(confirm).toBeDisabled()
    await userEvent.type(screen.getByLabelText(/Tell the author why/), '  It is an advert.  ')
    expect(confirm).toBeEnabled()
    await userEvent.click(confirm)

    await waitFor(() => expect(calls(fetchMock, 'POST', '/resolve')).toHaveLength(1))
    expect(lastBody(fetchMock, 'POST', '/resolve')).toEqual({ action: 'remove', note: 'It is an advert.' })
  })

  it('offers the right decisions for each kind, and suspending a person to admins only', async () => {
    mockFetch({ 'GET /api/moderation/reports': () => queue([commentItem(), postItem, personItem]) }, { user: admin })
    renderQueue()

    expect(await screen.findByRole('button', { name: 'Remove comment' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Unpublish story' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Suspend account' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Dismiss' })).toHaveLength(3)
  })

  it('can be backed out of, and shows the reason when a decision fails', async () => {
    const fetchMock = mockFetch(
      { 'GET /api/moderation/reports': () => queue([commentItem()]), 'POST /api/moderation/reports/11/resolve': () => errorResponse(409, 'ALREADY_RESOLVED', 'This report was already handled') },
      { user: editor },
    )
    renderQueue()

    await userEvent.click(await screen.findByRole('button', { name: 'Remove comment' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByLabelText(/Tell the author why/)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Remove comment' }))
    await userEvent.type(screen.getByLabelText(/Tell the author why/), 'Spam')
    await userEvent.click(screen.getByRole('button', { name: 'Confirm: Remove comment' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('This report was already handled')
    expect(calls(fetchMock, 'POST', '/resolve')).toHaveLength(1)
  })

  it('shows how a resolved report ended, with the moderator and their note', async () => {
    const done = commentItem({ status: 'actioned', handled: { by: 'ed', at: '2026-02-02T00:00:00.000Z', outcome: 'actioned', note: 'Removed: <b>advert</b>' } })
    mockFetch({ 'GET /api/moderation/reports': () => queue([done]) }, { user: editor })
    renderQueue()

    await userEvent.click(await screen.findByRole('button', { name: 'Resolved' }))

    expect(await screen.findByText(/Action taken by ed/)).toBeInTheDocument()
    expect(screen.getByText('Removed: <b>advert</b>')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove comment' })).not.toBeInTheDocument()
  })

  it('shows a removed comment and a vanished target without breaking', async () => {
    mockFetch(
      { 'GET /api/moderation/reports': () => queue([commentItem({ target: { id: 5, removed: true, excerpt: null, author: null, post: null } }), { ...postItem, target: null }]) },
      { user: editor },
    )
    renderQueue()

    expect(await screen.findByText('This comment was already removed.')).toBeInTheDocument()
    expect(screen.getByText('This no longer exists.')).toBeInTheDocument()
  })

  it('shows an error and a loading message', async () => {
    mockFetch({ 'GET /api/moderation/reports': () => errorResponse(500, 'INTERNAL_ERROR', 'The queue is unavailable') }, { user: editor })
    renderQueue()

    expect(screen.getByRole('status')).toHaveTextContent('Loading reports…')
    expect(await screen.findByRole('alert')).toHaveTextContent('The queue is unavailable')
  })
})

describe('notices about removed things', () => {
  const inRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>)
  const base = { actor: { id: 3, username: 'ed' }, post: { id: 7, slug: 'my-post', title: 'My post' }, comment: null, readAt: null, createdAt: new Date().toISOString() }

  it('says a comment was removed, with the moderator’s note, as text', () => {
    inRouter(<NotificationItem notification={{ ...base, id: 1, type: 'comment_removed', note: '<b>Off topic</b>' }} onOpen={() => {}} onDismiss={() => {}} />)

    expect(screen.getByRole('link', { name: /Your comment on “My post” was removed/ })).toHaveAttribute('href', '/blog/my-post#comments')
    expect(screen.getByText('<b>Off topic</b>')).toBeInTheDocument()
  })

  it('says a story was taken down, with the note, and links to it', () => {
    inRouter(<NotificationItem notification={{ ...base, id: 2, type: 'post_unpublished', note: 'Copied from elsewhere.' }} onOpen={() => {}} onDismiss={() => {}} />)

    expect(screen.getByRole('link', { name: /“My post” was taken down/ })).toHaveAttribute('href', '/posts/7')
    expect(screen.getByText('Copied from elsewhere.')).toBeInTheDocument()
  })
})
