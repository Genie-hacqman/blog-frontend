import { StrictMode } from 'react'
import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'
import { jsonResponse, setSession } from './test/utils.jsx'

describe('App', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => jsonResponse(200, { posts: [] }))
    // modern browsers return a Promise from scrollTo; jsdom returns undefined
    vi.spyOn(window, 'scrollTo').mockImplementation(() => Promise.resolve())
  })
  afterEach(() => {
    vi.restoreAllMocks()
    window.history.pushState({}, '', '/')
  })

  it('renders under StrictMode when scrollTo returns a Promise', async () => {
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
    expect(await screen.findByText('The presses are quiet.')).toBeInTheDocument()
  })

  it('shows previews on the front page with a sign-in prompt when logged out', async () => {
    const preview = {
      id: 7,
      title: 'My post',
      excerpt: 'The opening lines…',
      readingTime: 4,
      author: { id: 1, username: 'ada' },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    globalThis.fetch.mockImplementation(() => jsonResponse(200, { posts: [preview] }))
    render(<App />)
    expect(await screen.findByText('The opening lines…')).toBeInTheDocument()
    expect(screen.getByText('4 min read')).toBeInTheDocument()
    expect(screen.getByText('Sign in to read →')).toBeInTheDocument()
  })

  it('sends a logged-out visitor to log in instead of showing the full story', async () => {
    window.history.pushState({}, '', '/posts/7')
    render(<App />)
    expect(await screen.findByRole('button', { name: 'Log in' })).toBeInTheDocument()
    expect(globalThis.fetch).not.toHaveBeenCalledWith(expect.stringContaining('/api/posts/7'), expect.anything())
  })

  it('shows the full story to a signed-in reader', async () => {
    setSession({ id: 2, userName: 'bob' })
    const post = {
      id: 7,
      title: 'My post',
      content: 'The whole story.',
      author: { id: 1, username: 'ada' },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    globalThis.fetch.mockImplementation(() => jsonResponse(200, { post }))
    window.history.pushState({}, '', '/posts/7')
    render(<App />)
    expect(await screen.findByText('The whole story.')).toBeInTheDocument()
  })
})
