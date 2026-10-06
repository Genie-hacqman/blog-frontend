import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { useDeletePost, useViewedPost } from '../hooks/usePosts.js'
import { useAuth } from '../auth/useAuth.js'
import { useTrackStory } from '../hooks/useTrackStory.js'
import Avatar from '../components/Avatar.jsx'
import AuthorName from '../components/AuthorName.jsx'
import Button from '../components/Button.jsx'
import { buttonClass } from '../components/buttonClass.js'
import ContentView from '../components/ContentView.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import CommentSection from '../components/CommentSection.jsx'
import PostActions from '../components/PostActions.jsx'
import ReactionBar from '../components/ReactionBar.jsx'
import ReportButton from '../components/ReportButton.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import TagChips from '../components/TagChips.jsx'
import { ArticleSkeleton } from '../components/Skeletons.jsx'
import { formatDateLong } from '../components/formatDate.js'
import { useSeo } from '../seo/useSeo.js'
import { describe, storyJsonLd } from '../seo/site.js'
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

const REVIEWER_ROLES = new Set(['editor', 'admin'])

// Shown above a post that is not public: where it stands, and why if it was sent back.
function StatusBanner({ post }) {
  if (post.status === 'published') return null
  return (
    <div role="status" className="mt-8 space-y-2 border-l-2 border-accent bg-paper-2 px-4 py-3">
      <p className="flex flex-wrap items-center gap-3">
        <StatusBadge status={post.status} />
        <span className="font-serif text-ink-soft">
          {post.status === 'scheduled' && post.scheduledAt
            ? `Goes live ${new Date(post.scheduledAt).toLocaleString()}. Only you and editors can see it until then.`
            : post.status === 'pending_review'
              ? 'Waiting for an editor. Only you and editors can see it.'
              : 'Not public. Only you and editors can see it.'}
        </span>
      </p>
      {post.status === 'rejected' && post.rejectionReason && (
        <p className="font-serif text-ink">
          <span className="kicker text-danger">Editor’s note · </span>
          {post.rejectionReason}
        </p>
      )}
    </div>
  )
}

