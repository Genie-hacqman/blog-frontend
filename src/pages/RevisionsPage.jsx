import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useComparison, usePost, useRestoreRevision, useRevisions } from '../hooks/usePosts.js'
import Button from '../components/Button.jsx'
import DiffView from '../components/DiffView.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import Notice from '../components/Notice.jsx'
import Pager from '../components/Pager.jsx'
import { ArticleSkeleton } from '../components/Skeletons.jsx'
import { buttonClass } from '../components/buttonClass.js'
import NotFoundPage from './NotFoundPage.jsx'

const REASONS = { created: 'Created', edited: 'Edited', restored: 'Restored' }
const when = (iso) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export default function RevisionsPage() {
  const { id } = useParams()
  const [page, setPage] = useState(1)
  const [picked, setPicked] = useState({}) // { from, to } chosen by the reader
  const [confirming, setConfirming] = useState(false)
  const post = usePost(id)
  const history = useRevisions(id, page)
  const restore = useRestoreRevision()

  const list = history.data?.revisions ?? []
  const newest = history.data?.pagination.page === 1 ? list[0]?.version : undefined
  // by default: the second-newest version against the newest, which shows the latest change
  const from = picked.from ?? (list.length > 1 && page === 1 ? list[1].version : newest)
  const to = picked.to ?? newest
  const comparison = useComparison({ id, from, to })

  if (post.isPending || history.isPending) return <ArticleSkeleton />
  if (post.error?.status === 404 || history.error?.status === 404) return <NotFoundPage />
  const failure = post.error ?? history.error
  if (failure)
    return (
      <div className="mx-auto max-w-[68ch] px-4 py-12 sm:px-6">
        <ErrorMessage error={failure} />
      </div>
    )

  const versions = list.map((r) => r.version)
  const canRestore = post.data.canEdit && from != null

  const handleRestore = () =>
    restore.mutate(
      { id, version: from },
      {
        onSuccess: () => {
          setConfirming(false)
          setPicked({})
          setPage(1)
        },
      },
    )

  return (
    <div className="mx-auto max-w-5xl px-4 pt-10 pb-16 sm:px-6 sm:pt-14">
      <header className="mb-8">
        <p className="kicker text-accent">History</p>
        <h1 className="mt-1 text-3xl leading-tight font-semibold tracking-[-0.02em]">{post.data.title}</h1>
        <Link to={`/posts/${id}`} className="link-slide kicker mt-2 inline-block text-accent">
          ← Back to the story
        </Link>
      </header>

      {restore.isSuccess && (
        <div className="mb-6">
          <Notice tone="ok" label="Restored">
            That version is the current text again. The history keeps everything.
          </Notice>
        </div>
      )}

      <div className="grid gap-10 md:grid-cols-3">
        <section aria-label="Versions" className="md:col-span-1">
          <ol className="divide-y divide-rule border-y border-rule">
            {list.map((revision) => (
              <li key={revision.version} className="py-3">
                <p className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold">Version {revision.version}</span>
                  <span className="kicker text-ink-soft">{REASONS[revision.reason] ?? revision.reason}</span>
                </p>
                <p className="kicker text-ink-soft">
                  {when(revision.createdAt)}
                  {revision.editor && ` · ${revision.editor.username}`}
                </p>
              </li>
            ))}
          </ol>
          <Pager pagination={history.data.pagination} onPage={setPage} label="History pages" />
        </section>

        <section aria-label="Comparison" className="space-y-6 md:col-span-2">
          <div className="flex flex-wrap items-end gap-4">
            <label className="block">
              <span className="kicker mb-1 block text-ink-soft">From</span>
              <select
                className="border border-ink bg-paper px-2 py-1.5 font-mono text-sm"
                value={from ?? ''}
                onChange={(e) => setPicked({ ...picked, from: Number(e.target.value) })}
              >
                {versions.map((v) => (
                  <option key={v} value={v}>
                    Version {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="kicker mb-1 block text-ink-soft">To</span>
              <select
                className="border border-ink bg-paper px-2 py-1.5 font-mono text-sm"
                value={to ?? ''}
                onChange={(e) => setPicked({ ...picked, to: e.target.value === 'current' ? 'current' : Number(e.target.value) })}
              >
                {versions.map((v) => (
                  <option key={v} value={v}>
                    Version {v}
                  </option>
                ))}
                <option value="current">Current text</option>
              </select>
            </label>
          </div>

          {comparison.isPending && comparison.fetchStatus !== 'idle' ? (
            <p role="status" className="text-ink-soft">
              Comparing…
            </p>
          ) : comparison.error ? (
            <ErrorMessage error={comparison.error} />
          ) : comparison.data ? (
            <DiffView comparison={comparison.data} />
          ) : null}

          {canRestore && (
            <div className="space-y-3 border-t border-ink pt-5">
              <ErrorMessage error={restore.error} />
              {confirming ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-serif">Replace the current text with version {from}?</span>
                  <Button variant="ghost" onClick={() => setConfirming(false)} disabled={restore.isPending}>
                    Cancel
                  </Button>
                  <Button variant="danger" onClick={handleRestore} disabled={restore.isPending} autoFocus>
                    {restore.isPending ? 'Restoring…' : `Restore version ${from}`}
                  </Button>
                </div>
              ) : (
                <Button variant="secondary" onClick={() => setConfirming(true)}>
                  Restore version {from}…
                </Button>
              )}
            </div>
          )}
          {!post.data.canEdit && (
            <p className="font-serif text-ink-soft italic">
              Versions can only be restored by the author, while the story can be edited.{' '}
              <Link to={`/posts/${id}`} className={buttonClass('ghost')}>
                Back
              </Link>
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
