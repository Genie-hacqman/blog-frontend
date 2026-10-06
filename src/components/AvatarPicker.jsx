import { useState } from 'react'
import { useRemoveAvatar, useUploadAvatar } from '../hooks/useProfile.js'
import Avatar from './Avatar.jsx'
import Button from './Button.jsx'
import ErrorMessage from './ErrorMessage.jsx'
import { buttonClass } from './buttonClass.js'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_BYTES = 5 * 1024 * 1024

// Choosing a file uploads it straight away. The type and size checks are only a courtesy so the
// reader gets an instant answer; the server checks the real contents and has the final say.
export default function AvatarPicker({ user }) {
  const upload = useUploadAvatar()
  const remove = useRemoveAvatar()
  const [localError, setLocalError] = useState(null)

  const handleChange = (event) => {
    const file = event.target.files?.[0]
    event.target.value = '' // allow choosing the same file again
    if (!file) return
    setLocalError(null)
    if (!ACCEPTED_TYPES.includes(file.type)) return setLocalError('Choose a JPEG, PNG, WebP or GIF image.')
    if (file.size > MAX_BYTES) return setLocalError('That image is larger than 5 MB.')
    upload.mutate(file)
  }

  const busy = upload.isPending || remove.isPending

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <Avatar user={{ username: user.userName, avatarUrl: user.avatarUrl }} size="xl" alt="Your profile photo" />
      <div className="space-y-3">
        <ErrorMessage error={localError ?? upload.error ?? remove.error} />
        <div className="flex flex-wrap items-center gap-3">
          <label className={`${buttonClass('secondary')} cursor-pointer focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent ${busy ? 'pointer-events-none opacity-50' : ''}`}>
            {upload.isPending ? 'Uploading…' : user.avatarUrl ? 'Change photo' : 'Upload photo'}
            <input type="file" accept={ACCEPTED_TYPES.join(',')} className="sr-only" onChange={handleChange} disabled={busy} aria-label="Choose a profile photo" />
          </label>
          {user.avatarUrl && (
            <Button type="button" variant="ghost" onClick={() => remove.mutate()} disabled={busy}>
              {remove.isPending ? 'Removing…' : 'Remove photo'}
            </Button>
          )}
        </div>
        <p className="font-mono text-xs text-ink-soft">JPEG, PNG, WebP or GIF, up to 5 MB. It is resized and cropped to a square.</p>
      </div>
    </div>
  )
}
