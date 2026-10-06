export const STATUS_LABELS = {
  draft: 'Draft',
  pending_review: 'In review',
  scheduled: 'Scheduled',
  published: 'Published',
  rejected: 'Rejected',
  archived: 'Archived',
  private: 'Private',
}

export const STATUS_FILTERS = [
  { value: undefined, label: 'All' },
  { value: 'draft', label: 'Drafts' },
  { value: 'pending_review', label: 'In review' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'published', label: 'Published' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'archived', label: 'Archived' },
  { value: 'private', label: 'Private' },
]

// what to call each move, which depends on where the post is coming from
export const ACTION_LABELS = {
  pending_review: (from) => (from === 'rejected' ? 'Resubmit for review' : 'Submit for review'),
  draft: (from) =>
    ({ pending_review: 'Withdraw', scheduled: 'Unschedule', published: 'Unpublish', archived: 'Unarchive' })[from] ?? 'Back to draft',
  published: (from) => (from === 'pending_review' ? 'Approve and publish' : 'Publish now'),
  scheduled: (from) => (from === 'pending_review' ? 'Approve and schedule…' : 'Schedule…'),
  rejected: () => 'Reject…',
  archived: () => 'Archive',
  private: () => 'Make private',
}

// publishing and approving are the main moves; the rest are quieter
export const ACTION_ORDER = ['pending_review', 'published', 'scheduled', 'rejected', 'draft', 'archived', 'private']
