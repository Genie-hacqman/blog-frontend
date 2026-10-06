import { useState } from 'react'
import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { forgotPasswordSchema } from '../schemas/index.js'
import { forgotPassword } from '../api/auth.js'
import AuthCard from '../components/AuthCard.jsx'
import Button from '../components/Button.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import FormField from '../components/FormField.jsx'
import Notice from '../components/Notice.jsx'

export default function ForgotPasswordPage() {
  const [serverError, setServerError] = useState(null)
  const [sent, setSent] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(forgotPasswordSchema) })

  const onSubmit = async ({ email }) => {
    setServerError(null)
    try {
      await forgotPassword(email)
      setSent(true)
    } catch (error) {
      setServerError(error)
    }
  }

  return (
    <AuthCard
      title="Reset your password"
      quote="Even the best editors lose a page now and then."
      footer={
        <Link to="/login" className="link-slide font-semibold text-accent">
          Back to log in
        </Link>
      }
    >
      {sent ? (
        // the same message appears whether or not the address has an account
        <Notice tone="ok" label="Check your inbox">
          If that email has an account, a reset link is on its way. It works once and expires in an hour.
        </Notice>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <ErrorMessage error={serverError} />
          <FormField label="Email" type="email" autoComplete="email" error={errors.email} {...register('email')} />
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      )}
    </AuthCard>
  )
}
