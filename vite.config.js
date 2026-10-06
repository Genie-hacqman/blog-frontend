import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // VITE_API_URL is baked in at build time. An empty value is valid (same-origin /api, proxied by
  // the host), but leaving it undefined is almost certainly a mistake, so fail the build.
  if (command === 'build' && loadEnv(mode, process.cwd(), 'VITE_').VITE_API_URL === undefined) {
    throw new Error('VITE_API_URL is not set. Set it to the API origin, or to an empty value to use same-origin /api, before building.')
  }

  return {
    plugins: [react(), tailwindcss()],
    server: {
      // the browser talks to /api on the dev server, so the refresh cookie is first-party in development too
      // (/media serves locally stored uploads)
      proxy: { '/api': 'http://localhost:3030', '/media': 'http://localhost:3030' },
    },
    test: {
      // tests always call same-origin /api, whatever a developer has in their own .env
      env: { VITE_API_URL: '' },
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.js',
    },
  }
})
