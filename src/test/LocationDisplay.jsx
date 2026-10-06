import { useLocation } from 'react-router'

// renders the current route so tests can assert on navigation and on what the URL contains
export default function LocationDisplay() {
  const { pathname, search } = useLocation()
  return <span data-testid="location">{pathname + search}</span>
}
