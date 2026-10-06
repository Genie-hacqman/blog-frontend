import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '../auth/useAuth.js'
import { useProfile, useProfilePosts } from '../hooks/useProfile.js'
import Avatar from '../components/Avatar.jsx'
import Button from '../components/Button.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import FollowButton from '../components/FollowButton.jsx'
import ReportButton from '../components/ReportButton.jsx'
import PostCard from '../components/PostCard.jsx'
import { ArticleSkeleton } from '../components/Skeletons.jsx'
import { buttonClass } from '../components/buttonClass.js'
import { useSeo } from '../seo/useSeo.js'
import { collectionJsonLd, describe, personJsonLd } from '../seo/site.js'
import { SITE_NAME } from '../components/site.js'
import NotFoundPage from './NotFoundPage.jsx'

const PAGE_SIZE = 10

const PLATFORM_LABELS = {
  website: 'Website',
  github: 'GitHub',
  twitter: 'X / Twitter',
  linkedin: 'LinkedIn',
  mastodon: 'Mastodon',
  youtube: 'YouTube',
  instagram: 'Instagram',
}

// links come from the server already checked, but a link is only ever rendered if it is plain https
const safeHost = (href) => {
  try {
    const url = new URL(href)
    return url.protocol === 'https:' ? url.hostname : null
  } catch {
    return null
  }
}

function SocialLinks({ links }) {
  const entries = Object.entries(links ?? {}).filter(([, href]) => safeHost(href))
  if (entries.length === 0) return null
  return (
    <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
      {entries.map(([platform, href]) => (
        <li key={platform}>
          {/* user-supplied destination: no opener access, no referrer, and not endorsed by us */}
          <a href={href} target="_blank" rel="noopener noreferrer nofollow ugc" className="link-slide kicker text-accent">
            {PLATFORM_LABELS[platform] ?? platform}
            <span className="sr-only"> ({safeHost(href)}, opens in a new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  )
}

function Profile({ username }) {
  const { user: me } = useAuth()
  const [page, setPage] = useState(1)
  const { data: profile, isPending, error } = useProfile(username)
  const posts = useProfilePosts(username, page)

  const path = `/u/${encodeURIComponent(username)}`
  const summary = profile ? describe(profile.bio || `Stories by ${profile.username} on ${SITE_NAME}.`) : null
  // a profile with nothing published is not worth indexing
  useSeo(
    profile
      ? {
          title: profile.username,
          description: summary,
          path,
          type: 'profile',
          image: profile.avatarUrl ?? undefined,
          imageAlt: profile.avatarUrl ? `${profile.username}'s photo` : undefined,
          robots: profile.postCount > 0 ? 'index,follow' : 'noindex,follow',
          jsonLd: collectionJsonLd({
            name: profile.username,
            description: summary,
            path,
            trail: [[SITE_NAME, '/'], [profile.username, path]],
            extra: [personJsonLd(profile, path)],
          }),
        }
      : null,
  )

  if (isPending) return <ArticleSkeleton />
  if (error?.status === 404) return <NotFoundPage />
  if (error)
    return (
      <div className="mx-auto max-w-[68ch] px-4 py-12 sm:px-6">
        <ErrorMessage error={error} />
      </div>
    )

  const isMe = me && me.userName?.toLowerCase() === profile.username.toLowerCase()
  const pagination = posts.data?.pagination

  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16">
      <header className="flex flex-col gap-6 border-b border-ink pb-8 sm:flex-row sm:items-center">
        <Avatar user={profile} size="xl" alt={`${profile.username}'s profile photo`} />
        <div className="min-w-0">
          <p className="kicker text-accent">Author</p>
          <h1 className="mt-1 text-4xl leading-none font-semibold tracking-[-0.02em] break-words sm:text-5xl">{profile.username}</h1>
          <p className="kicker mt-3 text-ink-soft">
            Joined{' '}
            <time dateTime={profile.joinedAt}>
              {new Date(profile.joinedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}
            </time>
          </p>
          <p className="kicker mt-3 flex flex-wrap gap-x-5 text-ink-soft">
            <Link to={`/u/${encodeURIComponent(profile.username)}/followers`} className="link-slide hover:text-accent">
              {profile.followerCount ?? 0} {profile.followerCount === 1 ? 'follower' : 'followers'}
            </Link>
            <Link to={`/u/${encodeURIComponent(profile.username)}/following`} className="link-slide hover:text-accent">
              {profile.followingCount ?? 0} following
            </Link>
          </p>
          {isMe ? (
            <Link to="/settings" className={`${buttonClass('secondary')} mt-4`}>
              Edit profile
            </Link>
          ) : (
            <div className="mt-4">
              <FollowButton username={profile.username} following={Boolean(profile.viewer?.following)} />
              <div className="mt-3">
                <ReportButton targetType="user" targetId={profile.username} noun="person" />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* plain text on purpose: a bio is never rendered as HTML */}
      {profile.bio && <p className="mt-8 font-serif text-xl leading-relaxed whitespace-pre-line">{profile.bio}</p>}
      <SocialLinks links={profile.socialLinks} />

      <section aria-labelledby="stories-heading" className="mt-12">
        <div className="flex items-baseline gap-4 border-t-2 border-ink pt-3">
          <h2 id="stories-heading" className="kicker text-ink">
            Stories
          </h2>
          <span className="h-px flex-1 bg-rule" aria-hidden="true" />
          <span className="kicker text-ink-soft">{profile.postCount}</span>
        </div>

        {posts.isPending ? (
          <p role="status" className="py-8 text-ink-soft">
            Loading stories…
          </p>
        ) : posts.error ? (
          <div className="py-6">
            <ErrorMessage error={posts.error} />
          </div>
        ) : posts.data.posts.length === 0 ? (
          <p className="py-10 font-serif text-xl text-ink-soft italic">No published stories yet.</p>
        ) : (
          <div className="divide-y divide-rule">
            {posts.data.posts.map((post, i) => (
              <PostCard key={post.id} post={post} index={(page - 1) * PAGE_SIZE + i + 1} />
            ))}
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <nav aria-label="Stories pages" className="mt-6 flex items-center justify-between gap-4 border-t border-rule pt-5">
            <Button variant="secondary" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
              ← Newer
            </Button>
            <span className="kicker text-ink-soft">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button variant="secondary" onClick={() => setPage((p) => p + 1)} disabled={page >= pagination.totalPages}>
              Older →
            </Button>
          </nav>
        )}
      </section>
    </div>
  )
}

// keyed by username so moving from one profile to another starts on page 1
export default function ProfilePage() {
  const { username } = useParams()
  return <Profile key={username.toLowerCase()} username={username} />
}
