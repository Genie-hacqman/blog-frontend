import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import EditPostPage from './EditPostPage.jsx'
import NewPostPage from './NewPostPage.jsx'
import PostCard, { LeadStory } from '../components/PostCard.jsx'
import { errorResponse, mockFetch, okResponse, readerUser, renderWithProviders, typeInEditor } from '../test/utils.jsx'
import { MemoryRouter } from 'react-router'
import { render } from '@testing-library/react'

const author = { ...readerUser, id: 2, userName: 'bob', role: 'author' }

const post = (overrides = {}) => ({
  id: 5,
  slug: 'my-story',
  title: 'My story',
  excerpt: 'A short teaser.',
  content: '<p>The whole story.</p>',
  readingTime: 1,
  status: 'draft',
  publishedAt: null,
  scheduledAt: null,
  author: { id: 2, username: 'bob', avatarUrl: null },
  category: null,
  tags: [],
  cover: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  actions: ['pending_review'],
  canEdit: true,
  ...overrides,
})

const patches = (fetchMock) => fetchMock.mock.calls.filter(([url, init]) => url.endsWith('/api/posts/5') && init?.method === 'PATCH')
const bodyOf = (call) => JSON.parse(call[1].body)

describe('EditPostPage: automatic saving', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['setTimeout', 'clearTimeout'] }))
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  const renderEdit = () => renderWithProviders(<EditPostPage />, { route: '/posts/5/edit', path: '/posts/:id/edit', routes: <Route path="/posts/:id" element={<p>the preview</p>} /> })
  const advance = (ms) => act(async () => { await vi.advanceTimersByTimeAsync(ms) })
  const retitle = async (user, text) => {
    const title = await screen.findByLabelText('Title')
    await user.clear(title)
    await user.type(title, text)
  }

  it('saves a draft by itself, sends only what changed with the version it started from, and tracks the new version', async () => {
    let version = 0
    const fetchMock = mockFetch(
      {
        'GET /api/posts/5': () => okResponse(200, { post: post() }),
        'PATCH /api/posts/5': () => okResponse(200, { post: post({ updatedAt: `2026-01-02T00:00:0${++version}.000Z` }) }),
      },
      { user: author },
    )
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderEdit()

    await retitle(user, 'First edit')
    expect(patches(fetchMock)).toHaveLength(0)
    await advance(5100)
    await waitFor(() => expect(patches(fetchMock)).toHaveLength(1))
    expect(bodyOf(patches(fetchMock)[0])).toEqual({ title: 'First edit', content: '<p>The whole story.</p>', expectedUpdatedAt: '2026-01-02T00:00:00.000Z' })
    expect(await screen.findByText(/Saved \d/)).toBeInTheDocument()

    await user.type(screen.getByLabelText('Title'), '!')
    await advance(5100)
    await waitFor(() => expect(patches(fetchMock)).toHaveLength(2))
    expect(bodyOf(patches(fetchMock)[1]).expectedUpdatedAt).toBe('2026-01-02T00:00:01.000Z')
  })

  it('waits for the writer to pause: typing keeps pushing the save back', async () => {
    const fetchMock = mockFetch({ 'GET /api/posts/5': () => okResponse(200, { post: post() }), 'PATCH /api/posts/5': () => okResponse(200, { post: post() }) }, { user: author })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderEdit()
    const title = await screen.findByLabelText('Title')

    await user.type(title, 'a')
    await advance(3000)
    await user.type(title, 'b')
    await advance(3000)
    expect(patches(fetchMock)).toHaveLength(0)

    await advance(2500)
    await waitFor(() => expect(patches(fetchMock)).toHaveLength(1))
    expect(bodyOf(patches(fetchMock)[0]).title).toBe('My storyab')
  })

  it('never saves a published story by itself, because that would change what readers see', async () => {
    const published = post({ status: 'published', publishedAt: '2026-01-02T00:00:00.000Z', actions: ['draft'] })
    const fetchMock = mockFetch({ 'GET /api/posts/5': () => okResponse(200, { post: published }), 'PATCH /api/posts/5': () => okResponse(200, { post: published }) }, { user: author })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderEdit()

    await retitle(user, 'Live edit')
    await advance(8000)
    expect(patches(fetchMock)).toHaveLength(0)
    expect(screen.getByText(/unsaved changes/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(patches(fetchMock)).toHaveLength(1))
    expect(bodyOf(patches(fetchMock)[0]).expectedUpdatedAt).toBe('2026-01-02T00:00:00.000Z')
  })

  it('tells the writer, and stops, when the story was changed somewhere else', async () => {
    const fetchMock = mockFetch(
      { 'GET /api/posts/5': () => okResponse(200, { post: post() }), 'PATCH /api/posts/5': () => errorResponse(409, 'EDIT_CONFLICT', 'This post was changed somewhere else.') },
      { user: author },
    )
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderEdit()

    await retitle(user, 'Mine')
    await advance(5100)
    expect(await screen.findByText(/changed somewhere else/)).toBeInTheDocument()

    await user.type(screen.getByLabelText('Title'), '!')
    await advance(6000)
    expect(patches(fetchMock)).toHaveLength(1)
    expect(screen.getByLabelText('Title')).toHaveValue('Mine!')
  })

  it('explains a conflict on the Save button too', async () => {
    mockFetch(
      { 'GET /api/posts/5': () => okResponse(200, { post: post({ status: 'published', publishedAt: '2026-01-02T00:00:00.000Z' }) }), 'PATCH /api/posts/5': () => errorResponse(409, 'EDIT_CONFLICT', 'x') },
      { user: author },
    )
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderEdit()

    await retitle(user, 'Mine')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText(/changed somewhere else \(another tab or device\)/)).toBeInTheDocument()
  })

  it('does not replace what is being typed when the story is fetched again in the background', async () => {
    let serverTitle = 'My story'
    mockFetch({ 'GET /api/posts/5': () => okResponse(200, { post: post({ title: serverTitle }) }) }, { user: author })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderEdit()

    await retitle(user, 'Half-typed')
    serverTitle = 'Changed on the server'
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await vi.advanceTimersByTimeAsync(100)
    })

    expect(screen.getByLabelText('Title')).toHaveValue('Half-typed')
  })
})

