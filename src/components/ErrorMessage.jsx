export default function ErrorMessage({ error }) {
  if (!error) return null
  const message = typeof error === 'string' ? error : error.message
  return (
    <div role="alert" className="border-l-2 border-danger bg-danger/5 px-4 py-3">
      <p className="kicker text-danger">Correction</p>
      <p className="mt-1 text-base text-ink">{message}</p>
    </div>
  )
}
