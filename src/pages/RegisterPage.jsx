import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema } from '../schemas/index.js'
import { register as registerUser } from '../api/auth.js'
import { useAuth } from '../auth/useAuth.js'
import AuthCard from '../components/AuthCard.jsx'
import Button from '../components/Button.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import FormField from '../components/FormField.jsx'

export default function RegisterPage() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [serverError, setServerError] = useState(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(registerSchema) })

  if (isAuthenticated) return <Navigate to="/" replace />

  const onSubmit = async (values) => {
    setServerError(null)
    try {
      await registerUser(values)
      navigate('/login', { state: { registered: true, from: location.state?.from } })
    } catch (error) {
      setServerError(error)
    }
  }

  return (
    <AuthCard
      title="Create an account"
      kicker="Join"
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" state={{ from: location.state?.from }} className="link-slide font-semibold text-accent">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <ErrorMessage error={serverError} />
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField label="First name" autoComplete="given-name" error={errors.firstName} {...register('firstName')} />
          <FormField label="Last name" autoComplete="family-name" error={errors.lastName} {...register('lastName')} />
        </div>
        <FormField label="Username" autoComplete="username" error={errors.userName} {...register('userName')} />
        <FormField label="Email" type="email" autoComplete="email" error={errors.email} {...register('email')} />
        <FormField
          label="Password"
          type="password"
          autoComplete="new-password"
          error={errors.password}
          {...register('password')}
        />
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Creating account…' : 'Sign up'}
        </Button>
      </form>
    </AuthCard>
  )
}
