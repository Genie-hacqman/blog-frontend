import { Link } from 'react-router'
import { SITE_NAME, SITE_TAGLINE } from './site.js'

export default function Footer() {
  return (
    <footer className="mx-auto mt-24 w-full max-w-6xl px-4 pb-10 sm:px-6">
      <div className="h-1.25 border-y border-ink" />
      <div className="flex flex-col gap-6 pt-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link to="/" className="font-display text-3xl font-black tracking-[-0.02em]">
            {SITE_NAME}
            <span className="text-accent">.</span>
          </Link>
          <p className="mt-1 font-serif text-ink-soft italic">{SITE_TAGLINE}</p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <a href="#top" className="link-slide kicker self-start text-ink hover:text-accent sm:self-end">
            Back to top ↑
          </a>
          <p className="kicker text-ink-soft">
            Set in Fraunces &amp; Newsreader · © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </footer>
  )
}
