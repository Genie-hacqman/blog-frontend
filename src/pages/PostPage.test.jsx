import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PostPage from './PostPage.jsx'
import { jsonResponse, renderWithProviders, setSession } from '../test/utils.jsx'

const post = {
  id: 7,
  title: 'My post',
  content: '<img src=x onerror=alert(1)>',
  author: { id: 1, username: 'ada' },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const renderPost = () => renderWithProviders(<PostPage />, { route: '/posts/7', path: '/posts/:id' })

describe('PostPage', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => jsonResponse(200, { post }))
  })
  afterEach(() => vi.restoreAllMocks())

  it('shows edit and delete to the author', async () => {
    setSession({ id: 1, userName: 'ada' })
    renderPost()
    expect(await screen.findByRole('heading', { name: 'My post' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('hides edit and delete from other users', async () => {
    setSession({ id: 2, userName: 'bob' })
    renderPost()
    await screen.findByRole('heading', { name: 'My post' })
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('hides edit and delete when logged out', async () => {
    renderPost()
    await screen.findByRole('heading', { name: 'My post' })
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('renders content as text, not HTML', async () => {
    renderPost()
    expect(await screen.findByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
    expect(document.querySelector('img')).toBeNull()
  })

  it('shows the 404 page for a missing post', async () => {
    globalThis.fetch.mockImplementation(() => jsonResponse(404, { error: 'Post not found' }))
    renderPost()
    expect(await screen.findByText('404')).toBeInTheDocument()
  })
})
