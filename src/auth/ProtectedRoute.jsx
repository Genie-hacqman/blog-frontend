import { Navigate, useLocation } from 'react-router'
import NoIndex from '../components/NoIndex.jsx'
import { ArticleSkeleton } from '../components/Skeletons.jsx'
import { useAuth } from './useAuth.js'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading, endedBy } = useAuth()
  const location = useLocation()

  // a remembered session is still being restored: do not bounce the visitor to /login yet
  if (isLoading) return <ArticleSkeleton />

  if (!isAuthenticated) {
    // the account was just deleted: there is nothing to log back in to
    if (endedBy === 'deleted') return <Navigate to="/" replace state={{ accountDeleted: true }} />
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  // everything behind a login is private
  return (
    <>
      <NoIndex />
      {children}
    </>
  )
}
