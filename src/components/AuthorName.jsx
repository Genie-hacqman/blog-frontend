import { Link } from 'react-router'

// An author's name, linked to their public profile. Deleted accounts have no profile, so they are plain text.
export default function AuthorName({ author, className = '' }) {
  if (!author) return <span className={className}>unknown</span>
  if (author.deleted) return <span className={className}>{author.username}</span>
  return (
    // relative z-10 keeps it clickable above a card's stretched title link
    <Link to={`/u/${encodeURIComponent(author.username)}`} className={`link-slide relative z-10 ${className}`}>
      {author.username}
    </Link>
  )
}
