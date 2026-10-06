import { Link } from 'react-router'
import ErrorMessage from './ErrorMessage.jsx'
import Pager from './Pager.jsx'
import PostCard from './PostCard.jsx'
import { buttonClass } from './buttonClass.js'

const PAGE_SIZE = 10

// A titled list of stories with paging, for the pages that show somebody's own selection (Saved, Following).
// `query` is the result of a useQuery whose data is { posts, pagination }.
export default function StoryCollection({ kicker, title, query, page, onPage, empty }) {
  const { data, isPending, error } = query
  return (
    <div className="mx-auto max-w-4xl px-4 pt-10 pb-16 sm:px-6 sm:pt-14">
      <header className="mb-8 border-b-2 border-ink pb-4">
        <p className="kicker text-accent">{kicker}</p>
        <h1 className="mt-1 text-4xl leading-none font-semibold tracking-[-0.02em]">{title}</h1>
      </header>

      <ErrorMessage error={error} />
      {isPending ? (
        <p role="status" className="py-8 text-ink-soft">
          Loading stories…
        </p>
      ) : data.posts.length === 0 ? (
        <div className="py-10">
          <p className="font-serif text-xl text-ink-soft italic">{empty}</p>
          <Link to="/" className={`${buttonClass('secondary')} mt-6`}>
            Browse the front page
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-rule">
          {data.posts.map((post, i) => (
            <PostCard key={post.id} post={post} index={(page - 1) * PAGE_SIZE + i + 1} />
          ))}
        </div>
      )}
      <Pager pagination={data?.pagination} onPage={onPage} label={`${title} pages`} />
    </div>
  )
}
