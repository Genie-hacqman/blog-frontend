import { useEffect, useMemo, useRef } from 'react'
import { highlightCodeBlocks } from '../lib/highlight.js'
import { sanitizeHtml } from '../lib/sanitizeHtml.js'

// A post body, as the reader sees it. This is the only component that puts HTML into the page, and
// it only ever puts in what sanitizeHtml returned.
export default function ContentView({ content, dropcap = false, className = '' }) {
  const ref = useRef(null)
  const html = useMemo(() => sanitizeHtml(content), [content])

  useEffect(() => {
    if (html.includes('<pre') && ref.current) highlightCodeBlocks(ref.current).catch(() => {})
  }, [html])

  return (
    <div
      ref={ref}
      className={['article-body', dropcap && 'dropcap', className].filter(Boolean).join(' ')}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
