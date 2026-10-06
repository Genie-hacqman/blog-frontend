import { Link } from 'react-router'

// a post's topics, each a link to the page of posts with that tag
export default function TagChips({ tags, className = '' }) {
  if (!tags?.length) return null
  return (
    <ul aria-label="Tags" className={`flex flex-wrap gap-2 ${className}`}>
      {tags.map((tag) => (
        <li key={tag.slug}>
          <Link
            to={`/tag/${encodeURIComponent(tag.slug)}`}
            className="kicker relative z-10 inline-block border border-rule px-2 py-1 text-ink-soft hover:border-accent hover:text-accent"
          >
            {tag.name}
          </Link>
        </li>
      ))}
    </ul>
  )
}
