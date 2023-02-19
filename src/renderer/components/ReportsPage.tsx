import { Filing, Report } from '../../common/ipc-types'
import { Button, ButtonGroup, Container, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Pagination, Stack, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material'
import ipcContextApi from '../../renderer/ipc-context-api'
import React, { useEffect, useMemo, useState } from 'react'
import DoDisturbAltIcon from '@mui/icons-material/DoDisturbAlt'

interface ReportsPageProps {
  reports: Array<Report>
  filings: Array<Filing>
  invalidateReports: () => void
  invalidateFilings: () => void
}

const PAGE_SIZE = 20

type DeleteDialogState = {
  filingIds: number[]
  reportId: number
}

export const ReportsPage = (props: ReportsPageProps) => {
  const [page, setPage] = useState(1)
  const [deleteDialogState, setDeleteDialogState] = useState<DeleteDialogState | null>(null)
  const displayReports = useMemo(
    () => props.reports.slice(PAGE_SIZE * (page - 1), PAGE_SIZE * page),
    [page, props.reports],
  )
  const numPages = useMemo(
    () => Math.max(1, Math.ceil(props.reports.length / PAGE_SIZE)),
    [props.reports],
  )
  useEffect(() => {
    if (page > numPages){
      setPage(numPages)
    }
  }, [page, numPages])

  return <Container>
    <h2 style={{ marginBottom: 0}}>Reports</h2>
    {deleteDialogState && <div>
      <Dialog open={true} onClose={() => setDeleteDialogState(null)}>
        <DialogTitle>Report has related filings</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Deleting this report will also delete <b>{deleteDialogState.filingIds.length}</b> related filings.
            Are you sure?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogState(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={async () => {
            // Delete related filings
            for (const filingId of deleteDialogState.filingIds) {
              await ipcContextApi.deleteFiling(filingId)
              props.invalidateFilings()
            }
            // Delete report
            await ipcContextApi.deleteReport(deleteDialogState.reportId)
            props.invalidateReports()
            setDeleteDialogState(null)
          }}>Delete</Button>
        </DialogActions>
      </Dialog>
    </div>}
    <Table>
      <TableHead>
        <TableRow>
          <TableCell style={{ width: 50 }}><b>Id</b></TableCell>
          <TableCell><b>Status</b></TableCell>
          <TableCell><b>Name</b></TableCell>
          <TableCell><b>Filings</b></TableCell>
          <TableCell align="right"><b>Actions</b></TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {displayReports.map((r, rIdx) => {
          const relatedFilings = props.filings.filter(f => f.reportId === r.id)
          return <TableRow key={rIdx}>
            <TableCell>{r.id}</TableCell>
            <TableCell>{r.status}</TableCell>
            <TableCell>{r.reportName}</TableCell>
            <TableCell>{relatedFilings.map(r => r.id.toString()).join(', ')}</TableCell>
            <TableCell align="right">
              <ButtonGroup>
                <Button color="error" onClick={async () => {
                  if (relatedFilings.length > 0) {
                    // If there are filings to delete, ask for confirmation
                    setDeleteDialogState({
                      reportId: r.id,
                      filingIds: relatedFilings.map(f => f.id),
                    })
                    return
                  }
                  // Otherwise just delete the report
                  await ipcContextApi.deleteReport(r.id)
                  props.invalidateReports()
                }}>Delete</Button>
              </ButtonGroup>
            </TableCell>
          </TableRow>
          })
        }
        { props.reports.length === 0 &&
          <TableRow>
            <TableCell colSpan={6}>
              <Stack direction="row" alignItems="center" justifyContent="center" gap={1}>
                <DoDisturbAltIcon />
                No reports found
              </Stack>
            </TableCell>
          </TableRow> 
        }
      </TableBody>
    </Table>
    { numPages > 1 &&
      <Pagination count={numPages} onChange={(_e, value) => setPage(value)} />
    }
  </Container>
}
