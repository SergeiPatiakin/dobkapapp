import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'
import { FilingStatus, ReportType, Mailbox, MailboxCursor, ReportStatus, RunSql } from '../common/ipc-types'
import { deserializeMailboxCursor, serializeMailboxCursor } from '../common/mailbox-cursor'
import { PassiveIncomeType } from 'dobkap/lib/passive-income'

const databasePath = path.join(app.getPath('userData'), 'db.sqlite')
const db = new Database(databasePath)
db.pragma('journal_mode = WAL')

export const migrateDatabase = () => {
  const migrationsTables = db.prepare(
    'SELECT name FROM sqlite_master WHERE type=\'table\' AND name=\'dobkapman_migrations\''
  ).all() as Array<{name: string}>

  if (migrationsTables.length === 0) {
    // Logic for migration 1
    db.prepare(
      `CREATE TABLE dobkapman_migrations (
      id INTEGER NOT NULL,
      name TEXT NOT NULL
      )`
    ).run()
    db.prepare(
      'INSERT INTO dobkapman_migrations (id, name) VALUES (1, \'init\')'
    ).run()
    // mailboxes table
    db.prepare(
      `
      CREATE TABLE mailboxes (
        id INTEGER PRIMARY KEY,
        email_address TEXT NOT NULL,
        email_password TEXT NOT NULL,
        imap_host TEXT NOT NULL,
        imap_port INTEGER NOT NULL,
        cursor TEXT NOT NULL
      )
      `
    ).run()
    db.prepare(
      `
      INSERT INTO mailboxes (
        id,
        email_address,
        email_password,
        imap_host,
        imap_port,
        cursor
      ) VALUES (
        1,
        '',
        '',
        'imap.gmail.com',
        993,
        'date,' || date()
      )
      `
    ).run()
    // taxpayer profiles table
    db.prepare(
      `
      CREATE TABLE taxpayer_profiles (
        id INTEGER PRIMARY KEY,
        jmbg TEXT NOT NULL,
        full_name TEXT NOT NULL,
        street_address TEXT NOT NULL,
        opstina_code TEXT NOT NULL,
        phone_number TEXT NOT NULL,
        email_address TEXT NOT NULL
      )
      `
    ).run()
    db.prepare(
      `
      INSERT INTO taxpayer_profiles (
        id,
        jmbg,
        full_name,
        street_address,
        opstina_code,
        phone_number,
        email_address
      ) VALUES (
        1,
        '',
        '',
        '',
        '',
        '',
        ''
      )
      `
    ).run()
    // importers
    db.prepare(
      `
      CREATE TABLE importers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        taxpayer_profile_id INTEGER NOT NULL REFERENCES taxpayer_profiles(id),
        mailbox_id INTEGER NOT NULL REFERENCES mailboxes(id),
        from_filter TEXT NOT NULL,
        subject_filter TEXT NOT NULL,
        payment_notes TEXT NOT NULL,
        attachment_regex TEXT NOT NULL
      )
      `
    ).run()
    // reports table
    db.prepare(
      `CREATE TABLE reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      importer_id INTEGER REFERENCES importers(id) ON DELETE SET NULL,
      mailbox_id INTEGER NOT NULL REFERENCES mailboxes(id),
      mailbox_message_id INTEGER NOT NULL,
      report_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'init'
      )`
    ).run()
    db.prepare(
      `CREATE UNIQUE INDEX reports_importer_report_name_ui
      ON reports(importer_id, report_name)`
    ).run()
    // filings table
    db.prepare(
      `
      CREATE TABLE filings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL REFERENCES reports(id),
      paying_entity TEXT NOT NULL,
      filing_deadline TEXT NOT NULL,
      tax_payable INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'init'
      )
      `
    ).run()
  }

  const r = db.prepare(
    'SELECT id FROM dobkapman_migrations'
  ).all() as Array<{id: number}>
  const dbMigrationVersion = Math.max(...r.map(x => x.id))

  if (dbMigrationVersion < 2) {
    // Logic for migration 2
    db.prepare(
      'ALTER TABLE filings ADD COLUMN "type" TEXT NOT NULL DEFAULT \'dividend\''
    ).run()
    db.prepare(
      'INSERT INTO dobkapman_migrations (id, name) VALUES (2, \'filing-type\')'
    ).run()
  }
  if (dbMigrationVersion < 3) {
    // Logic for migration 3
    db.prepare(
      'ALTER TABLE filings ADD COLUMN tax_payment_reference TEXT NOT NULL DEFAULT \'\''
    ).run()
    db.prepare(
      'INSERT INTO dobkapman_migrations (id, name) VALUES (3, \'tax-payment-reference\')'
    ).run()
  }
  if (dbMigrationVersion < 4) {
    // Logic for migration 4
    db.prepare(
      'ALTER TABLE reports ADD COLUMN type TEXT NOT NULL DEFAULT \'IbkrCsv\''
    ).run()
    db.prepare(
      'ALTER TABLE importers RENAME COLUMN type TO report_type'
    ).run()
    db.prepare(
      'INSERT INTO dobkapman_migrations (id, name) VALUES (4, \'report-type\')'
    ).run()
  }
  // Logic for migration 5 and above goes here
  if (dbMigrationVersion > 4) {
    throw new Error('Database corrupted')
  }
}

