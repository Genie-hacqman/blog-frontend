import { Navigate } from 'react-router'
import NotFoundPage from '../pages/NotFoundPage.jsx'
import { useAuth } from './useAuth.js'

const RANK = { user: 0, author: 1, editor: 2, admin: 3 }

// A convenience for the interface only: pages that need a role show "not found" to everyone else.
// The server enforces every permission on its own; hiding a page here protects nothing.
export default function RequireRole({ role, children }) {
  const { user, isAuthenticated, isLoading } = useAuth()
  if (isLoading) return null
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if ((RANK[user?.role] ?? -1) < RANK[role]) return <NotFoundPage />
  return children
}
