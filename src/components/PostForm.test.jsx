import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import PostForm from './PostForm.jsx'
import { mockFetch, okResponse, renderWithProviders, typeInEditor } from '../test/utils.jsx'

// the form loads the list of sections, so it needs the app's providers; nothing here needs any
const render = (ui) => {
  mockFetch()
  return renderWithProviders(ui)
}

describe('PostForm', () => {
  it('shows validation errors and does not submit empty fields', async () => {
    const onSubmit = vi.fn()
    render(<PostForm onSubmit={onSubmit} submitLabel="Publish" />)

    await userEvent.click(screen.getByRole('button', { name: 'Publish' }))

    expect(await screen.findByText('Title is required')).toBeInTheDocument()
    expect(screen.getByText('Content is required')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects whitespace-only values like the API does', async () => {
    const onSubmit = vi.fn()
    render(<PostForm onSubmit={onSubmit} submitLabel="Publish" />)

    await userEvent.type(screen.getByLabelText('Title'), '   ')
    await typeInEditor('Body')
    await userEvent.click(screen.getByRole('button', { name: 'Publish' }))

    expect(await screen.findByText('Title is required')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits trimmed values', async () => {
    const onSubmit = vi.fn()
    render(<PostForm onSubmit={onSubmit} submitLabel="Publish" />)

    await userEvent.type(screen.getByLabelText('Title'), '  Hello  ')
    await typeInEditor('World')
    await userEvent.click(screen.getByRole('button', { name: 'Publish' }))

    expect(onSubmit).toHaveBeenCalledWith({ title: 'Hello', content: '<p>World</p>', excerpt: '', slug: '', categoryId: '', tags: [], coverMediaId: null, coverAlt: '' }, expect.anything())
  })

  it('validates the excerpt length and the URL format', async () => {
    const onSubmit = vi.fn()
    render(<PostForm onSubmit={onSubmit} submitLabel="Save draft" />)

    await userEvent.type(screen.getByLabelText('Title'), 'Hello')
    await typeInEditor('World')
    await userEvent.type(screen.getByLabelText('URL'), 'Not A URL!')
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }))

    expect(await screen.findByText('Use letters, numbers and single hyphens')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('locks the URL field once a post has been published', () => {
    render(<PostForm values={{ title: 'T', content: 'C', excerpt: '', slug: 'fixed-url', categoryId: '', tags: [] }} onSubmit={vi.fn()} submitLabel="Save changes" slugLocked />)

    expect(screen.getByLabelText('URL')).toBeDisabled()
    expect(screen.getByText('The URL is fixed once a post has been published.')).toBeInTheDocument()
  })

  it('warns before the tab is closed with unsaved writing, and not otherwise', async () => {
    render(<PostForm onSubmit={vi.fn()} submitLabel="Save draft" />)
    const closing = () => {
      const event = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(event)
      return event.defaultPrevented
    }

    expect(closing()).toBe(false)
    await userEvent.type(screen.getByLabelText('Title'), 'Half-written')
    expect(closing()).toBe(true)
  })
})

describe('PostForm: preview and cover', () => {
  it('previews the story as readers will see it, and goes back to writing without losing it', async () => {
    render(<PostForm onSubmit={vi.fn()} submitLabel="Save draft" />)
    await typeInEditor('Hello preview')

    await userEvent.click(screen.getByRole('button', { name: 'Preview' }))

    const preview = screen.getByLabelText('Preview of the story')
    expect(preview).toHaveTextContent('Hello preview')
    expect(preview.querySelector('.article-body')).not.toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Write' }))
    expect(screen.getByRole('textbox', { name: 'Content' })).toHaveTextContent('Hello preview')
  })

  it('says so when there is nothing to preview', async () => {
    render(<PostForm onSubmit={vi.fn()} submitLabel="Save draft" />)
    await screen.findByRole('textbox', { name: 'Content' })

    await userEvent.click(screen.getByRole('button', { name: 'Preview' }))

    expect(screen.getByText('Nothing to preview yet.')).toBeInTheDocument()
  })

  it('counts words in the text, not in the markup', async () => {
    render(<PostForm values={{ title: 'T', content: '<h2>Two words</h2><p>and <strong>three</strong> more</p>', excerpt: '', slug: '', categoryId: '', tags: [], coverMediaId: null, coverAlt: '', cover: null }} onSubmit={vi.fn()} submitLabel="Save" />)

    expect(await screen.findByText(/5 words/)).toBeInTheDocument()
  })

  it('submits the chosen cover picture and its description', async () => {
    mockFetch({ 'POST /api/media': () => okResponse(201, { media: { id: 8, url: '/media/u/1/c.webp', width: 1, height: 1, purpose: 'cover' } }) })
    const onSubmit = vi.fn()
    renderWithProviders(<PostForm onSubmit={onSubmit} submitLabel="Save draft" />)

    await userEvent.type(screen.getByLabelText('Title'), 'With cover')
    await typeInEditor('Body')
    await userEvent.upload(screen.getByLabelText('Choose a cover picture'), new File([new Uint8Array([1])], 'c.png', { type: 'image/png' }))
    await userEvent.type(await screen.findByLabelText('Picture description'), 'A sunrise')
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ title: 'With cover', content: '<p>Body</p>', coverMediaId: 8, coverAlt: 'A sunrise' })
  })

  it('removing the cover submits no cover', async () => {
    mockFetch()
    const onSubmit = vi.fn()
    const values = { title: 'T', content: '<p>C</p>', excerpt: '', slug: '', categoryId: '', tags: [], coverMediaId: 3, coverAlt: 'Old', cover: { id: 3, url: '/media/u/1/old.webp' } }
    renderWithProviders(<PostForm values={values} onSubmit={onSubmit} submitLabel="Save" />)

    await userEvent.click(await screen.findByRole('button', { name: 'Remove' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ coverMediaId: null, coverAlt: '' })
  })
})

describe('PostForm: autosave', () => {
  const values = { title: 'Saved title', content: '<p>Saved body</p>', excerpt: '', slug: '', categoryId: '', tags: [], coverMediaId: null, coverAlt: '', cover: null }
  const renderAutosave = (onAutosave) => {
    mockFetch()
    return renderWithProviders(<PostForm values={values} onSubmit={vi.fn()} submitLabel="Save draft" onAutosave={onAutosave} autosaveDelay={40} />)
  }
  const retitle = async (text) => {
    const title = await screen.findByLabelText('Title')
    await userEvent.clear(title)
    await userEvent.type(title, text)
  }

  it('saves by itself once the writer stops typing, and says when', async () => {
    const onAutosave = vi.fn().mockResolvedValue()
    renderAutosave(onAutosave)

    await retitle('New title')

    await waitFor(() => expect(onAutosave).toHaveBeenCalledTimes(1))
    expect(onAutosave).toHaveBeenCalledWith(expect.objectContaining({ title: 'New title', content: '<p>Saved body</p>' }))
    expect(await screen.findByText(/Saved \d/)).toBeInTheDocument()
    expect(screen.queryByText(/unsaved changes/)).not.toBeInTheDocument()
  })

  it('does not save again until something else changes', async () => {
    const onAutosave = vi.fn().mockResolvedValue()
    renderAutosave(onAutosave)
    await retitle('New title')
    await waitFor(() => expect(onAutosave).toHaveBeenCalledTimes(1))

    await new Promise((resolve) => setTimeout(resolve, 200))
    expect(onAutosave).toHaveBeenCalledTimes(1)

    await userEvent.type(screen.getByLabelText('Title'), '!')
    await waitFor(() => expect(onAutosave).toHaveBeenCalledTimes(2))
    expect(onAutosave).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'New title!' }))
  })

  it('does nothing when nothing has changed', async () => {
    const onAutosave = vi.fn().mockResolvedValue()
    renderAutosave(onAutosave)
    await screen.findByLabelText('Title')

    await new Promise((resolve) => setTimeout(resolve, 200))

    expect(onAutosave).not.toHaveBeenCalled()
  })

  it('waits until the story can be saved (a title is required)', async () => {
    const onAutosave = vi.fn().mockResolvedValue()
    renderAutosave(onAutosave)
    const title = await screen.findByLabelText('Title')

    await userEvent.clear(title)
    await new Promise((resolve) => setTimeout(resolve, 200))

    expect(onAutosave).not.toHaveBeenCalled()
    expect(screen.getByText(/unsaved changes/)).toBeInTheDocument()
  })

  it('reports a failure, keeps the writing, and tries again on the next change', async () => {
    const onAutosave = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue()
    renderAutosave(onAutosave)

    await retitle('First try')
    expect(await screen.findByText(/Could not save automatically/)).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveValue('First try')

    await userEvent.type(screen.getByLabelText('Title'), '!')
    await waitFor(() => expect(onAutosave).toHaveBeenCalledTimes(2))
    expect(await screen.findByText(/Saved \d/)).toBeInTheDocument()
  })

  it('stops for good when the story was changed somewhere else', async () => {
    const conflict = Object.assign(new Error('changed elsewhere'), { code: 'EDIT_CONFLICT' })
    const onAutosave = vi.fn().mockRejectedValue(conflict)
    renderAutosave(onAutosave)

    await retitle('Mine')
    expect(await screen.findByText(/changed somewhere else/)).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Title'), '!')
    await new Promise((resolve) => setTimeout(resolve, 200))
    expect(onAutosave).toHaveBeenCalledTimes(1)
  })

  it('is off when no save function is given (a new story, or a published one)', async () => {
    mockFetch()
    renderWithProviders(<PostForm values={values} onSubmit={vi.fn()} submitLabel="Save changes" autosaveDelay={40} />)

    await retitle('Changed')
    await new Promise((resolve) => setTimeout(resolve, 200))

    expect(screen.getByText(/unsaved changes/)).toBeInTheDocument()
  })
})
