import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { usePeople } from '../hooks/useEngagement.js'
import ErrorMessage from '../components/ErrorMessage.jsx'
import Pager from '../components/Pager.jsx'
import PersonList from '../components/PersonList.jsx'
import { ArticleSkeleton } from '../components/Skeletons.jsx'
import NoIndex from '../components/NoIndex.jsx'
import NotFoundPage from './NotFoundPage.jsx'

const TITLES = { followers: 'Followers', following: 'Following' }

// who follows a person, or whom they follow (kind: 'followers' | 'following')
function People({ username, kind }) {
  const [page, setPage] = useState(1)
  const { data, isPending, error } = usePeople(username, kind, page)

  if (error?.status === 404) return <NotFoundPage />
  return (
    <div className="mx-auto max-w-2xl px-4 pt-10 pb-16 sm:px-6 sm:pt-14">
      <NoIndex follow />
      <header className="mb-6 border-b-2 border-ink pb-4">
        <p className="kicker text-accent">
          <Link to={`/u/${encodeURIComponent(username)}`} className="link-slide">
            {username}
          </Link>
        </p>
        <h1 className="mt-1 text-4xl leading-none font-semibold tracking-[-0.02em]">{TITLES[kind]}</h1>
      </header>

      <ErrorMessage error={error} />
      {isPending ? (
        <ArticleSkeleton />
      ) : data.people.length === 0 ? (
        <p className="py-8 font-serif text-xl text-ink-soft italic">{kind === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}</p>
      ) : (
        <PersonList people={data.people} />
      )}
      <Pager pagination={data?.pagination} onPage={setPage} label={`${TITLES[kind]} pages`} />
    </div>
  )
}

// keyed by username and kind so moving between lists starts on page 1
export default function PeoplePage({ kind }) {
  const { username } = useParams()
  return <People key={`${username.toLowerCase()}-${kind}`} username={username} kind={kind} />
}
