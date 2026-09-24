# Blog Frontend

React + Vite (JSX) client for [Blog-api](../Blog-api).

## Setup

```sh
npm install
cp .env.example .env   # set VITE_API_URL to the API's address (its PORT in Blog-api/.env)
npm run dev            # http://localhost:5173
```

The API must allow this origin via `CLIENT_ORIGIN` in `Blog-api/.env` (defaults to `http://localhost:5173`).

## Scripts

- `npm run dev` — dev server
- `npm run build` — production build to `dist/`
- `npm test` — Vitest + React Testing Library
- `npm run lint` — oxlint

## Structure

- `src/api/` — `fetch` wrapper (`client.js`) and endpoint functions; errors are thrown as `ApiError(status, message)`
- `src/auth/` — `AuthProvider` (JWT + user in localStorage, cleared on any 401), `useAuth`, `ProtectedRoute`
- `src/hooks/usePosts.js` — TanStack Query hooks; mutations invalidate `['posts']`
- `src/schemas/` — Zod form schemas mirroring the API's validation
- `src/pages/`, `src/components/` — UI (Tailwind)

Post content is always rendered as plain text, never as HTML, because the auth token lives in localStorage.
