import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { verifyEmail } from '../api/auth.js'
import { useAuth } from '../auth/useAuth.js'
import AuthCard from '../components/AuthCard.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import Notice from '../components/Notice.jsx'

export default function VerifyEmailPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { user, isAuthenticated, reloadUser } = useAuth()
  // keep the one-time token in memory and off the address bar, history and referrers
  const [token] = useState(() => params.get('token'))
  const [state, setState] = useState(token ? 'verifying' : 'failed')
  const [error, setError] = useState(token ? null : 'This link is missing its token. Open the link from your email again.')
  // the token works once, so the request is made once even when React runs effects twice in development
  const attempt = useRef(null)

  useEffect(() => {
    if (!token) return
    navigate('/verify-email', { replace: true })
    attempt.current ??= verifyEmail(token)
    let cancelled = false
    attempt.current
      .then(() => !cancelled && setState('done'))
      .catch((e) => {
        if (cancelled) return
        setError(e)
        setState('failed')
      })
    return () => {
      cancelled = true
    }
  }, [token, navigate])

  // a signed-in reader's banner and permissions update without a reload
  useEffect(() => {
    if (state === 'done' && isAuthenticated && user && !user.emailVerified) reloadUser().catch(() => {})
  }, [state, isAuthenticated, user, reloadUser])

  return (
    <AuthCard title="Confirm your email" quote="Every byline starts with a real address." footer={<Link to="/" className="link-slide font-semibold text-accent">Back to the front page</Link>}>
      {state === 'verifying' && <Notice label="One moment">Confirming your email address…</Notice>}
      {state === 'done' && (
        <Notice tone="ok" label="Confirmed">
          Your email address is confirmed.{' '}
          {isAuthenticated ? (
            <Link to="/posts/new" className="link-slide font-semibold text-accent">Start writing</Link>
          ) : (
            <Link to="/login" className="link-slide font-semibold text-accent">Log in</Link>
          )}
        </Notice>
      )}
      {state === 'failed' && <ErrorMessage error={error} />}
    </AuthCard>
  )
}
