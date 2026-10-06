import { useState } from 'react'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TaxonomyPage from './TaxonomyPage.jsx'
import SearchPage from './SearchPage.jsx'
import ManageCategoriesPage from './ManageCategoriesPage.jsx'
import NewPostPage from './NewPostPage.jsx'
import EditPostPage from './EditPostPage.jsx'
import PostPage from './PostPage.jsx'
import HomePage from './HomePage.jsx'
import SectionNav from '../components/SectionNav.jsx'
import Navbar from '../components/Navbar.jsx'
import TagInput from '../components/TagInput.jsx'
import PostForm from '../components/PostForm.jsx'
import RequireRole from '../auth/RequireRole.jsx'
import { errorResponse, jsonResponse, mockFetch, okResponse, pageResponse, readerUser, renderWithProviders, typeInEditor } from '../test/utils.jsx'

const categories = [
  { id: 1, name: 'Technology', slug: 'technology', description: 'Software and hardware.', postCount: 4 },
  { id: 2, name: 'Culture', slug: 'culture', description: null, postCount: 2 },
  { id: 3, name: 'Opinion', slug: 'opinion', description: null, postCount: 0 },
]
const editor = { ...readerUser, id: 9, userName: 'ed', role: 'editor' }
const author = { ...readerUser, id: 2, userName: 'bob', role: 'author' }

const preview = (id, title, extra = {}) => ({
  id, slug: `story-${id}`, status: 'published', title, excerpt: `${title} teaser`, readingTime: 2,
  author: { id: 1, username: 'ada', avatarUrl: null }, category: null, tags: [],
  publishedAt: '2026-01-01T00:00:00.000Z', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', ...extra,
})
const post = (overrides = {}) => ({
  ...preview(5, 'My story'), content: 'The whole story.', status: 'draft', publishedAt: null, scheduledAt: null,
  actions: ['pending_review'], canEdit: true, slug: 'my-story', ...overrides,
})
const searchResponse = (posts, pagination, query) =>
  jsonResponse(200, { success: true, data: { posts }, meta: { pagination: pagination ?? { page: 1, limit: 10, total: posts.length, totalPages: 1 }, query } })

const calls = (fetchMock, method, suffix) => fetchMock.mock.calls.filter(([url, init]) => url.includes(suffix) && (init?.method ?? 'GET') === method)
const lastBody = (fetchMock, method, suffix) => JSON.parse(calls(fetchMock, method, suffix).at(-1)[1].body)

afterEach(() => vi.restoreAllMocks())

describe('SectionNav and the search box', () => {
  it('lists the sections that have stories, as links, and leaves out empty ones', async () => {
    mockFetch({ 'GET /api/categories': () => okResponse(200, { categories }) })
    renderWithProviders(<SectionNav />)

    const nav = await screen.findByRole('navigation', { name: 'Sections' })
    expect(within(nav).getByRole('link', { name: 'Technology' })).toHaveAttribute('href', '/category/technology')
    expect(within(nav).getByRole('link', { name: 'Culture' })).toHaveAttribute('href', '/category/culture')
    expect(within(nav).queryByRole('link', { name: 'Opinion' })).not.toBeInTheDocument()
  })

  it('shows only the search box when there are no sections, or the list cannot be loaded', async () => {
    mockFetch({ 'GET /api/categories': () => errorResponse(500, 'INTERNAL_ERROR', 'Something went wrong') })
    renderWithProviders(<SectionNav />)

    expect(await screen.findByRole('search')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Sections' })).not.toBeInTheDocument()
  })

  it('searches: sends the reader to the results page with the query in the address', async () => {
    mockFetch({ 'GET /api/categories': () => okResponse(200, { categories: [] }) })
    renderWithProviders(<SectionNav />)

    await userEvent.type(screen.getByLabelText('Search stories'), '  react hooks ')
    await userEvent.click(screen.getByRole('button', { name: 'Search' }))

    expect(screen.getByTestId('location')).toHaveTextContent('/search?q=react%20hooks')
  })

  it('ignores an empty search', async () => {
    mockFetch({ 'GET /api/categories': () => okResponse(200, { categories: [] }) })
    renderWithProviders(<SectionNav />)

    await userEvent.type(screen.getByLabelText('Search stories'), '   ')
    await userEvent.click(screen.getByRole('button', { name: 'Search' }))

    expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/)
  })

  it('shows what is being searched for while on the results page', async () => {
    mockFetch({ 'GET /api/categories': () => okResponse(200, { categories: [] }) })
    renderWithProviders(<SectionNav />, { route: '/search?q=rust', path: '/search' })

    expect(screen.getByLabelText('Search stories')).toHaveValue('rust')
  })
})

