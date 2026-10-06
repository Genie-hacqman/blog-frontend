import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/useAuth.js'
import { useSetUserRole, useSignOutUser, useSuspendUser, useUnsuspendUser } from '../hooks/useAdmin.js'
import { MAX_NOTE_LENGTH } from '../lib/moderation.js'
import Button from './Button.jsx'
import ErrorMessage from './ErrorMessage.jsx'
import { formatDate } from './formatDate.js'

const ROLES = ['user', 'author', 'editor', 'admin']

// One person in the admin list: who they are, and what an admin can do about their account.
export default function UserRow({ person }) {
  const { user: me } = useAuth()
  const isMe = me?.id === person.id
  const suspend = useSuspendUser()
  const unsuspend = useUnsuspendUser()
  const signOut = useSignOutUser()
  const setRole = useSetUserRole()
  const [role, setRoleChoice] = useState(person.role)
  const [asking, setAsking] = useState(null) // 'suspend' | 'sign-out' | null
  const [reason, setReason] = useState('')
  const failure = suspend.error ?? unsuspend.error ?? signOut.error ?? setRole.error

  return (
    <li className="space-y-3 py-5">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <Link to={`/u/${encodeURIComponent(person.username)}`} className="link-slide font-display text-xl font-semibold">
          {person.username}
        </Link>
        <span className="kicker text-ink-soft">{person.email}</span>
        <span className={`kicker px-2 py-0.5 ${person.status === 'suspended' ? 'bg-danger text-paper' : 'border border-rule text-ink-soft'}`}>{person.status}</span>
        {!person.emailVerified && <span className="kicker text-ink-soft">email not confirmed</span>}
        <span className="kicker ml-auto text-ink-soft">joined {formatDate(person.createdAt)}</span>
      </div>
      {person.status === 'suspended' && person.suspendedReason && (
        <p className="border-l-2 border-danger pl-3 font-serif break-words whitespace-pre-wrap">Suspended: {person.suspendedReason}</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">
          <span className="kicker text-ink-soft">Role</span>
          <select
            value={role}
            disabled={isMe}
            onChange={(event) => setRoleChoice(event.target.value)}
            aria-label={`Role of ${person.username}`}
            className="border border-rule bg-paper-2 px-2 py-1 font-sans text-sm disabled:opacity-60"
          >
            {ROLES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        {role !== person.role && (
          <Button variant="secondary" disabled={setRole.isPending} onClick={() => setRole.mutate({ id: person.id, role })}>
            {setRole.isPending ? 'Saving…' : `Make ${role}`}
          </Button>
        )}
        {!isMe && person.status === 'active' && (
          <Button variant="danger" onClick={() => { setAsking('suspend'); setReason('') }}>
            Suspend
          </Button>
        )}
        {person.status === 'suspended' && (
          <Button variant="secondary" disabled={unsuspend.isPending} onClick={() => unsuspend.mutate(person.id)}>
            {unsuspend.isPending ? 'Working…' : 'Reinstate'}
          </Button>
        )}
        {!isMe && (
          <Button variant="secondary" onClick={() => setAsking('sign-out')}>
            Sign out everywhere
          </Button>
        )}
      </div>

      {asking === 'suspend' && (
        <form
          noValidate
          className="space-y-3 border border-danger p-4"
          onSubmit={(event) => {
            event.preventDefault()
            suspend.mutate({ id: person.id, reason: reason.trim() }, { onSuccess: () => setAsking(null) })
          }}
        >
          <label htmlFor={`reason-${person.id}`} className="kicker block text-danger">
            Why is {person.username} being suspended? They are emailed this, and see it when they try to log in.
          </label>
          <textarea
            id={`reason-${person.id}`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={MAX_NOTE_LENGTH}
            rows={3}
            className="w-full border-0 border-b border-ink bg-paper px-3 py-2 font-serif text-lg focus:border-b-2 focus:border-accent focus:outline-none"
          />
          <div className="flex gap-3">
            <Button type="submit" variant="danger" disabled={suspend.isPending || !reason.trim()}>
              {suspend.isPending ? 'Suspending…' : 'Confirm suspension'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setAsking(null)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
      {asking === 'sign-out' && (
        <div role="group" aria-label={`Sign ${person.username} out everywhere`} className="flex flex-wrap items-center gap-3 border border-rule p-4">
          <span className="font-serif">End every session of {person.username}? They can log in again.</span>
          <Button disabled={signOut.isPending} onClick={() => signOut.mutate(person.id, { onSuccess: () => setAsking(null) })}>
            {signOut.isPending ? 'Working…' : 'Sign them out'}
          </Button>
          <Button variant="secondary" onClick={() => setAsking(null)}>
            Cancel
          </Button>
        </div>
      )}
      <ErrorMessage error={failure} />
    </li>
  )
}
