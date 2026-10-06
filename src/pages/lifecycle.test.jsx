import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import PostPage from './PostPage.jsx'
import NewPostPage from './NewPostPage.jsx'
import EditPostPage from './EditPostPage.jsx'
import MyPostsPage from './MyPostsPage.jsx'
import ReviewQueuePage from './ReviewQueuePage.jsx'
import RevisionsPage from './RevisionsPage.jsx'
import HomePage from './HomePage.jsx'
import Navbar from '../components/Navbar.jsx'
import DiffView from '../components/DiffView.jsx'
import PostActions from '../components/PostActions.jsx'
import RequireRole from '../auth/RequireRole.jsx'
import { errorResponse, mockFetch, okResponse, pageResponse, readerUser, renderWithProviders, typeInEditor } from '../test/utils.jsx'

const post = (overrides = {}) => ({
  id: 5,
  slug: 'my-story',
  title: 'My story',
  excerpt: 'A short teaser.',
  content: 'The whole story.',
  readingTime: 1,
  status: 'draft',
  publishedAt: null,
  scheduledAt: null,
  rejectionReason: null,
  author: { id: 2, username: 'bob', avatarUrl: null },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  actions: ['pending_review', 'private'],
  canEdit: true,
  ...overrides,
})

const author = { ...readerUser, id: 2, userName: 'bob', role: 'author' }
const editor = { ...readerUser, id: 9, userName: 'ed', role: 'editor' }

const calls = (fetchMock, method, suffix) =>
  fetchMock.mock.calls.filter(([url, init]) => url.includes(suffix) && (init?.method ?? 'GET') === method)
const lastBody = (fetchMock, method, suffix) => JSON.parse(calls(fetchMock, method, suffix).at(-1)[1].body)

afterEach(() => vi.restoreAllMocks())