describe('section and topic pages', () => {
  const renderPage = (kind, slug) =>
    renderWithProviders(<TaxonomyPage kind={kind} />, { route: `/${kind}/${slug}`, path: `/${kind}/:slug` })

  it('shows a section with its description, story count and stories', async () => {
    const fetchMock = mockFetch({
      'GET /api/categories/technology': () => okResponse(200, { category: categories[0] }),
      'GET /api/posts': () => pageResponse([preview(1, 'First'), preview(2, 'Second')], { page: 1, limit: 10, total: 4, totalPages: 1 }),
    })
    renderPage('category', 'technology')

    expect(await screen.findByRole('heading', { name: 'Technology' })).toBeInTheDocument()
    expect(screen.getByText('Software and hardware.')).toBeInTheDocument()
    expect(screen.getByText('4 stories')).toBeInTheDocument()
    expect(await screen.findByText('First teaser')).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([url]) => url.includes('category=technology'))).toBe(true)
  })

  it('shows a topic the same way, filtering by tag', async () => {
    const fetchMock = mockFetch({
      'GET /api/tags/react': () => okResponse(200, { tag: { id: 1, name: 'React', slug: 'react', postCount: 1 } }),
      'GET /api/posts': () => pageResponse([preview(1, 'Hooks')]),
    })
    renderPage('tag', 'react')

    expect(await screen.findByRole('heading', { name: 'React' })).toBeInTheDocument()
    expect(screen.getByText('1 story')).toBeInTheDocument()
    expect(screen.getByText('Topic')).toBeInTheDocument()
    await screen.findByText('Hooks teaser')
    expect(fetchMock.mock.calls.some(([url]) => url.includes('tag=react'))).toBe(true)
  })

  it('shows the 404 page for an unknown section or topic', async () => {
    mockFetch({ 'GET /api/categories/nope': () => errorResponse(404, 'NOT_FOUND', 'Category not found'), 'GET /api/posts': () => errorResponse(404, 'NOT_FOUND', 'Category not found') })
    renderPage('category', 'nope')

    expect(await screen.findByText('404')).toBeInTheDocument()
  })

  it('has an empty state, and pages through longer lists', async () => {
    const fetchMock = mockFetch({
      'GET /api/categories/culture': () => okResponse(200, { category: categories[1] }),
      'GET /api/posts': () => pageResponse([preview(1, 'Page one story')], { page: 1, limit: 10, total: 12, totalPages: 2 }),
    })
    renderPage('category', 'culture')
    await screen.findByText('Page one story teaser')

    fetchMock.mockImplementation((url) =>
      url.includes('/api/posts') && url.includes('page=2')
        ? pageResponse([preview(11, 'Page two story')], { page: 2, limit: 10, total: 12, totalPages: 2 })
        : url.includes('/api/categories/')
          ? okResponse(200, { category: categories[1] })
          : pageResponse([preview(1, 'Page one story')]),
    )
    await userEvent.click(screen.getByRole('button', { name: /Older/ }))

    expect(await screen.findByText('Page two story teaser')).toBeInTheDocument()
  })

  it('says so when a section has no stories', async () => {
    mockFetch({ 'GET /api/categories/opinion': () => okResponse(200, { category: categories[2] }), 'GET /api/posts': () => pageResponse([]) })
    renderPage('category', 'opinion')

    expect(await screen.findByText('No published stories here yet.')).toBeInTheDocument()
  })
})

