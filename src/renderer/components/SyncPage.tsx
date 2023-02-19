import { Job } from '../../common/ipc-types'
import { Alert, Button, ButtonGroup, Container, Stack } from '@mui/material'
import ipcContextApi from '../ipc-context-api'
import React, { useState } from 'react'

type Props = {
  setNavigationEnabled: (navigationEnabled: boolean) => void
  invalidateReports: () => void
  invalidateFilings: () => void
  invalidateMailbox: () => void
}

export const SyncPage = (props: Props) => {
  const [job, setJob] = useState<Job | null>(null)
  return <Container>
    <Stack spacing={1}>
      <h2 style={{ marginBottom: 0}}>Sync</h2>
      <ButtonGroup>
        <Button variant="contained" color="error" disabled={!(job && !job.completed)}
        onClick={async () => {
          if (job) {
            await ipcContextApi.cancelJob(job.id)
          }
        }}
        >
          Cancel Sync
        </Button>
        <Button variant="contained" color="success" disabled={!!(job && !job.completed)}
        onClick={async () => {
          props.setNavigationEnabled(false)
          try {
            const { id } = await ipcContextApi.createJob()
            // First job poll immediately
            const j = await ipcContextApi.getJob(id)
            setJob(j)
            // Continue job poll every 0.5s
            while (true) {
              await new Promise (resolve => setTimeout(resolve, 500))
              const job = await ipcContextApi.getJob(id)
              setJob(job)
              if (!job) {
                // should never happen
                break
              }
              if (job.completed) {
                break
              }
            }
          } finally {
            props.setNavigationEnabled(true)
            props.invalidateReports()
            props.invalidateFilings()
            props.invalidateMailbox()
          }
        }}>
          Run Sync
        </Button>
      </ButtonGroup>
      {job && job.messages.map((s, sIdx) => {
        if (s.type === 'success') {
          return <Alert key={sIdx} severity='success'>{s.message}</Alert>
        }
        if (s.type === 'error') {
          return <Alert key={sIdx} severity='error'>{s.message}</Alert>
        }
        return <Alert key={sIdx} severity='info'>
          From: {s.from}<br />
          Subject: {s.subject}<br />
          Attachment Name: {s.attachmentName}<br />
        </Alert>
      })}
    </Stack>
  </Container>
}
