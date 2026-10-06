import { SITE_NAME } from '../components/site.js'

// Pure builders for what pages tell search engines: descriptions and JSON-LD (schema.org). They mirror the
// API's crawler snapshots (Blog-api services/seoService.js), so both say the same thing about a page.

// one line, cut at a word boundary with an ellipsis
export const describe = (text, max = 160) => {
  const flat = String(text ?? '').replace(/\s+/g, ' ').trim()
  if (flat.length <= max) return flat
  const cut = flat.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(' ')
  const base = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut
  return `${base.replace(/[\s,;:.\-–—]+$/, '')}…`
}

const origin = () => window.location.origin
const url = (path) => `${origin()}${path}`
const iso = (value) => (value ? new Date(value).toISOString() : undefined)
const absolute = (value) => {
  try {
    const parsed = new URL(value, origin())
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : undefined
  } catch {
    return undefined
  }
}

const publisher = () => ({ '@type': 'Organization', name: SITE_NAME, url: url('/') })

export const breadcrumbs = (trail) => ({
  '@type': 'BreadcrumbList',
  itemListElement: trail.map(([name, path], index) => ({ '@type': 'ListItem', position: index + 1, name, item: url(path) })),
})

export const websiteJsonLd = (description) => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: url('/'),
  ...(description && { description }),
  publisher: publisher(),
})

// a story page: the article and where it sits
export const storyJsonLd = (post) => {
  const path = `/blog/${encodeURIComponent(post.slug)}`
  const image = post.cover ? absolute(post.cover.url) : undefined
  const author = post.author
  const authorPath = author && !author.deleted ? `/u/${encodeURIComponent(author.username)}` : null
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        headline: post.title,
        description: describe(post.excerpt),
        datePublished: iso(post.publishedAt),
        dateModified: iso(post.updatedAt),
        mainEntityOfPage: url(path),
        url: url(path),
        ...(image && { image: [image] }),
        ...(author && { author: { '@type': 'Person', name: author.username, ...(authorPath && { url: url(authorPath) }) } }),
        publisher: publisher(),
        ...(post.category && { articleSection: post.category.name }),
        ...(post.tags?.length && { keywords: post.tags.map((tag) => tag.name).join(', ') }),
      },
      breadcrumbs([
        [SITE_NAME, '/'],
        ...(post.category ? [[post.category.name, `/category/${encodeURIComponent(post.category.slug)}`]] : []),
        [post.title, path],
      ]),
    ],
  }
}

// a section, topic or author page
export const collectionJsonLd = ({ name, description, path, trail, extra = [] }) => ({
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'CollectionPage', name, description, url: url(path), isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: url('/') } },
    breadcrumbs(trail),
    ...extra,
  ],
})

export const personJsonLd = (profile, path) => {
  const links = Object.values(profile.socialLinks ?? {}).filter((value) => typeof value === 'string' && value.startsWith('https://'))
  const image = profile.avatarUrl ? absolute(profile.avatarUrl) : undefined
  return {
    '@type': 'Person',
    name: profile.username,
    url: url(path),
    ...(image && { image }),
    ...(profile.bio && { description: profile.bio }),
    ...(links.length && { sameAs: links }),
  }
}
