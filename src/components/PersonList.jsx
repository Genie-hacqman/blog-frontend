import { Link } from 'react-router'
import Avatar from './Avatar.jsx'

// people as a list of names and photos, each linking to their profile
export default function PersonList({ people }) {
  return (
    <ul className="divide-y divide-rule">
      {people.map((person) => (
        <li key={person.username}>
          <Link to={`/u/${encodeURIComponent(person.username)}`} className="flex items-center gap-4 py-3 hover:text-accent">
            <Avatar user={person} size="md" />
            <span className="font-display text-xl font-semibold">{person.username}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
