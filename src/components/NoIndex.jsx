import { useSeo } from '../seo/useSeo.js'

// Marks the page it is on as not for search engines (private areas, sign-in pages, lists of people). A page that
// describes itself with useSeo() overrides it (higher priority).
export default function NoIndex({ follow = false }) {
  useSeo({ robots: follow ? 'noindex,follow' : 'noindex,nofollow' }, { priority: 0 })
  return null
}
