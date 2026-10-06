import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AdminDashboardPage from './AdminDashboardPage.jsx'
import AdminUsersPage from './AdminUsersPage.jsx'
import AuditLogPage from './AuditLogPage.jsx'
import PostPage from './PostPage.jsx'
import ProfilePage from './ProfilePage.jsx'
import Navbar from '../components/Navbar.jsx'
import RequireRole from '../auth/RequireRole.jsx'
import { describeAudit } from '../lib/audit.js'
import { errorResponse, jsonResponse, mockFetch, okResponse, readerUser, renderWithProviders } from '../test/utils.jsx'

const reader = { ...readerUser, id: 2, userName: 'bob' }
const editor = { ...readerUser, id: 3, userName: 'ed', role: 'editor' }
const admin = { ...readerUser, id: 4, userName: 'root', role: 'admin' }

const calls = (fetchMock, method, suffix) =>
  fetchMock.mock.calls.filter(([url, init]) => new URL(url, 'http://x').pathname.endsWith(suffix) && (init?.method ?? 'GET') === method)
const lastBody = (fetchMock, method, suffix) => JSON.parse(calls(fetchMock, method, suffix).at(-1)[1].body)
const pagination = (page = 1, totalPages = 1, total = 1) => ({ page, limit: 20, total, totalPages })

afterEach(() => vi.restoreAllMocks())

describe('the overview', () => {
  const stats = {
    users: { total: 12, active: 10, suspended: 2, deleted: 1, byRole: { user: 8, author: 2, editor: 1, admin: 1 }, newLast7Days: 3, newLast30Days: 7 },
    posts: { total: 30, byStatus: { published: 20, draft: 8, pending_review: 2 }, publishedLast30Days: 5 },
    comments: { total: 41, last7Days: 9 },
    reports: { openTargets: 4 },
    reviewQueue: 2,
    recentActivity: [
      { id: 1, actor: { id: 4, username: 'root' }, action: 'user.suspended', entityType: 'user', entityId: '9', metadata: { reason: 'x' }, createdAt: new Date().toISOString() },
      { id: 2, actor: null, action: 'post.published_on_schedule', entityType: 'post', entityId: '3', metadata: null, createdAt: new Date().toISOString() },
    ],
  }
  const render = () => renderWithProviders(<AdminDashboardPage />, { route: '/admin', path: '/admin' })

  it('shows the numbers, where something needs a person, and recent activity in plain words', async () => {
    mockFetch({ 'GET /api/admin/stats': () => okResponse(200, { stats }) }, { user: admin })
    render()

    const reports = (await screen.findByText('Reports waiting')).closest('a')
    expect(reports).toHaveAttribute('href', '/moderation')
    expect(within(reports).getByText('4')).toBeInTheDocument()
    expect(screen.getByText('Stories waiting for review').closest('a')).toHaveAttribute('href', '/review')
    expect(screen.getByText('Accounts').closest('div')).toHaveTextContent('12')
    expect(screen.getByText('Suspended').closest('a')).toHaveTextContent('2')
    expect(screen.getByText(/8 users · 2 authors · 1 editor · 1 admin/)).toBeInTheDocument()
    expect(screen.getByText(/20 published · 8 draft · 2 pending review/)).toBeInTheDocument()
    expect(screen.getByText('root suspended user #9')).toBeInTheDocument()
    expect(screen.getByText('Story #3 went live on schedule')).toBeInTheDocument()
  })

  it('shows an error instead of a blank page', async () => {
    mockFetch({ 'GET /api/admin/stats': () => errorResponse(500, 'INTERNAL_ERROR', 'The numbers are unavailable') }, { user: admin })
    render()

    expect(await screen.findByRole('alert')).toHaveTextContent('The numbers are unavailable')
  })
})