export const getReportsByMailbox = (mailboxId: number) => {
  return db.prepare(`
    SELECT
      id AS id,
      type AS type,
      importer_id AS importerId,
      mailbox_id AS mailboxId,
      mailbox_message_id AS mailboxMessageId,
      report_name AS reportName,
      status AS status
    FROM reports
    WHERE mailbox_id=$mailboxId
    ORDER BY id
  `).all({
    mailboxId,  
  }) as Array<{
    id: number,
    type: ReportType,
    importerId: number | null,
    mailboxId: number,
    mailboxMessageId: number,
    reportName: string,
    status: ReportStatus
  }>
}

export const updateReport = (report: {
  id: number,
  status: ReportStatus,
}) => {
  return db.prepare(`
  UPDATE reports SET
    status = $status
  WHERE id=$id
  `).run({
    id: report.id,
    status: report.status,
  })
}

export const createReport = (report: {
  type: ReportType
  importerId: number | null
  mailboxId: number
  mailboxMessageId: number
  reportName: string
  status: ReportStatus
}) => {
  return db.prepare(`
  INSERT INTO reports (
    type,
    importer_id,
    mailbox_id,
    mailbox_message_id,
    report_name,
    status
  ) VALUES (
    $type,
    $importerId,
    $mailboxId,
    $mailboxMessageId,
    $reportName,
    $status
  ) RETURNING id`).get({
    type: report.type,
    importerId: report.importerId,
    mailboxId: report.mailboxId,
    mailboxMessageId: report.mailboxMessageId,
    reportName: report.reportName,
    status: report.status,
  }) as {
    id: number
  }
}

export const deleteReport = (id: number) => {
  return db.prepare(`
    DELETE FROM reports
    WHERE id=$id
  `).run({ id })
}

export const getFilings = () => {
  return db.prepare(`
    SELECT
      id AS id,
      type AS type,
      report_id AS reportId,
      status AS status,
      paying_entity AS payingEntity,
      filing_deadline AS filingDeadline,
      tax_payable AS taxPayable,
      tax_payment_reference AS taxPaymentReference
    FROM filings
    ORDER BY id DESC
  `).all({}) as Array<{
    id: number,
    type: PassiveIncomeType
    reportId: number,
    status: FilingStatus,
    payingEntity: string,
    filingDeadline: string,
    taxPayable: number,
    taxPaymentReference: string,
  }>
}

export const updateFiling = (filing: {
  id: number,
  status: FilingStatus,
  taxPaymentReference: string,
}) => {
  return db.prepare(`
    UPDATE filings SET
      status = $status,
      tax_payment_reference = $taxPaymentReference
    WHERE id=$id
  `).run({
    id: filing.id,
    status: filing.status,
    taxPaymentReference: filing.taxPaymentReference,
  })
}

export const createFiling = (filing: {
  type: PassiveIncomeType
  reportId: number
  payingEntity: string
  filingDeadline: string
  taxPayable: string
}) => {
  return db.prepare(`
    INSERT INTO filings (
      type,
      report_id,
      paying_entity,
      filing_deadline,
      tax_payable
    ) VALUES (
      $type,
      $reportId,
      $payingEntity,
      $filingDeadline,
      $taxPayable
    ) RETURNING id
  `).get({
    type: filing.type,
    reportId: filing.reportId,
    payingEntity: filing.payingEntity,
    filingDeadline: filing.filingDeadline,
    taxPayable: filing.taxPayable,
  }) as {
    id: number
  }
}

export const deleteFiling = (id: number) => {
  return db.prepare(`
    DELETE FROM filings
    WHERE id=$id
  `).run({ id })
}

export const getTaxpayerProfile = () => {
  return db.prepare(`
    SELECT
      id AS id,
      jmbg AS jmbg,
      full_name AS fullName,
      street_address AS streetAddress,
      opstina_code AS opstinaCode,
      phone_number AS phoneNumber,
      email_address AS emailAddress
    FROM taxpayer_profiles
    WHERE id=1
  `).get() as {
    id: number,
    jmbg: string,
    fullName: string,
    streetAddress: string,
    opstinaCode: string,
    phoneNumber: string,
    emailAddress: string,
  }
}

