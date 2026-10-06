import { StrictMode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'
import { errorResponse, mockFetch, okResponse, pageResponse, readerUser } from './test/utils.jsx'

const preview = {
  id: 7,
  slug: 'my-post',
  status: 'published',
  publishedAt: '2026-01-02T00:00:00.000Z',
  title: 'My post',
  excerpt: 'The opening lines…',
  readingTime: 4,
  author: { id: 1, username: 'ada' },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const post = {
  id: 7,
  slug: 'my-post',
  status: 'published',
  readingTime: 1,
  publishedAt: '2026-01-02T00:00:00.000Z',
  actions: [],
  canEdit: false,
  title: 'My post',
  content: 'The whole story.',
  author: { id: 1, username: 'ada' },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const emptyList = () => pageResponse([])

describe('App', () => {
  beforeEach(() => {
    // modern browsers return a Promise from scrollTo; jsdom returns undefined
    vi.spyOn(window, 'scrollTo').mockImplementation(() => Promise.resolve())
  })
  afterEach(() => {
    vi.restoreAllMocks()
    window.history.pushState({}, '', '/')
  })

  it('renders under StrictMode when scrollTo returns a Promise', async () => {
    mockFetch({ 'GET /api/posts': emptyList })
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
    expect(await screen.findByText('The presses are quiet.')).toBeInTheDocument()
  })

  it('shows previews on the front page, each linking to its public address', async () => {
    mockFetch({ 'GET /api/posts': () => pageResponse([preview]) })
    render(<App />)
    expect(await screen.findByText('The opening lines…')).toBeInTheDocument()
    expect(screen.getByText('4 min read')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'My post' })).toHaveAttribute('href', '/blog/my-post')
    expect(screen.getByText('Read the story →')).toBeInTheDocument()
  })

  it('lets a logged-out visitor read a published story at its public address', async () => {
    const fetchMock = mockFetch({ 'GET /api/posts/slug/my-post': () => okResponse(200, { post }) })
    window.history.pushState({}, '', '/blog/my-post')
    render(<App />)

    expect(await screen.findByText('The whole story.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Log in' })).not.toBeInTheDocument()
    const call = fetchMock.mock.calls.find(([url]) => url.includes('/api/posts/slug/my-post'))
    expect(call[1].headers.Authorization).toBeUndefined()
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining('/api/auth/refresh'), expect.anything())
  })

  it('sends a logged-out visitor who opens the private preview to log in', async () => {
    const fetchMock = mockFetch({ 'GET /api/posts': emptyList })
    window.history.pushState({}, '', '/posts/7')
    render(<App />)
    expect(await screen.findByRole('button', { name: 'Log in' })).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining('/api/posts/7'), expect.anything())
    // a visitor who never signed in has no session to restore
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining('/api/auth/refresh'), expect.anything())
  })

  it('restores a remembered session on reload, and sends a preview of a published story to its public address', async () => {
    const fetchMock = mockFetch(
      {
        'GET /api/posts/7': () => okResponse(200, { post }),
        'GET /api/posts/slug/my-post': () => okResponse(200, { post }),
      },
      { user: readerUser },
    )
    window.history.pushState({}, '', '/posts/7')
    render(<App />)

    expect(await screen.findByText('The whole story.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Log in' })).not.toBeInTheDocument()
    expect(window.location.pathname).toBe('/blog/my-post')

    // the restored access token is attached to the request, and it lives in memory only
    const postCall = fetchMock.mock.calls.find(([url]) => url.includes('/api/posts/7'))
    expect(postCall[1].headers.Authorization).toBe('Bearer test-token')
    expect(localStorage.getItem('blog.auth')).toBeNull()
    expect(JSON.stringify({ ...localStorage })).not.toContain('test-token')
  })

  it('sends the visitor to log in when the remembered session was rejected, and forgets it', async () => {
    mockFetch({
      'POST /api/auth/refresh': () => errorResponse(401, 'UNAUTHORIZED', 'Session has ended'),
      'GET /api/posts': emptyList,
    })
    localStorage.setItem('blog.session', '1')
    window.history.pushState({}, '', '/posts/7')
    render(<App />)

    expect(await screen.findByRole('button', { name: 'Log in' })).toBeInTheDocument()
    await waitFor(() => expect(localStorage.getItem('blog.session')).toBeNull())
  })

  it('shows a confirmation banner to signed-in readers with an unconfirmed email', async () => {
    mockFetch({ 'GET /api/posts': emptyList }, { user: { ...readerUser, emailVerified: false, email: 'bob@example.com' } })
    render(<App />)

    expect(await screen.findByText(/Confirm your email address to start writing/)).toBeInTheDocument()
  })
})
