// the reasons a reader can give (mirrors Blog-api/config/moderation.js)
export const REPORT_REASONS = [
  ['spam', 'Spam or advertising'],
  ['harassment', 'Harassment or bullying'],
  ['hate', 'Hate or abuse'],
  ['misinformation', 'Misleading or false'],
  ['copyright', 'Copyright'],
  ['other', 'Something else'],
]

export const MAX_DETAILS_LENGTH = 500
export const MAX_NOTE_LENGTH = 500

// what a moderator may do about each kind of thing: [action, button label, what the note is for]
export const MODERATION_ACTIONS = {
  comment: [
    ['dismiss', 'Dismiss', null],
    ['remove', 'Remove comment', 'Tell the author why (they will see this)'],
  ],
  post: [
    ['dismiss', 'Dismiss', null],
    ['unpublish', 'Unpublish story', 'Tell the author why (they will see this)'],
  ],
  user: [
    ['dismiss', 'Dismiss', null],
    ['suspend', 'Suspend account', 'The reason (the person is emailed it, and sees it when they try to log in)'],
  ],
}

export const TARGET_LABEL = { comment: 'Comment', post: 'Story', user: 'Person' }
