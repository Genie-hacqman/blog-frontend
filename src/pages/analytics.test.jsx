import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AdminAnalyticsPage from './AdminAnalyticsPage.jsx'
import AdminDashboardPage from './AdminDashboardPage.jsx'
import MyPostsPage from './MyPostsPage.jsx'
import MyStatsPage from './MyStatsPage.jsx'
import StoryStatsPage from './StoryStatsPage.jsx'
import BarChart from '../components/BarChart.jsx'
import Navbar from '../components/Navbar.jsx'
import RequireRole from '../auth/RequireRole.jsx'
import { errorResponse, mockFetch, okResponse, pageResponse, readerUser, renderWithProviders } from '../test/utils.jsx'

const reader = { ...readerUser, id: 2, userName: 'bob', role: 'user' }
const author = { ...readerUser, id: 3, userName: 'ada', role: 'author' }
const admin = { ...readerUser, id: 4, userName: 'root', role: 'admin' }

afterEach(() => vi.restoreAllMocks())

const days = (n, make) =>
  Array.from({ length: n }, (_, i) => ({ day: `2026-03-${String(i + 1).padStart(2, '0')}`, views: 0, visitors: 0, reads: 0, ...make?.(i) }))

const totals = { views: 120, visitors: 80, reads: 20, avgReadSeconds: 95, readRate: 0.25 }

const mine = (overrides = {}) => ({
  range: { days: 30 },
  totals,
  series: days(7, (i) => ({ views: i === 3 ? 50 : i })),
  stories: [
    { id: 11, title: 'First story', slug: 'first-story', views: 90, visitors: 60, reads: 15, avgReadSeconds: 100 },
    { id: 12, title: 'Second story', slug: 'second-story', views: 30, visitors: 20, reads: 5, avgReadSeconds: null },
  ],
  sources: [
    { host: 'news.example.com', views: 30 },
    { host: '(direct)', views: 60 },
  ],
  reactions: { likes: 14, comments: 6 },
  ...overrides,
})

const calls = (fetchMock, suffix) => fetchMock.mock.calls.filter(([url]) => url.includes(suffix))

describe('the chart', () => {
  const series = days(3, (i) => ({ views: [0, 5, 2][i] }))

  it('describes itself in words and offers the same numbers as a table', async () => {
    renderWithProviders(<BarChart series={series} metric="views" label="Views" />)
    expect(screen.getByRole('img', { name: /Views: 7 in these 3 days, most on .* \(5\)/ })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Show as table' }))
    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('row')).toHaveLength(4)
    expect(within(table).getByText('5')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Show as chart' }))
    expect(screen.getByRole('img')).toBeInTheDocument()
  })

  it('says so when there is nothing to draw', () => {
    renderWithProviders(<BarChart series={days(7)} metric="views" label="Views" />)
    expect(screen.getByRole('img', { name: 'Views: none in these 7 days.' })).toBeInTheDocument()
  })
})

describe('my statistics', () => {
  const render = () => renderWithProviders(<MyStatsPage />, { route: '/me/stats', path: '/me/stats' })

  it('shows the tiles, the stories with links to their own numbers, and where readers came from', async () => {
    mockFetch({ 'GET /api/analytics/me': () => okResponse(200, { analytics: mine() }) }, { user: author })
    render()

    await screen.findByRole('link', { name: 'First story' })
    const tiles = screen.getAllByRole('term').map((term) => [term.textContent, term.nextElementSibling.textContent])
    expect(tiles).toEqual([
      ['Views', '120'],
      ['Visitors', '80'],
      ['Reads', '20'],
      ['Average time', '1:35'],
      ['Likes', '14'],
      ['Comments', '6'],
    ])
    expect(screen.getByText(/a person on three days counts three times/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'First story' })).toHaveAttribute('href', '/posts/11/stats')
    expect(screen.getByRole('link', { name: 'Second story' })).toHaveAttribute('href', '/posts/12/stats')
    expect(screen.getByText('news.example.com')).toBeInTheDocument()
    expect(screen.getByText('(direct)')).toBeInTheDocument()
  })

  it('asks again for another period and keeps the old numbers up meanwhile', async () => {
    const fetchMock = mockFetch({ 'GET /api/analytics/me': () => okResponse(200, { analytics: mine() }) }, { user: author })
    render()
    await screen.findByRole('heading', { name: 'Statistics' })
    expect(calls(fetchMock, '/api/analytics/me?days=30')).toHaveLength(1)

    await userEvent.click(screen.getByRole('button', { name: '90 days' }))
    expect(screen.getByRole('button', { name: '90 days' })).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => expect(calls(fetchMock, '/api/analytics/me?days=90')).toHaveLength(1))
  })

  it('switches what the chart shows', async () => {
    mockFetch({ 'GET /api/analytics/me': () => okResponse(200, { analytics: mine() }) }, { user: author })
    render()
    expect(await screen.findByRole('img', { name: /^Views:/ })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reads' }))
    expect(screen.getByRole('img', { name: /^Reads: none/ })).toBeInTheDocument()
  })

  it('has an honest empty state and explains how counting works', async () => {
    mockFetch(
      {
        'GET /api/analytics/me': () =>
          okResponse(200, {
            analytics: mine({
              totals: { views: 0, visitors: 0, reads: 0, avgReadSeconds: null, readRate: null },
              stories: [],
              sources: [],
              reactions: { likes: 0, comments: 0 },
            }),
          }),
      },
      { user: author },
    )
    render()
    expect(await screen.findByText('You have no published stories yet.')).toBeInTheDocument()
    expect(screen.getByText('No views yet in this period.')).toBeInTheDocument()
    expect(screen.getByText('How these numbers are counted')).toBeInTheDocument()
    expect(screen.getByText(/Nothing identifying is stored/)).toBeInTheDocument()
    expect(screen.getByText(/someone with many addresses could still inflate a number/)).toBeInTheDocument()
  })

  it('shows the error and not a blank page when the request fails', async () => {
    mockFetch({ 'GET /api/analytics/me': () => errorResponse(500, 'INTERNAL_ERROR', 'Something went wrong') }, { user: author })
    render()
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong')
    expect(screen.getByRole('heading', { name: 'Statistics' })).toBeInTheDocument()
  })

  it('shows a hostile referrer as plain text', async () => {
    const hostile = '<img src=x onerror=alert(1)>.example.com'
    mockFetch(
      { 'GET /api/analytics/me': () => okResponse(200, { analytics: mine({ sources: [{ host: hostile, views: 3 }] }) }) },
      { user: author },
    )
    const { container } = render()
    expect(await screen.findByText(hostile)).toBeInTheDocument()
    expect(container.querySelector('img[src="x"]')).toBeNull()
  })
})

