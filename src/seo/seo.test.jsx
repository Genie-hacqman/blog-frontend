import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import NoIndex from '../components/NoIndex.jsx'
import { SITE_NAME } from '../components/site.js'
import { renderWithProviders } from '../test/utils.jsx'
import { describe as describeText, storyJsonLd } from './site.js'
import { useSeo } from './useSeo.js'

const meta = (attribute, name) => document.head.querySelector(`meta[${attribute}="${name}"]`)?.getAttribute('content') ?? null
const canonical = () => document.head.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null
const jsonLd = () => {
  const node = document.head.querySelector('script[type="application/ld+json"]')
  return node ? JSON.parse(node.textContent) : null
}

function Probe({ page }) {
  useSeo(page)
  return <p>probe</p>
}

const storyPage = (overrides = {}) => ({
  title: 'A "quoted" <story>',
  description: 'About things.',
  path: '/blog/a-story',
  type: 'article',
  robots: 'index,follow',
  image: '/media/u/1/x.webp',
  imageAlt: 'A sunrise',
  article: { published: '2026-01-01T00:00:00.000Z', modified: '2026-02-01T00:00:00.000Z', author: '/u/ada', tags: ['React', 'Node'] },
  ...overrides,
})

afterEach(() => {
  document.title = ''
})

describe('useSeo', () => {
  it('sets title, description, canonical, Open Graph, Twitter and article tags, with absolute addresses', () => {
    const { unmount } = renderWithProviders(<Probe page={storyPage()} />)
    const origin = window.location.origin

    expect(document.title).toBe(`A "quoted" <story> — ${SITE_NAME}`)
    expect(meta('name', 'description')).toBe('About things.')
    expect(meta('name', 'robots')).toBe('index,follow')
    expect(canonical()).toBe(`${origin}/blog/a-story`)
    expect(meta('property', 'og:url')).toBe(`${origin}/blog/a-story`)
    expect(meta('property', 'og:type')).toBe('article')
    expect(meta('property', 'og:title')).toBe('A "quoted" <story>')
    expect(meta('property', 'og:image')).toBe(`${origin}/media/u/1/x.webp`)
    expect(meta('property', 'og:image:alt')).toBe('A sunrise')
    expect(meta('name', 'twitter:card')).toBe('summary_large_image')
    expect(meta('name', 'twitter:image')).toBe(`${origin}/media/u/1/x.webp`)
    expect(meta('property', 'article:published_time')).toBe('2026-01-01T00:00:00.000Z')
    expect(meta('property', 'article:author')).toBe(`${origin}/u/ada`)
    expect([...document.head.querySelectorAll('meta[property="article:tag"]')].map((tag) => tag.getAttribute('content'))).toEqual(['React', 'Node'])
    unmount()
  })

  it('uses the default picture when the page has none', () => {
    const { unmount } = renderWithProviders(<Probe page={storyPage({ image: undefined, imageAlt: undefined })} />)
    expect(meta('property', 'og:image')).toBe(`${window.location.origin}/og-default.png`)
    expect(meta('property', 'og:image:alt')).toBeNull()
    unmount()
  })

  it('refuses a picture address that is not http(s)', () => {
    const { unmount } = renderWithProviders(<Probe page={storyPage({ image: 'javascript:alert(1)' })} />)
    expect(meta('property', 'og:image')).toBe(`${window.location.origin}/og-default.png`)
    unmount()
  })

  it('replaces the tags when the page changes and takes them away when it goes, without duplicates', () => {
    const { rerender, unmount } = renderWithProviders(<Probe page={storyPage()} />)
    rerender(<Probe page={storyPage({ title: 'Other', path: '/blog/other', description: 'Second.', article: undefined, type: 'website' })} />)

    expect(document.title).toBe(`Other — ${SITE_NAME}`)
    expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1)
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1)
    expect(canonical()).toBe(`${window.location.origin}/blog/other`)
    expect(document.head.querySelector('meta[property="article:tag"]')).toBeNull()
    expect(document.head.querySelector('meta[property="article:published_time"]')).toBeNull()

    unmount()
    expect(canonical()).toBeNull()
    expect(meta('property', 'og:title')).toBeNull()
    expect(document.head.querySelector('script[type="application/ld+json"]')).toBeNull()
  })

  it('does nothing while the page does not know yet (null)', () => {
    const { unmount } = renderWithProviders(<Probe page={null} />)
    expect(canonical()).toBeNull()
    expect(meta('property', 'og:title')).toBeNull()
    unmount()
  })

  it('has no canonical address on a page that is not indexed', () => {
    const { unmount } = renderWithProviders(<Probe page={storyPage({ robots: 'noindex,nofollow' })} />)
    expect(meta('name', 'robots')).toBe('noindex,nofollow')
    expect(canonical()).toBeNull()
    unmount()
  })

  it('writes JSON-LD as data, however hostile the text in it', () => {
    const hostile = '</script><script>window.pwned = 1</script>'
    const { unmount } = renderWithProviders(<Probe page={storyPage({ jsonLd: { '@context': 'https://schema.org', name: hostile } })} />)
    expect(jsonLd().name).toBe(hostile)
    expect(document.head.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(1)
    expect(window.pwned).toBeUndefined()
    unmount()
  })
})

