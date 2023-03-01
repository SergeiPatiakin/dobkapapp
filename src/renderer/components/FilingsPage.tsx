import { formatRsdcAmount } from '../../common/helpers'
import { Filing, FilingFilter, FilingStatus, Report } from '../../common/ipc-types'
import { Button, ButtonGroup, Container, FormControl, MenuItem, Pagination, Select, Stack, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material'
import ipcContextApi from '../../renderer/ipc-context-api'
import React, { useEffect, useMemo, useState } from 'react'
import DoDisturbAltIcon from '@mui/icons-material/DoDisturbAlt'

interface FilingsPageProps {
  reports: Array<Report>
  filings: Array<Filing>
  invalidateFilings: () => void
}

const PAGE_SIZE = 20

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
  useEffect(() => {
    if (page > numPages){
      setPage(numPages)
    }
  }, [page, numPages])

  return <Container>
    <h2 style={{ marginBottom: 0}}>Filings</h2>
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
          <TableCell align="right"><b>Filing Deadline</b></TableCell>
          <TableCell align="right"><b>Tax Payable</b></TableCell>
          <TableCell align="right"><b>Actions</b></TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {displayFilings.map((f, fIdx) => <TableRow key={fIdx}>
          <TableCell>{f.id}</TableCell>
          <TableCell>
            <FormControl size="small">
              <Select
                value={f.status}
                sx={{ minWidth: 90 }}
                onChange={async e => {
                  const newStatus = e.target.value as FilingStatus
                  await ipcContextApi.updateFiling({...f, status: newStatus})
                  props.invalidateFilings()
                }
              }>
                <MenuItem value='init'>Initial</MenuItem>
                <MenuItem value='filed'>Filed</MenuItem>
                <MenuItem value='paid'>Paid</MenuItem>
              </Select>
            </FormControl>
          </TableCell>
          <TableCell>{f.type}</TableCell>
          <TableCell>{f.payingEntity}</TableCell>
          <TableCell align="right">{f.filingDeadline}</TableCell>
          <TableCell align="right">{formatRsdcAmount(f.taxPayable)}</TableCell>
          <TableCell align="right">
            <ButtonGroup>
              <Button onClick={() => {
                ipcContextApi.exportFiling(f.id)
              }}>Save As...</Button>
              <Button color="error" onClick={async () => {
                await ipcContextApi.deleteFiling(f.id)
                props.invalidateFilings()
              }}>Delete</Button>
            </ButtonGroup>
          </TableCell>
        </TableRow>)}
        { filteredFilings.length === 0 &&
          <TableRow>
            <TableCell colSpan={6}>
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
