import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useDeletePost, usePost } from '../hooks/usePosts.js'
import { useAuth } from '../auth/useAuth.js'
import Button from '../components/Button.jsx'
import { buttonClass } from '../components/buttonClass.js'
import ErrorMessage from '../components/ErrorMessage.jsx'
import { ArticleSkeleton } from '../components/Skeletons.jsx'
import { formatDateLong } from '../components/formatDate.js'
import { readingTime } from '../components/readingTime.js'
import { SITE_NAME } from '../components/site.js'
import NotFoundPage from './NotFoundPage.jsx'

function ReadingProgress({ target }) {
  const barRef = useRef(null)

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const el = target.current
      if (!el || !barRef.current) return
      const { top, height } = el.getBoundingClientRect()
      const progress = Math.min(1, Math.max(0, -top / Math.max(1, height - window.innerHeight)))
      barRef.current.style.transform = `scaleX(${progress})`
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [target])

  return (
    <div aria-hidden="true" className="fixed inset-x-0 top-0 z-50 h-0.5">
      <div ref={barRef} className="h-full origin-left scale-x-0 bg-accent" />
    </div>
  )
}

export default function PostPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: post, isPending, error } = usePost(id)
  const deletePost = useDeletePost()
  const [confirming, setConfirming] = useState(false)
  const articleRef = useRef(null)

  useEffect(() => {
    if (!post) return
    document.title = `${post.title} — ${SITE_NAME}`
    return () => {
      document.title = SITE_NAME
    }
  }, [post])

  if (isPending) return <ArticleSkeleton />
  if (error?.status === 404) return <NotFoundPage />
  if (error)
    return (
      <div className="mx-auto max-w-[68ch] px-4 py-12 sm:px-6">
        <ErrorMessage error={error} />
      </div>
    )

  const isAuthor = user && post.author && user.id === post.author.id
  const authorName = post.author?.username ?? 'unknown'

  const handleDelete = () => {
    deletePost.mutate(post.id, { onSuccess: () => navigate('/') })
  }

  const edited = post.updatedAt !== post.createdAt

  return (
    <>
      <ReadingProgress target={articleRef} />
      <article ref={articleRef} className="mx-auto max-w-[68ch] px-4 pt-12 sm:px-6 sm:pt-16">
        <header>
          <p className="kicker text-accent">
            Essay <span className="text-ink-soft">· {readingTime(post.content)} min read</span>
          </p>
          <h1 className="mt-4 text-[clamp(2.25rem,6vw,3.75rem)] leading-[1.02] font-semibold tracking-tight text-balance">
            {post.title}
          </h1>
          <div className="mt-8 flex items-center gap-3 border-y border-rule py-4">
            <span
              aria-hidden="true"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink font-display text-lg font-semibold text-paper uppercase"
            >
              {authorName.charAt(0)}
            </span>
            <div className="min-w-0">
              <p className="font-serif text-base">
                by <span className="font-semibold">{authorName}</span>
              </p>
              <p className="kicker text-ink-soft">
                <time dateTime={post.createdAt}>{formatDateLong(post.createdAt)}</time>
                {edited && (
                  <>
                    {' · edited '}
                    <time dateTime={post.updatedAt}>{formatDateLong(post.updatedAt)}</time>
                  </>
                )}
              </p>
            </div>
          </div>
        </header>

        {/* rendered as plain text on purpose: never inject post content as HTML */}
        <div className="article-body dropcap mt-10">{post.content}</div>

        <p aria-hidden="true" className="mt-10 text-center text-sm text-accent">
          ■
        </p>

        {isAuthor && (
          <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-ink pt-5">
            <span className="kicker mr-auto text-ink-soft">Your story</span>
            <Link to={`/posts/${post.id}/edit`} className={buttonClass('secondary')}>
              Edit
            </Link>
            {confirming ? (
              <>
                <Button variant="ghost" onClick={() => setConfirming(false)} disabled={deletePost.isPending}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  className="bg-danger! text-paper!"
                  onClick={handleDelete}
                  disabled={deletePost.isPending}
                  autoFocus
                >
                  {deletePost.isPending ? 'Deleting…' : 'Confirm delete'}
                </Button>
              </>
            ) : (
              <Button variant="danger" onClick={() => setConfirming(true)}>
                Delete
              </Button>
            )}
          </div>
        )}
        {confirming && !deletePost.isPending && (
          <p role="status" className="mt-3 text-right font-serif text-sm text-ink-soft italic">
            This can't be undone.
          </p>
        )}
        {deletePost.error && (
          <div className="mt-4">
            <ErrorMessage
              error={deletePost.error.status === 403 ? 'You can only delete your own posts.' : deletePost.error}
            />
          </div>
        )}

        <div className="mt-14">
          <Link to="/" className={buttonClass('ghost')}>
            ← All posts
          </Link>
        </div>
      </article>
    </>
  )
}
