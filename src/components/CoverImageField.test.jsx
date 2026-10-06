import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CoverImageField from './CoverImageField.jsx'
import { errorResponse, mockFetch, okResponse } from '../test/utils.jsx'

const file = (name = 'cover.png', type = 'image/png') => new File([new Uint8Array([137, 80, 78, 71])], name, { type })

describe('CoverImageField', () => {
  afterEach(() => vi.restoreAllMocks())

  it('offers to add a picture when there is none', () => {
    render(<CoverImageField cover={null} alt="" onChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Add a cover picture' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Picture description')).not.toBeInTheDocument()
  })

  it('uploads the chosen picture as a cover and reports it', async () => {
    const fetchMock = mockFetch({ 'POST /api/media': () => okResponse(201, { media: { id: 8, url: '/media/u/1/c.webp', width: 1600, height: 900, purpose: 'cover' } }) })
    const onChange = vi.fn()
    render(<CoverImageField cover={null} alt="" onChange={onChange} />)

    await userEvent.upload(screen.getByLabelText('Choose a cover picture'), file())

    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ cover: { id: 8, url: '/media/u/1/c.webp' }, alt: '' }))
    const body = fetchMock.mock.calls[0][1].body
    expect(body.get('purpose')).toBe('cover')
    expect(body.get('file').name).toBe('cover.png')
  })

  it('shows the picture with its description, and lets the writer change or remove it', async () => {
    const onChange = vi.fn()
    const cover = { id: 8, url: '/media/u/1/c.webp' }
    render(<CoverImageField cover={cover} alt="A sunrise" onChange={onChange} />)

    expect(document.querySelector('img')).toHaveAttribute('src', '/media/u/1/c.webp')
    expect(screen.getByLabelText('Picture description')).toHaveValue('A sunrise')

    await userEvent.type(screen.getByLabelText('Picture description'), '!')
    expect(onChange).toHaveBeenLastCalledWith({ cover, alt: 'A sunrise!' })

    await userEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(onChange).toHaveBeenLastCalledWith({ cover: null, alt: '' })
  })

  it('shows why an upload failed and keeps the current picture', async () => {
    mockFetch({ 'POST /api/media': () => errorResponse(400, 'INVALID_IMAGE', 'That file is not a supported image') })
    const onChange = vi.fn()
    render(<CoverImageField cover={null} alt="" onChange={onChange} />)

    await userEvent.upload(screen.getByLabelText('Choose a cover picture'), file())

    expect(await screen.findByRole('alert')).toHaveTextContent('That file is not a supported image')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('refuses other kinds of file and files over 5 MB before uploading', async () => {
    const fetchMock = mockFetch()
    render(<CoverImageField cover={null} alt="" onChange={vi.fn()} />)
    const user = userEvent.setup({ applyAccept: false })
    const input = screen.getByLabelText('Choose a cover picture')

    await user.upload(input, new File(['hi'], 'a.pdf', { type: 'application/pdf' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Only JPEG, PNG, WebP or GIF')

    const big = file()
    Object.defineProperty(big, 'size', { value: 6 * 1024 * 1024 })
    await user.upload(input, big)
    expect(await screen.findByRole('alert')).toHaveTextContent('larger than 5 MB')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
