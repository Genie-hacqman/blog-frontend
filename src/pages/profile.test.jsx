import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ProfilePage from './ProfilePage.jsx'
import SettingsPage from './SettingsPage.jsx'
import HomePage from './HomePage.jsx'
import PostPage from './PostPage.jsx'
import RegisterPage from './RegisterPage.jsx'
import Avatar from '../components/Avatar.jsx'
import ProtectedRoute from '../auth/ProtectedRoute.jsx'
import { errorResponse, mockFetch, okResponse, pageResponse, readerUser, renderWithProviders, settle } from '../test/utils.jsx'

const profile = {
  username: 'ada_l',
  bio: 'I write about engines.\nAnd looms.',
  avatarUrl: '/media/u/1/abc.webp',
  socialLinks: { github: 'https://github.com/ada', website: 'https://ada.example.com' },
  joinedAt: '2026-03-15T00:00:00.000Z',
  postCount: 2,
}

const preview = (id, title, author = { id: 1, username: 'ada_l', avatarUrl: null }) => ({
  id,
  slug: `story-${id}`,
  status: 'published',
  publishedAt: '2026-01-01T00:00:00.000Z',
  title,
  excerpt: `${title} excerpt`,
  readingTime: 2,
  author,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
})

const pagination = (page, totalPages) => ({ page, limit: 10, total: totalPages * 10, totalPages })
const postsResponse = (posts, p = pagination(1, 1)) => jsonResponseWithMeta({ posts }, { pagination: p })
const jsonResponseWithMeta = (data, meta) =>
  Promise.resolve(new Response(JSON.stringify({ success: true, data, meta }), { status: 200 }))

const renderProfile = (username = 'ada_l') =>
  renderWithProviders(<ProfilePage />, { route: `/u/${username}`, path: '/u/:username' })

const bodyOf = (fetchMock, method, path) => {
  const call = fetchMock.mock.calls.find(([url, init]) => url.endsWith(path) && (init?.method ?? 'GET') === method)
  return call && (typeof call[1].body === 'string' ? JSON.parse(call[1].body) : call[1].body)
}

