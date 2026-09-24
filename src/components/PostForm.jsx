import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { postSchema } from '../schemas/index.js'
import Button from './Button.jsx'
import ErrorMessage from './ErrorMessage.jsx'
import FormField from './FormField.jsx'
import { readingTime, wordCount } from './readingTime.js'

export default function PostForm({ defaultValues = { title: '', content: '' }, onSubmit, submitLabel, error, isPending }) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({ resolver: zodResolver(postSchema), defaultValues })

  const content = useWatch({ control, name: 'content' }) ?? ''
  const words = wordCount(content)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <ErrorMessage error={error} />
      <FormField label="Title" variant="title" placeholder="Headline" autoComplete="off" error={errors.title} {...register('title')} />
      <div className="h-px bg-rule" aria-hidden="true" />
      <FormField
        label="Content"
        as="textarea"
        variant="body"
        rows={12}
        placeholder="Tell your story…"
        error={errors.content}
        {...register('content')}
      />

      <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-4 border-t border-ink bg-paper/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <p className="kicker text-ink-soft" aria-live="polite">
          {words} {words === 1 ? 'word' : 'words'}
          {words > 0 && <span> · {readingTime(content)} min read</span>}
        </p>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
