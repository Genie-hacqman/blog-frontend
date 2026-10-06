import { lazy, Suspense, useEffect, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { postSchema } from '../schemas/index.js'
import { useAutosave } from '../hooks/useAutosave.js'
import { htmlToText } from '../lib/htmlText.js'
import Button from './Button.jsx'
import ContentView from './ContentView.jsx'
import CoverImageField from './CoverImageField.jsx'
import ErrorMessage from './ErrorMessage.jsx'
import FormField from './FormField.jsx'
import { readingTime, wordCount } from './readingTime.js'
import TagInput from './TagInput.jsx'
import { useCategories } from '../hooks/useTaxonomy.js'

// the editor (and the highlighter inside it) is downloaded only by people who write
const RichTextEditor = lazy(() => import('./RichTextEditor.jsx'))

const EMPTY = { title: '', content: '', excerpt: '', slug: '', categoryId: '', tags: [], coverMediaId: null, coverAlt: '', cover: null }

const SAVE_NOTE = {
  saving: 'Saving…',
  error: 'Could not save automatically. Your latest changes are not saved yet.',
  conflict: 'This story was changed somewhere else. Copy what you need, then reload the page.',
}

const clock = (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

// The writing form. `values` (when given) replaces what is in the form, which is how the saved
// version, including a URL the server generated, comes back after a save.
// `onAutosave(validData)` (optional, async) turns on automatic saving of an unpublished story.
export default function PostForm({ values, onSubmit, submitLabel, error, isPending, slugLocked = false, onAutosave, autosaveDelay = 5000 }) {
  const {
    register,
    handleSubmit,
    control,
    getValues,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm({ resolver: zodResolver(postSchema), defaultValues: values ?? EMPTY, values })

  const { data: categories = [] } = useCategories()
  const all = useWatch({ control })
  const content = all.content ?? ''
  const text = htmlToText(content)
  const words = wordCount(text)
  const [mode, setMode] = useState('write')
  // { id, url } of the cover picture (only the id and the description are sent to the API)
  const cover = all.cover ?? null

  // after an automatic save, exactly what was saved becomes the form's baseline, so "unsaved" means
  // "typed since the last save" and nothing the writer typed meanwhile is touched
  const status = useAutosave({
    enabled: Boolean(onAutosave),
    dirty: isDirty,
    values: all,
    getValues,
    onSave: onAutosave,
    onSaved: (snapshot) => reset(snapshot, { keepValues: true }),
    delay: autosaveDelay,
  })
  const hasUnsaved = isDirty

  // closing the tab with unsaved writing asks first
  useEffect(() => {
    if (!hasUnsaved) return
    const warn = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [hasUnsaved])

  const saveNote = SAVE_NOTE[status.state] ?? (status.state === 'saved' && !hasUnsaved ? `Saved ${clock(status.at)}` : '')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <ErrorMessage error={error} />
      <FormField label="Title" variant="title" placeholder="Headline" autoComplete="off" error={errors.title} {...register('title')} />
      <div className="h-px bg-rule" aria-hidden="true" />

      <CoverImageField
        cover={cover}
        alt={all.coverAlt ?? ''}
        onChange={({ cover: next, alt }) => {
          setValue('cover', next, { shouldDirty: true })
          setValue('coverMediaId', next ? next.id : null, { shouldDirty: true })
          setValue('coverAlt', alt, { shouldDirty: true })
        }}
      />

      <div>
        <div className="mb-2 flex items-center justify-between gap-4">
          <span className="kicker text-ink-soft">Content</span>
          <div role="group" aria-label="Editor view" className="flex gap-1">
            {[
              ['write', 'Write'],
              ['preview', 'Preview'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={mode === key}
                onClick={() => setMode(key)}
                className="border border-rule px-3 py-1 font-sans text-sm aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* kept mounted while previewing, so nothing is lost and undo still works */}
        <div hidden={mode !== 'write'}>
          <Controller
            name="content"
            control={control}
            render={({ field }) => (
              <Suspense fallback={<div className="editor-surface" aria-busy="true">Loading the editor…</div>}>
                <RichTextEditor value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
              </Suspense>
            )}
          />
        </div>
        {mode === 'preview' && (
          <div className="border border-rule px-4 py-3" aria-label="Preview of the story">
            {text ? <ContentView content={content} /> : <p className="font-serif text-ink-soft">Nothing to preview yet.</p>}
          </div>
        )}
        {errors.content && (
          <p role="alert" className="mt-2 font-sans text-sm text-danger">
            {errors.content.message}
          </p>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {categories.length > 0 && (
          <label className="block">
            <span className="kicker mb-2 block text-ink-soft">Section</span>
            <select
              className="w-full border-0 border-b border-ink bg-paper-2 px-3 py-2.5 font-serif text-lg text-ink focus:border-b-2 focus:border-accent focus:outline-none"
              {...register('categoryId')}
            >
              <option value="">No section</option>
              {categories.map((category) => (
                <option key={category.id} value={String(category.id)}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <Controller name="tags" control={control} render={({ field }) => <TagInput value={field.value ?? []} onChange={field.onChange} />} />
      </div>

      <details className="border border-rule p-4" open={Boolean(errors.excerpt || errors.slug)}>
        <summary className="kicker cursor-pointer text-ink-soft">Excerpt and URL</summary>
        <div className="mt-5 space-y-6">
          <FormField
            label="Excerpt"
            as="textarea"
            rows={3}
            error={errors.excerpt}
            hint="Shown on the front page and in search results. Leave empty to use the start of the story."
            {...register('excerpt')}
          />
          <FormField
            label="URL"
            autoComplete="off"
            disabled={slugLocked}
            error={errors.slug}
            hint={slugLocked ? 'The URL is fixed once a post has been published.' : 'Lowercase letters, numbers and hyphens. Leave empty to use the title.'}
            {...register('slug')}
          />
        </div>
      </details>

      <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-4 border-t border-ink bg-paper/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <p className="kicker text-ink-soft" aria-live="polite">
          {words} {words === 1 ? 'word' : 'words'}
          {words > 0 && <span> · {readingTime(text)} min read</span>}
          {hasUnsaved && !saveNote && <span> · unsaved changes</span>}
          {saveNote && <span> · {saveNote}</span>}
        </p>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