describe('Avatar', () => {
  it('shows the photo, or the first letter when there is none', () => {
    const { rerender } = renderWithProviders(<Avatar user={{ username: 'ada', avatarUrl: '/media/x.webp' }} alt="Ada's photo" />)
    expect(screen.getByRole('img', { name: "Ada's photo" })).toHaveAttribute('src', '/media/x.webp')

    rerender(<Avatar user={{ username: 'ada', avatarUrl: null }} />)
    expect(screen.getByText('a')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})

describe('ProfilePage', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shows the public profile and the author’s stories to a visitor', async () => {
    mockFetch({
      'GET /api/users/ada_l': () => okResponse(200, { user: profile }),
      'GET /api/users/ada_l/posts': () => postsResponse([preview(1, 'First'), preview(2, 'Second')]),
    })
    renderProfile()

    expect(await screen.findByRole('heading', { name: 'ada_l' })).toBeInTheDocument()
    expect(screen.getByText(/I write about engines/)).toBeInTheDocument()
    expect(screen.getByText(/March 2026/)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: "ada_l's profile photo" })).toHaveAttribute('src', '/media/u/1/abc.webp')
    expect(await screen.findByText('First excerpt')).toBeInTheDocument()
    expect(screen.getByText('Second excerpt')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Edit profile' })).not.toBeInTheDocument()
  })

  it('opens social links safely in a new tab', async () => {
    mockFetch({
      'GET /api/users/ada_l': () => okResponse(200, { user: profile }),
      'GET /api/users/ada_l/posts': () => postsResponse([]),
    })
    renderProfile()

    const github = await screen.findByRole('link', { name: /GitHub/ })
    expect(github).toHaveAttribute('href', 'https://github.com/ada')
    expect(github).toHaveAttribute('target', '_blank')
    for (const token of ['noopener', 'noreferrer', 'nofollow', 'ugc']) {
      expect(github.getAttribute('rel')).toContain(token)
    }
  })

  it('never renders a link that is not https, whatever the server sent', async () => {
    const hostile = { ...profile, socialLinks: { website: 'javascript:alert(1)', github: 'http://github.com/a', twitter: 'https://x.com/a' } }
    mockFetch({
      'GET /api/users/ada_l': () => okResponse(200, { user: hostile }),
      'GET /api/users/ada_l/posts': () => postsResponse([]),
    })
    renderProfile()

    await screen.findByRole('heading', { name: 'ada_l' })
    const links = screen.getAllByRole('link').filter((link) => link.getAttribute('target') === '_blank')
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['https://x.com/a'])
  })

  it('renders a bio as text, never as HTML', async () => {
    mockFetch({
      'GET /api/users/ada_l': () => okResponse(200, { user: { ...profile, bio: '<img src=x onerror=alert(1)>' } }),
      'GET /api/users/ada_l/posts': () => postsResponse([]),
    })
    renderProfile()

    expect(await screen.findByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
    expect(document.querySelector('img[src="x"]')).toBeNull()
  })

  it('says so when there are no stories yet', async () => {
    mockFetch({
      'GET /api/users/ada_l': () => okResponse(200, { user: { ...profile, postCount: 0 } }),
      'GET /api/users/ada_l/posts': () => postsResponse([]),
    })
    renderProfile()

    expect(await screen.findByText('No published stories yet.')).toBeInTheDocument()
  })

  it('shows the 404 page for an unknown or deleted user', async () => {
    mockFetch({
      'GET /api/users/ghost': () => errorResponse(404, 'NOT_FOUND', 'User not found'),
      'GET /api/users/ghost/posts': () => errorResponse(404, 'NOT_FOUND', 'User not found'),
    })
    renderProfile('ghost')

    expect(await screen.findByText('404')).toBeInTheDocument()
  })

  it('pages through the stories', async () => {
    const fetchMock = mockFetch({
      'GET /api/users/ada_l': () => okResponse(200, { user: { ...profile, postCount: 12 } }),
      'GET /api/users/ada_l/posts': () => postsResponse([preview(1, 'Page one story')], pagination(1, 2)),
    })
    renderProfile()

    expect(await screen.findByText('Page one story excerpt')).toBeInTheDocument()
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Newer/ })).toBeDisabled()

    fetchMock.mockImplementation((url) => {
      if (url.includes('/posts?page=2')) return postsResponse([preview(11, 'Page two story')], pagination(2, 2))
      return okResponse(200, { user: profile })
    })
    await userEvent.click(screen.getByRole('button', { name: /Older/ }))

    expect(await screen.findByText('Page two story excerpt')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Older/ })).toBeDisabled()
  })

  it('offers the owner a way to edit their profile', async () => {
    mockFetch(
      {
        'GET /api/users/ada_l': () => okResponse(200, { user: profile }),
        'GET /api/users/ada_l/posts': () => postsResponse([]),
      },
      { user: { ...readerUser, userName: 'Ada_L' } },
    )
    renderProfile()

    expect(await screen.findByRole('link', { name: 'Edit profile' })).toHaveAttribute('href', '/settings')
  })
})

