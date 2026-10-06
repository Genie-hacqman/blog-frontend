import { screen, waitFor } from '@testing-library/react'
import { Route } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import HomePage from './HomePage.jsx'
import NotFoundPage from './NotFoundPage.jsx'
import PostPage from './PostPage.jsx'
import ProfilePage from './ProfilePage.jsx'
import SearchPage from './SearchPage.jsx'
import TaxonomyPage from './TaxonomyPage.jsx'
import LoginPage from './LoginPage.jsx'
import ProtectedRoute from '../auth/ProtectedRoute.jsx'
import { SITE_NAME } from '../components/site.js'
import { errorResponse, jsonResponse, mockFetch, okResponse, pageResponse, readerUser, renderWithProviders } from '../test/utils.jsx'

const origin = window.location.origin
const meta = (attribute, name) => document.head.querySelector(`meta[${attribute}="${name}"]`)?.getAttribute('content') ?? null
const canonical = () => document.head.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null
const jsonLd = () => JSON.parse(document.head.querySelector('script[type="application/ld+json"]').textContent)

const reader = { ...readerUser, id: 2, userName: 'bob', role: 'user' }
const ada = { ...readerUser, id: 1, userName: 'ada_l', role: 'author' }

const post = (overrides = {}) => ({
  id: 7,
  slug: 'my-post',
  status: 'published',
  title: 'My post',
  excerpt: 'A teaser for the story',
  content: '<p>Body text.</p>',
  readingTime: 1,
  cover: { id: 3, url: '/media/u/1/cover.webp', width: 10, height: 10, alt: 'A cover' },
  publishedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  author: { id: 1, username: 'ada_l', avatarUrl: null },
  category: { id: 1, name: 'Tech', slug: 'tech' },
  tags: [{ id: 1, name: 'React', slug: 'react' }],
  actions: [],
  likeCount: 0,
  commentCount: 0,
  liked: false,
  bookmarked: false,
  ...overrides,
})
const postRoutes = (p) => ({
  'GET /api/posts/slug/my-post': () => okResponse(200, { post: p }),
  'GET /api/posts/7': () => okResponse(200, { post: p }),
  'GET /api/posts/7/comments': () => jsonResponse(200, { success: true, data: { comments: [] }, meta: { pagination: { page: 1, limit: 10, total: 0, totalPages: 1 } } }),
})
const preview = (id, title) => ({ id, slug: `story-${id}`, title, excerpt: '', status: 'published', author: { id: 1, username: 'ada_l', avatarUrl: null }, tags: [], category: null, readingTime: 1, publishedAt: '2026-01-01T00:00:00.000Z', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' })

afterEach(() => vi.restoreAllMocks())

describe('what a story page tells search engines', () => {
  it('describes a published story on its public address', async () => {
    mockFetch(postRoutes(post()))
    renderWithProviders(<PostPage by="slug" />, { route: '/blog/my-post', path: '/blog/:slug' })
    await screen.findByRole('heading', { name: 'My post' })

    expect(document.title).toBe(`My post — ${SITE_NAME}`)
    expect(meta('name', 'description')).toBe('A teaser for the story')
    expect(meta('name', 'robots')).toBe('index,follow')
    expect(canonical()).toBe(`${origin}/blog/my-post`)
    expect(meta('property', 'og:type')).toBe('article')
    expect(meta('property', 'og:image')).toBe(`${origin}/media/u/1/cover.webp`)
    expect(meta('property', 'og:image:alt')).toBe('A cover')
    expect(meta('property', 'article:author')).toBe(`${origin}/u/ada_l`)
    const graph = jsonLd()['@graph']
    expect(graph[0]).toMatchObject({ '@type': 'BlogPosting', headline: 'My post', datePublished: '2026-01-01T00:00:00.000Z' })
  })

  it('does not let the private preview, a draft or an archived story be indexed', async () => {
    mockFetch(postRoutes(post({ status: 'draft' })), { user: ada })
    const { unmount } = renderWithProviders(<PostPage by="id" />, { route: '/posts/7', path: '/posts/:id' })
    await screen.findByRole('heading', { name: 'My post' })

    expect(meta('name', 'robots')).toBe('noindex,nofollow')
    expect(canonical()).toBeNull()
    expect(document.head.querySelector('script[type="application/ld+json"]')).toBeNull()
    unmount()
  })

  it('leaves no tags of the story behind once the page is gone', async () => {
    mockFetch(postRoutes(post()))
    const { unmount } = renderWithProviders(<PostPage by="slug" />, { route: '/blog/my-post', path: '/blog/:slug' })
    await screen.findByRole('heading', { name: 'My post' })
    unmount()
    expect(canonical()).toBeNull()
    expect(meta('property', 'og:title')).toBeNull()
  })
})

describe('the other public pages', () => {
  it('describes the front page, once', async () => {
    mockFetch({ 'GET /api/posts': () => pageResponse([preview(1, 'First'), preview(2, 'Second')]) })
    renderWithProviders(<HomePage />, { route: '/', path: '/' })
    await screen.findByText('First')

    expect(document.title).toBe(SITE_NAME)
    expect(canonical()).toBe(`${origin}/`)
    expect(meta('name', 'robots')).toBe('index,follow')
    expect(jsonLd()['@type']).toBe('WebSite')
    expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1)
  })

  it('describes a section and a topic, and does not index an empty one', async () => {
    mockFetch({
      'GET /api/categories/tech': () => okResponse(200, { category: { id: 1, name: 'Tech', slug: 'tech', description: 'Gadgets & more', postCount: 3 } }),
      'GET /api/tags/quiet': () => okResponse(200, { tag: { id: 2, name: 'Quiet', slug: 'quiet', postCount: 0 } }),
      'GET /api/posts': () => pageResponse([]),
    })
    const first = renderWithProviders(<TaxonomyPage kind="category" />, { route: '/category/tech', path: '/category/:slug' })
    await screen.findByRole('heading', { name: 'Tech' })
    expect(canonical()).toBe(`${origin}/category/tech`)
    expect(meta('name', 'description')).toBe('Gadgets & more')
    expect(meta('name', 'robots')).toBe('index,follow')
    first.unmount()

    renderWithProviders(<TaxonomyPage kind="tag" />, { route: '/tag/quiet', path: '/tag/:slug' })
    await screen.findByRole('heading', { name: /Quiet/ })
    expect(meta('name', 'robots')).toBe('noindex,follow')
    expect(canonical()).toBeNull()
  })

  it('describes a profile with a person in the data, and does not index one with nothing published', async () => {
    const profile = { username: 'ada_l', bio: 'Writes about <b>things</b>', avatarUrl: null, socialLinks: { github: 'https://github.com/ada' }, joinedAt: '2025-01-01T00:00:00.000Z', postCount: 2, followerCount: 0, followingCount: 0, following: false }
    mockFetch({ 'GET /api/users/ada_l': () => okResponse(200, { user: profile }), 'GET /api/users/ada_l/posts': () => pageResponse([preview(1, 'First')]) })
    const { unmount } = renderWithProviders(<ProfilePage />, { route: '/u/ada_l', path: '/u/:username' })
    await screen.findByText('First')
    expect(meta('name', 'description')).toBe('Writes about <b>things</b>')
    expect(meta('name', 'robots')).toBe('index,follow')
    expect(jsonLd()['@graph'].find((node) => node['@type'] === 'Person').sameAs).toEqual(['https://github.com/ada'])
    unmount()

    mockFetch({ 'GET /api/users/ada_l': () => okResponse(200, { user: { ...profile, postCount: 0, bio: null } }), 'GET /api/users/ada_l/posts': () => pageResponse([]) })
    renderWithProviders(<ProfilePage />, { route: '/u/ada_l', path: '/u/:username' })
    await waitFor(() => expect(meta('name', 'robots')).toBe('noindex,follow'))
    expect(meta('name', 'description')).toBe(`Stories by ada_l on ${SITE_NAME}.`)
  })

  it('keeps search results out of the index but lets their links be followed', async () => {
    mockFetch({ 'GET /api/search': () => jsonResponse(200, { success: true, data: { posts: [] }, meta: { pagination: { page: 1, limit: 10, total: 0, totalPages: 1 }, query: 'x' } }), 'GET /api/categories': () => okResponse(200, { categories: [] }) })
    renderWithProviders(<SearchPage />, { route: '/search?q=cats', path: '/search' })
    await waitFor(() => expect(document.title).toBe(`Search: cats — ${SITE_NAME}`))
    expect(meta('name', 'robots')).toBe('noindex,follow')
    expect(canonical()).toBeNull()
  })

  it('says a missing page is not a page', () => {
    renderWithProviders(<NotFoundPage />)
    expect(meta('name', 'robots')).toBe('noindex,nofollow')
    expect(document.title).toBe(`Page not found — ${SITE_NAME}`)
  })

  it('answers a story that does not exist with the not-found page, not indexed', async () => {
    mockFetch({ 'GET /api/posts/slug/nope': () => errorResponse(404, 'NOT_FOUND', 'Post not found') })
    renderWithProviders(<PostPage by="slug" />, { route: '/blog/nope', path: '/blog/:slug' })
    await screen.findByText('This page was never printed.')
    expect(meta('name', 'robots')).toBe('noindex,nofollow')
    expect(canonical()).toBeNull()
  })
})

describe('private pages', () => {
  it('marks everything behind a login not for indexing', async () => {
    mockFetch({}, { user: reader })
    renderWithProviders(
      <ProtectedRoute>
        <p>Your private page</p>
      </ProtectedRoute>,
      { route: '/settings', path: '/settings' },
    )
    await screen.findByText('Your private page')
    expect(meta('name', 'robots')).toBe('noindex,nofollow')
  })

  it('marks the sign-in pages not for indexing', async () => {
    mockFetch({})
    renderWithProviders(<LoginPage />, { route: '/login', path: '/login', routes: <Route path="/" element={<p>home</p>} /> })
    await screen.findByRole('heading', { name: /log in/i })
    expect(meta('name', 'robots')).toBe('noindex,nofollow')
  })
})