describe('people', () => {
  const person = (overrides = {}) => ({
    id: 21,
    username: 'carol',
    email: 'carol@example.com',
    firstName: 'Carol',
    lastName: 'C',
    role: 'author',
    status: 'active',
    emailVerified: true,
    createdAt: '2026-01-05T00:00:00.000Z',
    lastLoginAt: null,
    suspendedAt: null,
    suspendedReason: null,
    ...overrides,
  })
  const list = (users, p = pagination(1, 1, users.length)) => jsonResponse(200, { success: true, data: { users }, meta: { pagination: p } })
  const render = () => renderWithProviders(<AdminUsersPage />, { route: '/admin/users', path: '/admin/users' })

  it('lists people with their role, status and address, and says why a suspended account is suspended, as text', async () => {
    mockFetch(
      { 'GET /api/admin/users': () => list([person(), person({ id: 22, username: 'dan', email: 'dan@example.com', status: 'suspended', emailVerified: false, suspendedReason: '<b>Harassment</b>' })]) },
      { user: admin },
    )
    render()

    expect(await screen.findByRole('link', { name: 'carol' })).toHaveAttribute('href', '/u/carol')
    expect(screen.getByText('carol@example.com')).toBeInTheDocument()
    expect(screen.getByText('Suspended: <b>Harassment</b>')).toBeInTheDocument()
    expect(screen.getByText('email not confirmed')).toBeInTheDocument()
    expect(screen.getByText('2 people')).toBeInTheDocument()
  })

  it('searches and filters', async () => {
    const fetchMock = mockFetch({ 'GET /api/admin/users': () => list([person()]) }, { user: admin })
    render()
    await screen.findByRole('link', { name: 'carol' })

    const search = within(screen.getByRole('search'))
    await userEvent.type(search.getByLabelText('Username or email starts with'), 'car')
    await userEvent.selectOptions(search.getByLabelText('Role'), 'author')
    await userEvent.selectOptions(search.getByLabelText('Status'), 'suspended')
    await userEvent.click(search.getByRole('button', { name: 'Search' }))

    await waitFor(() => {
      const last = fetchMock.mock.calls.filter(([url]) => url.includes('/api/admin/users')).at(-1)[0]
      expect(last).toContain('q=car')
      expect(last).toContain('role=author')
      expect(last).toContain('status=suspended')
    })
  })

  it('says when no one matches, and pages', async () => {
    mockFetch({ 'GET /api/admin/users': () => list([]) }, { user: admin })
    const { unmount } = render()
    expect(await screen.findByText('No one matches.')).toBeInTheDocument()
    unmount()

    const fetchMock = mockFetch({ 'GET /api/admin/users': () => list([person()], pagination(1, 2, 25)) }, { user: admin })
    render()
    await screen.findByRole('link', { name: 'carol' })
    await userEvent.click(screen.getByRole('button', { name: /Older/ }))
    await waitFor(() => expect(fetchMock.mock.calls.at(-1)[0]).toContain('page=2'))
  })

  it('changes a role only when asked to', async () => {
    const fetchMock = mockFetch(
      { 'GET /api/admin/users': () => list([person()]), 'PATCH /api/admin/users/21/role': () => okResponse(200, { user: { id: 21, role: 'editor' } }) },
      { user: admin },
    )
    render()

    await userEvent.selectOptions(await screen.findByLabelText('Role of carol'), 'editor')
    expect(calls(fetchMock, 'PATCH', '/role')).toHaveLength(0)
    await userEvent.click(screen.getByRole('button', { name: 'Make editor' }))

    await waitFor(() => expect(lastBody(fetchMock, 'PATCH', '/role')).toEqual({ role: 'editor' }))
  })

  it('suspends only with a reason, after a confirmation, and says why it failed if it does', async () => {
    const fetchMock = mockFetch(
      { 'GET /api/admin/users': () => list([person()]), 'POST /api/admin/users/21/suspend': () => okResponse(200, { user: person({ status: 'suspended' }) }) },
      { user: admin },
    )
    render()

    await userEvent.click(await screen.findByRole('button', { name: 'Suspend' }))
    const confirm = screen.getByRole('button', { name: 'Confirm suspension' })
    expect(confirm).toBeDisabled()
    await userEvent.type(screen.getByLabelText(/Why is carol being suspended/), '  Repeated harassment.  ')
    await userEvent.click(confirm)

    await waitFor(() => expect(lastBody(fetchMock, 'POST', '/suspend')).toEqual({ reason: 'Repeated harassment.' }))
  })

  it('shows the server’s reason when a suspension is refused', async () => {
    mockFetch(
      { 'GET /api/admin/users': () => list([person({ role: 'admin' })]), 'POST /api/admin/users/21/suspend': () => errorResponse(403, 'FORBIDDEN', 'Cannot suspend the last admin') },
      { user: admin },
    )
    render()

    await userEvent.click(await screen.findByRole('button', { name: 'Suspend' }))
    await userEvent.type(screen.getByLabelText(/Why is carol being suspended/), 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Confirm suspension' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot suspend the last admin')
  })

  it('reinstates a suspended account', async () => {
    const fetchMock = mockFetch(
      { 'GET /api/admin/users': () => list([person({ status: 'suspended', suspendedReason: 'x' })]), 'POST /api/admin/users/21/unsuspend': () => okResponse(200, { user: person() }) },
      { user: admin },
    )
    render()

    await userEvent.click(await screen.findByRole('button', { name: 'Reinstate' }))

    await waitFor(() => expect(calls(fetchMock, 'POST', '/unsuspend')).toHaveLength(1))
    expect(screen.queryByRole('button', { name: 'Suspend' })).not.toBeInTheDocument()
  })

  it('signs a person out everywhere after a confirmation', async () => {
    const fetchMock = mockFetch(
      { 'GET /api/admin/users': () => list([person()]), 'POST /api/admin/users/21/sign-out': () => okResponse(200, { sessions: 2 }) },
      { user: admin },
    )
    render()

    await userEvent.click(await screen.findByRole('button', { name: 'Sign out everywhere' }))
    expect(calls(fetchMock, 'POST', '/sign-out')).toHaveLength(0)
    await userEvent.click(screen.getByRole('button', { name: 'Sign them out' }))

    await waitFor(() => expect(calls(fetchMock, 'POST', '/sign-out')).toHaveLength(1))
  })

  it('does not offer an admin the chance to suspend, sign out or re-role themselves', async () => {
    mockFetch({ 'GET /api/admin/users': () => list([person({ id: 4, username: 'root', role: 'admin' })]) }, { user: admin })
    render()

    expect(await screen.findByLabelText('Role of root')).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Suspend' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sign out everywhere' })).not.toBeInTheDocument()
  })

  it('shows an error instead of a blank page', async () => {
    mockFetch({ 'GET /api/admin/users': () => errorResponse(500, 'INTERNAL_ERROR', 'People are unavailable') }, { user: admin })
    render()

    expect(await screen.findByRole('alert')).toHaveTextContent('People are unavailable')
  })
})

