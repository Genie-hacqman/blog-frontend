import { Link } from 'react-router'
import { formatDate } from './formatDate.js'
import { readingTime } from './readingTime.js'

const excerptOf = (text, length) => (text.length > length ? `${text.slice(0, length).trimEnd()}…` : text)

export function Byline({ post }) {
  return (
    <p className="kicker text-ink-soft">
      By <span className="text-ink">{post.author?.username ?? 'unknown'}</span>
      <span aria-hidden="true"> · </span>
      <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
      <span aria-hidden="true"> · </span>
      <span className="whitespace-nowrap">{readingTime(post.content)} min read</span>
    </p>
  )
}

// the title is the only link; its ::after stretches over the entry so the whole block is clickable
const stretchedLink = 'after:absolute after:inset-0 after:content-[""]'

export function LeadStory({ post }) {
  return (
    <article className="group rise relative grid gap-6 py-10 sm:py-14 lg:grid-cols-12 lg:gap-10">
      <div className="lg:col-span-8">
        <p className="kicker text-accent">
          <span className="mr-2 inline-block h-2 w-2 -translate-y-px bg-accent align-middle" aria-hidden="true" />
          Latest
        </p>
        <h2 className="mt-4 text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.98] font-semibold tracking-[-0.03em] text-balance">
          <Link to={`/posts/${post.id}`} className={`link-slide ${stretchedLink} group-hover:text-accent`}>
            {post.title}
          </Link>
        </h2>
      </div>
      <div className="flex flex-col justify-end gap-5 lg:col-span-4 lg:border-l lg:border-rule lg:pl-10">
        <p className="line-clamp-6 text-lg leading-relaxed whitespace-pre-line text-ink/85">
          {excerptOf(post.content, 320)}
        </p>
        <Byline post={post} />
        <span className="kicker text-ink transition-colors group-hover:text-accent" aria-hidden="true">
          Read the story →
        </span>
      </div>
    </article>
  )
}

export default function PostCard({ post, index }) {
  return (
    <article className="group rise relative flex gap-5 py-7" style={{ '--i': index }}>
      {index != null && (
        <span
          aria-hidden="true"
          className="w-10 shrink-0 pt-1 font-display text-3xl leading-none font-light text-accent tabular-nums"
        >
          {String(index).padStart(2, '0')}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="text-2xl leading-tight font-semibold tracking-[-0.015em] text-balance">
          <Link to={`/posts/${post.id}`} className={`link-slide ${stretchedLink} group-hover:text-accent`}>
            {post.title}
          </Link>
        </h3>
        <div className="mt-2">
          <Byline post={post} />
        </div>
        <p className="mt-3 line-clamp-3 leading-relaxed whitespace-pre-line text-ink/80">{excerptOf(post.content, 200)}</p>
        <span
          aria-hidden="true"
          className="kicker mt-3 inline-block text-accent opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        >
          → Read
        </span>
      </div>
    </article>
  )
}
