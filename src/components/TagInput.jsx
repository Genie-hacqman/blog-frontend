import { useId, useState } from 'react'
import { useTagSuggestions } from '../hooks/useTaxonomy.js'

export const MAX_TAGS = 5
const NAME_PATTERN = /^[\p{L}\p{N}]+(?:[ -][\p{L}\p{N}]+)*$/u

// the same rules the API applies; it still checks everything itself
const problemWith = (name) => {
  if (name.length < 2 || name.length > 30) return 'A tag is 2 to 30 characters.'
  if (!NAME_PATTERN.test(name)) return 'Tags can only contain letters, numbers, spaces and hyphens.'
  if (!/[A-Za-z0-9]/.test(name.normalize('NFKD'))) return 'A tag needs at least one letter or number from A to Z.'
  return null
}

// Type a tag and press Enter or comma. Backspace in an empty field removes the last one.
// `value` is the list of tag names; suggestions come from tags that already exist.
export default function TagInput({ value, onChange, label = 'Tags' }) {
  const inputId = useId()
  const listId = `${inputId}-suggestions`
  const hintId = `${inputId}-hint`
  const [draft, setDraft] = useState('')
  const [problem, setProblem] = useState(null)
  const { data: suggestions = [] } = useTagSuggestions(draft.trim())
  const full = value.length >= MAX_TAGS

  const add = (raw) => {
    const name = raw.replace(/\s+/g, ' ').trim().replace(/,+$/, '').trim()
    if (!name) return
    const error = problemWith(name)
    if (error) return setProblem(error)
    // "React" and "react" are the same tag
    if (!value.some((existing) => existing.toLowerCase() === name.toLowerCase())) onChange([...value, name])
    setDraft('')
    setProblem(null)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      add(draft)
    } else if (event.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div>
      <label htmlFor={inputId} className="kicker mb-2 block text-ink-soft">
        {label}
      </label>
      {value.length > 0 && (
        <ul aria-label="Chosen tags" className="mb-3 flex flex-wrap gap-2">
          {value.map((name) => (
            <li key={name} className="kicker flex items-center gap-1 border border-ink px-2 py-1">
              {name}
              <button
                type="button"
                aria-label={`Remove tag ${name}`}
                onClick={() => onChange(value.filter((existing) => existing !== name))}
                className="px-1 text-ink-soft hover:text-danger"
              >
                <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        id={inputId}
        type="text"
        value={draft}
        list={listId}
        maxLength={31}
        autoComplete="off"
        disabled={full}
        aria-describedby={hintId}
        aria-invalid={Boolean(problem)}
        onChange={(event) => {
          setDraft(event.target.value)
          setProblem(null)
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => draft.trim() && add(draft)}
        placeholder={full ? 'Tag limit reached' : 'Add a tag and press Enter'}
        className="w-full border-0 border-b border-ink bg-paper-2 px-3 py-2.5 font-serif text-lg text-ink placeholder:text-ink-soft/60 focus:border-b-2 focus:border-accent focus:outline-none disabled:opacity-60"
      />
      <datalist id={listId}>
        {suggestions
          .filter((tag) => !value.some((existing) => existing.toLowerCase() === tag.name.toLowerCase()))
          .map((tag) => (
            <option key={tag.slug} value={tag.name} />
          ))}
      </datalist>
      <p id={hintId} className="mt-2 font-mono text-xs text-ink-soft" aria-live="polite">
        {value.length} of {MAX_TAGS} tags. Press Enter or comma to add one.
      </p>
      {problem && (
        <p role="alert" className="mt-1 flex gap-1.5 font-mono text-xs text-danger">
          <span aria-hidden="true">—</span>
          {problem}
        </p>
      )}
    </div>
  )
}