describe('PostActions', () => {
  const renderActions = (p) => renderWithProviders(<PostActions post={p} />)

  it('offers exactly the moves the server listed, named for where the post is', () => {
    mockFetch()
    renderActions(post({ status: 'rejected', actions: ['pending_review', 'draft'] }))

    expect(screen.getByRole('button', { name: 'Resubmit for review' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back to draft' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /publish/i })).not.toBeInTheDocument()
  })

  it('renders nothing when there is nothing to do', () => {
    mockFetch()
    const { container } = renderActions(post({ status: 'published', actions: [] }))

    expect(container.querySelector('section')).toBeNull()
  })

  it('submits for review with one click', async () => {
    const fetchMock = mockFetch({ 'POST /api/posts/5/status': () => okResponse(200, { post: post({ status: 'pending_review', actions: ['draft'] }) }) })
    renderActions(post())

    await userEvent.click(screen.getByRole('button', { name: 'Submit for review' }))

    await waitFor(() => expect(calls(fetchMock, 'POST', '/status')).toHaveLength(1))
    expect(lastBody(fetchMock, 'POST', '/status')).toEqual({ to: 'pending_review' })
  })

  it('names the review moves for an editor and approves in one click', async () => {
    const fetchMock = mockFetch({ 'POST /api/posts/5/status': () => okResponse(200, { post: post({ status: 'published' }) }) })
    renderActions(post({ status: 'pending_review', actions: ['published', 'scheduled', 'rejected'] }))

    expect(screen.getByRole('button', { name: 'Approve and schedule…' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Approve and publish' }))

    await waitFor(() => expect(lastBody(fetchMock, 'POST', '/status')).toEqual({ to: 'published' }))
  })

  it('will not reject without a reason, then sends it', async () => {
    const fetchMock = mockFetch({ 'POST /api/posts/5/status': () => okResponse(200, { post: post({ status: 'rejected' }) }) })
    renderActions(post({ status: 'pending_review', actions: ['published', 'rejected'] }))

    await userEvent.click(screen.getByRole('button', { name: 'Reject…' }))
    await userEvent.click(screen.getByRole('button', { name: 'Reject post' }))
    expect(await screen.findByText('Tell the author what to fix.')).toBeInTheDocument()
    expect(calls(fetchMock, 'POST', '/status')).toHaveLength(0)

    await userEvent.type(screen.getByLabelText('Reason for rejection'), 'Please add sources.')
    await userEvent.click(screen.getByRole('button', { name: 'Reject post' }))

    await waitFor(() => expect(lastBody(fetchMock, 'POST', '/status')).toEqual({ to: 'rejected', reason: 'Please add sources.' }))
  })

  it('schedules for a future time, and refuses a past one before asking the server', async () => {
    const fetchMock = mockFetch({ 'POST /api/posts/5/status': () => okResponse(200, { post: post({ status: 'scheduled' }) }) })
    renderActions(post({ status: 'draft', actions: ['published', 'scheduled'] }))

    await userEvent.click(screen.getByRole('button', { name: 'Schedule…' }))
    const input = screen.getByLabelText('Publish at')

    fireEvent.change(input, { target: { value: '2000-01-01T10:00' } })
    await userEvent.click(screen.getByRole('button', { name: 'Confirm schedule' }))
    expect(await screen.findByText(/at least a couple of minutes/)).toBeInTheDocument()
    expect(calls(fetchMock, 'POST', '/status')).toHaveLength(0)

    fireEvent.change(input, { target: { value: '2099-06-15T10:30' } })
    await userEvent.click(screen.getByRole('button', { name: 'Confirm schedule' }))

    await waitFor(() => expect(calls(fetchMock, 'POST', '/status')).toHaveLength(1))
    const sent = lastBody(fetchMock, 'POST', '/status')
    expect(sent.to).toBe('scheduled')
    expect(new Date(sent.publishAt).getTime()).toBe(new Date('2099-06-15T10:30').getTime())
  })

  it('shows the server’s explanation when a move is refused', async () => {
    mockFetch({ 'POST /api/posts/5/status': () => errorResponse(409, 'INVALID_TRANSITION', 'The post was changed by someone else. Reload and try again.') })
    renderActions(post())

    await userEvent.click(screen.getByRole('button', { name: 'Submit for review' }))

    expect(await screen.findByText('The post was changed by someone else. Reload and try again.')).toBeInTheDocument()
  })
})

describe('PostPage for people who can see more than the public', () => {
  const renderById = () => renderWithProviders(<PostPage by="id" />, { route: '/posts/5', path: '/posts/:id' })

  it('explains where an unpublished story stands, including an editor’s note', async () => {
    mockFetch({ 'GET /api/posts/5': () => okResponse(200, { post: post({ status: 'rejected', rejectionReason: 'Add sources.', actions: ['pending_review', 'draft'] }) }) }, { user: author })
    renderById()

    expect(await screen.findByText('Add sources.')).toBeInTheDocument()
    expect(screen.getByText('Rejected')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resubmit for review' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute('href', '/posts/5/edit')
    expect(screen.getByRole('link', { name: 'History' })).toHaveAttribute('href', '/posts/5/revisions')
  })

  it('shows an editor the review actions and history, but not the author’s edit and delete', async () => {
    mockFetch({ 'GET /api/posts/5': () => okResponse(200, { post: post({ status: 'pending_review', canEdit: false, actions: ['published', 'scheduled', 'rejected'] }) }) }, { user: editor })
    renderById()

    expect(await screen.findByRole('button', { name: 'Approve and publish' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'History' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
    expect(screen.getByText('Review tools')).toBeInTheDocument()
  })

  it('tells a scheduled story’s author when it goes live', async () => {
    mockFetch({ 'GET /api/posts/5': () => okResponse(200, { post: post({ status: 'scheduled', scheduledAt: '2099-01-01T09:00:00.000Z', canEdit: false, actions: ['draft'] }) }) }, { user: author })
    renderById()

    expect(await screen.findByText(/Goes live/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Unschedule' })).toBeInTheDocument()
  })
})

describe('NewPostPage', () => {
  it('saves a draft, sending only what was filled in, and opens it for editing', async () => {
    const fetchMock = mockFetch(
      { 'POST /api/posts': () => okResponse(201, { post: post({ id: 9 }) }) },
      { user: author },
    )
    renderWithProviders(<NewPostPage />, { route: '/posts/new', path: '/posts/new', routes: <Route path="/posts/:id/edit" element={<p>the editor</p>} /> })

    await userEvent.type(await screen.findByLabelText('Title'), 'A new story')
    await typeInEditor('Once upon a time.')
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }))

    expect(await screen.findByText('the editor')).toBeInTheDocument()
    expect(JSON.parse(calls(fetchMock, 'POST', '/api/posts')[0][1].body)).toEqual({ title: 'A new story', content: '<p>Once upon a time.</p>' })
    expect(screen.getByTestId('location')).toHaveTextContent('/posts/9/edit')
  })

  it('includes a chosen excerpt and URL', async () => {
    const fetchMock = mockFetch({ 'POST /api/posts': () => okResponse(201, { post: post({ id: 9 }) }) }, { user: author })
    renderWithProviders(<NewPostPage />, { route: '/posts/new', path: '/posts/new', routes: <Route path="/posts/:id/edit" element={<p>the editor</p>} /> })

    await userEvent.type(await screen.findByLabelText('Title'), 'Titled')
    await typeInEditor('Body.')
    await userEvent.type(screen.getByLabelText('Excerpt'), 'My teaser')
    await userEvent.type(screen.getByLabelText('URL'), 'my-own-url')
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }))

    await screen.findByText('the editor')
    expect(JSON.parse(calls(fetchMock, 'POST', '/api/posts')[0][1].body)).toEqual({ title: 'Titled', content: '<p>Body.</p>', excerpt: 'My teaser', slug: 'my-own-url' })
  })
})

describe('EditPostPage', () => {
  const renderEdit = () =>
    renderWithProviders(<EditPostPage />, {
      route: '/posts/5/edit',
      path: '/posts/:id/edit',
      routes: <Route path="/posts/:id" element={<p>the preview</p>} />,
    })

  it('pre-fills the post, and saves changes without freezing the generated excerpt or URL', async () => {
    const fetchMock = mockFetch(
      {
        'GET /api/posts/5': () => okResponse(200, { post: post() }),
        'PATCH /api/posts/5': () => okResponse(200, { post: post({ title: 'Better title' }) }),
      },
      { user: author },
    )
    renderEdit()

    const title = await screen.findByLabelText('Title')
    expect(title).toHaveValue('My story')
    expect(screen.getByLabelText('Excerpt')).toHaveValue('A short teaser.')
    expect(screen.getByLabelText('URL')).toHaveValue('my-story')

    await userEvent.clear(title)
    await userEvent.type(title, 'Better title')
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }))

    expect(await screen.findByText('Your changes are saved.')).toBeInTheDocument()
    expect(JSON.parse(calls(fetchMock, 'PATCH', '/api/posts/5')[0][1].body)).toEqual({ title: 'Better title', content: 'The whole story.', expectedUpdatedAt: '2026-01-02T00:00:00.000Z' })
  })

  it('sends an excerpt or URL only when the author changed it', async () => {
    const fetchMock = mockFetch(
      { 'GET /api/posts/5': () => okResponse(200, { post: post() }), 'PATCH /api/posts/5': () => okResponse(200, { post: post() }) },
      { user: author },
    )
    renderEdit()

    const excerpt = await screen.findByLabelText('Excerpt')
    await userEvent.clear(excerpt)
    await userEvent.type(excerpt, 'My own teaser')
    const slug = screen.getByLabelText('URL')
    await userEvent.clear(slug)
    await userEvent.type(slug, 'new-address')
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }))

    await waitFor(() => expect(calls(fetchMock, 'PATCH', '/api/posts/5')).toHaveLength(1))
    expect(JSON.parse(calls(fetchMock, 'PATCH', '/api/posts/5')[0][1].body)).toEqual({
      title: 'My story', content: 'The whole story.', excerpt: 'My own teaser', slug: 'new-address', expectedUpdatedAt: '2026-01-02T00:00:00.000Z',
    })
  })

  it('locks the URL of a published story and offers “Save changes”', async () => {
    mockFetch({ 'GET /api/posts/5': () => okResponse(200, { post: post({ status: 'published', publishedAt: '2026-01-03T00:00:00.000Z', actions: ['draft', 'archived', 'private'] }) }) }, { user: author })
    renderEdit()

    expect(await screen.findByRole('button', { name: 'Save changes' })).toBeInTheDocument()
    expect(screen.getByLabelText('URL')).toBeDisabled()
  })

  it('shows no form while a story is waiting for review, and offers to withdraw it', async () => {
    mockFetch({ 'GET /api/posts/5': () => okResponse(200, { post: post({ status: 'pending_review', canEdit: false, actions: ['draft'] }) }) }, { user: author })
    renderEdit()

    expect(await screen.findByText(/waiting for an editor/)).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Content' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Withdraw' })).toBeInTheDocument()
  })

  it('shows the editor’s note on a rejected story', async () => {
    mockFetch({ 'GET /api/posts/5': () => okResponse(200, { post: post({ status: 'rejected', rejectionReason: 'Too thin.', actions: ['pending_review', 'draft'] }) }) }, { user: author })
    renderEdit()

    expect(await screen.findByText('Too thin.')).toBeInTheDocument()
    expect(await screen.findByRole('textbox', { name: 'Content' })).toBeInTheDocument()
  })

  it('sends someone else’s story to the read-only preview', async () => {
    mockFetch({ 'GET /api/posts/5': () => okResponse(200, { post: post({ author: { id: 77, username: 'someone', avatarUrl: null }, canEdit: false, actions: [] }) }) }, { user: author })
    renderEdit()

    expect(await screen.findByText('the preview')).toBeInTheDocument()
  })
})

