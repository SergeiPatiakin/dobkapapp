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
import { PassiveIncomeType } from 'dobkap/lib/passive-income'

type ReportManualImportDialogProps = {
  onClose: () => void
}

export const ReportManualImportDialog = (props: ReportManualImportDialogProps) => {
  const queryClient = useQueryClient()
  const [incomeType, setIncomeType] = useState('') // TODO: dropdown
  const [payingEntity, setPayingEntity] = useState('')
  const [incomeDate, setIncomeDate] = useState('') // TODO: validate date
  const [incomeCurrencyCode, setIncomeCurrencyCode] = useState('') // TODO: dropdown
  const [incomeCurrencyAmount, setIncomeCurrencyAmount] = useState('') // TODO: validate number
  const [whtCurrencyCode, setWhtCurrencyCode] = useState('') // TODO: dropdown + same-as-income toggle
  const [whtCurrencyAmount, setWhtCurrencyAmount] = useState('') // TODO: validate number
  return <Dialog
      open
      onClose={props.onClose}
    >
    <DialogTitle>
      Manually Create Report
    </DialogTitle>
    <DialogContent>
      <p style={{ marginBottom: 0}}></p>
      <Stack gap={1}>
        <TextField
          style={{ width: 400 }}
          label="Income Type (dividend or interest)"
          value={incomeType}
          onChange={e => setIncomeType(e.target.value)}
        />
        <TextField
          style={{ width: 400 }}
          label="Paying Entity (optional)"
          value={payingEntity}
          onChange={e => setPayingEntity(e.target.value)}
        />
        <TextField
          style={{ width: 400 }}
          label="Income Date (YYYY-MM-DD)"
          value={incomeDate}
          onChange={e => setIncomeDate(e.target.value)}
        />
        <TextField
          style={{ width: 400 }}
          label="Income Currency Code"
          value={incomeCurrencyCode}
          onChange={e => setIncomeCurrencyCode(e.target.value)}
        />
        <TextField
          style={{ width: 400 }}
          label="Income Amount in Currency"
          value={incomeCurrencyAmount}
          onChange={e => setIncomeCurrencyAmount(e.target.value)}
        />
        <TextField
          style={{ width: 400 }}
          label="Withholding Tax Currency Code"
          value={whtCurrencyCode}
          onChange={e => setWhtCurrencyCode(e.target.value)}
        />
        <TextField
          style={{ width: 400 }}
          label="Withholding Tax Amount in Currency"
          value={whtCurrencyAmount}
          onChange={e => setWhtCurrencyAmount(e.target.value)}
        />
      </Stack>
    </DialogContent>
    <DialogActions>
      <ButtonGroup>
      <Button onClick={props.onClose}>Cancel</Button>
      <Button variant="contained" onClick={async () => {
        await ipcContextApi.importTrivialReport({
            type: incomeType as PassiveIncomeType,
            payingEntity,
            incomeDate,
            incomeCurrencyCode,
            incomeCurrencyAmount: parseFloat(incomeCurrencyAmount),
            whtCurrencyCode,
            whtCurrencyAmount: parseFloat(whtCurrencyAmount),
        })
        queryClient.invalidateQueries({ queryKey: ['reports'] })
        props.onClose()
      }} autoFocus>
        Save
      </Button>
      </ButtonGroup>
    </DialogActions>
  </Dialog>
}
