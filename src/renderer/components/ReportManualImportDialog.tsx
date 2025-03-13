import {
  Button,
  ButtonGroup,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  MenuItem,
  Select,
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

const isValidIncomeDate = (input: string) => {
  return /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(input)
}

const isValidCurrencyCode = (currencyCode: string) => {
  return currencyCode != ''
}

const isValidIncomeAmount = (amount: number) => {
  return Number.isFinite(amount) && amount != 0
}

const isValidWhtAmount = (amount: number) => {
  return Number.isFinite(amount)
}

export const ReportManualImportDialog = (props: ReportManualImportDialogProps) => {
  const queryClient = useQueryClient()
  const [incomeType, setIncomeType] = useState<PassiveIncomeType>('dividend')
  const [payingEntity, setPayingEntity] = useState('')
  const [incomeDate, setIncomeDate] = useState('')
  const [incomeCurrencyCode, setIncomeCurrencyCode] = useState('')
  const [incomeCurrencyAmount, setIncomeCurrencyAmount] = useState('') // TODO: validate number
  const [whtCurrencyCode, setWhtCurrencyCode] = useState('EUR')
  const [whtCurrencyAmount, setWhtCurrencyAmount] = useState('0')
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
        <FormControl size="small">
          <Select
            value={incomeType}
            sx={{ minWidth: 90 }}
            onChange={async e => {
              const newIncomeType = e.target.value as PassiveIncomeType
              setIncomeType(newIncomeType)
            }
          }>
            <MenuItem value='dividend'>Dividend</MenuItem>
            <MenuItem value='income'>Income</MenuItem>
          </Select>
        </FormControl>
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
          error={!isValidIncomeDate(incomeDate)}
          onChange={e => setIncomeDate(e.target.value)}
        />
        <TextField
          style={{ width: 400 }}
          label="Income Currency Code"
          value={incomeCurrencyCode}
          error={!isValidCurrencyCode(incomeCurrencyCode)}
          onChange={e => setIncomeCurrencyCode(e.target.value)}
        />
        <TextField
          style={{ width: 400 }}
          label="Income Amount in Currency"
          value={incomeCurrencyAmount}
          error={!isValidIncomeAmount(parseFloat(incomeCurrencyAmount))}
          onChange={e => setIncomeCurrencyAmount(e.target.value)}
        />
        <TextField
          style={{ width: 400 }}
          label="Withholding Tax Currency Code"
          value={whtCurrencyCode}
          error={!isValidCurrencyCode(whtCurrencyCode)}
          onChange={e => setWhtCurrencyCode(e.target.value)}
        />
        <TextField
          style={{ width: 400 }}
          label="Withholding Tax Amount in Currency"
          value={whtCurrencyAmount}
          error={!isValidWhtAmount(parseFloat(whtCurrencyAmount))}
          onChange={e => setWhtCurrencyAmount(e.target.value)}
        />
      </Stack>
    </DialogContent>
    <DialogActions>
      <ButtonGroup>
      <Button onClick={props.onClose}>Cancel</Button>
      <Button
        variant="contained"
        disabled={!(
          isValidIncomeDate(incomeDate) &&
          isValidCurrencyCode(incomeCurrencyCode) &&
          isValidIncomeAmount(parseFloat(incomeCurrencyAmount)) &&
          isValidCurrencyCode(whtCurrencyCode) &&
          isValidWhtAmount(parseFloat(whtCurrencyAmount))
        )}
        onClick={async () => {
          await ipcContextApi.importTrivialReport({
            type: incomeType,
            payingEntity,
            incomeDate,
            incomeCurrencyCode,
            incomeCurrencyAmount: parseFloat(incomeCurrencyAmount),
            whtCurrencyCode,
            whtCurrencyAmount: parseFloat(whtCurrencyAmount),
          })
          queryClient.invalidateQueries({ queryKey: ['reports'] })
          props.onClose()
        }}
        autoFocus
      >
        Save
      </Button>
      </ButtonGroup>
    </DialogActions>
  </Dialog>
}