describe('the audit log', () => {
  const entry = (id, action, extra = {}) => ({ id, actor: { id: 4, username: 'root' }, action, entityType: 'user', entityId: '9', metadata: null, ip: '10.0.0.1', createdAt: new Date().toISOString(), ...extra })
  const logs = (items, p = pagination(1, 1, items.length)) => jsonResponse(200, { success: true, data: { logs: items }, meta: { pagination: p } })
  const render = () => renderWithProviders(<AuditLogPage />, { route: '/admin/audit', path: '/admin/audit' })

  it('describes each entry in words, with the reason or note as text, and the exact action beside it', async () => {
    mockFetch(
      {
        'GET /api/admin/audit-logs': () =>
          logs([
            entry(1, 'user.suspended', { metadata: { reason: '<i>Harassment</i>' } }),
            entry(2, 'report.resolved', { entityType: 'report', entityId: '5', metadata: { action: 'remove', reports: 2, targetKey: 'comment:7', note: 'An advert' } }),
            entry(3, 'something.new', { entityType: 'thing', entityId: '1' }),
          ]),
      },
      { user: admin },
    )
    render()

    expect(await screen.findByText('root suspended user #9')).toBeInTheDocument()
    expect(screen.getByText('Reason: <i>Harassment</i>')).toBeInTheDocument()
    expect(screen.getByText('root resolved report #5: remove (2 reports about comment:7)')).toBeInTheDocument()
    expect(screen.getByText('Note: An advert')).toBeInTheDocument()
    expect(screen.getByText('root: something.new (thing #1)')).toBeInTheDocument()
    expect(screen.getByText('user.suspended')).toBeInTheDocument()
  })

  it('filters by kind, action and person, and pages', async () => {
    const fetchMock = mockFetch({ 'GET /api/admin/audit-logs': () => logs([entry(1, 'user.suspended')], pagination(1, 2, 30)) }, { user: admin })
    render()
    await screen.findByText('root suspended user #9')

    await userEvent.selectOptions(screen.getByLabelText('About'), 'user')
    await userEvent.type(screen.getByLabelText('Action (exact)'), 'user.suspended')
    await userEvent.type(screen.getByLabelText('Done by (user id)'), '4')
    await waitFor(() => {
      const last = fetchMock.mock.calls.at(-1)[0]
      expect(last).toContain('entityType=user')
      expect(last).toContain('action=user.suspended')
      expect(last).toContain('actorId=4')
    })
    await userEvent.click(screen.getByRole('button', { name: /Older/ }))
    await waitFor(() => expect(fetchMock.mock.calls.at(-1)[0]).toContain('page=2'))
  })

  it('shows an empty message and an error', async () => {
    mockFetch({ 'GET /api/admin/audit-logs': () => logs([]) }, { user: admin })
    const { unmount } = render()
    expect(await screen.findByText('Nothing matches.')).toBeInTheDocument()
    unmount()

    mockFetch({ 'GET /api/admin/audit-logs': () => errorResponse(500, 'INTERNAL_ERROR', 'The log is unavailable') }, { user: admin })
    render()
    expect(await screen.findByRole('alert')).toHaveTextContent('The log is unavailable')
  })

  it('has a readable line for the common kinds of entry', () => {
    const line = (action, metadata) => describeAudit(entry(1, action, { metadata, entityId: '5' }))

    expect(line('user.role_changed', { from: 'user', to: 'editor' })).toBe('root changed the role of user #5 from user to editor')
    expect(line('post.status_changed', { from: 'published', to: 'archived' })).toBe('root moved story #5 from published to archived')
    expect(line('comment.deleted_by_other', { as: 'post_author' })).toBe('root removed comment #5 (as post author)')
    expect(describeAudit(entry(1, 'user.deleted', { actor: null }))).toBe('User #9 deleted their account')
  })
})

