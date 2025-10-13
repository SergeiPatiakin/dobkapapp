import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import { TechnicalConf } from '../common/ipc-types'

export const migrateFilesystem = () => {
  fs.mkdirSync(getReportsDir(), { recursive: true })
  fs.mkdirSync(getFilingsDir(), { recursive: true })
  if (!fs.existsSync(getTechnicalConfPath())) {
    updateTechnicalConf(getDefaultTechnicalConf())
  }
}

// reports
export const getReportsDir = () => path.join(app.getPath('userData'), 'reports')
export const saveReportContent = (id: number, content: Buffer | string) => {
  fs.writeFileSync(getReportPath(id), content)
}
export const getReportContent = (id: number): Buffer => {
  const filePath = getReportPath(id)
  return fs.readFileSync(filePath)
}
export const getReportPath = (id: number) => path.join(getReportsDir(), `${id}.csv`)

// filings
export const getFilingsDir = () => path.join(app.getPath('userData'), 'filings')
export const getFilingContent = (id: number): Buffer => {
  const filePath = path.join(getFilingsDir(), `${id}.xml`)
  return fs.readFileSync(filePath)
}

export const saveFilingContent = (id: number, content: Buffer | string) => {
  fs.writeFileSync(getFilingPath(id), content)
}

export const getFilingPath = (id: number) => path.join(getFilingsDir(), `${id}.xml`)

// technical conf
export const getTechnicalConfPath = () => path.join(app.getPath('userData'), 'technical-conf.json')
export const getDefaultTechnicalConf = (): TechnicalConf => ({
  mexicoBdmToken: '',
  holidayConf: {
    holidayRangeStart: '2020-01-01',
    holidayRangeEnd: '2026-12-31',
    holidays: [
      '2020-01-01',
      '2020-01-02',
      '2020-01-07',
      '2020-02-15',
      '2020-02-16',
      '2020-02-17',
      '2020-04-17',
      '2020-04-18',
      '2020-04-19',
      '2020-04-20',
      '2020-05-01',
      '2020-05-02',
      '2020-11-11',
      '2021-01-01',
      '2021-01-02',
      '2021-01-07',
      '2021-02-15',
      '2021-02-16',
      '2021-04-30',
      '2021-05-03',
      '2021-11-11',
      '2022-01-01',
      '2022-01-02',
      '2022-01-03',
      '2022-01-07',
      '2022-02-15',
      '2022-02-16',
      '2022-04-22',
      '2022-04-23',
      '2022-04-24',
      '2022-04-25',
      '2022-05-01',
      '2022-05-02',
      '2022-05-03',
      '2022-11-11',
      '2023-01-01',
      '2023-01-02',
      '2023-01-03',
      '2023-02-15',
      '2023-02-16',
      '2023-04-14',
      '2023-04-17',
      '2023-05-01',
      '2023-05-02',
      '2023-11-11',
      '2024-01-01',
      '2024-01-02',
      '2024-01-07',
      '2024-02-15',
      '2024-02-16',
      '2024-05-01',
      '2024-05-02',
      '2024-05-03',
      '2024-05-06',
      '2024-11-11',
      '2025-01-01',
      '2025-01-02',
      '2025-01-07',
      '2025-02-15',
      '2025-02-16',
      '2025-04-18',
      '2025-04-21',
      '2025-05-01',
      '2025-05-02',
      '2025-11-11',
      '2026-01-01',
      '2026-01-02',
      '2026-01-07',
      '2026-02-16',
      '2026-02-17',
      '2026-04-10',
      '2026-04-13',
      '2026-05-01',
      '2026-11-11',
    ],
  },
})

export const getTechnicalConf = (): TechnicalConf => {
  return JSON.parse(fs.readFileSync(getTechnicalConfPath(), 'utf-8'))
}
export const updateTechnicalConf = (technicalConf: TechnicalConf) => {
  fs.writeFileSync(getTechnicalConfPath(), JSON.stringify(technicalConf, null, 4))
}