describe('MyPostsPage', () => {
  const listing = [
    post({ id: 1, title: 'A draft', status: 'draft' }),
    post({ id: 2, title: 'In the queue', status: 'pending_review' }),
    post({ id: 3, title: 'Coming soon', status: 'scheduled', scheduledAt: '2099-01-01T09:00:00.000Z' }),
  ]

  it('lists every story with its status, and links to preview and edit', async () => {
    mockFetch({ 'GET /api/posts/mine': () => pageResponse(listing) }, { user: author })
    renderWithProviders(<MyPostsPage />, { route: '/me/posts', path: '/me/posts' })

    expect(await screen.findByRole('link', { name: 'A draft' })).toHaveAttribute('href', '/posts/1')
    expect(within(screen.getByRole('list')).getByText('In review')).toBeInTheDocument()
    expect(screen.getByText(/Goes live/)).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Edit' })[0]).toHaveAttribute('href', '/posts/1/edit')
  })

  it('filters by status through the address, and pages', async () => {
    const fetchMock = mockFetch({ 'GET /api/posts/mine': () => pageResponse(listing, { page: 1, limit: 10, total: 25, totalPages: 3 }) }, { user: author })
    renderWithProviders(<MyPostsPage />, { route: '/me/posts', path: '/me/posts' })
    await screen.findByRole('link', { name: 'A draft' })

    await userEvent.click(screen.getByRole('button', { name: 'Drafts' }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/me/posts?status=draft'))
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url.includes('status=draft'))).toBe(true))
    expect(screen.getByRole('button', { name: 'Drafts' })).toHaveAttribute('aria-current', 'true')

    await userEvent.click(screen.getByRole('button', { name: /Older/ }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('status=draft&page=2'))
  })

  it('says so when there is nothing to show', async () => {
    mockFetch({ 'GET /api/posts/mine': () => pageResponse([]) }, { user: author })
    renderWithProviders(<MyPostsPage />, { route: '/me/posts', path: '/me/posts' })

    expect(await screen.findByText('You have not written anything yet.')).toBeInTheDocument()
  })
})

