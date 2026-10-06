import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import PostPage from './PostPage.jsx'
import ProfilePage from './ProfilePage.jsx'
import BookmarksPage from './BookmarksPage.jsx'
import FeedPage from './FeedPage.jsx'
import PeoplePage from './PeoplePage.jsx'
import PostCard from '../components/PostCard.jsx'
import { errorResponse, jsonResponse, mockFetch, okResponse, readerUser, renderWithProviders } from '../test/utils.jsx'

const reader = { ...readerUser, id: 2, userName: 'bob', emailVerified: true }
const unverified = { ...reader, emailVerified: false }

const post = (overrides = {}) => ({
  id: 7,
  slug: 'my-post',
  status: 'published',
  title: 'My post',
  excerpt: 'A teaser',
  content: '<p>Body text.</p>',
  readingTime: 1,
  publishedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  author: { id: 1, username: 'ada_l', avatarUrl: null },
  category: null,
  tags: [],
  actions: [],
  likeCount: 3,
  commentCount: 2,
  liked: false,
  bookmarked: false,
  ...overrides,
})

const comment = (id, body, overrides = {}) => ({
  id,
  postId: 7,
  parentId: null,
  body,
  author: { id: 1, username: 'ada_l', avatarUrl: null },
  createdAt: '2026-01-02T00:00:00.000Z',
  editedAt: null,
  replyCount: 0,
  deleted: false,
  canEdit: false,
  canDelete: false,
  ...overrides,
})

const pagination = (page = 1, totalPages = 1, total = 1) => ({ page, limit: 10, total, totalPages })
const listResponse = (key, items, p = pagination()) => jsonResponse(200, { success: true, data: { [key]: items }, meta: { pagination: p } })

const calls = (fetchMock, method, suffix) =>
  fetchMock.mock.calls.filter(([url, init]) => new URL(url, 'http://x').pathname.endsWith(suffix) && (init?.method ?? 'GET') === method)
const lastBody = (fetchMock, method, suffix) => JSON.parse(calls(fetchMock, method, suffix).at(-1)[1].body)

const renderPost = () => renderWithProviders(<PostPage by="slug" />, { route: '/blog/my-post', path: '/blog/:slug' })

const storyRoutes = (extra = {}, p = post()) => ({
  'GET /api/posts/slug/my-post': () => okResponse(200, { post: p }),
  'GET /api/posts/7/comments': () => listResponse('comments', []),
  ...extra,
})

afterEach(() => vi.restoreAllMocks())

