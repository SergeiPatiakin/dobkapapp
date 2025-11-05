import { formatRsdcAmount } from './helpers'
import { Filing, FilingStatus } from './ipc-types'
import {
  Button,
  ButtonGroup,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'

type FilingEditDialogProps = {
  filing: Filing
  onClose: () => void
}

export const FilingEditDialog = (props: FilingEditDialogProps) => {
  const queryClient = useQueryClient()
  const [filingStatus, setFilingStatus] = useState(props.filing.status)
  const [paymentReference, setPaymentReference] = useState(props.filing.taxPaymentReference)
  return <Dialog
      open
      onClose={props.onClose}
    >
    <DialogTitle>
      Edit Filing
    </DialogTitle>
    <DialogContent>
      <p style={{ marginBottom: 0}}></p>
      <Stack gap={1}>
        <TextField
          size="small"
          style={{ width: 400 }}
          disabled
          label="ID"
          value={props.filing.id}
          onChange={e => setPaymentReference(e.target.value)}
        />
        <FormControl size="small">
          <InputLabel>Status</InputLabel>
          <Select label="Status"
            value={filingStatus}
            sx={{ minWidth: 90 }}
            onChange={e => setFilingStatus(e.target.value as FilingStatus)}>
            <MenuItem value='init'>Initial</MenuItem>
            <MenuItem value='filed'>Filed</MenuItem>
            <MenuItem value='paid'>Paid</MenuItem>
          </Select>
        </FormControl>
        <TextField
          size="small"
          style={{ width: 400 }}
          disabled
          label="Tax Payable"
          value={formatRsdcAmount(props.filing.taxPayable)}
          onChange={e => setPaymentReference(e.target.value)}
        />
        <TextField
          size="small"
          style={{ width: 400 }}
          label="Payment Reference"
          value={paymentReference}
          onChange={e => {
            setPaymentReference(e.target.value)
            if (filingStatus == 'init' && e.target.value != '') {
              setFilingStatus('filed')
            }
          }}
        />
      </Stack>
    </DialogContent>
    <DialogActions>
      <ButtonGroup>
      <Button onClick={props.onClose}>Cancel</Button>
      <Button variant="contained" onClick={async () => {
        await invoke('update_filing', { filing: {
          ...props.filing,
          status: filingStatus,
          taxPaymentReference: paymentReference,
        }})
        queryClient.invalidateQueries({ queryKey: ['filings'] })
        props.onClose()
      }} autoFocus>
        Save
      </Button>
      </ButtonGroup>
    </DialogActions>
  </Dialog>
}