describe('who sees what', () => {
  it('shows moderation to editors and admins, and the admin area to admins only', async () => {
    mockFetch({ 'GET /api/notifications/unread-count': () => okResponse(200, { unreadCount: 0 }) }, { user: reader })
    const { unmount } = renderWithProviders(<Navbar />)
    await screen.findAllByRole('link', { name: 'Settings' })
    expect(screen.queryByRole('link', { name: 'Moderation' })).not.toBeInTheDocument()
    unmount()

    mockFetch({ 'GET /api/notifications/unread-count': () => okResponse(200, { unreadCount: 0 }) }, { user: editor })
    const second = renderWithProviders(<Navbar />)
    expect((await screen.findAllByRole('link', { name: 'Moderation' }))[0]).toHaveAttribute('href', '/moderation')
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument()
    second.unmount()

    mockFetch({ 'GET /api/notifications/unread-count': () => okResponse(200, { unreadCount: 0 }) }, { user: admin })
    renderWithProviders(<Navbar />)
    expect((await screen.findAllByRole('link', { name: 'Admin' }))[0]).toHaveAttribute('href', '/admin')
  })

  it('shows the admin pages as "not found" to anyone else', async () => {
    mockFetch({}, { user: editor })
    const { unmount } = renderWithProviders(
      <RequireRole role="admin">
        <p>the admin area</p>
      </RequireRole>,
    )
    expect(await screen.findByText('404')).toBeInTheDocument()
    expect(screen.queryByText('the admin area')).not.toBeInTheDocument()
    unmount()

    mockFetch({}, { user: admin })
    renderWithProviders(
      <RequireRole role="admin">
        <p>the admin area</p>
      </RequireRole>,
    )
    expect(await screen.findByText('the admin area')).toBeInTheDocument()
  })
})

