import fs from 'fs'
import { foreachIpc, IpcHandlerFns, MailboxCursor } from '../common/ipc-types'
import { BrowserWindow, ipcMain, shell, dialog } from 'electron'
import { createFiling, createImporter, createReport, deleteFiling, deleteImporter, deleteReport, getFilings, getImporters, getMailbox, getReportsByMailbox, getTaxpayerProfile, runSql, updateFiling, updateImporter, updateMailbox, updateReport, updateTaxpayerProfile } from './database'
import { JobStore } from './job-store'
import { getSearchCriteria, ImapClient, parseMessage } from './imap-utils'
import { fireAndForget } from '../common/helpers'
import { getFilingContent, getReportContent, getReportPath, getTechnicalConf, saveFilingContent, saveReportContent, updateTechnicalConf } from './filesystem'
import { createCurrencyService, createHolidayService, DividendInfo as PassiveIncomeInfo, fillOpoForm, getFilingDeadline, ibkrImporter, OpoData, toNaiveDate } from 'dobkap'
import { decodeHolidayConf } from '../common/holiday-conf'
import { getPassiveIncomeFilingInfo } from 'dobkap/lib/passive-income'

const jobStore = new JobStore()

const handlers: IpcHandlerFns = {
  openUrl: async ({ arg: url }) => {
    shell.openExternal(url)
  },

  runSql: async ({ arg: sql }) => {
    return runSql(sql)
  },

  getReports: async () => {
    return getReportsByMailbox(1)
  },

  exportReport: async ({ arg: reportId, browserWindow }) => {
    const r = await dialog.showSaveDialog(browserWindow, {
      defaultPath: `${reportId}.csv`
    })
    if (!r.canceled && r.filePath) {
      const reportContent = getReportContent(reportId)
      fs.writeFileSync(r.filePath, reportContent)
    }
  },

  deleteReport: async ({ arg: id }) => {
    deleteReport(id)
  },

  getFilings: async () => {
    return getFilings()
  },

  updateFiling: async ({ arg: filing }) => {
    updateFiling(filing)
  },

  exportFiling: async ({ arg: filingId, browserWindow }) => {
    const r = await dialog.showSaveDialog(browserWindow, {
      defaultPath: `${filingId}.xml`
    })
    if (!r.canceled && r.filePath) {
      const filingContent = getFilingContent(filingId)
      fs.writeFileSync(r.filePath, filingContent)
    }
  },

  deleteFiling: async ({ arg: filingId }) => {
    deleteFiling(filingId)
  },

  getTaxpayerProfile: async () => {
    return getTaxpayerProfile()
  },

  updateTaxpayerProfile: async ({ arg: taxpayerProfile }) => {
    updateTaxpayerProfile(taxpayerProfile)
  },

  getMailbox: async () => {
    return getMailbox()
  },

  updateMailbox: async ({ arg: mailbox }) => {
    updateMailbox(mailbox)
  },

  createJob: async () => {
    const { id: jobId } = jobStore.createJob()
    fireAndForget(async () => {
      try {
        const mailbox = getMailbox()
        const importers = getImporters()
        const imapClient = new ImapClient(mailbox)
        try {
          const taxpayerProfile = getTaxpayerProfile()
          await imapClient.connect()
          const box = await imapClient.openBox('INBOX')

          if (!box.persistentUIDs){
            throw new Error('Mailbox does not support persistent UIDs')
          }

          const importersByMessageUid: Map<number, Array<number>> = new Map()
          for (const importer of importers) {
            const searchCriteria = getSearchCriteria({
              fromFilter: importer.fromFilter,
              subjectFilter: importer.subjectFilter,
              cursor: mailbox.cursor,
            })

            const imapMessageUids: number[] = await imapClient.search(searchCriteria)
            for (const imapMessageUid of imapMessageUids) {
              if (!importersByMessageUid.has(imapMessageUid)) {
                importersByMessageUid.set(imapMessageUid, [importer.id])
              } else {
                // map.get must return non-null value since the key exists in the map
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                importersByMessageUid.get(imapMessageUid)!.push(importer.id)
              }
            }
          }

          const databaseMessageUids: Set<number> = new Set((getReportsByMailbox(mailbox.id))
            .map(d => d.mailboxMessageId))

          const uidsToProcess = [...importersByMessageUid.keys()].filter(u =>
            // IMAP will always return the last message, even if it outside the UID range.
            // https://stackoverflow.com/questions/34706633/imap-search-by-a-uid-range-on-exchange-server-seems-to-be-broken
            (mailbox.cursor.type === 'uid' ? u > mailbox.cursor.lastSeenUid : true)
            && !databaseMessageUids.has(u)
          )

          for (const uid of uidsToProcess) {
            jobStore.assertNotCancelled(jobId)
            try {
              const rawMessage = await imapClient.fetch(uid, {bodies: ''})
              const emailInfo = await parseMessage(rawMessage)

              for (const importerId of (importersByMessageUid.get(uid) ?? [])) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const importer = importers.find(im => im.id === importerId)!
                const attachmentRegex = RegExp(importer.attachmentRegex, 'i')
                for (const attachment of emailInfo.attachments) {
                  if (!attachmentRegex.test(attachment.fileName)) {
                    continue
                  }
                  const { id: reportId } = createReport({
                    importerId,
                    mailboxId: mailbox.id,
                    mailboxMessageId: uid,
                    reportName: attachment.fileName,
                    status: 'init',
                  })
                  saveReportContent(reportId, attachment.content)
                  jobStore.addMessage(jobId, {
                    type: 'report',
                    from: emailInfo.fromAddress,
                    subject: emailInfo.subject,
                    attachmentName: attachment.fileName,
                  })
                }
              }
              const newCursor: MailboxCursor = {
                type: 'uid',
                lastSeenUid: uid,
                lastSeenDatetime: Date.now().valueOf()
              }
              updateMailbox({
                ...mailbox,
                cursor: newCursor,
              })
            } catch (e) {
              jobStore.addMessage(jobId, {
                type: 'error',
                message: e.toString(),
              })
            }
          }
          jobStore.addMessage(jobId, {
            type: 'success',
            message: `Processed ${uidsToProcess.length} emails`,
          })

          // Process reports

          const allReports = getReportsByMailbox(1)
          const unprocessedReports = allReports.filter(r => r.status !== 'processed')
          
          const technicalConf = getTechnicalConf()
          const currencyService = createCurrencyService({
            mexicoBdmToken: technicalConf.mexicoBdmToken || undefined,
          })
          
          const holidayRange = {
            start: toNaiveDate(technicalConf.holidayConf.holidayRangeStart),
            end: toNaiveDate(technicalConf.holidayConf.holidayRangeEnd),
          }
          const holidays = technicalConf.holidayConf.holidays.map(h => toNaiveDate(h))
          const holidayService = createHolidayService(holidays, holidayRange)
          
          let passiveIncomeCounter = 0
          for (const report of unprocessedReports) {
            const importer = importers.find(im => im.id === report.importerId)
            if (!importer) {
              console.error(`Cannot find importer. ${{ importerId: report.importerId }}`)
              continue
            }
            let passiveIncomeInfos: Array<PassiveIncomeInfo>
            if (importer.type === 'IbkrCsv') {
              passiveIncomeInfos = await ibkrImporter(getReportPath(report.id))
            } else {
              console.error(`Unknown importer type: ${{ type: importer.type }}`)
              continue
            }
            for (const passiveIncomeInfo of passiveIncomeInfos) {
              const passiveIncomeFilingInfo = await getPassiveIncomeFilingInfo(
                currencyService,
                passiveIncomeInfo,
              )
              const filingDeadline = getFilingDeadline(
                holidayService,
                passiveIncomeFilingInfo.incomeDate
              )
              const opoData: OpoData = {
                jmbg: taxpayerProfile.jmbg,
                fullName: taxpayerProfile.fullName,
                streetAddress: taxpayerProfile.streetAddress,
                filerJmbg: taxpayerProfile.jmbg,
                phoneNumber: taxpayerProfile.phoneNumber,
                opstinaCode: taxpayerProfile.opstinaCode,
                email: taxpayerProfile.emailAddress,
                realizationMethod: importer?.paymentNotes ?? '',
                filingDeadline,
                passiveIncomeFilingInfo,
              }
              const opoForm = fillOpoForm(opoData)

              const { id: filingId } = createFiling({
                reportId: report.id,
                type: passiveIncomeFilingInfo.type,
                payingEntity: passiveIncomeFilingInfo.payingEntity,
                filingDeadline: filingDeadline.format('YYYY-MM-DD'),
                taxPayable: passiveIncomeFilingInfo.taxPayable.cents.toString(),
              })

              saveFilingContent(filingId, opoForm)

              passiveIncomeCounter += 1
            }
            updateReport({
              ...report,
              status: 'processed'
            })
          }

          if (unprocessedReports.length > 0) {
            jobStore.addMessage(jobId, {
              type: 'success',
              message: `Processed ${unprocessedReports.length} reports`,
            })
          }
          if (passiveIncomeCounter > 0) {
            jobStore.addMessage(jobId, {
              type: 'success',
              message: `Processed ${passiveIncomeCounter} passive incomes`,
            })
          }
        } catch (e) {
          jobStore.addMessage(jobId, {
            type: 'error',
            message: e.toString(),
          })
        } finally {
          jobStore.setCompleted(jobId)
          imapClient.end()
        }
      } catch (e) {
        jobStore.addMessage(jobId, {
          type: 'error',
          message: e.toString(),
        })
      }
    })
    return { id: jobId }
  },

  getJob: async ({ arg: jobId }) => {
    return jobStore.getJob(jobId)
  },

  cancelJob: async ({ arg: jobId }) => {
    return jobStore.cancelJob(jobId)
  },

  getTechnicalConf: async () => {
    return getTechnicalConf()
  },

  updateTechnicalConf: async ({ arg: technicalConf }) => {
    updateTechnicalConf(technicalConf)
  },

  importHolidayConf: async ({ browserWindow }) => {
    const r = await dialog.showOpenDialog(browserWindow)
    if (r.filePaths.length > 0) {
      try {
        const x = fs.readFileSync(r.filePaths[0], 'utf-8')
        const y = decodeHolidayConf(JSON.parse(x))
        return y
      } catch (e) {
        console.error(e)
        return null
      }
    } else {
      return null
    }
  },

  getImporters: async () => {
    return getImporters()
  },

  updateImporter: async ({ arg: importer }) => {
    updateImporter(importer)
  },

  deleteImporter: async ({ arg: importerId }) => {
    deleteImporter(importerId)
  },

  createImporter: async ({ arg: importer }) => {
    createImporter(importer)
  },
}

export const registerMainIpc = (mainWindow: BrowserWindow) => {
  foreachIpc((ipcKey, ipcName) => ipcMain.handle(ipcName, (e, arg) => handlers[ipcKey]({
    event: e,
    browserWindow: mainWindow,
    arg,
  } as any)))
}
