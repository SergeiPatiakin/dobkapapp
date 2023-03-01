import { PassiveIncomeType } from 'dobkap/lib/passive-income'
import type { BrowserWindow } from 'electron'
import { HolidayConf } from './holiday-conf'
import { DateString } from './primitive-types'

export type ReportStatus = 'init' | 'processed'

export type Report = {
  id: number,
  importerId: number | null,
  mailboxId: number,
  mailboxMessageId: number,
  reportName: string,
  status: ReportStatus,
}

export type FilingStatus = 'init' | 'filed' | 'paid'

export type Filing = {
  id: number,
  reportId: number,
  type: PassiveIncomeType,
  status: FilingStatus,
  payingEntity: string,
  filingDeadline: DateString,
  taxPayable: number
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

export type Mailbox = {
  id: number,
  emailAddress: string,
  emailPassword: string,
  imapHost: string,
  imapPort: number,
  cursor: MailboxCursor,
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

export type CreateJobResult = {
  id: number
}

export type MailboxCursor = {
  type: 'date'
  dateString: DateString
} | {
  type: 'uid'
  lastSeenUid: number
  lastSeenDatetime: number
}

export type FilingFilter = 'all' | 'unpaid'

export type TechnicalConf = {
  mexicoBdmToken: string
  holidayConf: HolidayConf
}

export type ImporterType = 'IbkrCsv'

export type Importer = {
  id: number
  name: string
  type: ImporterType
  taxpayerProfileId: number
  mailboxId: number
  fromFilter: string
  subjectFilter: string
  paymentNotes: string
  attachmentRegex: string
}

type IpcTypeDef<N extends string, A, B> = {
  Name: N
  Arg: A
  Result: B
  ClientFn: (arg: A) => Promise<B>
  HandlerFn: (req: {
    event: Electron.IpcMainInvokeEvent,
    browserWindow: BrowserWindow,
    arg: A,
  }) => Promise<B>
}

export type OpenUrl = IpcTypeDef<'open-url', string, void>

export type RunSql = IpcTypeDef<
  'run-sql',
  string,
  {
    columns: Array<{ name: string }>
    rows: Array<Array<any>>
  }
>

export type GetReports = IpcTypeDef<
  'get-reports',
  void,
  Array<Report>
>
export type DeleteReport = IpcTypeDef<
  'delete-report',
  number,
  void
>
export type GetFilings = IpcTypeDef<
  'get-filings',
  void,
  Array<Filing>
>
export type UpdateFiling = IpcTypeDef<
  'update-filing',
  Filing,
  void
>
export type ExportFiling = IpcTypeDef<
  'export-filing',
  number,
  void
>
export type DeleteFiling = IpcTypeDef<
  'delete-filing',
  number,
  void
>
export type GetTaxpayerProfile = IpcTypeDef<
  'get-taxpayer-profile',
  void,
  TaxpayerProfile
>
export type UpdateTaxpayerProfile = IpcTypeDef<
  'update-taxpayer-profile',
  TaxpayerProfile,
  void
>
export type GetMailbox = IpcTypeDef<
  'get-mailbox',
  void,
  Mailbox
>
export type UpdateMailbox = IpcTypeDef<
  'update-mailbox',
  Mailbox,
  void
>
export type CreateJob = IpcTypeDef<
  'create-job',
  void,
  CreateJobResult
>
export type GetJob = IpcTypeDef<
  'get-job',
  number,
  Job | null
>
export type CancelJob = IpcTypeDef<
  'cancel-job',
  number,
  void
>
export type GetTechnicalConf = IpcTypeDef<
  'get-technical-conf',
  void,
  TechnicalConf
>
export type UpdateTechnicalConf = IpcTypeDef<
  'update-technical-conf',
  TechnicalConf,
  void
>
export type ImportHolidayConf = IpcTypeDef<
  'import-holiday-conf',
  void,
  HolidayConf | null
>
export type GetImporters = IpcTypeDef<
  'get-importers',
  void,
  Array<Importer>
>
export type UpdateImporter = IpcTypeDef<
  'update-importer',
  Importer,
  void
>
export type DeleteImporter = IpcTypeDef<
  'delete-importer',
  number,
  void
>
export type CreateImporter = IpcTypeDef<
  'create-importer',
  Importer,
  void
>

export type IpcMethods = {
  openUrl: OpenUrl
  runSql: RunSql
  getReports: GetReports
  deleteReport: DeleteReport
  getFilings: GetFilings
  updateFiling: UpdateFiling
  exportFiling: ExportFiling
  deleteFiling: DeleteFiling
  getTaxpayerProfile: GetTaxpayerProfile
  updateTaxpayerProfile: UpdateTaxpayerProfile
  getMailbox: GetMailbox
  updateMailbox: UpdateMailbox
  createJob: CreateJob
  getJob: GetJob
  cancelJob: CancelJob
  getTechnicalConf: GetTechnicalConf
  updateTechnicalConf: UpdateTechnicalConf
  importHolidayConf: ImportHolidayConf
  getImporters: GetImporters
  updateImporter: UpdateImporter
  deleteImporter: DeleteImporter
  createImporter: CreateImporter
}

export type IpcHandlerFns = { [k in keyof IpcMethods]: IpcMethods[k]['HandlerFn']}
export type IpcContextApi = { [k in keyof IpcMethods]: IpcMethods[k]['ClientFn']}
export type IpcNames = { [k in keyof IpcMethods]: IpcMethods[k]['Name']}

const ipcNames: IpcNames = {
  openUrl: 'open-url',
  runSql: 'run-sql',
  getReports: 'get-reports',
  deleteReport: 'delete-report',
  getFilings: 'get-filings',
  updateFiling: 'update-filing',
  exportFiling: 'export-filing',
  deleteFiling: 'delete-filing',
  getTaxpayerProfile: 'get-taxpayer-profile',
  updateTaxpayerProfile: 'update-taxpayer-profile',
  getMailbox: 'get-mailbox',
  updateMailbox: 'update-mailbox',
  createJob: 'create-job',
  getJob: 'get-job',
  cancelJob: 'cancel-job',
  getTechnicalConf: 'get-technical-conf',
  updateTechnicalConf: 'update-technical-conf',
  importHolidayConf: 'import-holiday-conf',
  getImporters: 'get-importers',
  updateImporter: 'update-importer',
  deleteImporter: 'delete-importer',
  createImporter: 'create-importer',
}

export const foreachIpc = (cb: (ipcKey: keyof IpcNames, ipcName: string) => void): void => {
  Object.keys(ipcNames).forEach((ipcKey: keyof IpcNames) => {
    const ipcName  = ipcNames[ipcKey]
    cb(ipcKey, ipcName)
  })
}
