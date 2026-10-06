const sizes = {
  sm: 'h-7 w-7 text-sm',
  md: 'h-10 w-10 text-lg',
  xl: 'h-28 w-28 text-5xl sm:h-32 sm:w-32',
}

// A profile photo, or the first letter of the name when there is none. `alt` is empty by default
// because the name is almost always printed next to it; pass one where the photo stands alone.
export default function Avatar({ user, size = 'md', alt = '' }) {
  const name = user?.username ?? user?.userName ?? '?'
  const className = `shrink-0 rounded-full ${sizes[size]}`
  if (user?.avatarUrl) {
    return <img src={user.avatarUrl} alt={alt} loading="lazy" decoding="async" className={`${className} bg-paper-2 object-cover`} />
  }
  return (
    <span
      aria-hidden={alt === '' ? 'true' : undefined}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      className={`${className} grid place-items-center bg-ink font-display font-semibold text-paper uppercase`}
    >
      {name.charAt(0)}
    </span>
  )
}
