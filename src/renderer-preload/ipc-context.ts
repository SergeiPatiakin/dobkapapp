import { foreachIpc, IpcContextApi } from '../common/ipc-types'
import { ipcRenderer } from 'electron'

const ipcContext: IpcContextApi = {} as any

foreachIpc((ipcKey, ipcName) => {
  ipcContext[ipcKey] = (arg) => {
    return ipcRenderer.invoke(ipcName, arg)
  }
})

export default ipcContext
