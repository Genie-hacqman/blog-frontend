import { useState } from 'react'

const STORAGE_KEY = 'blog.theme'

const currentTheme = () => {
  const explicit = document.documentElement.dataset.theme
  if (explicit) return explicit
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState(currentTheme)
  const next = theme === 'dark' ? 'light' : 'dark'

  const toggle = () => {
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // storage unavailable (private mode); the choice just won't persist
    }
    setTheme(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${next === 'dark' ? 'night' : 'day'} edition`}
      title={`${next === 'dark' ? 'Night' : 'Day'} edition`}
      className={`kicker inline-flex min-h-8 items-center gap-1.5 text-ink-soft transition-colors hover:text-accent ${className}`}
    >
      <span aria-hidden="true" className="text-sm leading-none">
        {theme === 'dark' ? '☾' : '☼'}
      </span>
      <span className="hidden sm:inline">{theme === 'dark' ? 'Night' : 'Day'}</span>
    </button>
  )
}
