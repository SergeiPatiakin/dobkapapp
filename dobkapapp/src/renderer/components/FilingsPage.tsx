import { formatRsdcAmount } from '../../common/helpers'
import { Filing, FilingFilter, FilingStatus, Report } from '../../common/ipc-types'
import {
  Button,
  ButtonGroup,
  Container,
  FormControl,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Pagination,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  useTheme,
} from '@mui/material'
import ipcContextApi from '../../renderer/ipc-context-api'
import React, { useEffect, useMemo, useState } from 'react'
import DoDisturbAltIcon from '@mui/icons-material/DoDisturbAlt'
import DownloadIcon from '@mui/icons-material/Download'
import TrashIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import { FilingEditDialog } from './FilingEditDialog'
import { useQueryClient } from '@tanstack/react-query'

interface FilingsPageProps {
  reports: Array<Report>
  filings: Array<Filing>
}

const PAGE_SIZE = 20

type FilingsRowProps = {
  filing: Filing
  openFilingEditDialog: () => void
}

const FilingsRow = (props: FilingsRowProps) => {
  const theme = useTheme()
  const queryClient = useQueryClient()
  const [menuAnchorEl, setMenuAnchorEl] = React.useState<HTMLElement | null>(null)
  const menuOpen = Boolean(menuAnchorEl)
  return <TableRow style={{ cursor: 'pointer'}} hover onClick={props.openFilingEditDialog}>
    <TableCell>{props.filing.id}</TableCell>
    <TableCell>
      <FormControl size="small">
        <Select
          value={props.filing.status}
          sx={{ minWidth: 90 }}
          onClick={e => { e.stopPropagation() }}
          onChange={async e => {
            const newStatus = e.target.value as FilingStatus
            await ipcContextApi.updateFiling({...props.filing, status: newStatus})
            queryClient.invalidateQueries({ queryKey: ['filings'] })
          }
        }>
          <MenuItem value='init'>Initial</MenuItem>
          <MenuItem value='filed'>Filed</MenuItem>
          <MenuItem value='paid'>Paid</MenuItem>
        </Select>
      </FormControl>
    </TableCell>
    <TableCell>{props.filing.type}</TableCell>
    <TableCell>{props.filing.payingEntity}</TableCell>
    <TableCell align="right">{props.filing.filingDeadline}</TableCell>
    <TableCell align="right">{formatRsdcAmount(props.filing.taxPayable)}</TableCell>
    <TableCell align="right">{props.filing.taxPaymentReference || '-'}</TableCell>
    <TableCell align="right">
      <ButtonGroup>
        <Button onClick={e => {
            e.stopPropagation()
            setMenuAnchorEl(e.currentTarget)
          }}>
          Actions
        </Button>
        <Menu
          open={menuOpen}
          anchorEl={menuAnchorEl}
          onClick={e => { e.stopPropagation() }}
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
            onClick={async e => {
              e.stopPropagation()
              await ipcContextApi.exportFiling(props.filing.id)
              setMenuAnchorEl(null)
            }}
          >
            <ListItemIcon>
              <DownloadIcon />
            </ListItemIcon>
            <ListItemText>Save As...</ListItemText>
          </MenuItem>
          <MenuItem onClick={e => {
            e.stopPropagation()
            props.openFilingEditDialog()
            setMenuAnchorEl(null)
          }}>
            <ListItemIcon>
              <EditIcon />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
          <MenuItem
            onClick={async e => {
              e.stopPropagation()
              await ipcContextApi.deleteFiling(props.filing.id)
              setMenuAnchorEl(null)
            }}
          >
            <ListItemIcon style={{ color: theme.palette.error.dark }}>
              <TrashIcon />
            </ListItemIcon>
            <ListItemText style={{ color: theme.palette.error.dark }}>Delete</ListItemText>
          </MenuItem>
        </Menu>
      </ButtonGroup>
    </TableCell>
  </TableRow>
}

type FilingEditDialogState = 
| { visible: false }
| { visible: true, filing: Filing }

export const FilingsPage = (props: FilingsPageProps) => {
  const [filter, setFilter] = useState<FilingFilter>('unpaid')
  const [page, setPage] = useState(1)
  const filteredFilings = useMemo(() => filter === 'all'
    ? props.filings
    : props.filings.filter(f => f.status !== 'paid'),
    [props.filings, filter],
  )
  const displayFilings = useMemo(
    () => filteredFilings.slice(PAGE_SIZE * (page - 1), PAGE_SIZE * page),
    [page, filteredFilings],
  )
  const numPages = useMemo(
    () => Math.max(1, Math.ceil(filteredFilings.length / PAGE_SIZE)),
    [filteredFilings],
  )
  const [filingEditDialogState, setFilingEditDialogState] =
    useState<FilingEditDialogState>({ visible: false })

  useEffect(() => {
    if (page > numPages){
      setPage(numPages)
    }
  }, [page, numPages])



  return <Container>
    <h2 style={{ marginBottom: 0}}>Filings</h2>
    {filingEditDialogState.visible &&
      <FilingEditDialog
        filing={filingEditDialogState.filing}
        onClose={() => setFilingEditDialogState({ visible: false })}
      />
    }
    <FormControl size="small">
      <Select value={filter} onChange={e => setFilter(e.target.value as FilingFilter)}>
        <MenuItem value='unpaid'>Unpaid</MenuItem>
        <MenuItem value='all'>All</MenuItem>
      </Select>
    </FormControl>
    <Table>
      <TableHead>
        <TableRow>
          <TableCell style={{ width: 50 }}><b>Id</b></TableCell>
          <TableCell><b>Status</b></TableCell>
          <TableCell style={{ width: 50 }}><b>Type</b></TableCell>
          <TableCell><b>Paying Entity</b></TableCell>
          <TableCell align="right"><b>Deadline</b></TableCell>
          <TableCell align="right"><b>Tax Payable</b></TableCell>
          <TableCell align="right"><b>Payment Ref</b></TableCell>
          <TableCell align="right"></TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {displayFilings.map(f => 
          <FilingsRow
            key={f.id}
            filing={f}
            openFilingEditDialog={() => setFilingEditDialogState({
              visible: true,
              filing: f,
            })}
          />
        )}
        { filteredFilings.length === 0 &&
          <TableRow>
            <TableCell colSpan={7}>
              <Stack direction="row" alignItems="center" justifyContent="center" gap={1}>
                <DoDisturbAltIcon />
                No filings found
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
