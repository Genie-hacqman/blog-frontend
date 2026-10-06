import { useRef, useState } from 'react'
import { uploadImage } from '../api/media.js'

const IMAGE_TYPES = /^image\/(?:jpeg|png|webp|gif)$/
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

// The picture shown above the title. `cover` is { id, url } (or null); `alt` its description.
// onChange receives the new { cover, alt }.
export default function CoverImageField({ cover, alt, onChange }) {
  const input = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const choose = async (file) => {
    setError('')
    if (!IMAGE_TYPES.test(file.type)) return setError('Only JPEG, PNG, WebP or GIF pictures can be used.')
    if (file.size > MAX_IMAGE_BYTES) return setError('That picture is larger than 5 MB.')
    setBusy(true)
    try {
      const media = await uploadImage(file, 'cover')
      onChange({ cover: { id: media.id, url: media.url }, alt })
    } catch (uploadError) {
      setError(uploadError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <fieldset className="border border-rule p-4">
      <legend className="kicker px-1 text-ink-soft">Cover picture</legend>
      {cover ? (
        <div className="space-y-4">
          <img src={cover.url} alt="" className="max-h-64 w-full object-cover" />
          <label className="block">
            <span className="kicker mb-1 block text-ink-soft">Picture description</span>
            <input
              value={alt}
              maxLength={200}
              onChange={(event) => onChange({ cover, alt: event.target.value })}
              placeholder="Describe what the picture shows"
              className="w-full border-0 border-b border-ink bg-paper-2 px-3 py-2 font-serif text-lg focus:border-b-2 focus:border-accent focus:outline-none"
            />
          </label>
          <div className="flex gap-3">
            <button type="button" disabled={busy} onClick={() => input.current?.click()} className="border border-ink px-3 py-1.5 font-sans text-sm">
              {busy ? 'Uploading…' : 'Replace'}
            </button>
            <button type="button" disabled={busy} onClick={() => onChange({ cover: null, alt: '' })} className="border border-rule px-3 py-1.5 font-sans text-sm">
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button type="button" disabled={busy} onClick={() => input.current?.click()} className="border border-dashed border-ink px-4 py-6 font-sans text-sm text-ink-soft hover:text-ink">
          {busy ? 'Uploading…' : 'Add a cover picture'}
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        tabIndex={-1}
        aria-label="Choose a cover picture"
        onChange={(event) => {
          const [file] = event.target.files
          event.target.value = ''
          if (file) choose(file)
        }}
      />
      {error && (
        <p role="alert" className="mt-3 font-sans text-sm text-danger">
          {error}
        </p>
      )}
    </fieldset>
  )
}
