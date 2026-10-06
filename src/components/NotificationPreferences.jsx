import { useState } from 'react'
import { usePreferences, useSavePreferences } from '../hooks/useNotifications.js'
import Button from './Button.jsx'
import ErrorMessage from './ErrorMessage.jsx'
import Notice from './Notice.jsx'

const box = 'h-5 w-5 accent-accent'

// the editable grid, once the saved choices are known
function Grid({ saved }) {
  const [choices, setChoices] = useState(saved)
  const [done, setDone] = useState(false)
  const save = useSavePreferences()

  const change = (type, channel, value) => {
    setDone(false)
    setChoices((current) => current.map((item) => (item.type === type ? { ...item, [channel]: value } : item)))
  }

  const submit = (event) => {
    event.preventDefault()
    setDone(false)
    save.mutate(
      choices.map(({ type, inApp, email }) => ({ type, inApp, email })),
      { onSuccess: () => setDone(true) },
    )
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <table className="w-full text-left">
        <caption className="sr-only">Choose how each kind of notification reaches you</caption>
        <thead>
          <tr className="kicker text-ink-soft">
            <th scope="col" className="pb-2 font-normal">
              Tell me about
            </th>
            <th scope="col" className="pb-2 text-center font-normal">
              In the inbox
            </th>
            <th scope="col" className="pb-2 text-center font-normal">
              By email
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-rule">
          {choices.map((item) => (
            <tr key={item.type}>
              <th scope="row" className="py-3 pr-3 font-serif text-lg font-normal">
                {item.label}
              </th>
              <td className="py-3 text-center">
                <input type="checkbox" className={box} checked={item.inApp} aria-label={`${item.label}: in the inbox`} onChange={(e) => change(item.type, 'inApp', e.target.checked)} />
              </td>
              <td className="py-3 text-center">
                <input type="checkbox" className={box} checked={item.email} aria-label={`${item.label}: by email`} onChange={(e) => change(item.type, 'email', e.target.checked)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="font-mono text-xs text-ink-soft">Emails go to your confirmed address, and every one has a link that turns that kind off.</p>
      <ErrorMessage error={save.error} />
      {done && (
        <Notice tone="ok" label="Saved">
          Your notification choices are saved.
        </Notice>
      )}
      <Button type="submit" disabled={save.isPending}>
        {save.isPending ? 'Saving…' : 'Save choices'}
      </Button>
    </form>
  )
}

export default function NotificationPreferences() {
  const { data, isPending, error } = usePreferences()
  if (isPending) {
    return (
      <p role="status" className="text-ink-soft">
        Loading your choices…
      </p>
    )
  }
  if (error) return <ErrorMessage error={error} />
  return <Grid saved={data} />
}