describe('covers', () => {
  afterEach(() => vi.restoreAllMocks())

  const cover = { id: 3, url: '/media/u/2/c.webp', width: 1600, height: 900, alt: 'A sunrise' }
  const renderEdit = () => renderWithProviders(<EditPostPage />, { route: '/posts/5/edit', path: '/posts/:id/edit', routes: <Route path="/posts/:id" element={<p>the preview</p>} /> })

  it('shows the cover of a story being edited, and sends nothing about it when it is unchanged', async () => {
    const fetchMock = mockFetch({ 'GET /api/posts/5': () => okResponse(200, { post: post({ cover }) }), 'PATCH /api/posts/5': () => okResponse(200, { post: post({ cover }) }) }, { user: author })
    renderEdit()

    expect(await screen.findByLabelText('Picture description')).toHaveValue('A sunrise')
    const title = screen.getByLabelText('Title')
    await userEvent.clear(title)
    await userEvent.type(title, 'Retitled')
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }))

    await waitFor(() => expect(patches(fetchMock)).toHaveLength(1))
    expect(Object.keys(bodyOf(patches(fetchMock)[0])).sort()).toEqual(['content', 'expectedUpdatedAt', 'title'])
  })

  it('removing the cover sends coverMediaId null; changing its description sends only the description', async () => {
    const fetchMock = mockFetch({ 'GET /api/posts/5': () => okResponse(200, { post: post({ cover }) }), 'PATCH /api/posts/5': () => okResponse(200, { post: post({ cover }) }) }, { user: author })
    renderEdit()

    const alt = await screen.findByLabelText('Picture description')
    await userEvent.clear(alt)
    await userEvent.type(alt, 'Dawn')
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }))
    await waitFor(() => expect(patches(fetchMock)).toHaveLength(1))
    expect(bodyOf(patches(fetchMock)[0])).toMatchObject({ coverAlt: 'Dawn' })
    expect(bodyOf(patches(fetchMock)[0])).not.toHaveProperty('coverMediaId')

    await userEvent.click(await screen.findByRole('button', { name: 'Remove' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }))
    await waitFor(() => expect(patches(fetchMock)).toHaveLength(2))
    expect(bodyOf(patches(fetchMock)[1])).toMatchObject({ coverMediaId: null })
  })

  it('a new story is created with the chosen cover and its description', async () => {
    const fetchMock = mockFetch(
      {
        'POST /api/media': () => okResponse(201, { media: { id: 8, url: '/media/u/2/new.webp', width: 1, height: 1, purpose: 'cover' } }),
        'POST /api/posts': () => okResponse(201, { post: post({ id: 9 }) }),
      },
      { user: author },
    )
    renderWithProviders(<NewPostPage />, { route: '/posts/new', path: '/posts/new', routes: <Route path="/posts/:id/edit" element={<p>the editor</p>} /> })

    await userEvent.type(await screen.findByLabelText('Title'), 'Covered')
    await typeInEditor('Body.')
    await userEvent.upload(screen.getByLabelText('Choose a cover picture'), new File([new Uint8Array([1])], 'c.png', { type: 'image/png' }))
    await userEvent.type(await screen.findByLabelText('Picture description'), 'Dawn')
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }))

    await screen.findByText('the editor')
    const created = fetchMock.mock.calls.find(([url, init]) => url.endsWith('/api/posts') && init?.method === 'POST')
    expect(JSON.parse(created[1].body)).toEqual({ title: 'Covered', content: '<p>Body.</p>', coverMediaId: 8, coverAlt: 'Dawn' })
  })
})

describe('post cards', () => {
  const preview = { id: 1, slug: 's', title: 'A title', excerpt: 'A teaser', readingTime: 3, author: { id: 1, username: 'ada' }, publishedAt: '2026-01-01T00:00:00.000Z', createdAt: '2026-01-01T00:00:00.000Z', category: null, tags: [] }
  const inRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>)

  it('shows the cover as a picture with its description, in lists and in the lead story', () => {
    const withCover = { ...preview, cover: { id: 3, url: '/media/u/1/c.webp', alt: 'A sunrise' } }
    inRouter(<><PostCard post={withCover} index={1} /><LeadStory post={withCover} /></>)

    const pictures = screen.getAllByRole('img', { name: 'A sunrise' })
    expect(pictures).toHaveLength(2)
    expect(pictures[0]).toHaveAttribute('src', '/media/u/1/c.webp')
  })

  it('shows no picture without a cover, and never needs the body', () => {
    inRouter(<PostCard post={{ ...preview, cover: null }} index={1} />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('A teaser')).toBeInTheDocument()
    expect(screen.getByText(/3 min read/)).toBeInTheDocument()
  })
})
