import { formatRsdcAmount } from '../../common/helpers'
import { Filing } from '../../common/ipc-types'
import {
  Button,
  ButtonGroup,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material'
import ipcContextApi from '../../renderer/ipc-context-api'
import React, { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

type FilingEditDialogProps = {
  filing: Filing
  onClose: () => void
}

export const FilingEditDialog = (props: FilingEditDialogProps) => {
  const queryClient = useQueryClient()
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
          style={{ width: 400 }}
          disabled
          label="ID"
          value={props.filing.id}
          onChange={e => setPaymentReference(e.target.value)}
        />
        <TextField
          style={{ width: 400 }}
          disabled
          label="Tax Payable"
          value={formatRsdcAmount(props.filing.taxPayable)}
          onChange={e => setPaymentReference(e.target.value)}
        />
        <TextField
          style={{ width: 400 }}
          label="Payment Reference"
          value={paymentReference}
          onChange={e => setPaymentReference(e.target.value)}
        />
      </Stack>
    </DialogContent>
    <DialogActions>
      <ButtonGroup>
      <Button onClick={props.onClose}>Cancel</Button>
      <Button variant="contained" onClick={async () => {
        await ipcContextApi.updateFiling({
          ...props.filing,
          taxPaymentReference: paymentReference,
          status: (props.filing.status == 'init' && paymentReference != '')
            ? 'filed'
            : props.filing.status
        })
        queryClient.invalidateQueries({ queryKey: ['filings'] })
        props.onClose()
      }} autoFocus>
        Save
      </Button>
      </ButtonGroup>
    </DialogActions>
  </Dialog>
}
