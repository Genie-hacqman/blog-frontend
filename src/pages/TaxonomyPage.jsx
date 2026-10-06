import { useState } from 'react'
import { useParams } from 'react-router'
import { usePostsBy } from '../hooks/usePosts.js'
import { useCategory, useTag } from '../hooks/useTaxonomy.js'
import ErrorMessage from '../components/ErrorMessage.jsx'
import Pager from '../components/Pager.jsx'
import PostCard from '../components/PostCard.jsx'
import { ArticleSkeleton } from '../components/Skeletons.jsx'
import { useSeo } from '../seo/useSeo.js'
import { collectionJsonLd, describe } from '../seo/site.js'
import { SITE_NAME } from '../components/site.js'
import NotFoundPage from './NotFoundPage.jsx'

const PAGE_SIZE = 10

// One page for both: the stories of a section (/category/:slug) or of a topic (/tag/:slug)
function Listing({ kind, slug }) {
  const [page, setPage] = useState(1)
  const isCategory = kind === 'category'
  const category = useCategory(isCategory ? slug : null)
  const tag = useTag(isCategory ? null : slug)
  const meta = isCategory ? category : tag
  const posts = usePostsBy({ [kind]: slug, page })

  const path = `/${kind}/${encodeURIComponent(slug)}`
  const heading = meta.data ? (isCategory ? meta.data.name : `#${meta.data.name}`) : null
  const summary = meta.data
    ? describe(isCategory ? meta.data.description || `Stories in ${meta.data.name} on ${SITE_NAME}.` : `Stories tagged ${meta.data.name} on ${SITE_NAME}.`)
    : null
  // a section or topic with nothing published is not worth indexing
  useSeo(
    meta.data
      ? {
          title: heading,
          description: summary,
          path,
          robots: meta.data.postCount > 0 ? 'index,follow' : 'noindex,follow',
          jsonLd: collectionJsonLd({ name: heading, description: summary, path, trail: [[SITE_NAME, '/'], [heading, path]] }),
        }
      : null,
  )

  if (meta.isPending) return <ArticleSkeleton />
  if (meta.error?.status === 404) return <NotFoundPage />
  if (meta.error)
    return (
      <div className="mx-auto max-w-[68ch] px-4 py-12 sm:px-6">
        <ErrorMessage error={meta.error} />
      </div>
    )

  const { name, description, postCount } = meta.data

  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16">
      <header className="border-b border-ink pb-6">
        <p className="kicker text-accent">{isCategory ? 'Section' : 'Topic'}</p>
        <h1 className="mt-1 text-4xl leading-none font-semibold tracking-[-0.02em] break-words sm:text-5xl">{name}</h1>
        {description && <p className="mt-4 font-serif text-xl text-ink-soft">{description}</p>}
        <p className="kicker mt-4 text-ink-soft">
          {postCount} {postCount === 1 ? 'story' : 'stories'}
        </p>
      </header>

      {posts.isPending ? (
        <p role="status" className="py-8 text-ink-soft">
          Loading stories…
        </p>
      ) : posts.error ? (
        <div className="py-6">
          <ErrorMessage error={posts.error} />
        </div>
      ) : posts.data.posts.length === 0 ? (
        <p className="py-10 font-serif text-xl text-ink-soft italic">No published stories here yet.</p>
      ) : (
        <div className="divide-y divide-rule">
          {posts.data.posts.map((post, i) => (
            <PostCard key={post.id} post={post} index={(page - 1) * PAGE_SIZE + i + 1} />
          ))}
        </div>
      )}
      <Pager pagination={posts.data?.pagination} onPage={setPage} label="Stories pages" />
    </div>
  )
}

// keyed by kind and slug so moving between pages starts on page 1
export default function TaxonomyPage({ kind }) {
  const { slug } = useParams()
  return <Listing key={`${kind}:${slug}`} kind={kind} slug={slug} />
}