describe('NoIndex and priorities', () => {
  it('marks a page not for indexing and leaves everything else alone', () => {
    const { unmount } = renderWithProviders(<NoIndex />)
    expect(meta('name', 'robots')).toBe('noindex,nofollow')
    expect(document.head.querySelector('meta[property="og:title"]')).toBeNull()
    unmount()
    expect(meta('name', 'robots')).toBeNull()
  })

  it('lets a page that describes itself override the private-area marker', () => {
    const { unmount } = renderWithProviders(
      <>
        <NoIndex />
        <Probe page={storyPage()} />
      </>,
    )
    expect(meta('name', 'robots')).toBe('index,follow')
    unmount()
  })

  it('can keep following links on a page it does not index', () => {
    const { unmount } = renderWithProviders(<NoIndex follow />)
    expect(meta('name', 'robots')).toBe('noindex,follow')
    unmount()
  })
})

describe('JSON-LD builders and descriptions', () => {
  const post = {
    slug: 'my-story',
    title: 'My story',
    excerpt: 'A teaser',
    publishedAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    cover: { url: '/media/u/1/c.webp' },
    author: { id: 1, username: 'ada_l' },
    category: { name: 'Tech', slug: 'tech' },
    tags: [{ name: 'React' }, { name: 'Node JS' }],
  }

  it('describes a story like the API snapshot does', () => {
    const graph = storyJsonLd(post)['@graph']
    const origin = window.location.origin
    expect(graph[0]).toMatchObject({
      '@type': 'BlogPosting',
      headline: 'My story',
      mainEntityOfPage: `${origin}/blog/my-story`,
      image: [`${origin}/media/u/1/c.webp`],
      author: { '@type': 'Person', name: 'ada_l', url: `${origin}/u/ada_l` },
      articleSection: 'Tech',
      keywords: 'React, Node JS',
    })
    expect(graph[1].itemListElement.map((item) => item.position)).toEqual([1, 2, 3])
  })

  it('gives a deleted author a name and no address', () => {
    const { author } = storyJsonLd({ ...post, author: { id: 2, username: 'Deleted user', deleted: true } })['@graph'][0]
    expect(author).toEqual({ '@type': 'Person', name: 'Deleted user' })
  })

  it('cuts descriptions at a word with an ellipsis', () => {
    expect(describeText('  short   text ')).toBe('short text')
    const cut = describeText('word '.repeat(80))
    expect(cut.length).toBeLessThanOrEqual(160)
    expect(cut.endsWith('word…')).toBe(true)
  })
})

describe('what the host sends to crawlers (vercel.seo.example.json)', () => {
  const config = JSON.parse(readFileSync(resolve(process.cwd(), 'vercel.seo.example.json'), 'utf8'))
  const rules = config.rewrites
  const agentRule = (source) => rules.find((rule) => rule.source === source && rule.has)
  const matches = (agent) => new RegExp(`^${agentRule('/blog/:slug').has[0].value}$`).test(agent)

  it('puts the API first, the feeds and sitemaps next, crawler pages after them and the app last', () => {
    const sources = rules.map((rule) => rule.source)
    expect(sources[0]).toBe('/api/:path*')
    expect(sources.at(-1)).toBe('/(.*)')
    expect(sources.indexOf('/robots.txt')).toBeLessThan(sources.indexOf('/blog/:slug'))
    expect(sources.indexOf('/sitemap.xml')).toBeLessThan(sources.indexOf('/blog/:slug'))
    expect(sources.indexOf('/blog/:slug')).toBeLessThan(sources.indexOf('/(.*)'))
  })

  it('has one crawler rule for each public page type, all with the same user-agent test', () => {
    const pages = ['/', '/blog/:slug', '/u/:username', '/category/:slug', '/tag/:slug']
    const values = pages.map((source) => agentRule(source).has[0].value)
    expect(new Set(values).size).toBe(1)
    for (const source of pages) {
      expect(agentRule(source).destination).toMatch(/^https:\/\/YOUR-API-HOST\/api\/seo\//)
      expect(agentRule(source).has[0]).toMatchObject({ type: 'header', key: 'user-agent' })
    }
  })

  it('matches the crawlers and link-preview fetchers, and not browsers', () => {
    for (const agent of [
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
      'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
      'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      'Twitterbot/1.0',
      'LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)',
      'WhatsApp/2.23.20.0 A',
      'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
      'TelegramBot (like TwitterBot)',
    ]) {
      expect(matches(agent), agent).toBe(true)
    }
    for (const agent of [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0',
      '',
    ]) {
      expect(matches(agent), agent).toBe(false)
    }
  })
})
