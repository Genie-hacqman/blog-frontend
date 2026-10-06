import { Link, useSearchParams } from 'react-router'
import { useMyPosts } from '../hooks/usePosts.js'
import ErrorMessage from '../components/ErrorMessage.jsx'
import Pager from '../components/Pager.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { STATUS_FILTERS } from '../components/postStatus.js'
import { buttonClass } from '../components/buttonClass.js'
import { formatDate } from '../components/formatDate.js'

export default function MyPostsPage() {
  const [params, setParams] = useSearchParams()
  const status = STATUS_FILTERS.some((f) => f.value === params.get('status')) ? (params.get('status') ?? undefined) : undefined
  const page = Math.max(1, Number(params.get('page')) || 1)
  const { data, isPending, error } = useMyPosts({ status, page })

  const go = (next) => {
    const query = {}
    if (next.status) query.status = next.status
    if (next.page > 1) query.page = String(next.page)
    setParams(query)
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pt-10 pb-16 sm:px-6 sm:pt-14">
      <header className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-4xl leading-none font-semibold tracking-[-0.02em]">My stories</h1>
        <Link to="/posts/new" className={buttonClass('primary')}>
          ✎ New story
        </Link>
      </header>

      <nav aria-label="Filter by status" className="mb-6 flex flex-wrap gap-x-5 gap-y-2 border-b border-rule pb-3">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.label}
            type="button"
            onClick={() => go({ status: filter.value, page: 1 })}
            aria-current={filter.value === status ? 'true' : undefined}
            className={`kicker ${filter.value === status ? 'border-b-2 border-accent text-ink' : 'text-ink-soft hover:text-accent'}`}
          >
            {filter.label}
          </button>
        ))}
      </nav>

      <ErrorMessage error={error} />
      {isPending ? (
        <p role="status" className="py-8 text-ink-soft">
          Loading your stories…
        </p>
      ) : data.posts.length === 0 ? (
        <p className="py-10 font-serif text-xl text-ink-soft italic">{status ? 'Nothing here.' : 'You have not written anything yet.'}</p>
      ) : (
        <ul className="divide-y divide-rule">
          {data.posts.map((post) => (
            <li key={post.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-4">
              <StatusBadge status={post.status} />
              <Link to={`/posts/${post.id}`} className="link-slide min-w-0 flex-1 text-xl font-semibold">
                {post.title}
              </Link>
              <span className="kicker text-ink-soft">
                {post.status === 'scheduled' && post.scheduledAt
                  ? `Goes live ${new Date(post.scheduledAt).toLocaleString()}`
                  : `Updated ${formatDate(post.updatedAt)}`}
              </span>
              {post.status === 'published' && (
                <Link to={`/posts/${post.id}/stats`} className="link-slide kicker text-accent">
                  Stats
                </Link>
              )}
              <Link to={`/posts/${post.id}/edit`} className="link-slide kicker text-accent">
                Edit
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pager pagination={data?.pagination} onPage={(next) => go({ status, page: next })} label="Your stories pages" />
    </div>
  )
}
