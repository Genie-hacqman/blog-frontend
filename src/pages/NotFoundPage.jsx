import { Link } from 'react-router'
import { buttonClass } from '../components/buttonClass.js'
import { useSeo } from '../seo/useSeo.js'

export default function NotFoundPage() {
  // the app answers 200 for any address, so the page says itself that it is not a page
  useSeo({ title: 'Page not found', robots: 'noindex,nofollow' })
  return (
    <section className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
      <p className="kicker text-accent">Error · Page not found</p>
      <h1 className="text-outline mt-4 font-display text-[clamp(7rem,28vw,13rem)] leading-none font-black tracking-[-0.04em]">
        404
      </h1>
      <p className="mt-4 font-serif text-2xl italic">This page was never printed.</p>
      <p className="mt-2 text-ink-soft">It may have been moved, unpublished, or never existed at all.</p>
      <Link to="/" className={`${buttonClass('ghost')} mt-8`}>
        ← Back to the front page
      </Link>
    </section>
  )
}
