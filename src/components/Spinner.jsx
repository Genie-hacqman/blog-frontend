export default function Spinner() {
  return (
    <div className="flex justify-center py-12" role="status" aria-label="Loading">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-rule border-t-accent" />
    </div>
  )
}
