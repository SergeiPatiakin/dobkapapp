import { IpcContextApi } from '../common/ipc-types'

const context: IpcContextApi = (window as any).electronWindow?.ipcContext

export default context
