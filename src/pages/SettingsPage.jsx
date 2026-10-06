import { Link } from 'react-router'
import { useAuth } from '../auth/useAuth.js'
import AvatarPicker from '../components/AvatarPicker.jsx'
import DeleteAccountSection from '../components/DeleteAccountSection.jsx'
import NotificationPreferences from '../components/NotificationPreferences.jsx'
import ProfileForm from '../components/ProfileForm.jsx'
import { buttonClass } from '../components/buttonClass.js'

const Section = ({ title, children }) => (
  <section aria-label={title} className="border-t-2 border-ink pt-4">
    <h2 className="kicker mb-5 text-ink">{title}</h2>
    {children}
  </section>
)

export default function SettingsPage() {
  const { user } = useAuth()
  if (!user) return null

  return (
    <div className="mx-auto max-w-[68ch] space-y-12 px-4 pt-10 pb-16 sm:px-6 sm:pt-14">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-4xl leading-none font-semibold tracking-[-0.02em]">Settings</h1>
        <Link to={`/u/${encodeURIComponent(user.userName)}`} className="link-slide kicker text-accent">
          View public profile →
        </Link>
      </header>

      <Section title="Profile photo">
        <AvatarPicker user={user} />
      </Section>

      <Section title="Profile">
        <ProfileForm user={user} />
      </Section>

      <Section title="Notifications">
        <NotificationPreferences />
      </Section>

      <Section title="Password">
        <p className="mb-4 font-serif text-lg text-ink-soft">Changing it signs you out on your other devices.</p>
        <Link to="/account/password" className={buttonClass('secondary')}>
          Change password
        </Link>
      </Section>

      <DeleteAccountSection />
    </div>
  )
}