describe('SearchPage', () => {
  const renderSearch = (route = '/search') => renderWithProviders(<SearchPage />, { route, path: '/search' })
  const base = { 'GET /api/categories': () => okResponse(200, { categories }) }

  it('invites a search when there is no query, without calling the API', async () => {
    const fetchMock = mockFetch(base)
    renderSearch()

    expect(await screen.findByText(/Type a word or two/)).toBeInTheDocument()
    expect(calls(fetchMock, 'GET', '/api/search')).toHaveLength(0)
  })

  it('shows results with a count and the query as the server understood it', async () => {
    mockFetch({ ...base, 'GET /api/search': () => searchResponse([preview(1, 'Learning React'), preview(2, 'React notes')], null, 'react') })
    renderSearch('/search?q=react')

    expect(await screen.findByText('2 stories for “react”')).toBeInTheDocument()
    expect(screen.getByText('Learning React teaser')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Learning React' })).toHaveAttribute('href', '/blog/story-1')
  })

  it('has an empty state with a suggestion', async () => {
    mockFetch({ ...base, 'GET /api/search': () => searchResponse([], null, 'xylophone') })
    renderSearch('/search?q=xylophone')

    expect(await screen.findByText('No stories found for “xylophone”')).toBeInTheDocument()
    expect(screen.getByText(/Try different words/)).toBeInTheDocument()
  })

  it('does not ask the server for a query shorter than two characters', async () => {
    const fetchMock = mockFetch(base)
    renderSearch('/search?q=a')

    expect(await screen.findByText('Search for at least two characters.')).toBeInTheDocument()
    expect(calls(fetchMock, 'GET', '/api/search')).toHaveLength(0)
  })

  it('shows the server’s message when a search fails', async () => {
    mockFetch({ ...base, 'GET /api/search': () => errorResponse(429, 'RATE_LIMITED', 'Too many searches. Please wait a moment.') })
    renderSearch('/search?q=react')

    expect(await screen.findByText('Too many attempts, please try again later.')).toBeInTheDocument()
  })

  it('runs a new search from the form and keeps everything in the address', async () => {
    const fetchMock = mockFetch({ ...base, 'GET /api/search': () => searchResponse([preview(1, 'Result')], null, 'vue') })
    renderSearch('/search?q=react')
    await screen.findByText('1 story for “vue”')

    const field = screen.getAllByLabelText('Search stories')[0]
    await userEvent.clear(field)
    await userEvent.type(field, 'vue')
    await userEvent.click(screen.getAllByRole('button', { name: 'Search' })[0])

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/search?q=vue'))
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url.includes('/api/search') && url.includes('q=vue'))).toBe(true))
  })

  it('filters by section and by order, sending both to the API and keeping them in the address', async () => {
    const fetchMock = mockFetch({ ...base, 'GET /api/search': () => searchResponse([preview(1, 'Result')], null, 'react') })
    renderSearch('/search?q=react')
    await screen.findByText('1 story for “react”')

    await userEvent.selectOptions(await screen.findByLabelText('Section'), 'technology')
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url.includes('category=technology'))).toBe(true))
    await userEvent.selectOptions(screen.getByLabelText('Order'), 'newest')

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('category=technology'))
    expect(screen.getByTestId('location')).toHaveTextContent('sort=newest')
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url.includes('sort=newest'))).toBe(true))
  })

  it('pages through results', async () => {
    mockFetch({ ...base, 'GET /api/search': () => searchResponse([preview(1, 'Result')], { page: 1, limit: 10, total: 25, totalPages: 3 }, 'react') })
    renderSearch('/search?q=react')
    await screen.findByText('25 stories for “react”')

    await userEvent.click(screen.getByRole('button', { name: /Older/ }))

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('page=2'))
  })
})

