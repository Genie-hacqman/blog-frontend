import { Link, useSearchParams } from 'react-router'
import { useReviewQueue } from '../hooks/usePosts.js'
import AuthorName from '../components/AuthorName.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import Pager from '../components/Pager.jsx'
import { buttonClass } from '../components/buttonClass.js'
import { formatDate } from '../components/formatDate.js'

// stories waiting for an editor, longest-waiting first (the page is only for editors and admins; the API enforces that)
export default function ReviewQueuePage() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const { data, isPending, error } = useReviewQueue(page)

  return (
    <div className="mx-auto max-w-4xl px-4 pt-10 pb-16 sm:px-6 sm:pt-14">
      <header className="mb-8">
        <p className="kicker text-accent">Editors</p>
        <h1 className="mt-1 text-4xl leading-none font-semibold tracking-[-0.02em]">Review queue</h1>
        <p className="mt-3 font-serif text-lg text-ink-soft">Open a story to read it, then approve, schedule or send it back with a note.</p>
      </header>

      <ErrorMessage error={error} />
      {isPending ? (
        <p role="status" className="py-8 text-ink-soft">
          Loading the queue…
        </p>
      ) : data.posts.length === 0 ? (
        <p className="py-10 font-serif text-xl text-ink-soft italic">Nothing is waiting for review.</p>
      ) : (
        <ul className="divide-y divide-rule">
          {data.posts.map((post) => (
            <li key={post.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-4">
              <span className="min-w-0 flex-1">
                <span className="block text-xl font-semibold">{post.title}</span>
                <span className="kicker text-ink-soft">
                  by <AuthorName author={post.author} className="text-ink" /> · {post.readingTime} min read · submitted {formatDate(post.updatedAt)}
                </span>
              </span>
              <Link to={`/posts/${post.id}`} className={buttonClass('secondary')}>
                Review
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pager pagination={data?.pagination} onPage={(next) => setParams(next > 1 ? { page: String(next) } : {})} label="Review queue pages" />
    </div>
  )
}
