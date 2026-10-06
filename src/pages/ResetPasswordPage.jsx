import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { resetPasswordSchema } from '../schemas/index.js'
import { resetPassword } from '../api/auth.js'
import AuthCard from '../components/AuthCard.jsx'
import Button from '../components/Button.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import FormField from '../components/FormField.jsx'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  // keep the one-time token in memory and off the address bar, history and referrers
  const [token] = useState(() => params.get('token'))
  const [serverError, setServerError] = useState(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(resetPasswordSchema) })

  useEffect(() => {
    if (token) navigate('/reset-password', { replace: true })
  }, [token, navigate])

  const onSubmit = async ({ password }) => {
    setServerError(null)
    try {
      await resetPassword({ token, password })
      navigate('/login', { replace: true, state: { passwordReset: true } })
    } catch (error) {
      setServerError(error)
    }
  }

  return (
    <AuthCard
      title="Choose a new password"
      quote="A fresh page, a fresh start."
      footer={
        <Link to="/forgot-password" className="link-slide font-semibold text-accent">
          Request a new link
        </Link>
      }
    >
      {token ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <ErrorMessage error={serverError} />
          <FormField label="New password" type="password" autoComplete="new-password" error={errors.password} {...register('password')} />
          <FormField label="Confirm new password" type="password" autoComplete="new-password" error={errors.confirmPassword} {...register('confirmPassword')} />
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Saving…' : 'Reset password'}
          </Button>
        </form>
      ) : (
        <ErrorMessage error="This reset link is missing its token. Open the link from your email again, or request a new one." />
      )}
    </AuthCard>
  )
}
