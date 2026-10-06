import { useLocation, Link } from 'react-router'
import { useAuth } from '../auth/useAuth.js'
import { useComments, useCreateComment } from '../hooks/useEngagement.js'
import Button from './Button.jsx'
import CommentForm from './CommentForm.jsx'
import CommentItem from './CommentItem.jsx'
import ErrorMessage from './ErrorMessage.jsx'
import Notice from './Notice.jsx'

// The discussion under a published story: a form (or the reason there is none), then the comments.
export default function CommentSection({ post }) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()
  const comments = useComments(post.id)
  const create = useCreateComment()
  const loaded = comments.data?.pages.flatMap((page) => page.comments) ?? []

  return (
    <section id="comments" aria-labelledby="comments-heading" className="mt-12">
      <div className="flex items-baseline gap-4 border-t-2 border-ink pt-3">
        <h2 id="comments-heading" className="kicker text-ink">
          Comments
        </h2>
        <span className="h-px flex-1 bg-rule" aria-hidden="true" />
        <span className="kicker text-ink-soft">{post.commentCount ?? 0}</span>
      </div>

      <div className="mt-6">
        {!isAuthenticated ? (
          <p className="font-serif text-lg text-ink-soft">
            <Link to="/login" state={{ from: location.pathname }} className="link-slide text-accent">
              Log in
            </Link>{' '}
            to join the conversation.
          </p>
        ) : !user?.emailVerified ? (
          <Notice label="Confirm your email">Confirm your email address, using the link we sent you, to comment.</Notice>
        ) : (
          <CommentForm
            label="Add a comment"
            onSubmit={(body, idempotencyKey) => create.mutateAsync({ postId: post.id, body, idempotencyKey })}
          />
        )}
      </div>

      <ErrorMessage error={comments.error} />
      {comments.isPending ? (
        <p role="status" className="py-8 text-ink-soft">
          Loading comments…
        </p>
      ) : loaded.length === 0 ? (
        <p className="py-8 font-serif text-xl text-ink-soft italic">No comments yet. Be the first.</p>
      ) : (
        <ol className="mt-4 divide-y divide-rule">
          {loaded.map((comment) => (
            <CommentItem key={comment.id} comment={comment} postId={post.id} />
          ))}
        </ol>
      )}
      {comments.hasNextPage && (
        <Button variant="secondary" className="mt-4" disabled={comments.isFetchingNextPage} onClick={() => comments.fetchNextPage()}>
          {comments.isFetchingNextPage ? 'Loading…' : 'Load more comments'}
        </Button>
      )}
    </section>
  )
}
