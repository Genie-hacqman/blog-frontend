import { useState } from 'react'
import { Link } from 'react-router'
import { useUsers } from '../hooks/useAdmin.js'
import ErrorMessage from '../components/ErrorMessage.jsx'
import Pager from '../components/Pager.jsx'
import UserRow from '../components/UserRow.jsx'
import Button from '../components/Button.jsx'

// Find a person and act on their account. Searching matches the start of a username or an email address.
export default function AdminUsersPage() {
  const [draft, setDraft] = useState('')
  const [q, setQ] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const { data, isPending, error } = useUsers({ q: q || undefined, role: role || undefined, status: status || undefined, page })

  const filter = (setter) => (event) => {
    setter(event.target.value)
    setPage(1)
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pt-10 pb-16 sm:px-6 sm:pt-14">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-4 border-b-2 border-ink pb-4">
        <h1 className="text-4xl leading-none font-semibold tracking-[-0.02em]">People</h1>
        <Link to="/admin" className="link-slide kicker text-accent">← Overview</Link>
      </header>

      <form
        role="search"
        className="mb-4 flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          setQ(draft.trim())
          setPage(1)
        }}
      >
        <label className="min-w-56 flex-1">
          <span className="kicker mb-1 block text-ink-soft">Username or email starts with</span>
          <input value={draft} onChange={(event) => setDraft(event.target.value)} className="w-full border-0 border-b border-ink bg-paper-2 px-3 py-2 font-serif text-lg focus:border-b-2 focus:border-accent focus:outline-none" />
        </label>
        <label>
          <span className="kicker mb-1 block text-ink-soft">Role</span>
          <select value={role} onChange={filter(setRole)} className="border border-rule bg-paper-2 px-2 py-2 font-sans text-sm">
            <option value="">Any</option>
            {['user', 'author', 'editor', 'admin'].map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="kicker mb-1 block text-ink-soft">Status</span>
          <select value={status} onChange={filter(setStatus)} className="border border-rule bg-paper-2 px-2 py-2 font-sans text-sm">
            <option value="">Any</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </label>
        <Button type="submit">Search</Button>
      </form>

      <ErrorMessage error={error} />
      {isPending ? (
        <p role="status" className="py-8 text-ink-soft">Loading people…</p>
      ) : !data ? null : data.users.length === 0 ? (
        <p className="py-10 font-serif text-xl text-ink-soft italic">No one matches.</p>
      ) : (
        <>
          <p className="kicker text-ink-soft" aria-live="polite">{data.pagination.total} {data.pagination.total === 1 ? 'person' : 'people'}</p>
          <ul className="divide-y divide-rule">
            {data.users.map((person) => (
              <UserRow key={person.id} person={person} />
            ))}
          </ul>
        </>
      )}
      <Pager pagination={data?.pagination} onPage={setPage} label="People pages" />
    </div>
  )
}
