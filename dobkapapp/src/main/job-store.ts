import { CreateJobResult, Job, JobMessage } from '../common/ipc-types'

export class JobStore {
  private jobIdSeq = 1
  private jobs: Array<Job> = []
  public createJob(): CreateJobResult {
    const jobId = this.jobIdSeq++
    const job: Job = {
      id: jobId,
      completed: false,
      canceled: false,
      messages: [],
    }
    this.jobs.push(job)
    return {
      id: jobId
    }
  }
  public cancelJob(id: number) {
    const job = this.jobs.find(j => j.id === id)
    if (job) {
      job.canceled = true
    }
  }
  public getJob(id: number): Job | null {
    return this.jobs.find(j => j.id === id) ?? null
  }
  public setCompleted(id: number) {
    const job = this.jobs.find(j => j.id === id)
    if (job) {
      job.completed = true
    }
  }
  public assertNotCancelled(id: number): void {
    const job = this.jobs.find(j => j.id === id)
    if (job && job.canceled) {
      throw new Error('Job cancelled')
    }
  }
  public addMessage(jobId: number, message: JobMessage) {
    const job = this.jobs.find(j => j.id === jobId)
    if (job) {
      job.messages.push(message)
    }
  }
}
