import { useEffect, useId } from 'react'
import { registerSeo, unregisterSeo } from './manager.js'

// Describe the page for search engines and link previews (see seo/manager.js for the fields). Pass null while the
// page does not know yet (still loading). The description is applied when it changes and removed when the page
// goes away, so navigating never leaves a previous page's tags behind. `priority` lets a general rule (a private
// area) be overridden by the page itself.
export function useSeo(props, { priority = 1 } = {}) {
  const id = useId()
  const key = props ? JSON.stringify(props) : null
  useEffect(() => {
    if (!key) return undefined
    registerSeo(id, JSON.parse(key), priority)
    return () => unregisterSeo(id)
  }, [id, key, priority])
}
