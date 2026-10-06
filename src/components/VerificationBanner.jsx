import { useState } from 'react'
import { resendVerification } from '../api/auth.js'
import { useAuth } from '../auth/useAuth.js'

// shown to signed-in readers whose email address is not confirmed yet
export default function VerificationBanner() {
  const { user, isAuthenticated } = useAuth()
  const [state, setState] = useState('idle')

  if (!isAuthenticated || !user || user.emailVerified) return null

  const resend = async () => {
    setState('sending')
    try {
      await resendVerification()
      setState('sent')
    } catch {
      setState('error')
    }
  }

  return (
    <div role="status" className="border-b border-rule bg-paper-2">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 sm:px-6">
        <p className="font-serif text-base text-ink">Confirm your email address to start writing. We sent a link to {user.email}.</p>
        {state === 'sent' ? (
          <span className="kicker text-ok">Sent. Check your inbox.</span>
        ) : (
          <button type="button" onClick={resend} disabled={state === 'sending'} className="link-slide kicker text-accent">
            {state === 'sending' ? 'Sending…' : state === 'error' ? 'Could not send, try again' : 'Resend email'}
          </button>
        )}
      </div>
    </div>
  )
}
