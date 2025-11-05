import { Filing, Report } from './ipc-types'
import { Button, ButtonGroup, Container, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, ListItemIcon, ListItemText, Menu, MenuItem, Pagination, Stack, Table, TableBody, TableCell, TableHead, TableRow, useTheme } from '@mui/material'
import React, { useEffect, useMemo, useState } from 'react'
import DoDisturbAltIcon from '@mui/icons-material/DoDisturbAlt'
import DownloadIcon from '@mui/icons-material/Download'
import TrashIcon from '@mui/icons-material/Delete'
import { useQueryClient } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'
import { ReportManualImportDialog } from './report-manual-import-dialog'

interface ReportsPageProps {
  reports: Array<Report>
  filings: Array<Filing>
}

const PAGE_SIZE = 20

type ReportsRowProps = {
  report: Report
  allFilings: Array<Filing>
  openReportDeleteDialog: (dialogState: DeleteDialogState) => void
}

const ReportsRow = (props: ReportsRowProps) => {
  const relatedFilings = props.allFilings.filter(f => f.reportId === props.report.id)
  const queryClient = useQueryClient()
  const theme = useTheme()
  const [menuAnchorEl, setMenuAnchorEl] = React.useState<HTMLElement | null>(null)
  const menuOpen = Boolean(menuAnchorEl)
  return <TableRow>
    <TableCell>{props.report.id}</TableCell>
    <TableCell>{props.report.status}</TableCell>
    <TableCell>{props.report.reportName}</TableCell>
    <TableCell>{relatedFilings.map(r => r.id.toString()).join(', ')}</TableCell>
    <TableCell align="right">
        <Button onClick={e => { setMenuAnchorEl(e.currentTarget) }}>
          Actions
        </Button>
        <Menu
          open={menuOpen}
          anchorEl={menuAnchorEl}
          onClose={() => setMenuAnchorEl(null)}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <MenuItem
            onClick={async () => {
              await invoke('export_report', { reportId: props.report.id })
              setMenuAnchorEl(null)
            }}
          >
            <ListItemIcon>
              <DownloadIcon />
            </ListItemIcon>
            <ListItemText>Save As...</ListItemText>
          </MenuItem>
          <MenuItem
            onClick={async () => {
              if (relatedFilings.length > 0) {
                // If there are filings to delete, ask for confirmation
                props.openReportDeleteDialog({
                  reportId: props.report.id,
                  filingIds: relatedFilings.map(f => f.id),
                })
                return
              }
              // Otherwise just delete the report
              await invoke('delete_report', { reportId: props.report.id })
              queryClient.invalidateQueries({ queryKey: ['reports'] })
            }}
          >
            <ListItemIcon style={{ color: theme.palette.error.dark }}>
              <TrashIcon />
            </ListItemIcon>
            <ListItemText style={{ color: theme.palette.error.dark }}>Delete</ListItemText>
          </MenuItem>
        </Menu>
    </TableCell>
  </TableRow>
}

type DeleteDialogState = {
  filingIds: number[]
  reportId: number
}

export const ReportsPage = (props: ReportsPageProps) => {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [deleteDialogState, setDeleteDialogState] = useState<DeleteDialogState | null>(null)
  const [manualImportDialogState, setManualImportDialogState] = useState<Record<string, never> | null>(null)
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
              await invoke('delete_filing', { filingId })
              queryClient.invalidateQueries({ queryKey: ['filings'] })
            }
            // Delete report
            await invoke('delete_report', { reportId: deleteDialogState.reportId})
            queryClient.invalidateQueries({ queryKey: ['reports'] })
            setDeleteDialogState(null)
          }}>Delete</Button>
        </DialogActions>
      </Dialog>
    </div>}
    {manualImportDialogState &&
      <ReportManualImportDialog
        onClose={() => setManualImportDialogState(null)}
      />
    }
    <Table>
      <TableHead>
        <TableRow>
          <TableCell style={{ width: 50 }}><b>Id</b></TableCell>
          <TableCell><b>Status</b></TableCell>
          <TableCell><b>Name</b></TableCell>
          <TableCell><b>Filings</b></TableCell>
          <TableCell align="right"></TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {displayReports.map(r => {
          return <ReportsRow
            key={r.id}
            report={r}
            allFilings={props.filings}
            openReportDeleteDialog={s => setDeleteDialogState(s)}
          />
        })}
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
    <ButtonGroup>
      <Button onClick={() => {
        setManualImportDialogState({})
      }}>Manually create report</Button>
    </ButtonGroup>
  </Container>
}
