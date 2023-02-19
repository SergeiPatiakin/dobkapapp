import { contextBridge } from 'electron'
import ipcContext from './ipc-context'

contextBridge.exposeInMainWorld('electronWindow', {
  ipcContext,
})
