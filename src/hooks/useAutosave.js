import { useEffect, useRef, useState } from 'react'
import { postSchema } from '../schemas/index.js'

// Saves the form on its own a few seconds after the writer stops typing.
//   dirty:     the form differs from the last saved version (react-hook-form's isDirty)
//   values:    the form's current values (from useWatch); every change restarts the wait
//   getValues: reads the form when the wait is over
//   onSave:    async (validData) => void; throws to report a failure. An error with code EDIT_CONFLICT stops autosave.
//   onSaved:   called with the saved snapshot, so the form can mark exactly that as saved
// Returns { state: idle | saving | saved | error | conflict, at }.
export function useAutosave({ enabled, dirty, values, getValues, onSave, onSaved, delay = 5000 }) {
  const [status, setStatus] = useState({ state: 'idle' })
  const inFlight = useRef(false)
  const stopped = useRef(false)
  const handlers = useRef({ onSave, onSaved })
  useEffect(() => {
    handlers.current = { onSave, onSaved }
  })
  const raw = JSON.stringify(values)

  useEffect(() => {
    if (!enabled || !dirty || stopped.current) return undefined

    let timer
    const run = async () => {
      // one request at a time: look again once the one in flight is done
      if (inFlight.current) {
        timer = setTimeout(run, delay)
        return
      }
      const snapshot = getValues()
      const parsed = postSchema.safeParse(snapshot)
      if (!parsed.success) return // not valid yet (no title, say): nothing to save
      inFlight.current = true
      setStatus({ state: 'saving' })
      try {
        await handlers.current.onSave(parsed.data)
        handlers.current.onSaved(snapshot)
        setStatus({ state: 'saved', at: new Date() })
      } catch (error) {
        if (error?.code === 'EDIT_CONFLICT') {
          stopped.current = true
          setStatus({ state: 'conflict' })
        } else {
          setStatus({ state: 'error' })
        }
      } finally {
        inFlight.current = false
      }
    }
    timer = setTimeout(run, delay)
    return () => clearTimeout(timer)
  }, [raw, dirty, enabled, delay, getValues])

  return status
}
