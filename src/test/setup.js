import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { setAccessToken } from '../api/client.js'

// The editor (ProseMirror) measures text with layout APIs that jsdom does not implement. There is no
// layout in tests, so zero-sized answers are right.
const emptyRect = { x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0, toJSON: () => ({}) }
const emptyRects = Object.assign([], { item: () => null })
Range.prototype.getBoundingClientRect ??= () => emptyRect
Range.prototype.getClientRects ??= () => emptyRects
Element.prototype.getClientRects ??= () => emptyRects
document.elementFromPoint ??= () => null

afterEach(() => {
  cleanup()
  localStorage.clear()
  // the access token lives in module memory, so it must not leak from one test into the next
  setAccessToken(null)
})
