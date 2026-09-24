import { StrictMode } from 'react'
import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'
import { jsonResponse } from './test/utils.jsx'

describe('App', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => jsonResponse(200, { posts: [] }))
    // modern browsers return a Promise from scrollTo; jsdom returns undefined
    vi.spyOn(window, 'scrollTo').mockImplementation(() => Promise.resolve())
  })
  afterEach(() => vi.restoreAllMocks())

  it('renders under StrictMode when scrollTo returns a Promise', async () => {
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
    expect(await screen.findByText('The presses are quiet.')).toBeInTheDocument()
  })
})
