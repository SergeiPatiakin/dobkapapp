import { Alert, Button, ButtonGroup, Container, Stack, TextField } from '@mui/material'
import { useState } from 'react'
import { HolidayConf, TechnicalConf } from './ipc-types'
import { useQueryClient } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'

type Props = {
  technicalConf: TechnicalConf
}

export const TechnicalPage = (props: Props) => {
  const queryClient = useQueryClient()
  const [holidayConf, setHolidayConf] = useState(props.technicalConf.holidayConf)

  return <Container>
    <Stack spacing={1} style={{ paddingTop: '8px'}}>
      <h2>Technical</h2>
      <ButtonGroup>
        <TextField label="Holidays data" size="small" disabled value={`${holidayConf.holidayRangeStart}:${holidayConf.holidayRangeEnd}`} />
        <Button variant="contained" onClick={async () => {
          const newHolidayConf = await invoke('import_holiday_conf') as HolidayConf
          if (newHolidayConf) {
            setHolidayConf(newHolidayConf)
          }
        }}>Import...</Button>
      </ButtonGroup>
      <Alert severity="info">
        Serbia public holiday data is needed to correctly calculate filing deadlines. If the holiday
        data range is insufficient, you can import a larger range from a JSON file
      </Alert>
      <ButtonGroup>
        <Button variant="contained" onClick={async () => {
          await invoke('update_technical_conf', {
            technicalConf: {
                ...props.technicalConf,
                holidayConf,
            }
          })
          queryClient.invalidateQueries({ queryKey: ['technical-conf'] })
        }}>Save</Button>
      </ButtonGroup>
    </Stack>
  </Container>  
}
