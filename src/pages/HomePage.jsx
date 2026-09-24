import { Link } from 'react-router'
import { usePosts } from '../hooks/usePosts.js'
import { useAuth } from '../auth/useAuth.js'
import PostCard, { LeadStory } from '../components/PostCard.jsx'
import { PostListSkeleton } from '../components/Skeletons.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import { buttonClass } from '../components/buttonClass.js'

export default function HomePage() {
  const { data: posts, isPending, error } = usePosts()
  const { isAuthenticated } = useAuth()

  if (isPending) return <PostListSkeleton />
  if (error)
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <ErrorMessage error={error} />
      </div>
    )

  if (posts.length === 0) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
        <p className="kicker text-accent">Front page</p>
        <h1 className="mt-4 text-5xl leading-tight font-semibold tracking-[-0.02em] italic">The presses are quiet.</h1>
        <p className="mt-4 text-lg text-ink-soft">Nothing has been published yet. Every publication starts with one story.</p>
        <Link
          to={isAuthenticated ? '/posts/new' : '/login'}
          className={`${buttonClass('primary')} mt-8`}
        >
          {isAuthenticated ? 'Write the first one' : 'Log in to write one'}
        </Link>
      </section>
    )
  }

  const [lead, ...rest] = posts

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <h1 className="sr-only">Latest posts</h1>
      <LeadStory post={lead} />

      {rest.length > 0 && (
        <section aria-labelledby="index-heading">
          <div className="flex items-baseline gap-4 border-t-2 border-ink pt-3">
            <h2 id="index-heading" className="kicker text-ink">
              In this issue
            </h2>
            <span className="h-px flex-1 bg-rule" aria-hidden="true" />
            <span className="kicker text-ink-soft">
              {rest.length} more {rest.length === 1 ? 'story' : 'stories'}
            </span>
          </div>
          {/* two columns on wide screens, split by a vertical hairline */}
          <div className="grid lg:grid-cols-2">
            {rest.map((post, i) => (
              <div key={post.id} className={`border-b border-rule ${i % 2 === 0 ? 'lg:border-r lg:pr-10' : 'lg:pl-10'}`}>
                <PostCard post={post} index={i + 2} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
