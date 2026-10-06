import { SITE_NAME } from '../components/site.js'

// Owns the page's metadata in <head> (title, description, robots, canonical, Open Graph, Twitter, JSON-LD).
// Pages describe themselves with useSeo(); this module turns those descriptions into tags and, when a page goes
// away, puts back what index.html had. Several descriptions can be active at once (a private-area marker and the
// page itself): a higher priority wins per field, and among equals the most recent one.

export const DEFAULT_IMAGE_PATH = '/og-default.png'

const SINGLE_KEYS = [
  'name:description',
  'name:robots',
  'property:og:site_name',
  'property:og:type',
  'property:og:title',
  'property:og:description',
  'property:og:url',
  'property:og:image',
  'property:og:image:alt',
  'name:twitter:card',
  'name:twitter:title',
  'name:twitter:description',
  'name:twitter:image',
  'name:twitter:image:alt',
  'property:article:published_time',
  'property:article:modified_time',
  'property:article:author',
  'link:canonical',
]
const MAX_TAGS = 5
const TAG_KEYS = Array.from({ length: MAX_TAGS }, (_, i) => `property:article:tag#${i}`)
const ALL_KEYS = [...SINGLE_KEYS, ...TAG_KEYS]

const entries = new Map() // id -> { fields, priority, order }
let order = 0
let initial = null // what index.html had, by key

const selectorOf = (key) => {
  const [kind, rest] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)]
  if (kind === 'link') return `link[rel="${rest}"]`
  return `meta[${kind}="${rest.replace(/#\d+$/, '')}"]`
}

const ownElement = (key) => document.head.querySelector(`[data-seo-key="${key}"]`)

// remember and remove the tags index.html shipped, so this module is the only owner of each tag
const capture = () => {
  if (initial) return
  initial = { title: document.title }
  for (const key of SINGLE_KEYS) {
    const element = document.head.querySelector(`${selectorOf(key)}:not([data-seo-key])`)
    if (!element) continue
    initial[key] = key.startsWith('link:') ? element.getAttribute('href') : element.getAttribute('content')
    element.remove()
  }
}

const write = (key, value) => {
  let element = ownElement(key)
  if (value === undefined || value === null || value === '') {
    element?.remove()
    return
  }
  if (!element) {
    const isLink = key.startsWith('link:')
    element = document.createElement(isLink ? 'link' : 'meta')
    element.dataset.seoKey = key
    if (isLink) element.setAttribute('rel', key.slice(5))
    else element.setAttribute(key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1).replace(/#\d+$/, ''))
    document.head.append(element)
  }
  element.setAttribute(key.startsWith('link:') ? 'href' : 'content', value)
}

const writeJsonLd = (json) => {
  let element = document.head.querySelector('script[data-seo-key="jsonld"]')
  if (!json) {
    element?.remove()
    return
  }
  if (!element) {
    element = document.createElement('script')
    element.type = 'application/ld+json'
    element.dataset.seoKey = 'jsonld'
    document.head.append(element)
  }
  // textContent of a script is data, never markup
  element.textContent = json
}

const render = () => {
  capture()
  const merged = { ...initial }
  for (const { fields } of [...entries.values()].sort((a, b) => a.priority - b.priority || a.order - b.order)) {
    for (const [key, value] of Object.entries(fields)) if (value !== undefined) merged[key] = value
  }
  document.title = merged.title ?? initial.title
  for (const key of ALL_KEYS) write(key, merged[key])
  writeJsonLd(merged.jsonld)
}

const absoluteImage = (value) => {
  try {
    const url = new URL(value, window.location.origin)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

// What a page says about itself -> the tags it means.
// props: { title, description, path, image, imageAlt, type, robots, article: { published, modified, author, tags }, jsonLd }
// Only a page with a title speaks for social previews; a page that only sets robots changes nothing else.
export const toFields = (props) => {
  const origin = window.location.origin
  const fields = {}
  const noindex = props.robots?.startsWith('noindex')

  if (props.robots) fields['name:robots'] = props.robots
  if (props.description) fields['name:description'] = props.description
  if (props.path && !noindex) {
    fields['link:canonical'] = `${origin}${props.path}`
    fields['property:og:url'] = `${origin}${props.path}`
  } else if (props.path !== undefined || noindex) {
    // a page that is not to be indexed has no canonical address of its own
    fields['link:canonical'] = null
  }
  if (props.title) {
    fields.title = props.title === SITE_NAME ? SITE_NAME : `${props.title} — ${SITE_NAME}`
    const image = (props.image && absoluteImage(props.image)) || `${origin}${DEFAULT_IMAGE_PATH}`
    Object.assign(fields, {
      'property:og:site_name': SITE_NAME,
      'property:og:type': props.type ?? 'website',
      'property:og:title': props.title,
      'property:og:description': props.description,
      'property:og:image': image,
      'property:og:image:alt': props.image ? (props.imageAlt ?? '') : null,
      'name:twitter:card': 'summary_large_image',
      'name:twitter:title': props.title,
      'name:twitter:description': props.description,
      'name:twitter:image': image,
      'name:twitter:image:alt': props.image ? (props.imageAlt ?? '') : null,
    })
  }
  if (props.article) {
    fields['property:article:published_time'] = props.article.published
    fields['property:article:modified_time'] = props.article.modified
    fields['property:article:author'] = props.article.author ? `${origin}${props.article.author}` : null
    TAG_KEYS.forEach((key, i) => {
      fields[key] = props.article.tags?.[i] ?? null
    })
  }
  if (props.jsonLd) fields.jsonld = JSON.stringify(props.jsonLd)
  return fields
}

export const registerSeo = (id, props, priority) => {
  entries.set(id, { fields: toFields(props), priority, order: (order += 1) })
  render()
}

export const unregisterSeo = (id) => {
  if (entries.delete(id)) render()
}