describe('where the Report button appears', () => {
  const story = {
    id: 7, slug: 'my-post', status: 'published', title: 'My post', content: '<p>Body</p>', readingTime: 1, publishedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', author: { id: 1, username: 'ada_l', avatarUrl: null },
    category: null, tags: [], actions: [], likeCount: 0, commentCount: 0, liked: false, bookmarked: false,
  }
  const renderStory = () => renderWithProviders(<PostPage by="slug" />, { route: '/blog/my-post', path: '/blog/:slug' })
  const storyRoutes = (post = story) => ({
    'GET /api/posts/slug/my-post': () => okResponse(200, { post }),
    'GET /api/posts/7/comments': () => jsonResponse(200, { success: true, data: { comments: [] }, meta: { pagination: pagination(1, 1, 0) } }),
  })

  it('is under someone else’s story, and not under your own', async () => {
    mockFetch(storyRoutes(), { user: reader })
    const { unmount } = renderStory()
    expect(await screen.findByRole('button', { name: /Report/ })).toBeInTheDocument()
    unmount()

    mockFetch(storyRoutes(), { user: { ...reader, id: 1, userName: 'ada_l' } })
    renderStory()
    await screen.findByRole('heading', { name: 'My post' })
    await waitFor(() => expect(screen.queryByRole('button', { name: /Report/ })).not.toBeInTheDocument())
  })

  it('is on a comment by someone else, not on your own, and not on one that was removed', async () => {
    const comment = (id, username, extra = {}) => ({
      id, postId: 7, parentId: null, body: `by ${username}`, author: { id: id + 10, username, avatarUrl: null }, createdAt: '2026-01-02T00:00:00.000Z',
      editedAt: null, replyCount: 0, deleted: false, canEdit: false, canDelete: false, ...extra,
    })
    mockFetch(
      {
        ...storyRoutes(),
        'GET /api/posts/7/comments': () =>
          jsonResponse(200, {
            success: true,
            data: { comments: [comment(1, 'cy'), comment(2, 'bob', { canEdit: true, canDelete: true }), comment(3, 'dee', { deleted: true, body: null, author: null })] },
            meta: { pagination: pagination(1, 1, 3) },
          }),
      },
      { user: reader },
    )
    renderStory()

    const others = (await screen.findByText('by cy')).closest('li')
    expect(within(others).getByRole('button', { name: /Report/ })).toBeInTheDocument()
    expect(within(screen.getByText('by bob').closest('li')).queryByRole('button', { name: /Report/ })).not.toBeInTheDocument()
    expect(within(screen.getByText('This comment was deleted.').closest('li')).queryByRole('button', { name: /Report/ })).not.toBeInTheDocument()
  })

  it('is on another person’s profile, and not on your own', async () => {
    const profile = { username: 'ada_l', bio: null, avatarUrl: null, socialLinks: null, joinedAt: '2026-03-15T00:00:00.000Z', postCount: 0, followerCount: 0, followingCount: 0, viewer: { following: false } }
    const routes = { 'GET /api/users/ada_l': () => okResponse(200, { user: profile }), 'GET /api/users/ada_l/posts': () => jsonResponse(200, { success: true, data: { posts: [] }, meta: { pagination: pagination(1, 1, 0) } }) }
    mockFetch(routes, { user: reader })
    const { unmount } = renderWithProviders(<ProfilePage />, { route: '/u/ada_l', path: '/u/:username' })
    expect(await screen.findByRole('button', { name: /Report/ })).toBeInTheDocument()
    unmount()

    mockFetch({ ...routes, 'GET /api/users/ada_l': () => okResponse(200, { user: { ...profile, viewer: undefined } }) }, { user: { ...reader, userName: 'ada_l' } })
    renderWithProviders(<ProfilePage />, { route: '/u/ada_l', path: '/u/:username' })
    expect(await screen.findByRole('link', { name: 'Edit profile' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Report/ })).not.toBeInTheDocument()
  })
})