describe('review queue', () => {
  const queued = [post({ id: 4, title: 'Awaiting approval', status: 'pending_review', author: { id: 2, username: 'bob', avatarUrl: null } })]
  const renderQueue = () =>
    renderWithProviders(
      <RequireRole role="editor">
        <ReviewQueuePage />
      </RequireRole>,
      { route: '/review', path: '/review' },
    )

  it('shows editors the waiting stories with a way in to review each', async () => {
    mockFetch({ 'GET /api/posts/review': () => pageResponse(queued) }, { user: editor })
    renderQueue()

    expect(await screen.findByText('Awaiting approval')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'bob' })).toHaveAttribute('href', '/u/bob')
    expect(screen.getByRole('link', { name: 'Review' })).toHaveAttribute('href', '/posts/4')
  })

  it('has an empty state', async () => {
    mockFetch({ 'GET /api/posts/review': () => pageResponse([]) }, { user: editor })
    renderQueue()

    expect(await screen.findByText('Nothing is waiting for review.')).toBeInTheDocument()
  })

  it('shows authors a “not found” page instead (the API refuses them anyway)', async () => {
    const fetchMock = mockFetch({ 'GET /api/posts/review': () => pageResponse(queued) }, { user: author })
    renderQueue()

    expect(await screen.findByText('404')).toBeInTheDocument()
    expect(calls(fetchMock, 'GET', '/api/posts/review')).toHaveLength(0)
  })
})

