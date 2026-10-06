import { useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './auth/AuthContext.jsx'
import ProtectedRoute from './auth/ProtectedRoute.jsx'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import HomePage from './pages/HomePage.jsx'
import PostPage from './pages/PostPage.jsx'
import NewPostPage from './pages/NewPostPage.jsx'
import EditPostPage from './pages/EditPostPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx'
import ResetPasswordPage from './pages/ResetPasswordPage.jsx'
import VerifyEmailPage from './pages/VerifyEmailPage.jsx'
import ChangePasswordPage from './pages/ChangePasswordPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import MyPostsPage from './pages/MyPostsPage.jsx'
import ReviewQueuePage from './pages/ReviewQueuePage.jsx'
import RevisionsPage from './pages/RevisionsPage.jsx'
import TaxonomyPage from './pages/TaxonomyPage.jsx'
import SearchPage from './pages/SearchPage.jsx'
import ManageCategoriesPage from './pages/ManageCategoriesPage.jsx'
import RequireRole from './auth/RequireRole.jsx'
import VerificationBanner from './components/VerificationBanner.jsx'
import FeedPage from './pages/FeedPage.jsx'
import BookmarksPage from './pages/BookmarksPage.jsx'
import PeoplePage from './pages/PeoplePage.jsx'
import NotificationsPage from './pages/NotificationsPage.jsx'
import UnsubscribePage from './pages/UnsubscribePage.jsx'
import ModerationQueuePage from './pages/ModerationQueuePage.jsx'
import AdminDashboardPage from './pages/AdminDashboardPage.jsx'
import AdminUsersPage from './pages/AdminUsersPage.jsx'
import AuditLogPage from './pages/AuditLogPage.jsx'
import MyStatsPage from './pages/MyStatsPage.jsx'
import StoryStatsPage from './pages/StoryStatsPage.jsx'
import AdminAnalyticsPage from './pages/AdminAnalyticsPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'

const queryClient = new QueryClient({
  defaultOptions: {
    // don't retry client errors like 404/403; do retry transient failures once
    queries: { retry: (count, error) => (error.status ?? 500) >= 500 && count < 1 },
  },
})

function ScrollToTop() {
  const { pathname } = useLocation()
  // block body on purpose: scrollTo returns a Promise in modern browsers, and an effect
  // must return only a cleanup function or nothing
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <div id="top" className="flex min-h-screen flex-col">
            <Navbar />
            <VerificationBanner />
            {/* each page sets its own width: wide grid for the front page, a reading column for articles */}
            <main id="main" className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/u/:username" element={<ProfilePage />} />
                <Route path="/u/:username/followers" element={<PeoplePage kind="followers" />} />
                <Route path="/u/:username/following" element={<PeoplePage kind="following" />} />
                <Route path="/category/:slug" element={<TaxonomyPage kind="category" />} />
                <Route path="/tag/:slug" element={<TaxonomyPage kind="tag" />} />
                <Route path="/search" element={<SearchPage />} />
                <Route
                  path="/manage/categories"
                  element={
                    <ProtectedRoute>
                      <RequireRole role="editor">
                        <ManageCategoriesPage />
                      </RequireRole>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <SettingsPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                <Route
                  path="/account/password"
                  element={
                    <ProtectedRoute>
                      <ChangePasswordPage />
                    </ProtectedRoute>
                  }
                />
                {/* a published story is public at its own address; /posts/:id is the private preview for authors and editors */}
                <Route path="/blog/:slug" element={<PostPage by="slug" />} />
                <Route
                  path="/posts/:id"
                  element={
                    <ProtectedRoute>
                      <PostPage by="id" />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/posts/new"
                  element={
                    <ProtectedRoute>
                      <NewPostPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/posts/:id/edit"
                  element={
                    <ProtectedRoute>
                      <EditPostPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/posts/:id/revisions"
                  element={
                    <ProtectedRoute>
                      <RevisionsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/me/posts"
                  element={
                    <ProtectedRoute>
                      <MyPostsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/notifications"
                  element={
                    <ProtectedRoute>
                      <NotificationsPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/unsubscribe" element={<UnsubscribePage />} />
                <Route
                  path="/feed"
                  element={
                    <ProtectedRoute>
                      <FeedPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/me/stats"
                  element={
                    <ProtectedRoute>
                      <RequireRole role="author">
                        <MyStatsPage />
                      </RequireRole>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/posts/:id/stats"
                  element={
                    <ProtectedRoute>
                      <RequireRole role="author">
                        <StoryStatsPage />
                      </RequireRole>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/me/bookmarks"
                  element={
                    <ProtectedRoute>
                      <BookmarksPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/moderation"
                  element={
                    <ProtectedRoute>
                      <RequireRole role="editor">
                        <ModerationQueuePage />
                      </RequireRole>
                    </ProtectedRoute>
                  }
                />
                {['/admin', '/admin/users', '/admin/audit', '/admin/analytics'].map((path) => (
                  <Route
                    key={path}
                    path={path}
                    element={
                      <ProtectedRoute>
                        <RequireRole role="admin">
                          {path === '/admin' ? <AdminDashboardPage /> : path === '/admin/users' ? <AdminUsersPage /> : path === '/admin/audit' ? <AuditLogPage /> : <AdminAnalyticsPage />}
                        </RequireRole>
                      </ProtectedRoute>
                    }
                  />
                ))}
                <Route
                  path="/review"
                  element={
                    <ProtectedRoute>
                      <RequireRole role="editor">
                        <ReviewQueuePage />
                      </RequireRole>
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
