import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth.js'
import { buttonClass } from './buttonClass.js'
import { SITE_NAME, SITE_TAGLINE } from './site.js'
import NotificationBell from './NotificationBell.jsx'
import SectionNav from './SectionNav.jsx'
import ThemeToggle from './ThemeToggle.jsx'

const today = new Date().toLocaleDateString(undefined, {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

const stripLink = 'link-slide kicker text-ink hover:text-accent'

function AuthLinks({ onNavigate }) {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    onNavigate?.()
    await logout()
    navigate('/')
  }

  // a remembered session is being restored: show neither set of links yet
  if (isLoading) return null

  return isAuthenticated ? (
    <>
      <Link to={`/u/${encodeURIComponent(user?.userName ?? '')}`} onClick={onNavigate} className={`${stripLink} md:inline`}>
        {user?.userName}
      </Link>
      <NotificationBell onNavigate={onNavigate} />
      <Link to="/posts/new" onClick={onNavigate} className={`${stripLink} text-accent!`}>
        ✎ Write
      </Link>
      <Link to="/me/posts" onClick={onNavigate} className={stripLink}>
        My stories
      </Link>
      {user?.role !== 'user' && (
        <Link to="/me/stats" onClick={onNavigate} className={stripLink}>
          Stats
        </Link>
      )}
      <Link to="/feed" onClick={onNavigate} className={stripLink}>
        Following
      </Link>
      <Link to="/me/bookmarks" onClick={onNavigate} className={stripLink}>
        Saved
      </Link>
      {(user?.role === 'editor' || user?.role === 'admin') && (
        <>
          <Link to="/review" onClick={onNavigate} className={stripLink}>
            Review
          </Link>
          <Link to="/moderation" onClick={onNavigate} className={stripLink}>
            Moderation
          </Link>
          {user?.role === 'admin' && (
            <Link to="/admin" onClick={onNavigate} className={stripLink}>
              Admin
            </Link>
          )}
          <Link to="/manage/categories" onClick={onNavigate} className={stripLink}>
            Sections
          </Link>
        </>
      )}
      <Link to="/settings" onClick={onNavigate} className={stripLink}>
        Settings
      </Link>
      <button type="button" onClick={handleLogout} className={stripLink}>
        Log out
      </button>
    </>
  ) : (
    <>
      <Link to="/login" onClick={onNavigate} className={stripLink}>
        Log in
      </Link>
      <Link to="/register" onClick={onNavigate} className={`${stripLink} text-accent!`}>
        Sign up
      </Link>
    </>
  )
}

export default function Navbar() {
  const mastheadRef = useRef(null)
  const [compact, setCompact] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { isAuthenticated } = useAuth()

  // show the slim sticky bar once the full masthead has scrolled out of view
  useEffect(() => {
    const el = mastheadRef.current
    if (!el || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(([entry]) => setCompact(!entry.isIntersecting))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <header>
      <a
        href="#main"
        className="kicker sr-only z-70 bg-ink px-4 py-3 text-paper focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      {/* top strip */}
      <div className="border-b border-rule">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2 sm:px-6">
          <p className="kicker truncate text-ink-soft">{today}</p>
          <div className="flex items-center gap-5">
            <nav aria-label="Account" className="hidden items-center gap-5 sm:flex">
              <AuthLinks />
            </nav>
            <ThemeToggle />
            <button
              type="button"
              className="kicker min-h-8 text-ink sm:hidden"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? 'Close' : 'Menu'}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav
            id="mobile-menu"
            aria-label="Account"
            className="flex flex-col items-start gap-4 border-t border-rule px-4 py-4 sm:hidden"
          >
            <AuthLinks onNavigate={() => setMenuOpen(false)} />
          </nav>
        )}
      </div>

      {/* masthead */}
      <div ref={mastheadRef} className="mx-auto max-w-6xl px-4 pt-8 pb-6 text-center sm:px-6 sm:pt-12 sm:pb-8">
        <Link to="/" className="inline-block">
          <span className="block font-display text-5xl leading-none font-black tracking-[-0.03em] sm:text-7xl [font-variation-settings:'SOFT'_100,'WONK'_1]">
            {SITE_NAME}
            <span className="text-accent">.</span>
          </span>
        </Link>
        <p className="mt-3 font-serif text-lg text-ink-soft italic">{SITE_TAGLINE}</p>
      </div>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="h-1.25 border-y border-ink" />
      </div>
      <SectionNav />

      {/* compact sticky bar */}
      <div
        aria-hidden={!compact}
        inert={!compact}
        className={`fixed inset-x-0 top-0 z-40 border-b border-ink bg-paper/95 backdrop-blur transition-transform duration-200 ease-out ${
          compact ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5 sm:px-6">
          <Link to="/" className="font-display text-2xl leading-none font-black tracking-[-0.02em]">
            {SITE_NAME}
            <span className="text-accent">.</span>
          </Link>
          <Link
            to={isAuthenticated ? '/posts/new' : '/register'}
            className={`${buttonClass('primary')} min-h-8! px-3! py-1!`}
          >
            {isAuthenticated ? 'Write' : 'Sign up'}
          </Link>
        </div>
      </div>
    </header>
  )
}
