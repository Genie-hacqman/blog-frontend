import { useState } from 'react'
import { useFeed } from '../hooks/useEngagement.js'
import StoryCollection from '../components/StoryCollection.jsx'

export default function FeedPage() {
  const [page, setPage] = useState(1)
  return (
    <StoryCollection
      kicker="From the people you follow"
      title="Following"
      query={useFeed(page)}
      page={page}
      onPage={setPage}
      empty="Nothing here yet. Follow a few writers from their profile pages and their new stories will appear here."
    />
  )
}
