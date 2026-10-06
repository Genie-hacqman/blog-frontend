// Applies a saved theme before the page is drawn, so there is no flash of the wrong edition.
// It is a separate file, not an inline script in index.html, so the Content-Security-Policy can forbid inline scripts.
try {
  const theme = localStorage.getItem('blog.theme')
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme
} catch {
  // storage is unavailable (private mode, blocked): the system theme applies
}
