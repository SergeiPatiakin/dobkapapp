import { Importer, ReportType } from '../../common/ipc-types'
import { Button, ButtonGroup, Container, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, IconButton, InputAdornment, InputLabel, MenuItem, OutlinedInput, Pagination, Select, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip } from '@mui/material'
import ipcContextApi from '../../renderer/ipc-context-api'
import React, { useEffect, useMemo, useState } from 'react'
import DoDisturbAltIcon from '@mui/icons-material/DoDisturbAlt'
import HelpIcon from '@mui/icons-material/Help'
import { useQueryClient } from '@tanstack/react-query'

interface ImportersPageProps {
  importers: Array<Importer>
}

type UpsertDialogProps = {
  initialImporter: Importer
  onClose: () => void
}

const PAGE_SIZE = 20

const ReportTypeDescriptions: { [k in ReportType]: string} = {
  'IbkrCsv': 'InteractiveBrokers CSV',
}

const UpsertImporterDialog = (props: UpsertDialogProps) => {
  const queryClient = useQueryClient()
  const [name, setName] = useState(props.initialImporter.name)
  const [fromFilter, setFromFilter] = useState(props.initialImporter.fromFilter)
  const [subjectFilter, setSubjectFilter] = useState(props.initialImporter.subjectFilter)
  const [attachmentRegex, setAttachmentRegex] = useState(props.initialImporter.attachmentRegex)
  const [paymentNotes, setPaymentNotes] = useState(props.initialImporter.paymentNotes)
  return <div>
    <Dialog open={true} onClose={props.onClose} fullWidth>
      <DialogTitle>
        {props.initialImporter.id === 0 ? 'Create' : 'Edit'} importer
      </DialogTitle>
      <DialogContent>
        <h2 style={{ marginBottom: 0}}></h2>
        <Stack gap={1}>
          <TextField label="Name" value={name} onChange={e => setName(e.target.value)} />
          <TextField label="From filter" value={fromFilter} onChange={e => setFromFilter(e.target.value)} />
          <TextField label="Subject filter" value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} />
          <TextField label="Attachment regex" value={attachmentRegex} onChange={e => setAttachmentRegex(e.target.value)} />
          <FormControl variant="outlined">
            <InputLabel htmlFor="outlined-adornment-payment-notes">Payment Notes</InputLabel>
            <OutlinedInput
              id="outlined-adornment-payment-notes"
              label="Payment Notes"
              value={paymentNotes}
              onChange={e => setPaymentNotes(e.target.value)}
              endAdornment={
                <InputAdornment position="end">
                  <IconButton edge="end">
                    <Tooltip title="Description of how you received payment. This will be included in each filing" placement="bottom-end">
                      <HelpIcon />
                    </Tooltip>
                  </IconButton>
                </InputAdornment>
              }
            />
          </FormControl>
          <FormControl size="small">
            <InputLabel>Import format</InputLabel>
            <Select value="IbkrCsv" label="Import format">
              <MenuItem value='IbkrCsv'>{ReportTypeDescriptions['IbkrCsv']}</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose}>Cancel</Button>
        <Button variant="contained" onClick={async () => {
          if (props.initialImporter.id === 0) {
            await ipcContextApi.createImporter({
              ...props.initialImporter,
              name,
              fromFilter,
              subjectFilter,
              attachmentRegex,
              paymentNotes,
            })
          } else {
            await ipcContextApi.updateImporter({
              ...props.initialImporter,
              name,
              fromFilter,
              subjectFilter,
              attachmentRegex,
              paymentNotes,
            })
          }
          queryClient.invalidateQueries({ queryKey: ['importers'] })
          props.onClose()
        }}>Save</Button>
      </DialogActions>
    </Dialog>
  </div>
}

export const ImportersPage = (props: ImportersPageProps) => {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [upsertImporter, setUpsertImporter] = useState<Importer | null>(null)
  const displayImporters = useMemo(
    () => props.importers.slice(PAGE_SIZE * (page - 1), PAGE_SIZE * page),
    [page, props.importers],
  )
  const numPages = useMemo(
    () => Math.max(1, Math.ceil(props.importers.length / PAGE_SIZE)),
    [props.importers],
  )
  useEffect(() => {
    if (page > numPages){
      setPage(numPages)
    }
  }, [page, numPages])
  return <Container>
    <h2 style={{ marginBottom: 0}}>Importers</h2>
    {upsertImporter && <UpsertImporterDialog
      initialImporter={upsertImporter}
      onClose={() => setUpsertImporter(null)}
    />}
    <Table>
      <TableHead>
        <TableRow>
          <TableCell style={{ width: 50 }}><b>Id</b></TableCell>
          <TableCell><b>Name</b></TableCell>
          <TableCell><b>Report Type</b></TableCell>
          <TableCell align="right"><b>Actions</b></TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {displayImporters.map(im => {
          return <TableRow key={im.id}>
            <TableCell>{im.id}</TableCell>
            <TableCell>{im.name}</TableCell>
            <TableCell>{ReportTypeDescriptions[im.reportType]}</TableCell>
            <TableCell align="right">
              <ButtonGroup>
                <Button onClick={async () => {
                  setUpsertImporter(im)
                }}>Edit</Button>
                <Button color="error" onClick={async () => {
                  await ipcContextApi.deleteImporter(im.id)
                  queryClient.invalidateQueries({ queryKey: ['importers'] })
                }}>Delete</Button>
              </ButtonGroup>
            </TableCell>
          </TableRow>
          })
        }
        { props.importers.length === 0 &&
          <TableRow>
            <TableCell colSpan={6}>
              <Stack direction="row" alignItems="center" justifyContent="center" gap={1}>
                <DoDisturbAltIcon />
                No importers are configured
              </Stack>
            </TableCell>
          </TableRow> 
        }
      </TableBody>
    </Table>
    { numPages > 1 &&
      <Pagination count={numPages} onChange={(_e, value) => setPage(value)} />
    }
    <h2 style={{ marginBottom: 0}}></h2>
    <ButtonGroup>
      <Button onClick={async () => {
        setUpsertImporter({
          id: 0,
          name: 'Untitled importer',
          reportType: 'IbkrCsv',
          mailboxId: 1,
          taxpayerProfileId: 1,
          fromFilter: '',
          subjectFilter: '',
          paymentNotes: 'Isplata na brokerski racun',
          attachmentRegex: '',
        })
      }}>Add importer</Button>
    </ButtonGroup>
  </Container>
}