describe('TagInput', () => {
  function Harness({ initial = [] }) {
    const [tags, setTags] = useState(initial)
    return (
      <>
        <TagInput value={tags} onChange={setTags} />
        <output data-testid="value">{JSON.stringify(tags)}</output>
      </>
    )
  }
  const value = () => JSON.parse(screen.getByTestId('value').textContent)

  it('adds a tag with Enter or comma, and removes it with its × button or Backspace', async () => {
    mockFetch()
    renderWithProviders(<Harness />)
    const input = screen.getByLabelText('Tags')

    await userEvent.type(input, 'react{Enter}')
    await userEvent.type(input, 'node js,')
    expect(value()).toEqual(['react', 'node js'])
    expect(screen.getByText('2 of 5 tags. Press Enter or comma to add one.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Remove tag react' }))
    expect(value()).toEqual(['node js'])

    await userEvent.type(input, '{Backspace}')
    expect(value()).toEqual([])
  })

  it('treats tags that differ only by case as one', async () => {
    mockFetch()
    renderWithProviders(<Harness initial={['React']} />)

    await userEvent.type(screen.getByLabelText('Tags'), 'react{Enter}')

    expect(value()).toEqual(['React'])
  })

  it('adds the pending tag when the field loses focus', async () => {
    mockFetch()
    renderWithProviders(<Harness />)

    await userEvent.type(screen.getByLabelText('Tags'), 'typescript')
    await userEvent.tab()

    expect(value()).toEqual(['typescript'])
  })

  it('explains a tag it will not accept, and keeps what was typed', async () => {
    mockFetch()
    renderWithProviders(<Harness />)
    const input = screen.getByLabelText('Tags')

    await userEvent.type(input, 'c++{Enter}')
    expect(await screen.findByRole('alert')).toHaveTextContent('letters, numbers, spaces and hyphens')
    await userEvent.clear(input)
    await userEvent.type(input, 'x{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent('2 to 30 characters')
    expect(value()).toEqual([])
  })

  it('stops at five tags', async () => {
    mockFetch()
    renderWithProviders(<Harness initial={['one', 'two', 'three', 'four', 'five']} />)

    const input = screen.getByLabelText('Tags')
    expect(input).toBeDisabled()
    expect(input).toHaveAttribute('placeholder', 'Tag limit reached')
    expect(screen.getByText(/5 of 5 tags/)).toBeInTheDocument()
  })

  it('suggests existing tags as the reader types, leaving out the ones already chosen', async () => {
    const fetchMock = mockFetch({
      'GET /api/tags': () => okResponse(200, { tags: [{ id: 1, name: 'React', slug: 'react', postCount: 3 }, { id: 2, name: 'Redux', slug: 'redux', postCount: 1 }] }),
    })
    renderWithProviders(<Harness initial={['Redux']} />)

    await userEvent.type(screen.getByLabelText('Tags'), 're')

    await waitFor(() => expect([...document.querySelectorAll('datalist option')].map((o) => o.value)).toEqual(['React']))
    expect(fetchMock.mock.calls.some(([url]) => url.includes('/api/tags?q=re'))).toBe(true)
  })
})

describe('the editor: section and tags', () => {
  it('offers the sections in a list, and returns the chosen section and tags', async () => {
    mockFetch({ 'GET /api/categories': () => okResponse(200, { categories }) })
    const onSubmit = vi.fn()
    renderWithProviders(<PostForm onSubmit={onSubmit} submitLabel="Save draft" />)

    await userEvent.type(screen.getByLabelText('Title'), 'Hello')
    await typeInEditor('World')
    await userEvent.selectOptions(await screen.findByLabelText('Section'), 'Culture')
    await userEvent.type(screen.getByLabelText('Tags'), 'books{Enter}')
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ title: 'Hello', content: '<p>World</p>', categoryId: '2', tags: ['books'] })
  })

  it('leaves out the section list when there are no sections', async () => {
    mockFetch({ 'GET /api/categories': () => okResponse(200, { categories: [] }) })
    renderWithProviders(<PostForm onSubmit={vi.fn()} submitLabel="Save draft" />)

    await screen.findByLabelText('Tags')
    expect(screen.queryByLabelText('Section')).not.toBeInTheDocument()
  })

  it('a new story is saved with its section and tags', async () => {
    const fetchMock = mockFetch(
      { 'GET /api/categories': () => okResponse(200, { categories }), 'POST /api/posts': () => okResponse(201, { post: post({ id: 9 }) }) },
      { user: author },
    )
    renderWithProviders(<NewPostPage />, { route: '/posts/new', path: '/posts/new', routes: <Route path="/posts/:id/edit" element={<p>the editor</p>} /> })

    await userEvent.type(await screen.findByLabelText('Title'), 'Titled')
    await typeInEditor('Body.')
    await userEvent.selectOptions(await screen.findByLabelText('Section'), 'Technology')
    await userEvent.type(screen.getByLabelText('Tags'), 'react{Enter}css{Enter}')
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }))

    await screen.findByText('the editor')
    expect(JSON.parse(calls(fetchMock, 'POST', '/api/posts')[0][1].body)).toEqual({ title: 'Titled', content: '<p>Body.</p>', categoryId: 1, tags: ['react', 'css'] })
  })

  it('an edit sends the section and tags only when they changed', async () => {
    const existing = post({ author: { id: 2, username: 'bob', avatarUrl: null }, category: { id: 1, name: 'Technology', slug: 'technology' }, tags: [{ name: 'React', slug: 'react' }, { name: 'CSS', slug: 'css' }] })
    const fetchMock = mockFetch(
      { 'GET /api/categories': () => okResponse(200, { categories }), 'GET /api/posts/5': () => okResponse(200, { post: existing }), 'PATCH /api/posts/5': () => okResponse(200, { post: existing }) },
      { user: author },
    )
    renderWithProviders(<EditPostPage />, { route: '/posts/5/edit', path: '/posts/:id/edit' })

    const section = await screen.findByLabelText('Section')
    expect(section).toHaveValue('1')
    expect(screen.getByRole('list', { name: 'Chosen tags' })).toHaveTextContent('React')

    // nothing about the section or tags changed: neither is sent
    const title = screen.getByLabelText('Title')
    await userEvent.clear(title)
    await userEvent.type(title, 'Edited title')
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }))
    await waitFor(() => expect(calls(fetchMock, 'PATCH', '/api/posts/5')).toHaveLength(1))
    expect(Object.keys(lastBody(fetchMock, 'PATCH', '/api/posts/5')).sort()).toEqual(['content', 'expectedUpdatedAt', 'title'])

    // changing the section and removing a tag sends both
    await userEvent.selectOptions(section, '')
    await userEvent.click(screen.getByRole('button', { name: 'Remove tag CSS' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }))
    await waitFor(() => expect(calls(fetchMock, 'PATCH', '/api/posts/5')).toHaveLength(2))
    expect(lastBody(fetchMock, 'PATCH', '/api/posts/5')).toMatchObject({ categoryId: null, tags: ['React'] })
  })
})

