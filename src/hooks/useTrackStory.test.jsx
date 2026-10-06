import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTrackStory } from './useTrackStory.js'

const setVisibility = (state) => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
  document.dispatchEvent(new Event('visibilitychange'))
}

// an article as tall as the window, so how far it has scrolled into view is easy to know
const article = (top = 0, height = window.innerHeight) => ({ current: { getBoundingClientRect: () => ({ top, height }) } })

const sent = (fetchMock) =>
  fetchMock.mock.calls.map(([url, init]) => ({ path: new URL(url, 'http://x').pathname, body: JSON.parse(init.body), init }))

let fetchMock

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
  fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(new Response(null, { status: 204 })))
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('telling the server a story was read', () => {
  it('sends the view once the story has been on screen a moment, and not before', () => {
    renderHook(() => useTrackStory({ postId: 7, enabled: true, articleRef: article() }))
    vi.advanceTimersByTime(1000)
    expect(sent(fetchMock)).toHaveLength(0)

    vi.advanceTimersByTime(600)
    const [view, ...rest] = sent(fetchMock)
    expect(view.path).toBe('/api/analytics/view')
    expect(view.body.postId).toBe(7)
    expect(rest).toHaveLength(0)
    vi.advanceTimersByTime(60_000)
    expect(sent(fetchMock)).toHaveLength(1)
  })

  it('sends how long and how far once, when the page is hidden, and not again when it comes back and goes', () => {
    renderHook(() => useTrackStory({ postId: 7, enabled: true, articleRef: article() }))
    vi.advanceTimersByTime(20_000)
    setVisibility('hidden')

    const reading = sent(fetchMock).find((call) => call.path === '/api/analytics/reading')
    expect(reading.body).toEqual({ postId: 7, seconds: 20, depth: 100 })

    setVisibility('visible')
    vi.advanceTimersByTime(5000)
    setVisibility('hidden')
    expect(sent(fetchMock).filter((call) => call.path === '/api/analytics/reading')).toHaveLength(1)
  })

  it('only counts the time the tab was visible', () => {
    renderHook(() => useTrackStory({ postId: 7, enabled: true, articleRef: article() }))
    vi.advanceTimersByTime(2000)
    setVisibility('hidden')
    vi.advanceTimersByTime(600_000)

    const reading = sent(fetchMock).find((call) => call.path === '/api/analytics/reading')
    expect(reading.body.seconds).toBe(2)
  })

  it('reports how far down the reader got, not how tall the story is', () => {
    // the story is 4 windows tall and only the first one has scrolled into view
    renderHook(() => useTrackStory({ postId: 7, enabled: true, articleRef: article(0, window.innerHeight * 4) }))
    vi.advanceTimersByTime(2000)
    setVisibility('hidden')

    expect(sent(fetchMock).find((call) => call.path === '/api/analytics/reading').body.depth).toBe(25)
  })

  it('sends the reading when the reader moves on inside the app', () => {
    const { unmount } = renderHook(() => useTrackStory({ postId: 7, enabled: true, articleRef: article() }))
    vi.advanceTimersByTime(3000)
    unmount()
    expect(sent(fetchMock).map((call) => call.path)).toEqual(['/api/analytics/view', '/api/analytics/reading'])
  })

  it('sends no reading for a story whose view was never sent', () => {
    const { unmount } = renderHook(() => useTrackStory({ postId: 7, enabled: true, articleRef: article() }))
    vi.advanceTimersByTime(500)
    unmount()
    expect(sent(fetchMock)).toHaveLength(0)
  })

  it('sends nothing while the tab is in the background when the delay ends', () => {
    setVisibility('hidden')
    renderHook(() => useTrackStory({ postId: 7, enabled: true, articleRef: article() }))
    vi.advanceTimersByTime(5000)
    expect(sent(fetchMock)).toHaveLength(0)
  })

  it.each([
    ['the author, an unpublished story, the preview or an unknown viewer', { postId: 7, enabled: false }],
    ['no story yet', { postId: undefined, enabled: true }],
  ])('sends nothing for %s', (_name, props) => {
    const { unmount } = renderHook(() => useTrackStory({ ...props, articleRef: article() }))
    vi.advanceTimersByTime(60_000)
    unmount()
    expect(sent(fetchMock)).toHaveLength(0)
  })

  it('starts when the viewer becomes known, and not before', () => {
    const { rerender } = renderHook(({ enabled }) => useTrackStory({ postId: 7, enabled, articleRef: article() }), { initialProps: { enabled: false } })
    vi.advanceTimersByTime(5000)
    expect(sent(fetchMock)).toHaveLength(0)

    rerender({ enabled: true })
    vi.advanceTimersByTime(2000)
    expect(sent(fetchMock)).toHaveLength(1)
  })

  it('sends the referrer when there is one and no token or cookie value of its own', () => {
    renderHook(() => useTrackStory({ postId: 7, enabled: true, articleRef: article() }))
    vi.advanceTimersByTime(2000)
    const view = sent(fetchMock)[0]
    expect(view.init.keepalive).toBe(true)
    expect(Object.keys(view.body).sort()).toEqual(['postId'])
  })

  it('carries on when the request fails, and never throws', async () => {
    fetchMock.mockImplementation(() => Promise.reject(new TypeError('offline')))
    const { unmount } = renderHook(() => useTrackStory({ postId: 7, enabled: true, articleRef: article() }))
    vi.advanceTimersByTime(2000)
    expect(() => unmount()).not.toThrow()
    await Promise.resolve()
    expect(sent(fetchMock)).toHaveLength(2)
  })
})
