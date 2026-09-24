import { useRef } from 'react'
import { useNavigate } from 'react-router'
import { useCreatePost } from '../hooks/usePosts.js'
import PostForm from '../components/PostForm.jsx'

export default function NewPostPage() {
  const navigate = useNavigate()
  const createPost = useCreatePost()
  // reuse the same Idempotency-Key when the same content is resubmitted (double-click, retry
  // after a network error) so the API replays the first result instead of creating a duplicate
  const lastSubmission = useRef(null)

  const handleSubmit = (values) => {
    const body = JSON.stringify(values)
    if (lastSubmission.current?.body !== body) {
      lastSubmission.current = { body, key: crypto.randomUUID() }
    }
    createPost.mutate(
      { ...values, idempotencyKey: lastSubmission.current.key },
      { onSuccess: (post) => navigate(`/posts/${post.id}`) },
    )
  }

  return (
    <section className="mx-auto max-w-[68ch] px-4 pt-10 sm:px-6 sm:pt-14">
      <div className="mb-8 flex items-center gap-3">
        <span className="kicker bg-accent px-2 py-1 text-paper">Draft</span>
        <h1 className="kicker text-ink-soft">New story</h1>
      </div>
      <PostForm
        onSubmit={handleSubmit}
        submitLabel="Publish"
        error={createPost.error}
        isPending={createPost.isPending}
      />
    </section>
  )
}