describe('reading: sections and topics', () => {
  it('shows the section and tags on the article, as links', async () => {
    const live = post({
      status: 'published', publishedAt: '2026-01-01T00:00:00.000Z', actions: [], canEdit: false,
      category: { id: 1, name: 'Technology', slug: 'technology' }, tags: [{ name: 'React', slug: 'react' }, { name: 'Node JS', slug: 'node-js' }],
    })
    mockFetch({ 'GET /api/posts/slug/my-story': () => okResponse(200, { post: live }) })
    renderWithProviders(<PostPage by="slug" />, { route: '/blog/my-story', path: '/blog/:slug' })

    expect(await screen.findByRole('link', { name: 'Technology' })).toHaveAttribute('href', '/category/technology')
    const tags = within(screen.getByRole('list', { name: 'Tags' }))
    expect(tags.getByRole('link', { name: 'React' })).toHaveAttribute('href', '/tag/react')
    expect(tags.getByRole('link', { name: 'Node JS' })).toHaveAttribute('href', '/tag/node-js')
  })

  it('shows the section above each story on the front page', async () => {
    mockFetch({ 'GET /api/posts': () => pageResponse([preview(1, 'Lead', { category: { id: 1, name: 'Technology', slug: 'technology' } })]) })
    renderWithProviders(<HomePage />)

    const kicker = await screen.findByRole('link', { name: 'Technology' })
    expect(kicker).toHaveAttribute('href', '/category/technology')
  })
})

