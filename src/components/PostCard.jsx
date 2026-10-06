import { Link } from 'react-router'
import { formatDate } from './formatDate.js'
import Avatar from './Avatar.jsx'
import AuthorName from './AuthorName.jsx'

// the post's section, as a link (above the card's stretched title link)
function CategoryKicker({ category, className = '' }) {
  if (!category) return null
  return (
    <p className={`kicker ${className}`}>
      <Link to={`/category/${encodeURIComponent(category.slug)}`} className="link-slide relative z-10 text-accent">
        {category.name}
      </Link>
    </p>
  )
}

const excerptOf = (text, length) => (text.length > length ? `${text.slice(0, length).trimEnd()}…` : text)

export function Byline({ post }) {
  return (
    <p className="kicker flex flex-wrap items-center gap-x-1.5 text-ink-soft">
      {post.author && <Avatar user={post.author} size="sm" />}
      <span>
        By <AuthorName author={post.author} className="text-ink" />
      </span>
      <span aria-hidden="true"> · </span>
      <time dateTime={post.publishedAt ?? post.createdAt}>{formatDate(post.publishedAt ?? post.createdAt)}</time>
      <span aria-hidden="true"> · </span>
      <span className="whitespace-nowrap">{post.readingTime ?? 1} min read</span>
      {(post.likeCount > 0 || post.commentCount > 0) && (
        <>
          <span aria-hidden="true"> · </span>
          <span className="whitespace-nowrap">
            {post.likeCount > 0 && <span>♥ {post.likeCount}</span>}
            {post.likeCount > 0 && post.commentCount > 0 && <span aria-hidden="true"> </span>}
            {post.commentCount > 0 && (
              <span>
                <span className="sr-only">{post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}</span>
                <span aria-hidden="true">💬 {post.commentCount}</span>
              </span>
            )}
          </span>
        </>
      )}
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
        <CategoryKicker category={post.category} className="mt-1" />
        <h2 className="mt-4 text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.98] font-semibold tracking-[-0.03em] text-balance">
          <Link to={`/blog/${post.slug}`} className={`link-slide ${stretchedLink} group-hover:text-accent`}>
            {post.title}
          </Link>
        </h2>
      </div>
      <div className="flex flex-col justify-end gap-5 lg:col-span-4 lg:border-l lg:border-rule lg:pl-10">
        {post.cover && <img src={post.cover.url} alt={post.cover.alt} loading="lazy" className="aspect-video w-full object-cover" />}
        <p className="line-clamp-6 text-lg leading-relaxed whitespace-pre-line text-ink/85">
          {excerptOf(post.excerpt ?? '', 320)}
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
        <CategoryKicker category={post.category} className="mb-1" />
        <h3 className="text-2xl leading-tight font-semibold tracking-[-0.015em] text-balance">
          <Link to={`/blog/${post.slug}`} className={`link-slide ${stretchedLink} group-hover:text-accent`}>
            {post.title}
          </Link>
        </h3>
        <div className="mt-2">
          <Byline post={post} />
        </div>
        <p className="mt-3 line-clamp-3 leading-relaxed whitespace-pre-line text-ink/80">{excerptOf(post.excerpt ?? '', 200)}</p>
        <span
          aria-hidden="true"
          className="kicker mt-3 inline-block text-accent opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        >
          → Read
        </span>
      </div>
      {post.cover && (
        <img src={post.cover.url} alt={post.cover.alt} loading="lazy" className="hidden aspect-[4/3] w-32 shrink-0 self-start object-cover sm:block" />
      )}
    </article>
  )
}
