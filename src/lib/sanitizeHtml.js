import DOMPurify from 'dompurify'

// Post bodies are HTML written by other people. The API sanitizes them when they are saved
// (Blog-api/utils/richText.js); this is the second lock, applied every time one is shown, so a body that
// was stored under looser rules, or by a bug, still cannot run script in a reader's browser.
// Keep the allowlist in step with the API's.
const ALLOWED_TAGS = ['p', 'br', 'h2', 'h3', 'h4', 'strong', 'em', 's', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li', 'hr', 'a', 'img']
const ALLOWED_ATTR = ['href', 'rel', 'src', 'alt', 'width', 'height', 'loading', 'decoding', 'class']

// http(s) and mailto links, and addresses on this site ("/media/..."), never "//host", "javascript:" or "data:"
const ALLOWED_URI_REGEXP = /^(?:https?:|mailto:|\/(?!\/)|#)/i

const IMAGE_SOURCE = /^(?:https?:\/\/|\/(?!\/))/i

const LANGUAGE_CLASS = /^language-[a-z0-9+#-]+$/

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('rel', 'noopener noreferrer nofollow ugc')
    node.removeAttribute('target')
  }
  if (node.tagName === 'IMG') {
    // A picture needs an http(s) address or one on this site. (DOMPurify lets data: pictures through whatever the
    // URL rule says, so this checks the address itself.) One without a usable address is dropped, not left as an empty box.
    if (!IMAGE_SOURCE.test(node.getAttribute('src') ?? '')) {
      node.remove()
      return
    }
    node.setAttribute('loading', 'lazy')
    node.setAttribute('decoding', 'async')
  }
  // the only class allowed is the language of a code block
  if (node.hasAttribute('class')) {
    const kept = node.tagName === 'CODE' ? [...node.classList].filter((name) => LANGUAGE_CLASS.test(name)) : []
    if (kept.length > 0) node.setAttribute('class', kept.join(' '))
    else node.removeAttribute('class')
  }
})

const OPTIONS = { ALLOWED_TAGS, ALLOWED_ATTR, ALLOWED_URI_REGEXP, ALLOW_DATA_ATTR: false, ALLOW_ARIA_ATTR: false }

// safe HTML for a post body (a string, ready for ContentView)
export const sanitizeHtml = (html) => DOMPurify.sanitize(String(html ?? ''), OPTIONS)