describe('ManageCategoriesPage', () => {
  const renderManage = () =>
    renderWithProviders(
      <RequireRole role="editor">
        <ManageCategoriesPage />
      </RequireRole>,
      { route: '/manage/categories', path: '/manage/categories' },
    )

  it('lists the sections with their addresses and story counts', async () => {
    mockFetch({ 'GET /api/categories': () => okResponse(200, { categories }) }, { user: editor })
    renderManage()

    expect(await screen.findByText('Technology')).toBeInTheDocument()
    expect(screen.getByText('/category/technology · 4 stories')).toBeInTheDocument()
    expect(screen.getByText('Software and hardware.')).toBeInTheDocument()
  })

  it('creates a section and clears the form', async () => {
    const fetchMock = mockFetch(
      { 'GET /api/categories': () => okResponse(200, { categories }), 'POST /api/categories': () => okResponse(201, { category: { id: 4, name: 'Science', slug: 'science', description: null } }) },
      { user: editor },
    )
    renderManage()

    const form = within(await screen.findByRole('region', { name: 'New section' }))
    await userEvent.type(form.getByLabelText('Name'), 'Science')
    await userEvent.type(form.getByLabelText('Description'), 'Discoveries.')
    await userEvent.click(form.getByRole('button', { name: 'Create section' }))

    await waitFor(() => expect(calls(fetchMock, 'POST', '/api/categories')).toHaveLength(1))
    expect(lastBody(fetchMock, 'POST', '/api/categories')).toEqual({ name: 'Science', description: 'Discoveries.' })
    await waitFor(() => expect(form.getByLabelText('Name')).toHaveValue(''))
  })

  it('checks the name before asking the server, and shows the server’s refusal', async () => {
    mockFetch(
      { 'GET /api/categories': () => okResponse(200, { categories }), 'POST /api/categories': () => errorResponse(409, 'CONFLICT', 'A category with that name already exists') },
      { user: editor },
    )
    renderManage()
    const form = within(await screen.findByRole('region', { name: 'New section' }))

    await userEvent.type(form.getByLabelText('Name'), 'x')
    await userEvent.click(form.getByRole('button', { name: 'Create section' }))
    expect(await form.findByText('Name must be at least 2 characters')).toBeInTheDocument()

    await userEvent.clear(form.getByLabelText('Name'))
    await userEvent.type(form.getByLabelText('Name'), 'Technology')
    await userEvent.click(form.getByRole('button', { name: 'Create section' }))
    expect(await form.findByText('A category with that name already exists')).toBeInTheDocument()
    expect(form.getByLabelText('Name')).toHaveValue('Technology')
  })

  it('renames a section', async () => {
    const fetchMock = mockFetch(
      { 'GET /api/categories': () => okResponse(200, { categories }), 'PATCH /api/categories/2': () => okResponse(200, { category: { ...categories[1], name: 'Arts' } }) },
      { user: editor },
    )
    renderManage()

    await userEvent.click(await screen.findByRole('button', { name: 'Edit Culture' }))
    const row = screen.getByDisplayValue('Culture')
    await userEvent.clear(row)
    await userEvent.type(row, 'Arts')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(calls(fetchMock, 'PATCH', '/api/categories/2')).toHaveLength(1))
    expect(lastBody(fetchMock, 'PATCH', '/api/categories/2')).toEqual({ name: 'Arts', description: '' })
  })

  it('asks before deleting, and explains the stories stay', async () => {
    const fetchMock = mockFetch(
      { 'GET /api/categories': () => okResponse(200, { categories }), 'DELETE /api/categories/1': () => okResponse(200) },
      { user: editor },
    )
    renderManage()

    await userEvent.click(await screen.findByRole('button', { name: 'Delete Technology' }))
    expect(screen.getByText(/Its 4 stories stay, with no section/)).toBeInTheDocument()
    expect(calls(fetchMock, 'DELETE', '/api/categories/1')).toHaveLength(0)

    await userEvent.click(screen.getByRole('button', { name: 'Delete Technology' }))
    await waitFor(() => expect(calls(fetchMock, 'DELETE', '/api/categories/1')).toHaveLength(1))
  })

  it('is not available to authors', async () => {
    const fetchMock = mockFetch({ 'GET /api/categories': () => okResponse(200, { categories }) }, { user: author })
    renderManage()

    expect(await screen.findByText('404')).toBeInTheDocument()
    expect(calls(fetchMock, 'GET', '/api/categories')).toHaveLength(0)
  })

  it('links editors to it from the header, and only editors', async () => {
    mockFetch({ 'GET /api/categories': () => okResponse(200, { categories: [] }) }, { user: editor })
    const { unmount } = renderWithProviders(<Navbar />)
    const nav = (await screen.findAllByRole('navigation', { name: 'Account' }))[0]
    expect(await within(nav).findByRole('link', { name: 'Sections' })).toHaveAttribute('href', '/manage/categories')
    unmount()

    mockFetch({ 'GET /api/categories': () => okResponse(200, { categories: [] }) }, { user: author })
    renderWithProviders(<Navbar />)
    const authorNav = (await screen.findAllByRole('navigation', { name: 'Account' }))[0]
    await within(authorNav).findByRole('link', { name: 'My stories' })
    expect(within(authorNav).queryByRole('link', { name: 'Sections' })).not.toBeInTheDocument()
  })
})
