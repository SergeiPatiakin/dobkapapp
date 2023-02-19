import { TaxpayerProfile } from '../../common/ipc-types'
import { Alert, Button, ButtonGroup, Container, FormControl, IconButton, InputAdornment, InputLabel, OutlinedInput, Stack, TextField, Tooltip } from '@mui/material'
import React, { useState } from 'react'
import ipcContextApi from '../ipc-context-api'
import HelpIcon from '@mui/icons-material/Help'

type Props = {
  taxpayerProfile: TaxpayerProfile
  invalidateTaxpayerProfile: () => void
}

export const TaxpayerProfilePage = (props: Props) => {
  const [jmbg, setJmbg] = useState(props.taxpayerProfile.jmbg)
  const [fullName, setFullName] = useState(props.taxpayerProfile.fullName)
  const [streetAddress, setStreetAddress] = useState(props.taxpayerProfile.streetAddress)
  const [opstinaCode, setOpstinaCode] = useState(props.taxpayerProfile.opstinaCode)
  const [phoneNumber, setPhoneNumber] = useState(props.taxpayerProfile.phoneNumber)
  const [filingEmailAddress, setFilingEmailAddress] = useState(props.taxpayerProfile.emailAddress)

  return <Container>
    <Stack spacing={1}>
      <h2 style={{ marginBottom: 0}}>Taxpayer</h2>
      <Alert severity="warning">These details will be copied to each filing</Alert>
      <TextField label="JMBG" value={jmbg} onChange={e => setJmbg(e.target.value)} />
      <TextField label="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} />
      <FormControl variant="outlined">
        <InputLabel htmlFor="outlined-adornment-street-address">Street Address</InputLabel>
        <OutlinedInput
          id="outlined-adornment-street-address"
          label="Street Address"
          value={streetAddress}
          onChange={e => setStreetAddress(e.target.value)}
          endAdornment={
            <InputAdornment position="end">
              <IconButton edge="end">
                <Tooltip title="E.g. Terazije 1/1" placement="bottom-end">
                  <HelpIcon />
                </Tooltip>
              </IconButton>
            </InputAdornment>
          }
        />
      </FormControl>
      <FormControl variant="outlined">
        <InputLabel htmlFor="outlined-adornment-opstina-code">Opština Code</InputLabel>
        <OutlinedInput
          id="outlined-adornment-opstina-code"
          label="Opština Code"
          value={opstinaCode}
          onChange={e => setOpstinaCode(e.target.value)}
          endAdornment={
            <InputAdornment position="end">
              <IconButton edge="end">
                <Tooltip title="E.g. 013 for Novi Beograd" placement="bottom-end">
                  <HelpIcon />
                </Tooltip>
              </IconButton>
            </InputAdornment>
          }
        />
      </FormControl>
      <TextField label="Phone Number" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
      <TextField label="Contact Email Address" value={filingEmailAddress} onChange={e => setFilingEmailAddress(e.target.value)} />
      <ButtonGroup>
        <Button variant="contained" onClick={async () => {
          await ipcContextApi.updateTaxpayerProfile({
            id: 1,
            jmbg,
            fullName,
            streetAddress,
            opstinaCode,
            phoneNumber,
            emailAddress: filingEmailAddress,
          })
          props.invalidateTaxpayerProfile()
        }}>
          Save
        </Button>
      </ButtonGroup>
    </Stack>
  </Container>
}
