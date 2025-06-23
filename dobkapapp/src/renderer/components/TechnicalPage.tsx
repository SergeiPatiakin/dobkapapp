import { Alert, Button, ButtonGroup, Container, Stack, TextField } from '@mui/material'
import React, { useState } from 'react'
import { TechnicalConf } from '../../common/ipc-types'
import ipcContextApi from '../ipc-context-api'
import { useQueryClient } from '@tanstack/react-query'

type Props = {
  technicalConf: TechnicalConf
}

export const TechnicalPage = (props: Props) => {
  const queryClient = useQueryClient()
  const [mexicoBdmToken, setMexicoBdmToken] = useState(props.technicalConf.mexicoBdmToken)
  const [holidayConf, setHolidayConf] = useState(props.technicalConf.holidayConf)

  return <Container>
    <Stack spacing={1}>
      <h2 style={{ marginBottom: 0}}>Technical</h2>
      <TextField label="Mexico BDM token" value={mexicoBdmToken} onChange={e => setMexicoBdmToken(e.target.value)} />
      <Alert severity="info">Adding a Banco De Mexico API token will enable current conversion for
        incomes received in the MXN currency. You can obtain a token <a
        href="#" onClick={() => {
          ipcContextApi.openUrl('https://www.banxico.org.mx/SieAPIRest/service/v1/')
        }}>here</a>
      </Alert>
      <ButtonGroup>
        <TextField label="Holidays data" disabled value={`${holidayConf.holidayRangeStart}:${holidayConf.holidayRangeEnd}`} />
        <Button variant="contained" onClick={async () => {
          const newHolidayConf = await ipcContextApi.importHolidayConf()
          if (newHolidayConf) {
            setHolidayConf(newHolidayConf)
          }
        }}>Import...</Button>
      </ButtonGroup>
      <Alert severity="info">
        Serbia holiday data is needed to correctly calculate filing deadlines. If the holiday
        data range is insufficient, you can import a larger range from a JSON file
      </Alert>
      <ButtonGroup>
        <Button variant="contained" onClick={async () => {
          await ipcContextApi.updateTechnicalConf({
            ...props.technicalConf,
            mexicoBdmToken,
            holidayConf,
          })
          queryClient.invalidateQueries({ queryKey: ['technical-conf'] })
        }}>Save</Button>
      </ButtonGroup>
    </Stack>
  </Container>  
}
