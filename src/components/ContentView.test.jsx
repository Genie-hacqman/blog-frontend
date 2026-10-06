import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ContentView from './ContentView.jsx'

describe('ContentView', () => {
  it('renders the formatting of a post inside the article column', () => {
    const { container } = render(<ContentView content="<h2>Hello</h2><p>A <em>fine</em> day.</p>" />)

    expect(screen.getByRole('heading', { name: 'Hello', level: 2 })).toBeInTheDocument()
    expect(screen.getByText('fine').tagName).toBe('EM')
    expect(container.firstChild).toHaveClass('article-body')
  })

  it('marks the body for a drop cap only when asked', () => {
    const { container, rerender } = render(<ContentView content="<p>x</p>" />)
    expect(container.firstChild).not.toHaveClass('dropcap')
    rerender(<ContentView content="<p>x</p>" dropcap />)
    expect(container.firstChild).toHaveClass('dropcap')
  })

  it('sanitizes before it renders', () => {
    const { container } = render(<ContentView content={'<p onclick="x()">Hi</p><script>window.__pwned = true</script>'} />)

    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('[onclick]')).toBeNull()
    expect(window.__pwned).toBeUndefined()
  })

  it('colours code blocks with a known language, and leaves their text as text', async () => {
    const { container } = render(<ContentView content={'<pre><code class="language-javascript">const a = 1 &lt; 2; // &lt;img src=x onerror=alert(1)&gt;</code></pre>'} />)

    await waitFor(() => expect(container.querySelector('code .hljs-keyword')).not.toBeNull())
    expect(container.querySelector('code .hljs-keyword').textContent).toBe('const')
    expect(container.querySelector('code').textContent).toBe('const a = 1 < 2; // <img src=x onerror=alert(1)>')
    expect(container.querySelector('code img')).toBeNull()
  })

  it('leaves code in an unknown language uncoloured', async () => {
    const { container } = render(<ContentView content={'<pre><code class="language-klingon">qapla</code></pre>'} />)

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(container.querySelector('code span')).toBeNull()
    expect(container.querySelector('code').textContent).toBe('qapla')
  })
})
