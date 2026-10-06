// The honest explanation of the figures, next to them: what each means, what is not collected and what that costs in precision.
export default function HowWeCount() {
  return (
    <details className="border border-rule p-4">
      <summary className="kicker cursor-pointer text-ink-soft">How these numbers are counted</summary>
      <div className="mt-4 space-y-3 font-serif">
        <p>
          <strong>Views</strong> are visits to a story. The same visitor opening it again within half an hour is the same view.{' '}
          <strong>Visitors</strong> are counted per day and added up, so one person who comes on three different days counts three times: we do not follow
          people from one day to the next.
        </p>
        <p>
          <strong>Reads</strong> are visitors who scrolled most of the way down and stayed long enough for it to be believable that they read it (at least
          three quarters of the way down, and about 40 percent of the story’s reading time, between 10 and 60 seconds). The <strong>average time</strong> is
          the mean of the times that readers’ browsers reported when they left.
        </p>
        <p>
          Nothing identifying is stored: no cookies, no addresses, no browser details, no accounts. A visitor is told from another by a one-way code that
          changes every day and is deleted after two days. Visitors who ask not to be tracked are counted as a view, but never as a visitor or a read. Your
          own visits to your own stories are not counted. These are statistics, not accounts: someone with many addresses could still inflate a number.
        </p>
      </div>
    </details>
  )
}