describe('RevisionsPage', () => {
  const revisions = [
    { version: 2, title: 'My story', excerpt: null, reason: 'edited', editor: { id: 2, username: 'bob' }, createdAt: '2026-02-02T10:00:00.000Z' },
    { version: 1, title: 'My story', excerpt: null, reason: 'created', editor: { id: 2, username: 'bob' }, createdAt: '2026-02-01T10:00:00.000Z' },
  ]
  const comparison = {
    from: revisions[1], to: revisions[0],
    title: { changed: false, from: 'My story', to: 'My story' },
    excerpt: { changed: false, from: null, to: null },
    content: [
      { type: 'same', value: 'Alpha\n' },
      { type: 'remove', value: 'Bravo\n' },
      { type: 'add', value: 'Beta\nDelta\n' },
    ],
    stats: { added: 2, removed: 1 },
  }
  const routes = (extra = {}) => ({
    'GET /api/posts/5': () => okResponse(200, { post: post() }),
    'GET /api/posts/5/revisions': () => jsonList(revisions),
    'GET /api/posts/5/revisions/compare': () => okResponse(200, { comparison }),
    ...extra,
  })
  const jsonList = (list) =>
    Promise.resolve(new Response(JSON.stringify({ success: true, data: { revisions: list }, meta: { pagination: { page: 1, limit: 20, total: list.length, totalPages: 1 } } }), { status: 200 }))
  const renderHistory = () => renderWithProviders(<RevisionsPage />, { route: '/posts/5/revisions', path: '/posts/:id/revisions' })

  it('lists the versions and compares the latest two by default', async () => {
    const fetchMock = mockFetch(routes(), { user: author })
    renderHistory()

    const versions = within(await screen.findByRole('region', { name: 'Versions' }))
    expect(versions.getByText('Version 2')).toBeInTheDocument()
    expect(versions.getByText('Version 1')).toBeInTheDocument()
    expect(await screen.findByText('2 added · 1 removed')).toBeInTheDocument()
    expect(screen.getByText(/Bravo/)).toBeInTheDocument()
    expect(screen.getByText(/Delta/)).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([url]) => url.includes('/compare?from=1&to=2'))).toBe(true)
  })

  it('compares against the current text when chosen', async () => {
    const fetchMock = mockFetch(routes(), { user: author })
    renderHistory()
    await screen.findByText('2 added · 1 removed')

    await userEvent.selectOptions(screen.getByLabelText('To'), 'current')

    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url.includes('/compare?from=1&to=current'))).toBe(true))
  })

  it('restores a version after a confirmation, and says so', async () => {
    const fetchMock = mockFetch(routes({ 'POST /api/posts/5/revisions/1/restore': () => okResponse(200, { post: post() }) }), { user: author })
    renderHistory()
    await screen.findByText('2 added · 1 removed')

    await userEvent.click(screen.getByRole('button', { name: 'Restore version 1…' }))
    expect(calls(fetchMock, 'POST', '/restore')).toHaveLength(0)
    await userEvent.click(screen.getByRole('button', { name: 'Restore version 1' }))

    expect(await screen.findByText(/That version is the current text again/)).toBeInTheDocument()
    expect(calls(fetchMock, 'POST', '/revisions/1/restore')).toHaveLength(1)
  })

  it('shows history to a reader who cannot edit, without any restore control', async () => {
    mockFetch(routes({ 'GET /api/posts/5': () => okResponse(200, { post: post({ canEdit: false, status: 'pending_review' }) }) }), { user: editor })
    renderHistory()

    expect(await screen.findByText('2 added · 1 removed')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Restore version/ })).not.toBeInTheDocument()
    expect(screen.getByText(/can only be restored by the author/)).toBeInTheDocument()
  })

  it('shows “not found” when the history is hidden from the viewer', async () => {
    mockFetch({ 'GET /api/posts/5': () => errorResponse(404, 'NOT_FOUND', 'Post not found'), 'GET /api/posts/5/revisions': () => errorResponse(404, 'NOT_FOUND', 'Post not found') }, { user: author })
    renderHistory()

    expect(await screen.findByText('404')).toBeInTheDocument()
  })
})

