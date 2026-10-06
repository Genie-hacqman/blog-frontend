import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { profileSchema, SOCIAL_PLATFORMS } from '../schemas/index.js'
import { useUpdateProfile } from '../hooks/useProfile.js'
import Button from './Button.jsx'
import ErrorMessage from './ErrorMessage.jsx'
import FormField from './FormField.jsx'
import Notice from './Notice.jsx'

const LABELS = {
  website: 'Website',
  github: 'GitHub',
  twitter: 'X / Twitter',
  linkedin: 'LinkedIn',
  mastodon: 'Mastodon',
  youtube: 'YouTube',
  instagram: 'Instagram',
}

const PLACEHOLDERS = {
  website: 'https://example.com',
  github: 'https://github.com/you',
  twitter: 'https://x.com/you',
  linkedin: 'https://www.linkedin.com/in/you',
  mastodon: 'https://mastodon.social/@you',
  youtube: 'https://www.youtube.com/@you',
  instagram: 'https://www.instagram.com/you',
}

const toFormValues = (user) => ({
  bio: user.bio ?? '',
  socialLinks: Object.fromEntries(SOCIAL_PLATFORMS.map((platform) => [platform, user.socialLinks?.[platform] ?? ''])),
})

export default function ProfileForm({ user }) {
  const update = useUpdateProfile()
  const [saved, setSaved] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({ resolver: zodResolver(profileSchema), defaultValues: toFormValues(user) })

  const bioLength = useWatch({ control, name: 'bio' })?.length ?? 0

  const onSubmit = (values) => {
    setSaved(false)
    update.mutate(values, {
      onSuccess: (updated) => {
        reset(toFormValues(updated))
        setSaved(true)
      },
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {saved && (
        <Notice tone="ok" label="Saved">
          Your profile was updated.
        </Notice>
      )}
      <ErrorMessage error={update.error} />
      <div>
        <FormField
          label="Bio"
          as="textarea"
          rows={4}
          error={errors.bio}
          hint="Plain text. Shown on your public profile."
          {...register('bio')}
        />
        <p className={`mt-1 text-right font-mono text-xs ${bioLength > 500 ? 'text-danger' : 'text-ink-soft'}`} aria-live="polite">
          {bioLength} / 500
        </p>
      </div>
      <fieldset className="space-y-5">
        <legend className="kicker mb-2 text-ink">Links</legend>
        {SOCIAL_PLATFORMS.map((platform) => (
          <FormField
            key={platform}
            label={LABELS[platform]}
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder={PLACEHOLDERS[platform]}
            error={errors.socialLinks?.[platform]}
            {...register(`socialLinks.${platform}`)}
          />
        ))}
      </fieldset>
      <Button type="submit" disabled={update.isPending}>
        {update.isPending ? 'Saving…' : 'Save profile'}
      </Button>
    </form>
  )
}