describe('likes and saving', () => {
  it('shows the counts and asks a signed-out reader to log in', async () => {
    mockFetch(storyRoutes())
    renderPost()

    expect(await screen.findByText(/3 likes/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Log in to like or save' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Like/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '2 comments' })).toHaveAttribute('href', '#comments')
  })

  it('likes at once, then shows the count the server reports', async () => {
    let answer
    const fetchMock = mockFetch(
      storyRoutes({ 'PUT /api/posts/7/like': () => new Promise((resolve) => (answer = resolve)) }),
      { user: reader },
    )
    renderPost()

    await userEvent.click(await screen.findByRole('button', { name: /^Like/ }))

    // before the server has answered, the button already shows the new state
    expect(await screen.findByRole('button', { name: 'Like 4', pressed: true })).toBeInTheDocument()
    answer(await okResponse(200, { liked: true, likeCount: 5 }))
    expect(await screen.findByRole('button', { name: 'Like 5', pressed: true })).toBeInTheDocument()
    expect(calls(fetchMock, 'PUT', '/like')).toHaveLength(1)
  })

  it('unlikes with DELETE', async () => {
    const fetchMock = mockFetch(
      storyRoutes({ 'DELETE /api/posts/7/like': () => okResponse(200, { liked: false, likeCount: 2 }) }, post({ liked: true })),
      { user: reader },
    )
    renderPost()

    await userEvent.click(await screen.findByRole('button', { name: 'Like 3', pressed: true }))

    expect(await screen.findByRole('button', { name: 'Like 2', pressed: false })).toBeInTheDocument()
    expect(calls(fetchMock, 'DELETE', '/like')).toHaveLength(1)
  })

  it('puts the button back and says what went wrong when the like fails', async () => {
    mockFetch(storyRoutes({ 'PUT /api/posts/7/like': () => errorResponse(404, 'NOT_FOUND', 'Post not found') }), { user: reader })
    renderPost()

    await userEvent.click(await screen.findByRole('button', { name: /^Like/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Post not found')
    expect(screen.getByRole('button', { name: 'Like 3', pressed: false })).toBeInTheDocument()
  })

  it('saves and unsaves a story', async () => {
    const fetchMock = mockFetch(
      storyRoutes({
        'PUT /api/posts/7/bookmark': () => okResponse(200, { bookmarked: true }),
        'DELETE /api/posts/7/bookmark': () => okResponse(200, { bookmarked: false }),
      }),
      { user: reader },
    )
    renderPost()

    await userEvent.click(await screen.findByRole('button', { name: 'Save', pressed: false }))
    expect(await screen.findByRole('button', { name: 'Saved', pressed: true })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Saved' }))
    expect(await screen.findByRole('button', { name: 'Save', pressed: false })).toBeInTheDocument()
    expect(calls(fetchMock, 'PUT', '/bookmark')).toHaveLength(1)
    expect(calls(fetchMock, 'DELETE', '/bookmark')).toHaveLength(1)
  })

  it('offers neither reactions nor comments on a story that is not published', async () => {
    mockFetch(storyRoutes({}, post({ status: 'draft' })), { user: reader })
    renderPost()

    await screen.findByRole('heading', { name: 'My post' })
    expect(screen.queryByRole('group', { name: 'Reactions' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Comments' })).not.toBeInTheDocument()
  })
})

describe('comments', () => {
  it('lists comments as plain text, never as markup', async () => {
    const hostile = '<img src=x onerror="window.__pwned = true"> <b>bold?</b>\nsecond line'
    mockFetch(storyRoutes({ 'GET /api/posts/7/comments': () => listResponse('comments', [comment(1, hostile)]) }))
    renderPost()

    const item = (await screen.findByText(/second line/)).closest('li')
    expect(item).toHaveTextContent('<img src=x onerror="window.__pwned = true"> <b>bold?</b>')
    expect(item.querySelector('img, b, script')).toBeNull()
    expect(window.__pwned).toBeUndefined()
  })

  it('asks a signed-out reader to log in, and an unverified one to confirm their email', async () => {
    mockFetch(storyRoutes())
    const { unmount } = renderPost()
    expect(await screen.findByRole('link', { name: 'Log in' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Add a comment')).not.toBeInTheDocument()
    unmount()

    mockFetch(storyRoutes(), { user: unverified })
    renderPost()
    expect(await screen.findByText(/Confirm your email address/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Add a comment')).not.toBeInTheDocument()
  })

  it('shows an empty-state message when there are no comments', async () => {
    mockFetch(storyRoutes())
    renderPost()

    expect(await screen.findByText('No comments yet. Be the first.')).toBeInTheDocument()
  })

  it('posts a comment with an idempotency key, clears the box and reloads the list', async () => {
    let posted = false
    const fetchMock = mockFetch(
      storyRoutes({
        'GET /api/posts/7/comments': () => listResponse('comments', posted ? [comment(5, 'Great read', { author: { id: 2, username: 'bob', avatarUrl: null }, canEdit: true, canDelete: true })] : []),
        'POST /api/posts/7/comments': () => {
          posted = true
          return okResponse(201, { comment: comment(5, 'Great read') })
        },
      }),
      { user: reader },
    )
    renderPost()

    const box = await screen.findByLabelText('Add a comment')
    await userEvent.type(box, '  Great read  ')
    await userEvent.click(screen.getByRole('button', { name: 'Post comment' }))

    expect(await screen.findByText('Great read')).toBeInTheDocument()
    expect(box).toHaveValue('')
    expect(lastBody(fetchMock, 'POST', '/comments')).toEqual({ body: 'Great read' })
    const headers = calls(fetchMock, 'POST', '/comments')[0][1].headers
    expect(headers['Idempotency-Key']).toBeTruthy()
  })

  it('refuses an empty comment without contacting the server, and counts characters', async () => {
    const fetchMock = mockFetch(storyRoutes(), { user: reader })
    renderPost()
    const box = await screen.findByLabelText('Add a comment')
    expect(screen.getByText('2000 characters left')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Post comment' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Write something first.')
    await userEvent.type(box, '   ')
    await userEvent.click(screen.getByRole('button', { name: 'Post comment' }))

    expect(calls(fetchMock, 'POST', '/comments')).toHaveLength(0)
    await userEvent.type(box, 'abc')
    expect(screen.getByText('1994 characters left')).toBeInTheDocument() // the three spaces typed earlier count too
  })

  it('keeps what was typed and shows the message when posting fails, and retries with the same key', async () => {
    let attempts = 0
    const fetchMock = mockFetch(
      storyRoutes({
        'POST /api/posts/7/comments': () => (++attempts === 1 ? errorResponse(429, 'RATE_LIMITED', 'x') : okResponse(201, { comment: comment(5, 'Retry me') })),
      }),
      { user: reader },
    )
    renderPost()
    const box = await screen.findByLabelText('Add a comment')
    await userEvent.type(box, 'Retry me')

    await userEvent.click(screen.getByRole('button', { name: 'Post comment' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts')
    expect(box).toHaveValue('Retry me')

    await userEvent.click(screen.getByRole('button', { name: 'Post comment' }))
    await waitFor(() => expect(box).toHaveValue(''))
    const keys = calls(fetchMock, 'POST', '/comments').map(([, init]) => init.headers['Idempotency-Key'])
    expect(keys[0]).toBe(keys[1])
  })

  it('loads more comments a page at a time', async () => {
    const fetchMock = mockFetch(
      storyRoutes({
        'GET /api/posts/7/comments': () => listResponse('comments', [comment(1, 'first page')], pagination(1, 2, 2)),
      }),
    )
    renderPost()
    expect(await screen.findByText('first page')).toBeInTheDocument()
    fetchMock.mockClear()

    fetchMock.mockImplementation(() => listResponse('comments', [comment(2, 'second page')], pagination(2, 2, 2)))
    await userEvent.click(screen.getByRole('button', { name: 'Load more comments' }))

    expect(await screen.findByText('second page')).toBeInTheDocument()
    expect(screen.getByText('first page')).toBeInTheDocument()
    expect(fetchMock.mock.calls[0][0]).toContain('page=2')
    expect(screen.queryByRole('button', { name: 'Load more comments' })).not.toBeInTheDocument()
  })

  it('shows replies on request, and posts a reply under a comment', async () => {
    const fetchMock = mockFetch(
      storyRoutes({
        'GET /api/posts/7/comments': () => listResponse('comments', [comment(1, 'parent', { replyCount: 2 })]),
        'GET /api/comments/1/replies': () =>
          listResponse('comments', [comment(2, 'first reply', { parentId: 1 }), comment(3, 'second reply', { parentId: 1 })], pagination(1, 1, 2)),
        'POST /api/posts/7/comments': () => okResponse(201, { comment: comment(4, 'mine', { parentId: 1 }) }),
      }),
      { user: reader },
    )
    renderPost()

    await userEvent.click(await screen.findByRole('button', { name: 'Show 2 replies' }))
    expect(await screen.findByText('first reply')).toBeInTheDocument()
    expect(screen.getByText('second reply')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hide replies' })).toHaveAttribute('aria-expanded', 'true')
    // replies have no "Reply" of their own: one level only
    const parentItem = document.getElementById('comment-1')
    expect(within(document.getElementById('comment-2')).queryByRole('button', { name: 'Reply' })).not.toBeInTheDocument()

    await userEvent.click(within(parentItem).getAllByRole('button', { name: 'Reply' })[0])
    await userEvent.type(screen.getByLabelText('Reply to ada_l'), 'mine')
    await userEvent.click(screen.getByRole('button', { name: 'Post reply' }))

    await waitFor(() => expect(calls(fetchMock, 'POST', '/comments')).toHaveLength(1))
    expect(lastBody(fetchMock, 'POST', '/comments')).toEqual({ parentId: 1, body: 'mine' })
  })

  it('lets the author edit their comment', async () => {
    const fetchMock = mockFetch(
      storyRoutes({
        'GET /api/posts/7/comments': () => listResponse('comments', [comment(1, 'typo here', { canEdit: true, canDelete: true })]),
        'PATCH /api/comments/1': () => okResponse(200, { comment: comment(1, 'fixed', { editedAt: '2026-01-03T00:00:00.000Z' }) }),
      }),
      { user: reader },
    )
    renderPost()

    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    const box = screen.getByLabelText('Edit your comment')
    expect(box).toHaveValue('typo here')
    await userEvent.clear(box)
    await userEvent.type(box, 'fixed')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(calls(fetchMock, 'PATCH', '/comments/1')).toHaveLength(1))
    expect(lastBody(fetchMock, 'PATCH', '/comments/1')).toEqual({ body: 'fixed' })
    await waitFor(() => expect(screen.queryByLabelText('Edit your comment')).not.toBeInTheDocument())
  })

  it('asks before deleting, and keeps the comment when the reader changes their mind', async () => {
    const fetchMock = mockFetch(
      storyRoutes({
        'GET /api/posts/7/comments': () => listResponse('comments', [comment(1, 'mine', { canEdit: true, canDelete: true })]),
        'DELETE /api/comments/1': () => okResponse(200),
      }),
      { user: reader },
    )
    renderPost()

    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    expect(screen.getByText('Delete this comment?')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Keep' }))
    expect(calls(fetchMock, 'DELETE', '/comments/1')).toHaveLength(0)

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    const confirm = screen.getByRole('group', { name: 'Confirm deleting this comment' })
    await userEvent.click(within(confirm).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(calls(fetchMock, 'DELETE', '/comments/1')).toHaveLength(1))
  })

  it('offers edit and delete only where the server says the reader may', async () => {
    mockFetch(
      storyRoutes({
        'GET /api/posts/7/comments': () =>
          listResponse('comments', [comment(1, 'not mine', { canEdit: false, canDelete: false }), comment(2, 'moderated', { canEdit: false, canDelete: true })]),
      }),
      { user: reader },
    )
    renderPost()

    const first = (await screen.findByText('not mine')).closest('li')
    expect(within(first).queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    expect(within(first).queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
    const second = screen.getByText('moderated').closest('li')
    expect(within(second).queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    expect(within(second).getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('shows a deleted comment as a placeholder with no author and no actions', async () => {
    mockFetch(
      storyRoutes({
        'GET /api/posts/7/comments': () => listResponse('comments', [comment(1, null, { deleted: true, author: null, replyCount: 1 })]),
      }),
      { user: reader },
    )
    renderPost()

    const item = (await screen.findByText('This comment was deleted.')).closest('li')
    expect(within(item).queryByRole('button', { name: 'Reply' })).not.toBeInTheDocument()
    expect(within(item).getByRole('button', { name: 'Show 1 reply' })).toBeInTheDocument()
  })
})

describe('following', () => {
  const profile = (overrides = {}) => ({
    username: 'ada_l',
    bio: null,
    avatarUrl: null,
    socialLinks: null,
    joinedAt: '2026-03-15T00:00:00.000Z',
    postCount: 1,
    followerCount: 4,
    followingCount: 2,
    viewer: { following: false },
    ...overrides,
  })
  const profileRoutes = (extra = {}, p = profile()) => ({
    'GET /api/users/ada_l': () => okResponse(200, { user: p }),
    'GET /api/users/ada_l/posts': () => listResponse('posts', []),
    ...extra,
  })
  const renderProfile = () => renderWithProviders(<ProfilePage />, { route: '/u/ada_l', path: '/u/:username' })

  it('shows the counts as links to the lists', async () => {
    mockFetch(profileRoutes())
    renderProfile()

    expect(await screen.findByRole('link', { name: '4 followers' })).toHaveAttribute('href', '/u/ada_l/followers')
    expect(screen.getByRole('link', { name: '2 following' })).toHaveAttribute('href', '/u/ada_l/following')
    expect(screen.getByRole('link', { name: 'Log in to follow' })).toBeInTheDocument()
  })

  it('follows at once, shows the server count, and unfollows', async () => {
    const fetchMock = mockFetch(
      profileRoutes({
        'PUT /api/users/ada_l/follow': () => okResponse(200, { following: true, followerCount: 5 }),
        'DELETE /api/users/ada_l/follow': () => okResponse(200, { following: false, followerCount: 4 }),
      }),
      { user: reader },
    )
    renderProfile()

    await userEvent.click(await screen.findByRole('button', { name: /^Follow/, pressed: false }))
    expect(await screen.findByRole('button', { name: /^Following/, pressed: true })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: '5 followers' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /^Following/ }))
    expect(await screen.findByRole('button', { name: /^Follow/, pressed: false })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: '4 followers' })).toBeInTheDocument()
    expect(calls(fetchMock, 'PUT', '/follow')).toHaveLength(1)
    expect(calls(fetchMock, 'DELETE', '/follow')).toHaveLength(1)
  })

  it('goes back and shows the reason when following fails', async () => {
    mockFetch(profileRoutes({ 'PUT /api/users/ada_l/follow': () => errorResponse(409, 'FOLLOW_LIMIT', 'You can follow at most 5000 people') }), { user: reader })
    renderProfile()

    await userEvent.click(await screen.findByRole('button', { name: /^Follow/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent('at most 5000')
    expect(screen.getByRole('button', { name: /^Follow/, pressed: false })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '4 followers' })).toBeInTheDocument()
  })

  it('has no follow button on your own profile', async () => {
    mockFetch(profileRoutes({}, profile({ viewer: undefined })), { user: { ...reader, userName: 'ada_l' } })
    renderProfile()

    expect(await screen.findByRole('link', { name: 'Edit profile' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Follow/ })).not.toBeInTheDocument()
  })
})

describe('the Saved, Following and people pages', () => {
  const preview = (id, title) => ({ ...post({ id, slug: `story-${id}`, title }), content: undefined })

  it('lists saved stories, with an empty state', async () => {
    mockFetch({ 'GET /api/posts/bookmarks': () => listResponse('posts', [preview(1, 'Saved one'), preview(2, 'Saved two')], pagination(1, 1, 2)) }, { user: reader })
    const { unmount } = renderWithProviders(<BookmarksPage />, { route: '/me/bookmarks', path: '/me/bookmarks' })
    expect(await screen.findByRole('heading', { name: 'Saved' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Saved one' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Saved two' })).toBeInTheDocument()
    unmount()

    mockFetch({ 'GET /api/posts/bookmarks': () => listResponse('posts', [], pagination(1, 1, 0)) }, { user: reader })
    renderWithProviders(<BookmarksPage />, { route: '/me/bookmarks', path: '/me/bookmarks' })
    expect(await screen.findByText(/Nothing saved yet/)).toBeInTheDocument()
  })

  it('pages through the stories of the people you follow', async () => {
    const fetchMock = mockFetch({ 'GET /api/posts/feed': () => listResponse('posts', [preview(1, 'Feed one')], pagination(1, 2, 12)) }, { user: reader })
    renderWithProviders(<FeedPage />, { route: '/feed', path: '/feed' })

    expect(await screen.findByRole('link', { name: 'Feed one' })).toBeInTheDocument()
    fetchMock.mockImplementation(() => listResponse('posts', [preview(2, 'Feed two')], pagination(2, 2, 12)))
    await userEvent.click(screen.getByRole('button', { name: /Older/ }))

    expect(await screen.findByRole('link', { name: 'Feed two' })).toBeInTheDocument()
    expect(fetchMock.mock.calls.at(-1)[0]).toContain('page=2')
  })

  it('shows an empty feed with a way back to the front page', async () => {
    mockFetch({ 'GET /api/posts/feed': () => listResponse('posts', [], pagination(1, 1, 0)) }, { user: reader })
    renderWithProviders(<FeedPage />, { route: '/feed', path: '/feed' })

    expect(await screen.findByText(/Follow a few writers/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse the front page' })).toHaveAttribute('href', '/')
  })

  it('lists followers as links to their profiles, and answers 404 for an unknown person', async () => {
    mockFetch({
      'GET /api/users/ada_l/followers': () => listResponse('people', [{ username: 'bob', avatarUrl: null }, { username: 'cy', avatarUrl: '/media/u/3/a.webp' }], pagination(1, 1, 2)),
    })
    const { unmount } = renderWithProviders(<PeoplePage kind="followers" />, { route: '/u/ada_l/followers', path: '/u/:username/followers' })
    expect(await screen.findByRole('heading', { name: 'Followers' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /bob/ })).toHaveAttribute('href', '/u/bob')
    expect(screen.getByRole('link', { name: /cy/ })).toHaveAttribute('href', '/u/cy')
    unmount()

    mockFetch({ 'GET /api/users/nobody/following': () => errorResponse(404, 'NOT_FOUND', 'User not found') })
    renderWithProviders(<PeoplePage kind="following" />, { route: '/u/nobody/following', path: '/u/:username/following' })
    expect(await screen.findByText('404')).toBeInTheDocument()
  })

  it('shows empty lists kindly', async () => {
    mockFetch({ 'GET /api/users/ada_l/following': () => listResponse('people', [], pagination(1, 1, 0)) })
    renderWithProviders(<PeoplePage kind="following" />, { route: '/u/ada_l/following', path: '/u/:username/following' })

    expect(await screen.findByText('Not following anyone yet.')).toBeInTheDocument()
  })
})

describe('counts on story cards', () => {
  const inRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>)
  const card = (overrides) => ({ ...post(overrides), content: undefined })

  it('shows likes and comments when there are any', () => {
    inRouter(<PostCard post={card({ likeCount: 12, commentCount: 3 })} index={1} />)

    expect(screen.getByText('♥ 12')).toBeInTheDocument()
    expect(screen.getByText('3 comments')).toBeInTheDocument()
  })

  it('shows neither when there are none', () => {
    inRouter(<PostCard post={card({ likeCount: 0, commentCount: 0 })} index={1} />)

    expect(screen.queryByText(/♥/)).not.toBeInTheDocument()
    expect(screen.queryByText(/comment/)).not.toBeInTheDocument()
  })
})
