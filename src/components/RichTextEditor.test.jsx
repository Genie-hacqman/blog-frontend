import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import RichTextEditor from './RichTextEditor.jsx'
import { errorResponse, mockFetch, okResponse } from '../test/utils.jsx'

// Hosts the editor the way the form does and keeps the last HTML it produced
function Host({ initial = '', onChange }) {
  return <RichTextEditor value={initial} onChange={onChange} />
}

const setup = async (initial = '') => {
  const onChange = vi.fn()
  render(<Host initial={initial} onChange={onChange} />)
  const editor = await screen.findByRole('textbox', { name: 'Content' })
  return { onChange, editor, last: () => onChange.mock.calls.at(-1)?.[0] }
}

const typeAndSelectAll = async (editor, text) => {
  await userEvent.click(editor)
  await userEvent.keyboard(text)
  await userEvent.keyboard('{Control>}a{/Control}')
}

const imageFile = (name = 'p.png', type = 'image/png') => new File([new Uint8Array([137, 80, 78, 71])], name, { type })

describe('RichTextEditor', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shows what it was given, without reporting a change', async () => {
    const { editor, onChange } = await setup('<h2>Existing</h2><p>text</p>')

    expect(editor).toHaveTextContent('Existingtext')
    expect(editor.querySelector('h2')).not.toBeNull()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('reports HTML as the writer types', async () => {
    const { editor, last } = await setup()
    await userEvent.click(editor)
    await userEvent.keyboard('Hello{Enter}World')

    expect(last()).toBe('<p>Hello</p><p>World</p>')
  })

  it('reports an empty string, not an empty paragraph, when nothing is written', async () => {
    const { editor, last } = await setup()
    await userEvent.click(editor)
    await userEvent.keyboard('x')
    expect(last()).toBe('<p>x</p>')

    await userEvent.keyboard('{Control>}a{/Control}{Backspace}')

    expect(last()).toBe('')
  })

  it('applies inline formatting from the toolbar', async () => {
    const { editor, last } = await setup()
    await typeAndSelectAll(editor, 'Hello')

    const bold = screen.getByRole('button', { name: 'Bold' })
    expect(bold).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(bold)
    expect(last()).toBe('<p><strong>Hello</strong></p>')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'true'))

    await userEvent.click(screen.getByRole('button', { name: 'Italic' }))
    expect(last()).toBe('<p><strong><em>Hello</em></strong></p>')
  })

  it.each([
    ['Heading 2', '<h2>Hello</h2>'],
    ['Heading 3', '<h3>Hello</h3>'],
    ['Quote', '<blockquote><p>Hello</p></blockquote>'],
    ['Bulleted list', '<ul><li><p>Hello</p></li></ul>'],
    ['Numbered list', '<ol><li><p>Hello</p></li></ol>'],
    ['Code block', '<pre><code>Hello</code></pre>'],
  ])('turns the paragraph into a block with “%s”', async (label, html) => {
    const { editor, last } = await setup()
    await typeAndSelectAll(editor, 'Hello')

    await userEvent.click(screen.getByRole('button', { name: label }))

    expect(last()).toBe(html)
  })

  it('offers a language for a code block and stores it as a class', async () => {
    const { editor, last } = await setup()
    await userEvent.click(editor)
    await userEvent.keyboard('x = 1')
    await userEvent.click(screen.getByRole('button', { name: 'Code block' }))

    await userEvent.selectOptions(await screen.findByLabelText('Language'), 'python')

    expect(last()).toBe('<pre><code class="language-python">x = 1</code></pre>')
  })

  it('adds a link with a safe address, completing a bare domain with https', async () => {
    const { editor, last } = await setup()
    await typeAndSelectAll(editor, 'my site')
    await userEvent.click(screen.getByRole('button', { name: 'Link' }))

    await userEvent.type(screen.getByLabelText('Link address'), 'example.com/page')
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))

    expect(last()).toContain('href="https://example.com/page"')
    expect(last()).toContain('rel="noopener noreferrer nofollow ugc"')
    expect(last()).not.toContain('target')
  })

  it('refuses a link that is not a web or email address', async () => {
    const { editor, onChange } = await setup()
    await typeAndSelectAll(editor, 'click me')
    onChange.mockClear()
    await userEvent.click(screen.getByRole('button', { name: 'Link' }))

    for (const bad of ['javascript:alert(1)', 'data:text/html,hi', '//evil.example', 'not a link']) {
      const input = screen.getByLabelText('Link address')
      await userEvent.clear(input)
      await userEvent.type(input, bad)
      await userEvent.click(screen.getByRole('button', { name: 'Apply' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('web address')
    }
    expect(onChange).not.toHaveBeenCalled()
  })

  it('removes a link', async () => {
    const { editor, last } = await setup('<p><a href="https://a.example">linked</a></p>')
    await userEvent.click(editor)
    await userEvent.keyboard('{Control>}a{/Control}')
    await userEvent.click(screen.getByRole('button', { name: 'Link' }))

    await userEvent.click(await screen.findByRole('button', { name: 'Remove link' }))

    expect(last()).toBe('<p>linked</p>')
  })

  it('undoes and redoes', async () => {
    const { editor, last } = await setup()
    await typeAndSelectAll(editor, 'Hello')
    await userEvent.click(screen.getByRole('button', { name: 'Bold' }))
    expect(last()).toContain('<strong>')

    await userEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(last()).toBe('<p>Hello</p>')
    await userEvent.click(screen.getByRole('button', { name: 'Redo' }))
    expect(last()).toBe('<p><strong>Hello</strong></p>')
  })

  it('has labelled, grouped controls', async () => {
    await setup()

    expect(screen.getByRole('toolbar', { name: 'Formatting' })).toBeInTheDocument()
    for (const group of ['Text style', 'Headings', 'Blocks', 'Insert', 'History']) {
      expect(screen.getByRole('group', { name: group })).toBeInTheDocument()
    }
  })

  describe('pictures', () => {
    it('uploads a chosen picture as an inline image and puts it in the text', async () => {
      const fetchMock = mockFetch({
        'POST /api/media': () => okResponse(201, { media: { id: 4, url: '/media/u/1/x.webp', width: 10, height: 10, purpose: 'inline' } }),
      })
      const { last } = await setup('<p>Before</p>')

      await userEvent.upload(screen.getByLabelText('Choose an image to insert'), imageFile())

      await waitFor(() => expect(last()).toContain('<img src="/media/u/1/x.webp" alt="">'))
      const body = fetchMock.mock.calls.find(([url]) => url.endsWith('/api/media'))[1].body
      expect(body.get('purpose')).toBe('inline')
      expect(body.get('file').name).toBe('p.png')
    })

    it('uploads a picture pasted into the editor', async () => {
      mockFetch({ 'POST /api/media': () => okResponse(201, { media: { id: 5, url: '/media/u/1/pasted.webp', width: 1, height: 1, purpose: 'inline' } }) })
      const { editor, last } = await setup()

      fireEvent.paste(editor, { clipboardData: { files: [imageFile('shot.png')], getData: () => '' } })

      await waitFor(() => expect(last()).toContain('src="/media/u/1/pasted.webp"'))
    })

    it('shows why an upload failed and puts nothing in the text', async () => {
      mockFetch({ 'POST /api/media': () => errorResponse(400, 'INVALID_IMAGE', 'That file is not a supported image') })
      const { onChange } = await setup()

      await userEvent.upload(screen.getByLabelText('Choose an image to insert'), imageFile())

      expect(await screen.findByRole('alert')).toHaveTextContent('That file is not a supported image')
      expect(onChange).not.toHaveBeenCalled()
    })

    it('refuses other kinds of file and files over 5 MB without contacting the server', async () => {
      const fetchMock = mockFetch()
      await setup()
      const user = userEvent.setup({ applyAccept: false })
      const input = screen.getByLabelText('Choose an image to insert')

      await user.upload(input, new File(['hi'], 'notes.txt', { type: 'text/plain' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('Only JPEG, PNG, WebP or GIF')

      const big = imageFile('big.png')
      Object.defineProperty(big, 'size', { value: 6 * 1024 * 1024 })
      await user.upload(input, big)
      expect(await screen.findByRole('alert')).toHaveTextContent('larger than 5 MB')
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  it('shows a newer saved version, but never replaces what is being typed', async () => {
    const onChange = vi.fn()
    const { rerender } = render(<RichTextEditor value="<p>Version one</p>" onChange={onChange} />)
    const editor = await screen.findByRole('textbox', { name: 'Content' })

    rerender(<RichTextEditor value="<p>Version two</p>" onChange={onChange} />)
    await waitFor(() => expect(editor).toHaveTextContent('Version two'))

    await userEvent.click(editor)
    rerender(<RichTextEditor value="<p>Version three</p>" onChange={onChange} />)
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(editor).toHaveTextContent('Version two')
  })
})
