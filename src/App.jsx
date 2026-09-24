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
            {/* each page sets its own width: wide grid for the front page, a reading column for articles */}
            <main id="main" className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/posts/:id" element={<PostPage />} />
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
