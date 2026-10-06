import { useState } from 'react'
import { useAuth } from '../auth/useAuth.js'
import { useEndSession, useSessions } from '../hooks/useSessions.js'
import Button from './Button.jsx'
import ErrorMessage from './ErrorMessage.jsx'
import { timeAgo } from './formatDate.js'

// "Where you are signed in": every device the account is signed in on, with a way to end any of them.
// Everything shown comes from the API as plain text (a device label and a network area, never a full address).
export default function SessionsSection() {
  const { logoutEverywhere } = useAuth()
  const { data: sessions, isPending, error } = useSessions()
  const end = useEndSession()
  const [leaving, setLeaving] = useState(false)
  const [leaveError, setLeaveError] = useState(null)

  const signOutEverywhere = async () => {
    setLeaveError(null)
    setLeaving(true)
    try {
      await logoutEverywhere()
    } catch (failure) {
      setLeaveError(failure)
      setLeaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="font-serif text-lg text-ink-soft">These devices are signed in to your account. Sign out any you do not recognise.</p>
      <ErrorMessage error={error ?? end.error ?? leaveError} />

      {isPending ? (
        <p role="status" className="text-ink-soft">Loading…</p>
      ) : !sessions ? null : (
        <ul className="divide-y divide-rule border-y border-rule">
          {sessions.map((session) => (
            <li key={session.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-serif text-lg">
                  {session.device}
                  {session.current && <span className="kicker ml-3 text-accent">This device</span>}
                </p>
                <p className="kicker text-ink-soft">
                  {session.ipArea ? `${session.ipArea} · ` : ''}
                  signed in {timeAgo(session.createdAt)} · active {timeAgo(session.lastUsedAt)}
                </p>
              </div>
              {!session.current && (
                <Button
                  variant="secondary"
                  aria-label={`Sign out ${session.device}`}
                  disabled={end.isPending && end.variables === session.id}
                  onClick={() => end.mutate(session.id)}
                >
                  Sign out
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <Button variant="secondary" onClick={signOutEverywhere} disabled={leaving}>
        {leaving ? 'Signing out…' : 'Sign out everywhere'}
      </Button>
    </div>
  )
}
