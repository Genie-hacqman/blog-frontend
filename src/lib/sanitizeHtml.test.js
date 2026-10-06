import { describe, expect, it } from 'vitest'
import { sanitizeHtml } from './sanitizeHtml.js'
import { htmlToText } from './htmlText.js'

const parse = (html) => {
  const root = document.createElement('div')
  root.innerHTML = sanitizeHtml(html)
  return root
}

// whatever the input, none of this may remain
const DANGEROUS = /<script|<iframe|<svg|<math|<style|<form|<input|<object|<embed|<link|<meta|<base|\son[a-z]+\s*=|javascript:|vbscript:|data:|\sstyle\s*=|srcdoc/i

describe('sanitizeHtml: attacks', () => {
  const payloads = [
    '<script>alert(1)</script><p>hi</p>',
    '<img src=x onerror=alert(1)>',
    '<img src="x" onerror="alert(1)" alt="a">',
    '<p onclick="alert(1)">click</p>',
    '<a href="javascript:alert(1)">x</a>',
    '<a href="  javascript:alert(1)">x</a>',
    '<a href="jav&#x09;ascript:alert(1)">x</a>',
    '<a href="&#106;avascript:alert(1)">x</a>',
    '<a href="JaVaScRiPt:alert(1)">x</a>',
    '<a href="vbscript:msgbox(1)">x</a>',
    '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">x</a>',
    '<img src="data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+">',
    '<img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">',
    '<img src="javascript:alert(1)">',
    '<svg onload=alert(1)><circle/></svg>',
    '<svg><script>alert(1)</script></svg>',
    '<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>',
    '<iframe src="https://evil.example"></iframe>',
    '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
    '<style>body{background:url(javascript:alert(1))}</style>',
    '<p style="background:url(javascript:alert(1))">x</p>',
    '<form action="https://evil.example"><input name="password"></form>',
    '<object data="x.swf"></object><embed src="x.swf">',
    '<link rel="stylesheet" href="https://evil.example/x.css"><meta http-equiv="refresh" content="0;url=https://evil.example"><base href="https://evil.example/">',
    '<noscript><p title="</noscript><img src=x onerror=alert(1)>">',
    '<details open ontoggle=alert(1)>x</details>',
    '<video><source onerror="alert(1)"></video>',
    '<p>text</p><!--[if IE]><script>alert(1)</script><![endif]-->',
    '<div><p>unclosed <b>bold <i>italic <a href="javascript:alert(1)">x',
  ]

  for (const payload of payloads) {
    it(`neutralizes ${JSON.stringify(payload).slice(0, 70)}`, () => {
      expect(sanitizeHtml(payload)).not.toMatch(DANGEROUS)
    })
  }

  it('drops pictures that are not on http(s) or on this site, instead of leaving them empty', () => {
    const root = parse('<img src="//evil.example/p.png"><img src="relative.png"><img src="data:image/gif;base64,AAAA"><img alt="no source">')
    expect(root.querySelectorAll('img')).toHaveLength(0)
  })

  it('does not execute anything while sanitizing', () => {
    window.__pwned = false
    sanitizeHtml('<img src=x onerror="window.__pwned = true"><script>window.__pwned = true</script>')
    expect(window.__pwned).toBe(false)
  })
})

describe('sanitizeHtml: what is kept', () => {
  it('keeps the formatting the editor produces', () => {
    const root = parse(
      '<h2>H</h2><h3>S</h3><p>A <strong>b</strong> <em>i</em> <s>s</s> <code>c</code></p><ul><li><p>x</p></li></ul><ol><li>y</li></ol><blockquote><p>q</p></blockquote><hr>',
    )
    for (const selector of ['h2', 'h3', 'strong', 'em', 's', 'code', 'ul > li > p', 'ol > li', 'blockquote > p', 'hr']) {
      expect(root.querySelector(selector), selector).not.toBeNull()
    }
  })

  it('forces rel on links, removes target, and keeps only http, https and mailto links', () => {
    const root = parse('<a href="https://a.example" rel="opener" target="_blank">a</a><a href="mailto:me@example.com">m</a><a href="ftp://x.example">f</a>')
    const [web, mail, ftp] = root.querySelectorAll('a')
    expect(web).toHaveAttribute('rel', 'noopener noreferrer nofollow ugc')
    expect(web).not.toHaveAttribute('target')
    expect(mail).toHaveAttribute('href', 'mailto:me@example.com')
    expect(ftp.getAttribute('href')).toBeNull()
  })

  it('keeps a language class on code and no other class anywhere', () => {
    const root = parse('<pre><code class="language-js evil">x</code></pre><p class="big">y</p>')
    expect(root.querySelector('code')).toHaveAttribute('class', 'language-js')
    expect(root.querySelector('p')).not.toHaveAttribute('class')
  })

  it('keeps pictures on this site or on http(s), lazy-loaded, with their description', () => {
    const root = parse('<img src="/media/u/1/a.webp" alt="A red box"><img src="https://cdn.example/b.webp" alt="">')
    const [first, second] = root.querySelectorAll('img')
    expect(first).toHaveAttribute('alt', 'A red box')
    expect(first).toHaveAttribute('loading', 'lazy')
    expect(second).toHaveAttribute('src', 'https://cdn.example/b.webp')
  })

  it('returns an empty string for nothing', () => {
    expect(sanitizeHtml(undefined)).toBe('')
    expect(sanitizeHtml('')).toBe('')
  })
})

describe('htmlToText', () => {
  it('gives the words with block boundaries as spaces, and decodes entities', () => {
    expect(htmlToText('<h2>Title &amp; more</h2><p>One<br>two</p><ul><li>a</li><li>b</li></ul>')).toBe('Title & more One two a b')
  })

  it('is empty for nothing or for empty paragraphs', () => {
    expect(htmlToText('')).toBe('')
    expect(htmlToText('<p></p><p> </p>')).toBe('')
    expect(htmlToText(undefined)).toBe('')
  })

  it('does not run scripts or load pictures', () => {
    window.__pwned = false
    htmlToText('<img src=x onerror="window.__pwned = true"><script>window.__pwned = true</script>')
    expect(window.__pwned).toBe(false)
  })
})
