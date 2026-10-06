import { Link, useLocation } from 'react-router'
import { useAuth } from '../auth/useAuth.js'
import { useToggleFollow } from '../hooks/useEngagement.js'
import Button from './Button.jsx'
import ErrorMessage from './ErrorMessage.jsx'

// Follow / Following for a profile. `following` is what the profile says about the signed-in reader.
export default function FollowButton({ username, following }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const toggle = useToggleFollow(username)

  if (!isAuthenticated) {
    return (
      <Link to="/login" state={{ from: location.pathname }} className="link-slide kicker text-accent">
        Log in to follow
      </Link>
    )
  }
  return (
    <div>
      <Button
        variant={following ? 'secondary' : 'primary'}
        aria-pressed={following}
        disabled={toggle.isPending}
        onClick={() => toggle.mutate({ follow: !following })}
      >
        {following ? 'Following' : 'Follow'}
        <span className="sr-only"> {username}</span>
      </Button>
      <ErrorMessage error={toggle.error} />
    </div>
  )
}
