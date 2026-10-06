import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { categorySchema } from '../schemas/index.js'
import { useCategories, useCreateCategory, useDeleteCategory, useUpdateCategory } from '../hooks/useTaxonomy.js'
import Button from '../components/Button.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import FormField from '../components/FormField.jsx'

function CategoryForm({ defaultValues = { name: '', description: '' }, submitLabel, pendingLabel, isPending, error, onSubmit, onCancel }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(categorySchema), defaultValues })

  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        const saved = await onSubmit(values)
        if (saved !== false) reset(defaultValues)
      })}
      className="space-y-4"
      noValidate
    >
      <ErrorMessage error={error} />
      <FormField label="Name" autoComplete="off" error={errors.name} {...register('name')} />
      <FormField label="Description" as="textarea" rows={2} error={errors.description} hint="Optional. Shown at the top of the section's page." {...register('description')} />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? pendingLabel : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}

function CategoryRow({ category }) {
  const [mode, setMode] = useState('view') // 'view' | 'edit' | 'delete'
  const update = useUpdateCategory()
  const remove = useDeleteCategory()

  return (
    <li className="py-5">
      {mode === 'edit' ? (
        <CategoryForm
          defaultValues={{ name: category.name, description: category.description ?? '' }}
          submitLabel="Save"
          pendingLabel="Saving…"
          isPending={update.isPending}
          error={update.error}
          onCancel={() => setMode('view')}
          onSubmit={async (values) => {
            try {
              await update.mutateAsync({ id: category.id, ...values })
              setMode('view')
            } catch {
              return false // the error is shown above the form
            }
          }}
        />
      ) : (
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <div className="min-w-0 flex-1">
            <p className="text-xl font-semibold">{category.name}</p>
            <p className="kicker text-ink-soft">
              /category/{category.slug} · {category.postCount} {category.postCount === 1 ? 'story' : 'stories'}
            </p>
            {category.description && <p className="mt-1 font-serif text-ink-soft">{category.description}</p>}
          </div>
          {mode === 'delete' ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-serif">
                Delete {category.name}? Its {category.postCount} {category.postCount === 1 ? 'story stays' : 'stories stay'}, with no section.
              </span>
              <Button variant="ghost" onClick={() => setMode('view')} disabled={remove.isPending}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => remove.mutate(category.id)} disabled={remove.isPending} autoFocus>
                {remove.isPending ? 'Deleting…' : `Delete ${category.name}`}
              </Button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setMode('edit')} aria-label={`Edit ${category.name}`}>
                Edit
              </Button>
              <Button variant="danger" onClick={() => setMode('delete')} aria-label={`Delete ${category.name}`}>
                Delete
              </Button>
            </div>
          )}
        </div>
      )}
      {mode === 'delete' && <ErrorMessage error={remove.error} />}
    </li>
  )
}

// The sections of the publication (editors and admins). Authors only choose from this list.
export default function ManageCategoriesPage() {
  const { data: categories, isPending, error } = useCategories()
  const create = useCreateCategory()

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 pt-10 pb-16 sm:px-6 sm:pt-14">
      <header>
        <p className="kicker text-accent">Editors</p>
        <h1 className="mt-1 text-4xl leading-none font-semibold tracking-[-0.02em]">Sections</h1>
        <p className="mt-3 font-serif text-lg text-ink-soft">
          Each story can sit in one section. Renaming a section keeps its address, so links keep working.
        </p>
      </header>

      <section aria-label="New section" className="border border-rule p-5">
        <h2 className="kicker mb-4 text-ink">New section</h2>
        <CategoryForm
          submitLabel="Create section"
          pendingLabel="Creating…"
          isPending={create.isPending}
          error={create.error}
          onSubmit={async (values) => {
            try {
              await create.mutateAsync(values)
            } catch {
              return false
            }
          }}
        />
      </section>

      <section aria-label="All sections">
        <ErrorMessage error={error} />
        {isPending ? (
          <p role="status" className="text-ink-soft">
            Loading sections…
          </p>
        ) : categories.length === 0 ? (
          <p className="font-serif text-xl text-ink-soft italic">No sections yet. Create the first one above.</p>
        ) : (
          <ul className="divide-y divide-rule border-y border-rule">
            {categories.map((category) => (
              <CategoryRow key={category.id} category={category} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
