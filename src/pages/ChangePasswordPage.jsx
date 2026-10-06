import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { changePasswordSchema } from '../schemas/index.js'
import { changePassword } from '../api/auth.js'
import Button from '../components/Button.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import FormField from '../components/FormField.jsx'
import Notice from '../components/Notice.jsx'

export default function ChangePasswordPage() {
  const [serverError, setServerError] = useState(null)
  const [changed, setChanged] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(changePasswordSchema) })

  const onSubmit = async ({ currentPassword, newPassword }) => {
    setServerError(null)
    setChanged(false)
    try {
      await changePassword({ currentPassword, newPassword })
      reset()
      setChanged(true)
    } catch (error) {
      setServerError(error)
    }
  }

  return (
    <section className="mx-auto max-w-[68ch] px-4 pt-10 pb-16 sm:px-6 sm:pt-14">
      <h1 className="mb-8 text-4xl leading-none font-semibold tracking-[-0.02em]">Change your password</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        {changed && (
          <Notice tone="ok" label="Done">
            Password changed. Your other devices have been signed out.
          </Notice>
        )}
        <ErrorMessage error={serverError} />
        <FormField label="Current password" type="password" autoComplete="current-password" error={errors.currentPassword} {...register('currentPassword')} />
        <FormField label="New password" type="password" autoComplete="new-password" error={errors.newPassword} {...register('newPassword')} />
        <FormField label="Confirm new password" type="password" autoComplete="new-password" error={errors.confirmPassword} {...register('confirmPassword')} />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Change password'}
        </Button>
      </form>
    </section>
  )
}