export const updateTaxpayerProfile = (taxpayerProfile: {
  id: number,
  jmbg: string,
  fullName: string,
  streetAddress: string,
  opstinaCode: string,
  phoneNumber: string,
  emailAddress: string,
}) => {
  return db.prepare(`
    UPDATE taxpayer_profiles SET
      jmbg = $jmbg,
      full_name = $fullName,
      street_address = $streetAddress,
      opstina_code = $opstinaCode,
      phone_number = $phoneNumber,
      email_address = $emailAddress
    WHERE id=$id
  `).run({
    id: taxpayerProfile.id,
    jmbg: taxpayerProfile.jmbg,
    fullName: taxpayerProfile.fullName,
    streetAddress: taxpayerProfile.streetAddress,
    opstinaCode: taxpayerProfile.opstinaCode,
    phoneNumber: taxpayerProfile.phoneNumber,
    emailAddress: taxpayerProfile.emailAddress,
  })
}

export const getMailbox = (): Mailbox => {
  const rawMailbox = db.prepare(`
    SELECT
      id AS id,
      email_address AS emailAddress,
      email_password AS emailPassword,
      imap_host AS imapHost,
      imap_port AS imapPort,
      cursor AS cursor
    FROM mailboxes
    WHERE id=1
  `).get() as {
    id: number,
    emailAddress: string,
    emailPassword: string,
    imapHost: string,
    imapPort: number,
    cursor: string,
  }
  return {
    ...rawMailbox,
    cursor: deserializeMailboxCursor(rawMailbox.cursor),
  }
}

export const updateMailbox = (mailbox: {
  id: number,
  emailAddress: string,
  emailPassword: string,
  imapHost: string,
  imapPort: number,
  cursor: MailboxCursor,
}) => {
  return db.prepare(`
    UPDATE mailboxes SET
      email_address = $emailAddress,
      email_password = $emailPassword,
      imap_host = $imapHost,
      imap_port = $imapPort,
      cursor = $cursor
    WHERE id=$id
  `).run({
    id: mailbox.id,
    emailAddress: mailbox.emailAddress,
    emailPassword: mailbox.emailPassword,
    imapHost: mailbox.imapHost,
    imapPort: mailbox.imapPort,
    cursor: serializeMailboxCursor(mailbox.cursor),
  })
}

// importers

export const getImporters = () => {
  return db.prepare(`
    SELECT
      id AS id,
      name AS name,
      report_type AS reportType,
      taxpayer_profile_id AS taxpayerProfileId,
      mailbox_id AS mailboxId,
      from_filter AS fromFilter,
      subject_filter AS subjectFilter,
      payment_notes AS paymentNotes,
      attachment_regex AS attachmentRegex
    FROM importers
    ORDER BY id
  `).all({}) as Array<{
    id: number,
    name: string
    reportType: ReportType
    taxpayerProfileId: number
    mailboxId: number
    fromFilter: string
    subjectFilter: string
    paymentNotes: string
    attachmentRegex: string
  }>
}

export const createImporter = (importer: {
  name: string,
  reportType: string,
  fromFilter: string,
  subjectFilter: string,
  paymentNotes: string,
  attachmentRegex: string,
}) => {
  return db.prepare(`
    INSERT INTO importers(
      name,
      report_type,
      taxpayer_profile_id,
      mailbox_id,
      from_filter,
      subject_filter,
      payment_notes,
      attachment_regex
    ) VALUES (
      $name,
      $reportType,
      1,
      1,
      $fromFilter,
      $subjectFilter,
      $paymentNotes,
      $attachmentRegex
    )
    RETURNING id
  `).get({
    name: importer.name,
    reportType: importer.reportType,
    fromFilter: importer.fromFilter,
    subjectFilter: importer.subjectFilter,
    paymentNotes: importer.paymentNotes,
    attachmentRegex: importer.attachmentRegex,
  }) as {
    id: number
  }
}

export const updateImporter = (importer: {
  id: number,
  name: string,
  reportType: string,
  fromFilter: string,
  subjectFilter: string,
  paymentNotes: string,
  attachmentRegex: string,
}) => {
  return db.prepare(`
    UPDATE importers SET
      name = $name,
      report_type = $reportType,
      from_filter = $fromFilter,
      subject_filter = $subjectFilter,
      payment_notes = $paymentNotes,
      attachment_regex = $attachmentRegex
    WHERE id=$id
  `).run({
    id: importer.id,
    name: importer.name,
    reportType: importer.reportType,
    fromFilter: importer.fromFilter,
    subjectFilter: importer.subjectFilter,
    paymentNotes: importer.paymentNotes,
    attachmentRegex: importer.attachmentRegex,
  })
}

export const deleteImporter = (id: number) => {
  return db.prepare(`
    DELETE FROM importers
    WHERE id=$id
  `).run({ id })
}

// misc

export const runSql = (sql: string): RunSql['Result'] => {
  const stmt = db.prepare(sql)
  stmt.raw()
  return {
    columns: stmt.columns(),
    rows: stmt.all(),
  }
}