// by="slug" is the public article at /blog/:slug; by="id" is the private preview at /posts/:id,
// which sends a published post on to its public address
export default function PostPage({ by = 'slug' }) {
  const params = useParams()
  const navigate = useNavigate()
  const { user, isLoading: authLoading } = useAuth()
  const { data: post, isPending, error } = useViewedPost(by, by === 'slug' ? params.slug : params.id)
  const deletePost = useDeletePost()
  const [confirming, setConfirming] = useState(false)
  const articleRef = useRef(null)

  // Reading statistics (private: see HowWeCount). Only the public page of a published story, and only once it is
  // known who is looking, so the author's own visits are never counted by mistake.
  useTrackStory({
    postId: post?.id,
    enabled: by === 'slug' && post?.status === 'published' && !authLoading && !(user && post.author && user.id === post.author.id),
    articleRef,
  })

  // Search engines and link previews: only the public page of a published story is indexed; the private preview is not.
  const indexable = by === 'slug' && post?.status === 'published'
  useSeo(
    post
      ? {
          title: post.title,
          description: describe(post.excerpt),
          path: `/blog/${encodeURIComponent(post.slug)}`,
          robots: indexable ? 'index,follow' : 'noindex,nofollow',
          type: 'article',
          image: post.cover?.url,
          imageAlt: post.cover?.alt,
          article: {
            published: post.publishedAt ?? undefined,
            modified: post.updatedAt,
            author: post.author && !post.author.deleted ? `/u/${encodeURIComponent(post.author.username)}` : undefined,
            tags: post.tags?.map((tag) => tag.name),
          },
          jsonLd: indexable ? storyJsonLd(post) : undefined,
        }
      : null,
  )

  if (isPending) return <ArticleSkeleton />
  if (error?.status === 404) return <NotFoundPage />
  if (error)
    return (
      <div className="mx-auto max-w-[68ch] px-4 py-12 sm:px-6">
        <ErrorMessage error={error} />
      </div>
    )
  if (by === 'id' && post.status === 'published') return <Navigate to={`/blog/${post.slug}`} replace />

  const isAuthor = user && post.author && user.id === post.author.id
  const canSeeHistory = isAuthor || REVIEWER_ROLES.has(user?.role)

  const handleDelete = () => {
    deletePost.mutate(post.id, { onSuccess: () => navigate('/me/posts') })
  }

  const when = post.publishedAt ?? post.createdAt
  const edited = post.updatedAt !== post.createdAt && post.status === 'published'

  return (
    <>
      <ReadingProgress target={articleRef} />
      <article ref={articleRef} className="mx-auto max-w-[68ch] px-4 pt-12 sm:px-6 sm:pt-16">
        {post.cover && (
          <figure className="mb-10">
            <img src={post.cover.url} alt={post.cover.alt} width={post.cover.width} height={post.cover.height} className="h-auto w-full object-cover" />
          </figure>
        )}
        <header>
          <p className="kicker text-accent">
            {post.category ? (
              <Link to={`/category/${encodeURIComponent(post.category.slug)}`} className="link-slide">
                {post.category.name}
              </Link>
            ) : (
              'Essay'
            )}{' '}
            <span className="text-ink-soft">· {post.readingTime} min read</span>
          </p>
          <h1 className="mt-4 text-[clamp(2.25rem,6vw,3.75rem)] leading-[1.02] font-semibold tracking-tight text-balance">
            {post.title}
          </h1>
          <StatusBanner post={post} />
          <div className="mt-8 flex items-center gap-3 border-y border-rule py-4">
            <Avatar user={post.author} />
            <div className="min-w-0">
              <p className="font-serif text-base">
                by <AuthorName author={post.author} className="font-semibold" />
              </p>
              <p className="kicker text-ink-soft">
                <time dateTime={when}>{formatDateLong(when)}</time>
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

        <ContentView content={post.content} dropcap className="mt-10" />

        <p aria-hidden="true" className="mt-10 text-center text-sm text-accent">
          ■
        </p>

        <TagChips tags={post.tags} className="mt-8" />

        {/* reactions and comments exist only on published stories (the API answers 404 for the rest) */}
        {post.status === 'published' && (
          <>
            <ReactionBar post={post} />
            {!isAuthor && (
              <div className="mt-3">
                <ReportButton targetType="post" targetId={post.id} noun="story" />
              </div>
            )}
            <CommentSection post={post} />
          </>
        )}

        {user && (
          <div className="mt-10 space-y-6">
            <PostActions post={post} />
            {(isAuthor || canSeeHistory) && (
              <div className="flex flex-wrap items-center gap-3 border-t border-ink pt-5">
                <span className="kicker mr-auto text-ink-soft">{isAuthor ? 'Your story' : 'Review tools'}</span>
                {post.canEdit && (
                  <Link to={`/posts/${post.id}/edit`} className={buttonClass('secondary')}>
                    Edit
                  </Link>
                )}
                {isAuthor && post.status === 'published' && (
                  <Link to={`/posts/${post.id}/stats`} className={buttonClass('secondary')}>
                    Statistics
                  </Link>
                )}
                {canSeeHistory && (
                  <Link to={`/posts/${post.id}/revisions`} className={buttonClass('secondary')}>
                    History
                  </Link>
                )}
                {isAuthor &&
                  (confirming ? (
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
                  ))}
              </div>
            )}
            {confirming && !deletePost.isPending && (
              <p role="status" className="text-right font-serif text-sm text-ink-soft italic">
                This can't be undone. Its history is deleted with it.
              </p>
            )}
            {deletePost.error && (
              <ErrorMessage error={deletePost.error.status === 403 ? 'You can only delete your own posts.' : deletePost.error} />
            )}
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
