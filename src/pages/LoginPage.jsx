import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema } from '../schemas/index.js'
import { useAuth } from '../auth/useAuth.js'
import AuthCard from '../components/AuthCard.jsx'
import Button from '../components/Button.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import FormField from '../components/FormField.jsx'
import Notice from '../components/Notice.jsx'

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [serverError, setServerError] = useState(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema) })

  const redirectTo = location.state?.from ?? '/'
  if (isAuthenticated && !isSubmitting) return <Navigate to={redirectTo} replace />

  const onSubmit = async (values) => {
    setServerError(null)
    try {
      await login(values)
      navigate(redirectTo, { replace: true })
    } catch (error) {
      setServerError(error)
    }
  }

  return (
    <AuthCard
      title="Log in"
      quote="Welcome back to the reading room."
      footer={
        <>
          No account?{' '}
          {/* carry the story they were trying to open through sign-up and back */}
          <Link to="/register" state={{ from: location.state?.from }} className="link-slide font-semibold text-accent">
            Sign up
          </Link>
        </>
      }
    >
      {location.state?.registered && (
        <Notice tone="ok" label="Welcome">
          Account created. Check your email to confirm your address, then log in.
        </Notice>
      )}
      {location.state?.passwordReset && (
        <Notice tone="ok" label="Password updated">
          Your password was reset. Log in with the new one.
        </Notice>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <ErrorMessage error={serverError} />
        <FormField label="Email" type="email" autoComplete="email" error={errors.email} {...register('email')} />
        <FormField
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password}
          {...register('password')}
        />
        <p className="font-serif text-ink-soft">
          <Link to="/forgot-password" className="link-slide font-semibold text-accent">
            Forgot your password?
          </Link>
        </p>
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
    </AuthCard>
  )
}
