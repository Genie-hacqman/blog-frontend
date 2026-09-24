import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import PostForm from './PostForm.jsx'

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
    await userEvent.type(screen.getByLabelText('Content'), 'Body')
    await userEvent.click(screen.getByRole('button', { name: 'Publish' }))

    expect(await screen.findByText('Title is required')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits trimmed values', async () => {
    const onSubmit = vi.fn()
    render(<PostForm onSubmit={onSubmit} submitLabel="Publish" />)

    await userEvent.type(screen.getByLabelText('Title'), '  Hello  ')
    await userEvent.type(screen.getByLabelText('Content'), 'World')
    await userEvent.click(screen.getByRole('button', { name: 'Publish' }))

    expect(onSubmit).toHaveBeenCalledWith({ title: 'Hello', content: 'World' }, expect.anything())
  })
})
