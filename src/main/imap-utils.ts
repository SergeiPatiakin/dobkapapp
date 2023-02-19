import { Mailbox, MailboxCursor } from '../common/ipc-types'
import Imap from 'node-imap'
import util from 'util'
const MailParser = require('mailparser-mit').MailParser

export const getSearchCriteria = (opts: {
  fromFilter: string
  subjectFilter: string
  cursor: MailboxCursor
}): Array<[string, string]> => {
  const searchCriteria: Array<[string, string]> = []
  if (opts.fromFilter) {
    searchCriteria.push(['FROM', opts.fromFilter])
  }
  if (opts.subjectFilter) {
    searchCriteria.push(['SUBJECT', opts.subjectFilter])
  }

  if (opts.cursor.type === 'date') {
    searchCriteria.push(['SINCE', opts.cursor.dateString])
  } else {
    const uidRangeString = `${opts.cursor.lastSeenUid + 1}:*`
    searchCriteria.push(['UID', uidRangeString])
  }
  return searchCriteria
}

export class ImapClient {
  private imap: Imap
  private connected = false
  constructor(mailbox: Mailbox) {
    this.imap = new Imap({
      user: mailbox.emailAddress,
      password: mailbox.emailPassword,
      host: mailbox.imapHost,
      port: mailbox.imapPort,
      tls: true,
      tlsOptions: { servername: mailbox.imapHost },
    })
  }

  public openBox(mailboxName: string) {
    if (!this.connected) {
      throw new Error('ImapClient not connected')
    }
    return util.promisify<string, Imap.Box>(this.imap.openBox.bind(this.imap))(mailboxName)
  }

  public search(searchCriteria: any[]) {
    if (!this.connected) {
      throw new Error('ImapClient not connected')
    }
    return util.promisify(this.imap.search.bind(this.imap))(searchCriteria)
  }

  // Returns raw message string
  public fetch(source: any, options: Imap.FetchOptions): Promise<string> {
    if (!this.connected) {
      throw new Error('ImapClient not connected')
    }
    const f = this.imap.fetch(source, options)
    return new Promise((resolve, reject) => {
      f.on('message', msg => {
        msg.on('body', (stream, _info) => {
          const chunkStrings: Array<string> = []
          stream.on('data', chunk => {
            chunkStrings.push(chunk.toString('utf8'))
          })
          stream.once('end', () => {
            resolve(chunkStrings.join(''))
          })
          stream.on('error', e => {
            reject(e)
          })
        })
      })
    })
  }

  public connect() {
    return new Promise<void>((resolve, reject) => {
      this.imap.once('ready', () => {
        this.connected = true
        resolve()
      })
      this.imap.once('error', (err: any) => {
        console.log('IMAP error', err)
        reject(err)
      })
      this.imap.once('end', () => {
        // In the happy path this will be triggered but with no effect (as we will have already resolved)
        reject(new Error('Connection ended'))
      })
      this.imap.connect()
    })
  }

  public end() {
    this.imap.end()
  }
}

export type EmailInfo = {
  fromAddress: string
  fromName: string
  subject: string
  attachments: Array<{fileName: string, content: Buffer | string}>
}

export const parseMessage = async (rawMessage: string): Promise<EmailInfo> =>
  new Promise((resolve, reject) => {
    const mailparser = new MailParser()
    mailparser.on('end', function(mailObject: any){
      resolve({
        fromAddress: mailObject.from[0]?.address || '' as unknown as string,
        fromName: mailObject.from[0]?.name || '' as unknown as string,
        subject: mailObject.subject,
        attachments: mailObject.attachments || [],
      })
    })
    mailparser.on('error', (e: any) => reject(e))
    mailparser.write(rawMessage)
    mailparser.end()
  })