describe('bylines', () => {
  afterEach(() => vi.restoreAllMocks())

  it('link authors to their profile and show their photo on the front page', async () => {
    mockFetch({
      'GET /api/posts': () =>
        pageResponse([preview(1, 'Lead story', { id: 1, username: 'ada_l', avatarUrl: '/media/u/1/a.webp' })]),
    })
    renderWithProviders(<HomePage />)

    const link = await screen.findByRole('link', { name: 'ada_l' })
    expect(link).toHaveAttribute('href', '/u/ada_l')
    expect(document.querySelector('img[src="/media/u/1/a.webp"]')).not.toBeNull()
  })

  it('show “Deleted user” as plain text, with no profile link', async () => {
    mockFetch({
      'GET /api/posts': () =>
        pageResponse([preview(1, 'Orphaned story', { id: 9, username: 'Deleted user', avatarUrl: null, deleted: true })]),
    })
    renderWithProviders(<HomePage />)

    expect(await screen.findByText('Deleted user')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Deleted user' })).not.toBeInTheDocument()
  })

  it('link the author on the article page too', async () => {
    const post = { ...preview(7, 'My post'), content: 'The whole story.', actions: [] }
    mockFetch({ 'GET /api/posts/slug/story-7': () => okResponse(200, { post }) })
    renderWithProviders(<PostPage by="slug" />, { route: '/blog/story-7', path: '/blog/:slug' })

    expect(await screen.findByRole('link', { name: 'ada_l' })).toHaveAttribute('href', '/u/ada_l')
  })
})

describe('SettingsPage', () => {
  afterEach(() => vi.restoreAllMocks())

  const me = { ...readerUser, userName: 'bob', bio: 'Hello there', socialLinks: { github: 'https://github.com/bob' }, avatarUrl: null }
  const renderSettings = (routes) =>
    renderWithProviders(
      <ProtectedRoute>
        <SettingsPage />
      </ProtectedRoute>,
      { route: '/settings', path: '/settings', routes },
    )

  it('starts from the saved profile and saves changes', async () => {
    const fetchMock = mockFetch(
      {
        'PATCH /api/users/me': () =>
          okResponse(200, { user: { ...me, bio: 'New bio', socialLinks: { github: 'https://github.com/bob', website: 'https://bob.dev' } } }),
      },
      { user: me },
    )
    renderSettings()

    const bio = await screen.findByLabelText('Bio')
    expect(bio).toHaveValue('Hello there')
    expect(screen.getByLabelText('GitHub')).toHaveValue('https://github.com/bob')

    await userEvent.clear(bio)
    await userEvent.type(bio, 'New bio')
    await userEvent.type(screen.getByLabelText('Website'), 'https://bob.dev')
    await userEvent.click(screen.getByRole('button', { name: 'Save profile' }))

    expect(await screen.findByText('Your profile was updated.')).toBeInTheDocument()
    const sent = bodyOf(fetchMock, 'PATCH', '/api/users/me')
    expect(sent.bio).toBe('New bio')
    expect(sent.socialLinks.website).toBe('https://bob.dev')
    expect(sent.socialLinks.github).toBe('https://github.com/bob')
  })

  it('checks links and bio length before calling the API', async () => {
    const fetchMock = mockFetch({}, { user: me })
    renderSettings()
    await screen.findByLabelText('Bio')
    fetchMock.mockClear()

    await userEvent.clear(screen.getByLabelText('Website'))
    await userEvent.type(screen.getByLabelText('Website'), 'javascript:alert(1)')
    await userEvent.click(screen.getByRole('button', { name: 'Save profile' }))

    expect(await screen.findByText('Enter a full https:// link')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows what the server rejected, such as a link to the wrong site', async () => {
    mockFetch(
      { 'PATCH /api/users/me': () => errorResponse(400, 'VALIDATION_ERROR', 'github must link to github.com') },
      { user: me },
    )
    renderSettings()

    await userEvent.type(await screen.findByLabelText('X / Twitter'), 'https://github.com/bob')
    await userEvent.click(screen.getByRole('button', { name: 'Save profile' }))

    expect(await screen.findByText('github must link to github.com')).toBeInTheDocument()
  })

  it('uploads a chosen photo as multipart and shows it', async () => {
    const withPhoto = { ...me, avatarUrl: '/media/u/2/new.webp' }
    const fetchMock = mockFetch({ 'PUT /api/users/me/avatar': () => okResponse(200, { user: withPhoto }) }, { user: me })
    renderSettings()

    const file = new File(['pixels'], 'me.png', { type: 'image/png' })
    await userEvent.upload(await screen.findByLabelText('Choose a profile photo'), file)

    await waitFor(() => expect(document.querySelector('img[src="/media/u/2/new.webp"]')).not.toBeNull())
    const body = bodyOf(fetchMock, 'PUT', '/api/users/me/avatar')
    expect(body).toBeInstanceOf(FormData)
    expect(body.get('file')).toBeInstanceOf(File)
    expect(screen.getByRole('button', { name: 'Remove photo' })).toBeInTheDocument()
  })

  it('refuses the wrong file type or an oversized image without uploading', async () => {
    const fetchMock = mockFetch({}, { user: me })
    renderSettings()
    const input = await screen.findByLabelText('Choose a profile photo')
    fetchMock.mockClear()

    await userEvent.upload(input, new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' }), { applyAccept: false })
    expect(await screen.findByText('Choose a JPEG, PNG, WebP or GIF image.')).toBeInTheDocument()

    const big = new File(['x'], 'big.png', { type: 'image/png' })
    Object.defineProperty(big, 'size', { value: 6 * 1024 * 1024 })
    await userEvent.upload(input, big)
    expect(await screen.findByText('That image is larger than 5 MB.')).toBeInTheDocument()

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows the server’s verdict on an upload it rejects', async () => {
    mockFetch({ 'PUT /api/users/me/avatar': () => errorResponse(415, 'UNSUPPORTED_MEDIA_TYPE', 'Only JPEG, PNG, WebP and GIF images are allowed') }, { user: me })
    renderSettings()

    await userEvent.upload(await screen.findByLabelText('Choose a profile photo'), new File(['x'], 'fake.png', { type: 'image/png' }))

    expect(await screen.findByText('Only JPEG, PNG, WebP and GIF images are allowed')).toBeInTheDocument()
  })

  it('removes the photo', async () => {
    const fetchMock = mockFetch({ 'DELETE /api/users/me/avatar': () => okResponse(200, { user: { ...me, avatarUrl: null } }) }, { user: { ...me, avatarUrl: '/media/u/2/x.webp' } })
    renderSettings()

    await userEvent.click(await screen.findByRole('button', { name: 'Remove photo' }))

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Remove photo' })).not.toBeInTheDocument())
    expect(fetchMock.mock.calls.some(([url, init]) => url.endsWith('/api/users/me/avatar') && init.method === 'DELETE')).toBe(true)
  })

  it('deletes the account only after a password is entered, then signs out and says so', async () => {
    const fetchMock = mockFetch(
      {
        'DELETE /api/users/me': () => okResponse(200),
        'POST /api/auth/logout': () => okResponse(200),
        'GET /api/posts': () => pageResponse([]),
      },
      { user: me },
    )
    renderSettings(<Route path="/" element={<HomePage />} />)

    await userEvent.click(await screen.findByRole('button', { name: 'Delete account…' }))
    expect(screen.getByText(/stay on the site under the name/)).toBeInTheDocument()

    // no password: nothing is sent
    await userEvent.click(screen.getByRole('button', { name: 'Delete my account' }))
    expect(await screen.findByText('Enter your password to confirm')).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false)

    await userEvent.type(screen.getByLabelText('Your password'), 'my password')
    await userEvent.click(screen.getByRole('button', { name: 'Delete my account' }))

    expect(await screen.findByText(/Your account has been deleted/)).toBeInTheDocument()
    expect(bodyOf(fetchMock, 'DELETE', '/api/users/me')).toEqual({ password: 'my password' })
    expect(localStorage.getItem('blog.session')).toBeNull()
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/)
  })

  it('keeps the account and shows the error when the password is wrong', async () => {
    mockFetch({ 'DELETE /api/users/me': () => errorResponse(400, 'INVALID_PASSWORD', 'Password is incorrect') }, { user: me })
    renderSettings()

    await userEvent.click(await screen.findByRole('button', { name: 'Delete account…' }))
    await userEvent.type(screen.getByLabelText('Your password'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: 'Delete my account' }))

    expect(await screen.findByText('Password is incorrect')).toBeInTheDocument()
    expect(localStorage.getItem('blog.session')).toBe('1')
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
  })

  it('needs a signed-in user', async () => {
    mockFetch()
    renderSettings(<Route path="/login" element={<p>login page</p>} />)

    expect(await screen.findByText('login page')).toBeInTheDocument()
    await settle()
  })
})

describe('RegisterPage username rule', () => {
  afterEach(() => vi.restoreAllMocks())

  it('explains the username rules before calling the API', async () => {
    const fetchMock = mockFetch()
    renderWithProviders(<RegisterPage />)

    await userEvent.type(screen.getByLabelText('First name'), 'Ada')
    await userEvent.type(screen.getByLabelText('Last name'), 'Lovelace')
    await userEvent.type(screen.getByLabelText('Username'), 'a b')
    await userEvent.type(screen.getByLabelText('Email'), 'ada@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: 'Sign up' }))

    expect(await screen.findByText('Letters, numbers and underscores only')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
