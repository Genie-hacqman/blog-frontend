import { Link, useLocation } from 'react-router'
import { useAuth } from '../auth/useAuth.js'
import { useToggleBookmark, useToggleLike } from '../hooks/useEngagement.js'
import ErrorMessage from './ErrorMessage.jsx'

const reaction =
  'inline-flex min-h-10 items-center gap-2 border border-rule px-3 py-1.5 font-mono text-xs tracking-[0.1em] uppercase transition-colors hover:border-ink focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper'

// Like, save and "jump to the comments", under a story. The buttons change at once (see useEngagement);
// a signed-out reader gets links to log in instead of buttons that cannot work.
export default function ReactionBar({ post }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const like = useToggleLike()
  const bookmark = useToggleBookmark()
  const liked = Boolean(post.liked)
  const saved = Boolean(post.bookmarked)
  const count = post.likeCount ?? 0
  const login = { to: '/login', state: { from: location.pathname } }

  return (
    <div className="mt-10 border-y border-rule py-3">
      <div role="group" aria-label="Reactions" className="flex flex-wrap items-center gap-3">
        {isAuthenticated ? (
          <>
            <button type="button" className={reaction} aria-pressed={liked} disabled={like.isPending} onClick={() => like.mutate({ postId: post.id, like: !liked })}>
              <span aria-hidden="true">{liked ? '♥' : '♡'}</span>
              Like <span className="tabular-nums">{count}</span>
            </button>
            <button type="button" className={reaction} aria-pressed={saved} disabled={bookmark.isPending} onClick={() => bookmark.mutate({ postId: post.id, save: !saved })}>
              <span aria-hidden="true">{saved ? '★' : '☆'}</span>
              {saved ? 'Saved' : 'Save'}
            </button>
          </>
        ) : (
          <>
            <span className="kicker text-ink-soft">
              <span aria-hidden="true">♡ </span>
              {count} {count === 1 ? 'like' : 'likes'}
            </span>
            <Link {...login} className="link-slide kicker text-accent">
              Log in to like or save
            </Link>
          </>
        )}
        <a href="#comments" className="link-slide kicker ml-auto text-ink-soft hover:text-accent">
          {post.commentCount ?? 0} {post.commentCount === 1 ? 'comment' : 'comments'}
        </a>
      </div>
      <ErrorMessage error={like.error ?? bookmark.error} />
    </div>
  )
}
