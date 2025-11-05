export type DateString = string

export type HolidayConf = {
  holidayRangeStart: DateString
  holidayRangeEnd: DateString
  holidays: DateString[]
}

export type TechnicalConf = {
  holidayConf: HolidayConf
}

export type MailboxCursor = {
  type: 'date'
  dateString: DateString
} | {
  type: 'uid'
  lastSeenUid: number
  lastSeenDatetime: number
}

export type Mailbox = {
  id: number,
  emailAddress: string,
  emailPassword: string,
  imapHost: string,
  imapPort: number,
  cursor: MailboxCursor
}

export type TaxpayerProfile = {
  id: number,
  jmbg: string,
  fullName: string,
  streetAddress: string,
  opstinaCode: string,
  phoneNumber: string,
  emailAddress: string,
}

export type ReportType = 'IbkrCsv' | 'NativeIncomeJson'

export type Importer = {
  id: number
  name: string
  reportType: ReportType
  taxpayerProfileId: number
  mailboxId: number
  fromFilter: string
  subjectFilter: string
  paymentNotes: string
  attachmentRegex: string
}

export type ReportStatus = 'init' | 'processed'

export type Report = {
  id: number,
  type: ReportType,
  importerId: number | null,
  mailboxId: number,
  mailboxMessageId: number,
  reportName: string,
  status: ReportStatus,
}

export type FilingStatus = 'init' | 'filed' | 'paid'
export declare type PassiveIncomeType = 'dividend' | 'interest'

export type Filing = {
  id: number,
  reportId: number,
  type: PassiveIncomeType,
  status: FilingStatus,
  payingEntity: string,
  filingDeadline: DateString,
  taxPayable: number
  taxPaymentReference: string,
}

export type ReportJobMessage = {
  type: 'report'
  from: string
  subject: string
  attachmentName: string
}

export type ErrorJobMessage = {
  type: 'error',
  message: string
}

export type SuccessJobMessage = {
  type: 'success',
  message: string
}

export type JobMessage = ReportJobMessage | ErrorJobMessage | SuccessJobMessage

export type Job = {
  id: number
  completed: boolean
  canceled: boolean
  messages: JobMessage[]
}