describe('statistics of one story', () => {
  const story = (overrides = {}) => ({
    post: { id: 11, title: 'First story', slug: 'first-story', status: 'published' },
    range: { days: 30 },
    totals,
    series: days(7, (i) => ({ views: i })),
    sources: [{ host: 'news.example.com', views: 9 }],
    reactions: { likes: 4, comments: 2, bookmarks: 3 },
    ...overrides,
  })
  const render = () =>
    renderWithProviders(<StoryStatsPage />, { route: '/posts/11/stats', path: '/posts/:id/stats', routes: <Route path="/me/stats" element={<p>my stats</p>} /> })

  it('shows the figures, the reading rate, the sources and a way back', async () => {
    mockFetch({ 'GET /api/analytics/posts/11': () => okResponse(200, { analytics: story() }) }, { user: author })
    render()

    expect(await screen.findByRole('heading', { name: 'First story' })).toBeInTheDocument()
    expect(screen.getByText('25% of visitors got most of the way through.')).toBeInTheDocument()
    expect(screen.getByText('news.example.com')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Read the story' })).toHaveAttribute('href', '/blog/first-story')
    expect(screen.getByRole('link', { name: '← All statistics' })).toHaveAttribute('href', '/me/stats')
  })

  it('does not offer a link to read a story that is not public', async () => {
    mockFetch(
      { 'GET /api/analytics/posts/11': () => okResponse(200, { analytics: story({ post: { id: 11, title: 'Hidden', slug: 'hidden', status: 'archived' } }) }) },
      { user: author },
    )
    render()
    await screen.findByRole('heading', { name: 'Hidden' })
    expect(screen.queryByRole('link', { name: 'Read the story' })).not.toBeInTheDocument()
  })

  it('answers someone else’s story like one that does not exist', async () => {
    mockFetch({ 'GET /api/analytics/posts/11': () => errorResponse(404, 'NOT_FOUND', 'Story not found') }, { user: author })
    render()
    expect(await screen.findByText(/not found|doesn.t exist|couldn.t find/i)).toBeInTheDocument()
    expect(screen.queryByText('Views')).not.toBeInTheDocument()
  })
})

describe('site analytics', () => {
  const site = () => ({
    range: { days: 30 },
    totals: { ...totals, signups: 9, comments: 33, published: 5 },
    series: days(7, (i) => ({ views: i, visitors: i, reads: 0, signups: i === 2 ? 4 : 0, comments: 0, published: 0 })),
    stories: [{ id: 11, title: 'Top story', slug: 'top-story', views: 70, visitors: 40, reads: 9 }],
    authors: [{ id: 3, username: 'ada', views: 70, visitors: 40, reads: 9 }],
    sources: [{ host: 'news.example.com', views: 30 }],
  })
  const render = () => renderWithProviders(<AdminAnalyticsPage />, { route: '/admin/analytics', path: '/admin/analytics' })

  it('shows traffic and growth, the top stories and authors, and the sources', async () => {
    mockFetch({ 'GET /api/admin/analytics': () => okResponse(200, { analytics: site() }) }, { user: admin })
    render()

    await screen.findByRole('link', { name: 'Top story' })
    const tiles = Object.fromEntries(screen.getAllByRole('term').map((term) => [term.textContent, term.nextElementSibling.textContent]))
    expect(tiles).toMatchObject({ Views: '120', 'New accounts': '9', Comments: '33', 'Stories published': '5' })
    expect(screen.getByRole('link', { name: 'Top story' })).toHaveAttribute('href', '/posts/11/stats')
    expect(screen.getByRole('link', { name: 'ada' })).toHaveAttribute('href', '/u/ada')
    expect(screen.getByText('news.example.com')).toBeInTheDocument()
  })

  it('draws growth as well as reading', async () => {
    mockFetch({ 'GET /api/admin/analytics': () => okResponse(200, { analytics: site() }) }, { user: admin })
    render()
    await userEvent.click(await screen.findByRole('button', { name: 'New accounts' }))
    expect(screen.getByRole('img', { name: /^New accounts: 4 in these 7 days/ })).toBeInTheDocument()
  })

  it('shows the error and not a blank page', async () => {
    mockFetch({ 'GET /api/admin/analytics': () => errorResponse(500, 'INTERNAL_ERROR', 'Something went wrong') }, { user: admin })
    render()
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong')
  })
})

describe('who gets to the pages', () => {
  const gated = (role, user, Page) => {
    mockFetch({ 'GET /api/analytics/me': () => okResponse(200, { analytics: mine() }), 'GET /api/admin/analytics': () => okResponse(200, { analytics: {} }) }, { user })
    return renderWithProviders(
      <RequireRole role={role}>
        <Page />
      </RequireRole>,
      { route: '/x', path: '/x' },
    )
  }

  it('keeps readers out of my statistics', async () => {
    gated('author', reader, MyStatsPage)
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Statistics' })).not.toBeInTheDocument())
    expect(screen.queryByText('Views')).not.toBeInTheDocument()
  })

  it('lets authors in', async () => {
    gated('author', author, MyStatsPage)
    expect(await screen.findByRole('heading', { name: 'Statistics' })).toBeInTheDocument()
  })

  it('keeps authors out of site analytics', async () => {
    gated('admin', author, AdminAnalyticsPage)
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Site analytics' })).not.toBeInTheDocument())
  })
})

describe('the links', () => {
  it('shows authors a Stats link in the navigation, and readers none', async () => {
    mockFetch({ 'GET /api/notifications/unread-count': () => okResponse(200, { count: 0 }) }, { user: author })
    const { unmount } = renderWithProviders(<Navbar />)
    expect(await screen.findAllByRole('link', { name: 'Stats' })).not.toHaveLength(0)
    unmount()

    mockFetch({ 'GET /api/notifications/unread-count': () => okResponse(200, { count: 0 }) }, { user: reader })
    renderWithProviders(<Navbar />)
    await screen.findAllByRole('link', { name: 'Following' })
    expect(screen.queryByRole('link', { name: 'Stats' })).not.toBeInTheDocument()
  })

  it('links the admin overview to site analytics', async () => {
    mockFetch(
      {
        'GET /api/admin/stats': () =>
          okResponse(200, {
            stats: {
              users: { total: 1, active: 1, suspended: 0, deleted: 0, byRole: {}, newLast7Days: 0, newLast30Days: 0 },
              posts: { total: 0, byStatus: {}, publishedLast30Days: 0 },
              comments: { total: 0, last7Days: 0 },
              reports: { openTargets: 0 },
              reviewQueue: 0,
              recentActivity: [],
            },
          }),
      },
      { user: admin },
    )
    renderWithProviders(<AdminDashboardPage />, { route: '/admin', path: '/admin' })
    expect(await screen.findByRole('link', { name: 'Analytics' })).toHaveAttribute('href', '/admin/analytics')
  })

  it('links a published story in My stories to its numbers, and a draft not', async () => {
    const base = { excerpt: '', readingTime: 1, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', actions: [], tags: [], category: null }
    mockFetch(
      {
        'GET /api/posts/mine': () =>
          pageResponse([
            { ...base, id: 11, slug: 'pub', title: 'Published one', status: 'published', publishedAt: '2026-01-01T00:00:00.000Z' },
            { ...base, id: 12, slug: 'dr', title: 'Draft one', status: 'draft' },
          ]),
      },
      { user: author },
    )
    renderWithProviders(<MyPostsPage />, { route: '/me/posts', path: '/me/posts' })
    await screen.findByText('Published one')
    const links = screen.getAllByRole('link', { name: 'Stats' })
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAttribute('href', '/posts/11/stats')
  })
})
