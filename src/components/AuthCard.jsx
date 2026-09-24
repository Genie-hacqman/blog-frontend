import { SITE_NAME } from './site.js'

export default function AuthCard({ title, kicker = 'Members', quote = 'Every essay begins with a blank page.', children, footer }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-16">
      <div className="grid border border-ink md:grid-cols-5">
        <aside className="flex flex-col justify-between gap-8 bg-ink p-8 text-paper md:col-span-2 md:p-10">
          <p className="kicker text-paper/70">
            {SITE_NAME}
            <span className="text-accent">.</span> {kicker}
          </p>
          <blockquote className="font-display text-3xl leading-tight font-medium tracking-[-0.02em] text-balance italic md:text-4xl">
            <span className="text-accent">“</span>
            {quote}
            <span className="text-accent">”</span>
          </blockquote>
          <p className="kicker hidden text-paper/50 md:block">Est. {new Date().getFullYear()}</p>
        </aside>
        <div className="p-6 sm:p-10 md:col-span-3">
          <h1 className="mb-8 text-4xl leading-none font-semibold tracking-[-0.02em]">{title}</h1>
          <div className="space-y-6">{children}</div>
          <p className="mt-8 border-t border-rule pt-5 font-serif text-ink-soft">{footer}</p>
        </div>
      </div>
    </div>
  )
}
