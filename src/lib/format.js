// "1:05", or a dash when nobody reported a time
export const formatDuration = (seconds) => {
  if (seconds === null || seconds === undefined) return '—'
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

// 0.313 -> "31%", or a dash when there is nothing to divide
export const formatPercent = (ratio) => (ratio === null || ratio === undefined ? '—' : `${Math.round(ratio * 100)}%`)

export const formatNumber = (value) => (value ?? 0).toLocaleString()

// "2026-03-05" -> "5 Mar" (days are UTC dates; they are formatted as such, never shifted by the reader's time zone)
export const formatDay = (day) => new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' })
