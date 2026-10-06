import { Link, useSearchParams } from 'react-router'
import { useUnsubscribe } from '../hooks/useNotifications.js'
import Button from '../components/Button.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import Notice from '../components/Notice.jsx'
import { buttonClass } from '../components/buttonClass.js'
import NoIndex from '../components/NoIndex.jsx'

// The page behind the link in a notification email. It only says what will happen; nothing changes until the
// button is pressed (a mail program that opens links to check them must not unsubscribe anyone).
export default function UnsubscribePage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const unsubscribe = useUnsubscribe()

  return (
    <section className="mx-auto max-w-[68ch] px-4 pt-10 pb-16 sm:px-6 sm:pt-14">
      <NoIndex />
      <h1 className="mb-4 text-4xl leading-none font-semibold tracking-[-0.02em]">Stop these emails?</h1>

      {!token ? (
        <p className="font-serif text-lg text-ink-soft">This link is incomplete. Use the link at the bottom of the email, or change your choices in Settings.</p>
      ) : unsubscribe.isSuccess ? (
        <div className="space-y-6">
          <Notice tone="ok" label="Done">
            {unsubscribe.data.scope === 'all' ? 'You will not get any notification emails from us.' : `You will no longer get emails about “${unsubscribe.data.label}”.`} You can still see everything in your inbox on the site.
          </Notice>
          <Link to="/settings" className={buttonClass('secondary')}>
            Change my choices
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <p className="font-serif text-lg">
            You will stop getting this kind of notification by email. Nothing changes on the site, and you can turn emails back on any time in Settings.
          </p>
          <ErrorMessage error={unsubscribe.error} />
          <Button disabled={unsubscribe.isPending} onClick={() => unsubscribe.mutate(token)}>
            {unsubscribe.isPending ? 'Working…' : 'Unsubscribe'}
          </Button>
        </div>
      )}
    </section>
  )
}
