import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router'
import { updatePost as savePost } from '../api/posts.js'
import { usePost, useUpdatePost } from '../hooks/usePosts.js'
import { useAuth } from '../auth/useAuth.js'
import PostActions from '../components/PostActions.jsx'
import PostForm from '../components/PostForm.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { ArticleSkeleton } from '../components/Skeletons.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import Notice from '../components/Notice.jsx'
import { buttonClass } from '../components/buttonClass.js'
import NotFoundPage from './NotFoundPage.jsx'

const LOCKED_REASON = {
  pending_review: 'This story is waiting for an editor, so it cannot be changed. Withdraw it to keep editing.',
  scheduled: 'This story is scheduled, so it cannot be changed. Unschedule it to keep editing.',
  archived: 'This story is archived. Unarchive it to keep editing.',
}

const toValues = (post) => ({
  title: post.title,
  content: post.content,
  excerpt: post.excerpt ?? '',
  slug: post.slug ?? '',
  categoryId: post.category ? String(post.category.id) : '',
  tags: (post.tags ?? []).map((tag) => tag.name),
  coverMediaId: post.cover?.id ?? null,
  coverAlt: post.cover?.alt ?? '',
  cover: post.cover ? { id: post.cover.id, url: post.cover.url } : null,
})

// "React" and "react" are one tag, so compare without regard to case or order
const sameTags = (a, b) => a.length === b.length && [...a].map((t) => t.toLowerCase()).sort().join('|') === [...b].map((t) => t.toLowerCase()).sort().join('|')

// What differs from the saved story: only these fields are sent.
// The excerpt and URL are sent only when the author changed them. The form is pre-filled with the
// generated ones, and sending those back would turn them into "chosen" values that stop following the story.
// (An emptied excerpt goes back to automatic.)
const changesFrom = (post, { title, content, excerpt, slug, categoryId, tags, coverMediaId, coverAlt }) => {
  const changes = { title, content }
  if (excerpt.trim() !== (post.excerpt ?? '')) changes.excerpt = excerpt.trim()
  if (!post.publishedAt && slug.trim() && slug.trim().toLowerCase() !== post.slug) changes.slug = slug.trim()
  // the section, the tags and the cover are sent only when they changed
  if (categoryId !== (post.category ? String(post.category.id) : '')) changes.categoryId = categoryId ? Number(categoryId) : null
  if (!sameTags(tags, (post.tags ?? []).map((tag) => tag.name))) changes.tags = tags
  if (coverMediaId !== (post.cover?.id ?? null)) changes.coverMediaId = coverMediaId
  if (coverMediaId && coverAlt.trim() !== (post.cover?.alt ?? '')) changes.coverAlt = coverAlt.trim()
  return changes
}


export default function EditPostPage() {
  const { id } = useParams()
  const location = useLocation()
  const { user } = useAuth()
  const { data: post, isPending, error } = usePost(id)
  const [saved, setSaved] = useState(Boolean(location.state?.justCreated))

  // Every save (the button and the automatic one) goes through this queue, one at a time, each naming the
  // version it started from, so two saves can never overwrite each other and another tab's save is noticed.
  const latest = useRef(null) // the last version the server told us about
  const queue = useRef(Promise.resolve())
  const persist = ({ id: postId, ...changes }) => {
    const run = queue.current
      .catch(() => {})
      .then(async () => {
        const result = await savePost({ id: postId, ...changes, expectedUpdatedAt: latest.current?.updatedAt })
        latest.current = result
        return result
      })
    queue.current = run
    return run
  }
  const updatePost = useUpdatePost(persist)

  useEffect(() => {
    if (post) latest.current = post
  }, [post])

  // The form is given its starting values once, and again after a manual save. A refetch in the background
  // (the tab regained focus) must not replace what is being typed.
  const [formValues, setFormValues] = useState(null)
  if (post && formValues === null) setFormValues(toValues(post))

  if (isPending) return <ArticleSkeleton />
  if (error?.status === 404) return <NotFoundPage />
  if (error)
    return (
      <div className="mx-auto max-w-[68ch] px-4 py-12 sm:px-6">
        <ErrorMessage error={error} />
      </div>
    )
  if (post.author?.id !== user?.id) return <Navigate to={`/posts/${id}`} replace />

  const handleSubmit = (data) => {
    setSaved(false)
    updatePost.mutate(
      { id: post.id, ...changesFrom(latest.current ?? post, data) },
      {
        onSuccess: (savedPost) => {
          setSaved(true)
          setFormValues(toValues(savedPost))
        },
      },
    )
  }

  // a published story is live, so it is saved only when the writer says so; drafts save themselves
  const autosave = post.status === 'published' ? undefined : (data) => persist({ id: post.id, ...changesFrom(latest.current ?? post, data) })

  const mutationError =
    updatePost.error?.status === 403
      ? 'You can only edit your own posts.'
      : updatePost.error?.code === 'EDIT_CONFLICT'
        ? 'This story was changed somewhere else (another tab or device). Copy what you need, then reload the page.'
        : updatePost.error

  return (
    <section className="mx-auto max-w-[68ch] px-4 pt-10 pb-16 sm:px-6 sm:pt-14">
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <StatusBadge status={post.status} />
        <h1 className="kicker text-ink-soft">{post.canEdit ? 'Editing' : 'Read only'}</h1>
        <span className="ml-auto flex gap-4">
          <Link to={`/posts/${post.id}`} className="link-slide kicker text-accent">
            Preview
          </Link>
          <Link to={`/posts/${post.id}/revisions`} className="link-slide kicker text-accent">
            History
          </Link>
        </span>
      </div>

      {post.status === 'rejected' && post.rejectionReason && (
        <div className="mb-8">
          <Notice label="Editor’s note">{post.rejectionReason}</Notice>
        </div>
      )}
      {saved && post.canEdit && (
        <div className="mb-6">
          <Notice tone="ok" label="Saved">
            Your changes are saved.
          </Notice>
        </div>
      )}

      {post.canEdit && !formValues ? (
        <ArticleSkeleton />
      ) : post.canEdit ? (
        <PostForm
          values={formValues}
          onAutosave={autosave}
          onSubmit={handleSubmit}
          submitLabel={post.status === 'published' ? 'Save changes' : 'Save draft'}
          error={mutationError}
          isPending={updatePost.isPending}
          slugLocked={Boolean(post.publishedAt)}
        />
      ) : (
        <div className="space-y-6">
          <Notice label="Locked">{LOCKED_REASON[post.status] ?? 'This story cannot be edited right now.'}</Notice>
          <h2 className="text-3xl font-semibold tracking-[-0.02em]">{post.title}</h2>
          <Link to={`/posts/${post.id}`} className={buttonClass('secondary')}>
            Read it
          </Link>
        </div>
      )}

      <div className="mt-12">
        <PostActions post={post} />
      </div>
    </section>
  )
}