describe('DiffView', () => {
  const base = { title: { changed: false }, excerpt: { changed: false } }

  it('marks additions and removals with symbols and hidden labels, not just colour', () => {
    renderWithProviders(
      <DiffView comparison={{ ...base, content: [{ type: 'remove', value: 'old line\n' }, { type: 'add', value: 'new line\n' }], stats: { added: 1, removed: 1 } }} />,
    )

    expect(screen.getByText('Removed:')).toHaveClass('sr-only')
    expect(screen.getByText('Added:')).toHaveClass('sr-only')
    expect(screen.getByText('old line')).toBeInTheDocument()
    expect(screen.getByText('new line')).toBeInTheDocument()
  })

  it('folds long unchanged stretches and says how many lines were skipped', () => {
    const middle = Array.from({ length: 20 }, (_, i) => `same ${i}`).join('\n') + '\n'
    renderWithProviders(
      <DiffView comparison={{ ...base, content: [{ type: 'same', value: middle }, { type: 'add', value: 'brand new\n' }], stats: { added: 1, removed: 0 } }} />,
    )

    expect(screen.getByText(/17 unchanged lines/)).toBeInTheDocument()
    expect(screen.queryByText('same 0')).not.toBeInTheDocument()
    expect(screen.getByText('same 19')).toBeInTheDocument()
  })

  it('shows a title change and says when nothing changed', () => {
    renderWithProviders(
      <DiffView comparison={{ title: { changed: true, from: 'Old', to: 'New' }, excerpt: { changed: false }, content: [{ type: 'same', value: 'text\n' }], stats: { added: 0, removed: 0 } }} />,
    )

    expect(screen.getByText('Old')).toBeInTheDocument()
    expect(screen.getByText('New')).toBeInTheDocument()
    expect(screen.getByText('The text is the same.')).toBeInTheDocument()
  })
})

describe('front page and navigation', () => {
  const preview = (id) => ({ id, slug: `story-${id}`, status: 'published', title: `Story ${id}`, excerpt: 'Teaser', readingTime: 1, author: { id: 1, username: 'ada', avatarUrl: null }, publishedAt: '2026-01-01T00:00:00.000Z', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' })

  it('pages through older stories on the front page', async () => {
    const fetchMock = mockFetch({ 'GET /api/posts': () => pageResponse([preview(1), preview(2)], { page: 1, limit: 10, total: 20, totalPages: 2 }) })
    renderWithProviders(<HomePage />)
    await screen.findByText('Story 2')

    fetchMock.mockImplementation((url) =>
      url.includes('page=2') ? pageResponse([preview(11)], { page: 2, limit: 10, total: 20, totalPages: 2 }) : pageResponse([preview(1)]),
    )
    await userEvent.click(screen.getByRole('button', { name: /Older/ }))

    expect(await screen.findByText('Story 11')).toBeInTheDocument()
  })

  it('gives signed-in writers a link to their stories, and editors one to the queue', async () => {
    mockFetch({}, { user: editor })
    renderWithProviders(<Navbar />)

    const nav = (await screen.findAllByRole('navigation', { name: 'Account' }))[0]
    expect(within(nav).getByRole('link', { name: 'My stories' })).toHaveAttribute('href', '/me/posts')
    expect(within(nav).getByRole('link', { name: 'Review' })).toHaveAttribute('href', '/review')
  })

  it('does not show the review link to authors', async () => {
    mockFetch({}, { user: author })
    renderWithProviders(<Navbar />)

    const nav = (await screen.findAllByRole('navigation', { name: 'Account' }))[0]
    expect(await within(nav).findByRole('link', { name: 'My stories' })).toBeInTheDocument()
    expect(within(nav).queryByRole('link', { name: 'Review' })).not.toBeInTheDocument()
  })
})
