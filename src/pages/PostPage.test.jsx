import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import PostPage from './PostPage.jsx'
import { errorResponse, mockFetch, okResponse, renderWithProviders, settle } from '../test/utils.jsx'

const post = {
  id: 7,
  slug: 'my-post',
  status: 'published',
  readingTime: 1,
  publishedAt: '2026-01-01T00:00:00.000Z',
  actions: [],
  title: 'My post',
  content: '<h2>A heading</h2><p>Plain <strong>bold</strong> and <a href="https://example.com/x">a link</a>.</p><img src="/media/u/1/a.webp" alt="A red box">',
  author: { id: 1, username: 'ada' },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const author = { id: 1, userName: 'ada', role: 'author', emailVerified: true }
const stranger = { id: 2, userName: 'bob', role: 'author', emailVerified: true }

const routes = { 'GET /api/posts/slug/my-post': () => okResponse(200, { post }) }
const renderPost = () => renderWithProviders(<PostPage by="slug" />, { route: '/blog/my-post', path: '/blog/:slug' })

describe('PostPage', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shows edit and delete to the author', async () => {
    mockFetch({ 'GET /api/posts/slug/my-post': () => okResponse(200, { post: { ...post, canEdit: true } }) }, { user: author })
    renderPost()
    expect(await screen.findByRole('heading', { name: 'My post' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('hides edit and delete from other users', async () => {
    mockFetch(routes, { user: stranger })
    renderPost()
    await screen.findByRole('heading', { name: 'My post' })
    await settle()
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('hides edit and delete when logged out', async () => {
    mockFetch(routes)
    renderPost()
    await screen.findByRole('heading', { name: 'My post' })
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('renders the formatting of a post: headings, emphasis, links and pictures', async () => {
    mockFetch(routes)
    renderPost()

    expect(await screen.findByRole('heading', { name: 'A heading', level: 2 })).toBeInTheDocument()
    expect(screen.getByText('bold').tagName).toBe('STRONG')
    const link = screen.getByRole('link', { name: 'a link' })
    expect(link).toHaveAttribute('href', 'https://example.com/x')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer nofollow ugc')
    expect(screen.getByRole('img', { name: 'A red box' })).toHaveAttribute('src', '/media/u/1/a.webp')
  })

  it('never runs or shows anything dangerous in a post body, even one stored that way', async () => {
    const hostile =
      '<p onclick="steal()">Hi</p><script>window.__pwned = true</script><img src=x onerror="window.__pwned = true">' +
      '<a href="javascript:steal()">bad link</a><iframe src="https://evil.example"></iframe><svg onload="steal()"></svg>' +
      '<img src="//evil.example/pixel.png"><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">'
    mockFetch({ 'GET /api/posts/slug/my-post': () => okResponse(200, { post: { ...post, content: hostile } }) })
    renderPost()

    expect(await screen.findByText('Hi')).toBeInTheDocument()
    const body = document.querySelector('.article-body')
    expect(body.querySelector('script, iframe, svg, style, form')).toBeNull()
    expect(body.querySelector('[onclick], [onerror], [onload]')).toBeNull()
    expect(body.querySelector('img')).toBeNull()
    expect(body.querySelector('a').getAttribute('href')).toBeNull()
    expect(window.__pwned).toBeUndefined()
  })

  it('shows the cover picture above the title, with its description', async () => {
    const cover = { id: 3, url: '/media/u/1/cover.webp', width: 1600, height: 900, alt: 'A sunrise' }
    mockFetch({ 'GET /api/posts/slug/my-post': () => okResponse(200, { post: { ...post, cover } }) })
    renderPost()

    const image = await screen.findByRole('img', { name: 'A sunrise' })
    expect(image).toHaveAttribute('src', '/media/u/1/cover.webp')
    expect(image.compareDocumentPosition(screen.getByRole('heading', { name: 'My post' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('shows the 404 page for a missing post', async () => {
    mockFetch({ 'GET /api/posts/slug/my-post': () => errorResponse(404, 'NOT_FOUND', 'Post not found') })
    renderPost()
    expect(await screen.findByText('404')).toBeInTheDocument()
  })
})
