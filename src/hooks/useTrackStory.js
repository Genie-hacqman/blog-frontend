import { useEffect } from 'react'
import { sendReading, sendView } from '../api/analytics.js'

// how long a story must have been on screen before it counts as opened (a page flicked past does not)
const VIEW_DELAY_MS = 1500
const MAX_SECONDS = 3600

// Tells the server, privately, that this story was read: once when it has been on screen for a moment, and once
// when the reader leaves, with how long they stayed and how far down they got. Nothing is stored in the browser and
// nothing identifying is sent. `enabled` is false for the author's own story, an unpublished story, the private
// preview and while it is not yet known who is looking (so the author's own visit is never counted by mistake).
export function useTrackStory({ postId, enabled, articleRef }) {
  useEffect(() => {
    if (!enabled || !postId) return undefined

    let viewSent = false
    let readingSent = false
    let visibleSince = document.visibilityState === 'visible' ? Date.now() : null
    let visibleMs = 0
    let deepest = 0
    let frame = 0

    const measureDepth = () => {
      frame = 0
      const el = articleRef?.current
      if (!el) return
      const { top, height } = el.getBoundingClientRect()
      if (height <= 0) return
      // how much of the story has scrolled into view, from its top to the bottom edge of the window
      deepest = Math.max(deepest, Math.min(100, Math.max(0, ((window.innerHeight - top) / height) * 100)))
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measureDepth)
    }

    const timer = setTimeout(() => {
      if (document.visibilityState !== 'visible') return
      viewSent = true
      sendView(postId, document.referrer)
    }, VIEW_DELAY_MS)

    const finish = () => {
      if (readingSent || !viewSent) return
      readingSent = true
      measureDepth()
      const seconds = (visibleMs + (visibleSince ? Date.now() - visibleSince : 0)) / 1000
      sendReading(postId, Math.min(MAX_SECONDS, Math.round(seconds)), Math.round(deepest))
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (visibleSince) visibleMs += Date.now() - visibleSince
        visibleSince = null
        finish()
      } else {
        visibleSince = Date.now()
      }
    }

    measureDepth()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', finish)

    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', finish)
      // leaving the page inside the app (to another story) counts as leaving
      finish()
    }
  }, [postId, enabled, articleRef])
}
