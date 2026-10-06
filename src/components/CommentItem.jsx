import { useState } from 'react'
import { useAuth } from '../auth/useAuth.js'
import { useCreateComment, useDeleteComment, useEditComment, useReplies } from '../hooks/useEngagement.js'
import AuthorName from './AuthorName.jsx'
import Avatar from './Avatar.jsx'
import Button from './Button.jsx'
import CommentForm from './CommentForm.jsx'
import ErrorMessage from './ErrorMessage.jsx'
import ReportButton from './ReportButton.jsx'
import { formatDate } from './formatDate.js'

const action = 'kicker text-ink-soft hover:text-accent focus-visible:outline-2 focus-visible:outline-accent'

// One comment: its words (as plain text, never HTML), who wrote it, and what the signed-in reader may do with it
// (the server decides: comment.canEdit and comment.canDelete). A top-level comment also holds its replies.
export default function CommentItem({ comment, postId }) {
  const { isAuthenticated, user } = useAuth()
  const [editing, setEditing] = useState(false)
  const [replying, setReplying] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [showReplies, setShowReplies] = useState(false)
  const create = useCreateComment()
  const edit = useEditComment()
  const remove = useDeleteComment()
  const replies = useReplies(comment.id, showReplies)
  const topLevel = comment.parentId === null
  const canReply = isAuthenticated && user?.emailVerified && topLevel && !comment.deleted
  const loaded = replies.data?.pages.flatMap((page) => page.comments) ?? []

  return (
    <li id={`comment-${comment.id}`} className="py-5">
      {comment.deleted ? (
        <p className="font-serif text-ink-soft italic">This comment was deleted.</p>
      ) : (
        <>
          <p className="kicker flex flex-wrap items-center gap-x-2 text-ink-soft">
            <Avatar user={comment.author} size="sm" />
            <AuthorName author={comment.author} className="text-ink" />
            <span aria-hidden="true">·</span>
            <time dateTime={comment.createdAt}>{formatDate(comment.createdAt)}</time>
            {comment.editedAt && <span>(edited)</span>}
          </p>

          {editing ? (
            <div className="mt-3">
              <CommentForm
                label="Edit your comment"
                submitLabel="Save changes"
                initialBody={comment.body}
                autoFocus
                onCancel={() => setEditing(false)}
                onSubmit={async (body) => {
                  await edit.mutateAsync({ id: comment.id, body })
                  setEditing(false)
                }}
              />
            </div>
          ) : (
            // plain text on purpose: a comment is never rendered as HTML, and links in it are not made clickable
            <p className="mt-2 font-serif text-lg leading-relaxed break-words whitespace-pre-wrap">{comment.body}</p>
          )}

          {!editing && (
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1">
              {canReply && (
                <button type="button" className={action} aria-expanded={replying} onClick={() => setReplying((open) => !open)}>
                  Reply
                </button>
              )}
              {comment.canEdit && (
                <button type="button" className={action} onClick={() => setEditing(true)}>
                  Edit
                </button>
              )}
              {!comment.canEdit && comment.author?.username !== user?.userName && (
                <ReportButton targetType="comment" targetId={comment.id} noun="comment" />
              )}
              {comment.canDelete && !confirming && (
                <button type="button" className={action} onClick={() => setConfirming(true)}>
                  Delete
                </button>
              )}
              {confirming && (
                <span role="group" aria-label="Confirm deleting this comment" className="flex items-center gap-3">
                  <span className="kicker text-danger">Delete this comment?</span>
                  <Button variant="danger" disabled={remove.isPending} onClick={() => remove.mutate(comment.id, { onSettled: () => setConfirming(false) })}>
                    {remove.isPending ? 'Deleting…' : 'Delete'}
                  </Button>
                  <Button variant="secondary" disabled={remove.isPending} onClick={() => setConfirming(false)}>
                    Keep
                  </Button>
                </span>
              )}
            </div>
          )}
          <ErrorMessage error={remove.error} />
        </>
      )}

      {replying && (
        <div className="mt-4 border-l-2 border-rule pl-4">
          <CommentForm
            label={`Reply to ${comment.author?.username ?? 'this comment'}`}
            submitLabel="Post reply"
            autoFocus
            onCancel={() => setReplying(false)}
            onSubmit={async (body, idempotencyKey) => {
              await create.mutateAsync({ postId, parentId: comment.id, body, idempotencyKey })
              setReplying(false)
              setShowReplies(true)
            }}
          />
        </div>
      )}

      {topLevel && comment.replyCount > 0 && (
        <div className="mt-3">
          <button type="button" className={action} aria-expanded={showReplies} aria-controls={`replies-${comment.id}`} onClick={() => setShowReplies((open) => !open)}>
            {showReplies ? 'Hide replies' : `Show ${comment.replyCount} ${comment.replyCount === 1 ? 'reply' : 'replies'}`}
          </button>
        </div>
      )}
      {showReplies && (
        <div id={`replies-${comment.id}`} className="mt-2 border-l-2 border-rule pl-4">
          {replies.isPending && (
            <p role="status" className="py-3 text-ink-soft">
              Loading replies…
            </p>
          )}
          <ErrorMessage error={replies.error} />
          <ol className="divide-y divide-rule">
            {loaded.map((reply) => (
              <CommentItem key={reply.id} comment={reply} postId={postId} />
            ))}
          </ol>
          {replies.hasNextPage && (
            <Button variant="secondary" className="mt-3" disabled={replies.isFetchingNextPage} onClick={() => replies.fetchNextPage()}>
              {replies.isFetchingNextPage ? 'Loading…' : 'Load more replies'}
            </Button>
          )}
        </div>
      )}
    </li>
  )
}
