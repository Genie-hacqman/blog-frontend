const Bar = ({ className, style }) => <div className={`animate-pulse bg-rule/70 ${className}`} style={style} />

export function PostListSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Bar className="h-3 w-24" />
      <Bar className="mt-5 h-12 w-4/5" />
      <Bar className="mt-3 h-12 w-3/5" />
      <Bar className="mt-6 h-4 w-full max-w-2xl" />
      <Bar className="mt-2 h-4 w-2/3 max-w-xl" />
      <div className="mt-14 grid gap-10 border-t border-rule pt-8 lg:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex gap-5">
            <Bar className="h-8 w-10" />
            <div className="flex-1">
              <Bar className="h-6 w-3/4" />
              <Bar className="mt-3 h-3 w-1/3" />
              <Bar className="mt-4 h-4 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ArticleSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="mx-auto max-w-[68ch] px-4 py-12 sm:px-6">
      <Bar className="h-3 w-32" />
      <Bar className="mt-5 h-12 w-full" />
      <Bar className="mt-3 h-12 w-2/3" />
      <Bar className="mt-8 h-10 w-56" />
      <div className="mt-10 space-y-3">
        {[100, 96, 92, 98, 70].map((w, i) => (
          <Bar key={i} className="h-4" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  )
}
