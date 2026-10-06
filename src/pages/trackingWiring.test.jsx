import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PostPage from './PostPage.jsx'
import { mockFetch, okResponse, readerUser, renderWithProviders } from '../test/utils.jsx'

const track = vi.hoisted(() => vi.fn())
vi.mock('../hooks/useTrackStory.js', () => ({ useTrackStory: track }))

const reader = { ...readerUser, id: 2, userName: 'bob', role: 'user' }
const ada = { ...readerUser, id: 1, userName: 'ada_l', role: 'author' }

const post = (overrides = {}) => ({
  id: 7,
  slug: 'my-post',
  status: 'published',
  title: 'My post',
  excerpt: '',
  content: '<p>Body text.</p>',
  readingTime: 1,
  publishedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  author: { id: 1, username: 'ada_l', avatarUrl: null },
  category: null,
  tags: [],
  actions: [],
  likeCount: 0,
  commentCount: 0,
  liked: false,
  bookmarked: false,
  ...overrides,
})

const routes = (p) => ({
  'GET /api/posts/slug/my-post': () => okResponse(200, { post: p }),
  'GET /api/posts/7': () => okResponse(200, { post: p }),
  'GET /api/posts/7/comments': () =>
    Promise.resolve(new Response(JSON.stringify({ success: true, data: { comments: [] }, meta: { pagination: { page: 1, limit: 10, total: 0, totalPages: 1 } } }))),
})

// what the story page asked the tracker to do on its last render
const lastCall = () => track.mock.calls.at(-1)[0]

beforeEach(() => track.mockClear())
afterEach(() => vi.restoreAllMocks())

describe('the story page and reading statistics', () => {
  it('tracks a published story for a reader', async () => {
    mockFetch(routes(post()), { user: reader })
    renderWithProviders(<PostPage by="slug" />, { route: '/blog/my-post', path: '/blog/:slug' })
    await screen.findByRole('heading', { name: 'My post' })
    expect(lastCall()).toMatchObject({ postId: 7, enabled: true })
  })

  it('tracks a published story for a signed-out visitor', async () => {
    mockFetch(routes(post()))
    renderWithProviders(<PostPage by="slug" />, { route: '/blog/my-post', path: '/blog/:slug' })
    await screen.findByRole('heading', { name: 'My post' })
    expect(lastCall()).toMatchObject({ postId: 7, enabled: true })
  })

  it('never tracks the author’s own story, and offers them its statistics', async () => {
    mockFetch(routes(post()), { user: ada })
    renderWithProviders(<PostPage by="slug" />, { route: '/blog/my-post', path: '/blog/:slug' })
    expect(await screen.findByRole('link', { name: 'Statistics' })).toHaveAttribute('href', '/posts/7/stats')
    expect(lastCall().enabled).toBe(false)
    expect(track.mock.calls.filter(([args]) => args.postId === 7 && args.enabled)).toHaveLength(0)
  })

  it('does not track while it is not yet known who is looking', async () => {
    mockFetch(routes(post()), { user: ada })
    renderWithProviders(<PostPage by="slug" />, { route: '/blog/my-post', path: '/blog/:slug' })
    await screen.findByRole('heading', { name: 'My post' })
    // every render in which the story was already there but the session was still being restored was disabled
    expect(track.mock.calls.filter(([args]) => args.postId === 7 && args.enabled).length).toBe(0)
  })

  it('never tracks an unpublished story', async () => {
    mockFetch(routes(post({ status: 'draft' })), { user: reader })
    renderWithProviders(<PostPage by="slug" />, { route: '/blog/my-post', path: '/blog/:slug' })
    await screen.findByRole('heading', { name: 'My post' })
    expect(track.mock.calls.every(([args]) => !args.enabled)).toBe(true)
  })

  it('never tracks the private preview', async () => {
    mockFetch(routes(post({ status: 'draft' })), { user: ada })
    renderWithProviders(<PostPage by="id" />, { route: '/posts/7', path: '/posts/:id' })
    await screen.findByRole('heading', { name: 'My post' })
    expect(track.mock.calls.every(([args]) => !args.enabled)).toBe(true)
  })
})
