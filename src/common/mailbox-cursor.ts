import { MailboxCursor } from './ipc-types'

export const serializeMailboxCursor = (cursor: MailboxCursor): string => {
  if (cursor.type === 'date') {
    return `date,${cursor.dateString}`
  }
  return `uid,${cursor.lastSeenUid},${cursor.lastSeenDatetime}`
}

export const formatMailboxCursor = (cursor: MailboxCursor): string => {
  if (cursor.type === 'date') {
    return cursor.dateString
  }
  return new Date(cursor.lastSeenDatetime).toISOString()
}

export const deserializeMailboxCursor = (str: string): MailboxCursor => {
  const fragments = str.split(',')
  if (fragments[0] === 'date') {
    if (fragments.length !== 2) {
      throw new Error(`Expected 2 fragments, received ${fragments.length}`)
    }
    return {
      type: 'date',
      dateString: fragments[1],
    }
  } else if (fragments[0] === 'uid') {
    return {
      type: 'uid',
      lastSeenUid: parseInt(fragments[1], 10),
      lastSeenDatetime: parseInt(fragments[2], 10),
    }
  } else {
    throw new Error(`Unknown cursor type: ${fragments[0]}`)
  }
}

export const incrementCursor = (mailboxCursor: MailboxCursor): MailboxCursor => {
  if (mailboxCursor.type === 'uid') {
    const nextDatetime = Math.floor(mailboxCursor.lastSeenDatetime / 86400000) * 86400000 + 86400000
    return {
      type: 'date',
      dateString: new Date(nextDatetime).toISOString().slice(0, 10)
    }
  }
  const nextDatetime = new Date(new Date(mailboxCursor.dateString).valueOf() + 86400000)
  return {
    type: 'date',
    dateString: nextDatetime.toISOString().slice(0, 10),
  }
}

export const decrementCursor = (mailboxCursor: MailboxCursor): MailboxCursor => {
  if (mailboxCursor.type === 'uid') {
    const nextDatetime = Math.floor(mailboxCursor.lastSeenDatetime / 86400000) * 86400000
    return {
      type: 'date',
      dateString: new Date(nextDatetime).toISOString().slice(0, 10)
    }
  }
  const nextDatetime = new Date(new Date(mailboxCursor.dateString).valueOf() - 86400000)
  return {
    type: 'date',
    dateString: nextDatetime.toISOString().slice(0, 10),
  }
}
