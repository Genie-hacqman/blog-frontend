import { Navigate, useNavigate, useParams } from 'react-router'
import { usePost, useUpdatePost } from '../hooks/usePosts.js'
import { useAuth } from '../auth/useAuth.js'
import PostForm from '../components/PostForm.jsx'
import { ArticleSkeleton } from '../components/Skeletons.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import NotFoundPage from './NotFoundPage.jsx'

export default function EditPostPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: post, isPending, error } = usePost(id)
  const updatePost = useUpdatePost()

  if (isPending) return <ArticleSkeleton />
  if (error?.status === 404) return <NotFoundPage />
  if (error)
    return (
      <div className="mx-auto max-w-[68ch] px-4 py-12 sm:px-6">
        <ErrorMessage error={error} />
      </div>
    )
  if (post.author?.id !== user?.id) return <Navigate to={`/posts/${id}`} replace />

  const handleSubmit = (values) => {
    updatePost.mutate({ id: post.id, ...values }, { onSuccess: () => navigate(`/posts/${post.id}`) })
  }

  const mutationError =
    updatePost.error?.status === 403 ? 'You can only edit your own posts.' : updatePost.error

  return (
    <section className="mx-auto max-w-[68ch] px-4 pt-10 sm:px-6 sm:pt-14">
      <div className="mb-8 flex items-center gap-3">
        <span className="kicker bg-accent px-2 py-1 text-paper">Editing</span>
        <h1 className="kicker text-ink-soft">Revise and republish</h1>
      </div>
      <PostForm
        defaultValues={{ title: post.title, content: post.content }}
        onSubmit={handleSubmit}
        submitLabel="Save changes"
        error={mutationError}
        isPending={updatePost.isPending}
      />
    </section>
  )
}
