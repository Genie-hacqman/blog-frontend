import { useState } from 'react'
import { useBookmarks } from '../hooks/useEngagement.js'
import StoryCollection from '../components/StoryCollection.jsx'

export default function BookmarksPage() {
  const [page, setPage] = useState(1)
  return (
    <StoryCollection
      kicker="Your reading list"
      title="Saved"
      query={useBookmarks(page)}
      page={page}
      onPage={setPage}
      empty="Nothing saved yet. Use “Save” under a story to keep it here."
    />
  )
}
