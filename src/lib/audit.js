// One readable line for an entry of the audit log. Unknown actions fall back to their code, so a new kind of
// entry still shows up (just less friendly) until it is added here.
const entity = (entry) => `${entry.entityType} #${entry.entityId}`

export const describeAudit = (entry) => {
  const who = entry.actor?.username ?? 'The system'
  const m = entry.metadata ?? {}
  switch (entry.action) {
    case 'user.role_changed':
      return `${who} changed the role of user #${entry.entityId} from ${m.from} to ${m.to}`
    case 'user.suspended':
      return `${who} suspended user #${entry.entityId}`
    case 'user.unsuspended':
      return `${who} reinstated user #${entry.entityId}`
    case 'user.sessions_revoked':
      return `${who} signed user #${entry.entityId} out everywhere`
    case 'user.deleted':
      return `User #${entry.entityId} deleted their account`
    case 'user.became_author':
      return `User #${entry.entityId} became an author`
    case 'post.status_changed':
      return `${who} moved story #${entry.entityId} from ${m.from ?? 'nothing'} to ${m.to}`
    case 'post.published_on_schedule':
      return `Story #${entry.entityId} went live on schedule`
    case 'comment.deleted_by_other':
      return `${who} removed comment #${entry.entityId} (as ${String(m.as ?? '').replace('_', ' ')})`
    case 'report.resolved':
      return `${who} resolved report #${entry.entityId}: ${m.action} (${m.reports} ${m.reports === 1 ? 'report' : 'reports'} about ${m.targetKey})`
    case 'auth.login':
      return `${who} logged in`
    default:
      return `${who}: ${entry.action} (${entity(entry)})`
  }
}

// the filter choices on the audit page
export const AUDIT_ENTITY_TYPES = ['user', 'post', 'comment', 'report']
