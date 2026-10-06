import { useRef } from 'react'
import { useNavigate } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { becomeAuthor } from '../api/auth.js'
import { useAuth } from '../auth/useAuth.js'
import { useCreatePost } from '../hooks/usePosts.js'
import Button from '../components/Button.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import PostForm from '../components/PostForm.jsx'

// only what was filled in is sent: an empty excerpt or URL means "generate it"
const toPayload = ({ title, content, excerpt, slug, categoryId, tags, coverMediaId, coverAlt }) => ({
  title,
  content,
  ...(excerpt.trim() && { excerpt: excerpt.trim() }),
  ...(slug.trim() && { slug: slug.trim() }),
  ...(categoryId && { categoryId: Number(categoryId) }),
  ...(tags.length > 0 && { tags }),
  ...(coverMediaId && { coverMediaId, ...(coverAlt.trim() && { coverAlt: coverAlt.trim() }) }),
})

export default function NewPostPage() {
  const navigate = useNavigate()
  const createPost = useCreatePost()
  const { user, updateUser } = useAuth()
  const upgrade = useMutation({ mutationFn: becomeAuthor, onSuccess: updateUser })
  // reuse the same Idempotency-Key when the same content is resubmitted (double-click, retry
  // after a network error) so the API replays the first result instead of creating a duplicate
  const lastSubmission = useRef(null)

  const handleSubmit = (values) => {
    const payload = toPayload(values)
    const body = JSON.stringify(payload)
    if (lastSubmission.current?.body !== body) {
      lastSubmission.current = { body, key: crypto.randomUUID() }
    }
    // a new story is always saved as a draft; submitting or publishing it is a separate, deliberate step
    createPost.mutate(
      { ...payload, idempotencyKey: lastSubmission.current.key },
      { onSuccess: (post) => navigate(`/posts/${post.id}/edit`, { state: { justCreated: true } }) },
    )
  }

  // new accounts are readers until they opt in to writing (the server enforces this; this is only the way in)
  if (user?.role === 'user') {
    return (
      <section className="mx-auto max-w-[68ch] px-4 pt-10 sm:px-6 sm:pt-14">
        <h1 className="mb-4 text-4xl leading-none font-semibold tracking-[-0.02em]">Start writing</h1>
        <p className="mb-6 font-serif text-lg text-ink-soft">
          Your account can read every story. Become an author to publish your own.
        </p>
        <ErrorMessage error={upgrade.error} />
        {!user.emailVerified && (
          <p className="mb-6 font-serif text-ink-soft">Confirm your email address first: use the link we sent you.</p>
        )}
        <Button type="button" disabled={!user.emailVerified || upgrade.isPending} onClick={() => upgrade.mutate()}>
          {upgrade.isPending ? 'Upgrading…' : 'Become an author'}
        </Button>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-[68ch] px-4 pt-10 sm:px-6 sm:pt-14">
      <div className="mb-8 flex items-center gap-3">
        <span className="kicker bg-accent px-2 py-1 text-paper">Draft</span>
        <h1 className="kicker text-ink-soft">New story</h1>
      </div>
      <PostForm onSubmit={handleSubmit} submitLabel="Save draft" error={createPost.error} isPending={createPost.isPending} />
    </section>
  )
}
