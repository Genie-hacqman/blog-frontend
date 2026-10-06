import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { useCategories, useSearch } from '../hooks/useTaxonomy.js'
import Button from '../components/Button.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import Pager from '../components/Pager.jsx'
import PostCard from '../components/PostCard.jsx'
import { useSeo } from '../seo/useSeo.js'

const SORTS = [
  { value: '', label: 'Most relevant' },
  { value: 'newest', label: 'Newest first' },
]

// Search results. Everything the reader chose lives in the address (?q=&category=&sort=&page=), so a
// search can be bookmarked, shared and reached with the back button.
export default function SearchPage() {
  const [params, setParams] = useSearchParams()
  const q = (params.get('q') ?? '').trim()
  const category = params.get('category') ?? ''
  const sort = params.get('sort') ?? ''
  const page = Math.max(1, Number(params.get('page')) || 1)
  const [text, setText] = useState(q)
  const [seenQuery, setSeenQuery] = useState(q)
  const { data: categories = [] } = useCategories()
  const results = useSearch({ q, category: category || undefined, sort: sort || undefined, page })

  // follow the address when it changes from outside (the header's search box, back and forward)
  if (seenQuery !== q) {
    setSeenQuery(q)
    setText(q)
  }

  // search results are not worth indexing, but the links on them are worth following
  useSeo({ title: q ? `Search: ${q}` : 'Search', robots: 'noindex,follow' })

  const update = (changes) => {
    const next = { q, category, sort, page: '1', ...changes }
    const query = {}
    for (const [key, value] of Object.entries(next)) if (value && !(key === 'page' && value === '1')) query[key] = String(value)
    setParams(query)
  }

  const submit = (event) => {
    event.preventDefault()
    update({ q: text.trim() })
  }

  const tooShort = q.length > 0 && q.length < 2
  const { data } = results

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 pb-16 sm:px-6 sm:pt-14">
      <h1 className="text-4xl leading-none font-semibold tracking-[-0.02em]">Search</h1>

      <form role="search" onSubmit={submit} className="mt-6 flex flex-wrap items-end gap-3">
        <label className="block min-w-48 flex-1">
          <span className="kicker mb-1 block text-ink-soft">Search stories</span>
          <input
            type="search"
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={100}
            autoComplete="off"
            className="w-full border-0 border-b border-ink bg-paper-2 px-3 py-2.5 font-serif text-lg text-ink focus:border-b-2 focus:border-accent focus:outline-none"
          />
        </label>
        <Button type="submit">Search</Button>
      </form>

      <div className="mt-4 flex flex-wrap gap-4">
        {categories.length > 0 && (
          <label className="block">
            <span className="kicker mb-1 block text-ink-soft">Section</span>
            <select
              value={category}
              onChange={(event) => update({ category: event.target.value })}
              className="border border-ink bg-paper px-2 py-1.5 font-mono text-sm"
            >
              <option value="">All sections</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block">
          <span className="kicker mb-1 block text-ink-soft">Order</span>
          <select
            value={sort}
            onChange={(event) => update({ sort: event.target.value })}
            className="border border-ink bg-paper px-2 py-1.5 font-mono text-sm"
          >
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section aria-label="Results" className="mt-8">
        {!q ? (
          <p className="font-serif text-xl text-ink-soft italic">Type a word or two to search every published story.</p>
        ) : tooShort ? (
          <p role="status" className="font-serif text-xl text-ink-soft italic">
            Search for at least two characters.
          </p>
        ) : results.error ? (
          <ErrorMessage error={results.error} />
        ) : results.isPending ? (
          <p role="status" className="text-ink-soft">
            Searching…
          </p>
        ) : (
          <>
            <p role="status" className="kicker mb-2 text-ink-soft">
              {data.pagination.total === 0
                ? `No stories found for “${data.query}”`
                : `${data.pagination.total} ${data.pagination.total === 1 ? 'story' : 'stories'} for “${data.query}”`}
            </p>
            {data.posts.length === 0 ? (
              <p className="py-6 font-serif text-xl text-ink-soft italic">
                Try different words, fewer words, or another section.
              </p>
            ) : (
              <div className="divide-y divide-rule">
                {data.posts.map((post, i) => (
                  <PostCard key={post.id} post={post} index={(page - 1) * 10 + i + 1} />
                ))}
              </div>
            )}
            <Pager pagination={data.pagination} onPage={(next) => update({ page: String(next) })} label="Search result pages" />
          </>
        )}
      </section>
    </div>
  )
}
