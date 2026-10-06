import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { deleteAccountSchema } from '../schemas/index.js'
import { useAuth } from '../auth/useAuth.js'
import { useDeleteAccount } from '../hooks/useProfile.js'
import Button from './Button.jsx'
import ErrorMessage from './ErrorMessage.jsx'
import FormField from './FormField.jsx'

export default function DeleteAccountSection() {
  const { logout } = useAuth()
  const deleteAccount = useDeleteAccount()
  const [open, setOpen] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(deleteAccountSchema) })

  const onSubmit = ({ password }) => {
    deleteAccount.mutate(password, {
      // the server has already ended every session; this clears the browser's copy and its cached
      // data, and the protected route then sends the visitor home with a confirmation
      onSuccess: () => logout({ endedBy: 'deleted' }),
    })
  }

  return (
    <section aria-labelledby="danger-heading" className="border border-danger p-5 sm:p-6">
      <h2 id="danger-heading" className="kicker text-danger">
        Delete account
      </h2>
      <p className="mt-3 font-serif text-lg">
        This cannot be undone. Your email, username, photo, bio and links are erased, you are signed out everywhere, and your
        drafts are deleted. Stories you have published stay on the site under the name “Deleted user”.
      </p>
      {open ? (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5" noValidate>
          <ErrorMessage error={deleteAccount.error} />
          <FormField label="Your password" type="password" autoComplete="current-password" error={errors.password} {...register('password')} />
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="danger" disabled={deleteAccount.isPending}>
              {deleteAccount.isPending ? 'Deleting…' : 'Delete my account'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={deleteAccount.isPending}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button type="button" variant="danger" className="mt-5" onClick={() => setOpen(true)}>
          Delete account…
        </Button>
      )}
    </section>
  )
}
