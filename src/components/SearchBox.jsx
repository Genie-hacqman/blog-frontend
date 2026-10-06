import { useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'

// The search field in the header. It sends the reader to /search?q=..., where the results live
// at an address that can be bookmarked and shared.
export default function SearchBox() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  // on the results page the box shows what is being searched for
  const current = location.pathname === '/search' ? (params.get('q') ?? '') : ''
  const [text, setText] = useState(current)
  const [shown, setShown] = useState(current)
  if (shown !== current) {
    // the address changed (a new search, back button): follow it
    setShown(current)
    setText(current)
  }

  const submit = (event) => {
    event.preventDefault()
    const q = text.trim()
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  return (
    <form role="search" onSubmit={submit} className="flex items-center border-b border-ink focus-within:border-accent">
      <label htmlFor="site-search" className="sr-only">
        Search stories
      </label>
      <input
        id="site-search"
        type="search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Search stories"
        maxLength={100}
        autoComplete="off"
        className="w-40 bg-transparent px-1 py-1.5 font-serif text-base text-ink placeholder:text-ink-soft/60 focus:outline-none sm:w-52"
      />
      <button type="submit" className="kicker px-2 py-1.5 text-ink hover:text-accent">
        Search
      </button>
    </form>
  )
}
