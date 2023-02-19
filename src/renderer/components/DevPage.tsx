import React, { useEffect, useState } from 'react'
import { Accordion, AccordionDetails, AccordionSummary, Alert, Button, ButtonGroup, Container, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material'
import ipcContextApi from '../ipc-context-api'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

type Props = {
  invalidateAllData: () => void
}

export const DevPage = (props: Props) => {
  const [sql, setSql] = useState('')
  const [result, setResult] = useState<{columns: Array<{name: string}>, rows: any[][]} | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [versions, setVersions] = useState<Record<string, string>>({})

  /**
   * On component mount
   */
  useEffect(() => {
    // Apply verisons
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const rootDomNode = document.getElementById('app')!
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const versions = JSON.parse(rootDomNode.getAttribute('data-versions')!)
    setVersions(versions)
  }, [])

  return <Container>
    <h2 style={{ marginBottom: 0}}>Dev</h2>
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>Versions</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <pre>{JSON.stringify(versions, null, 4)}</pre>
      </AccordionDetails>
    </Accordion>
    <h3 style={{ marginBottom: 0}}>SQL Console</h3>
    <Alert severity="warning">
      This console is intended for developers. Some SQL queries may permanently corrupt dobkapapp
      application data
    </Alert>
    <Stack spacing={1}>
      <ButtonGroup>
      <Button variant="contained"
        onClick={async () => {
          try {
            const x = await ipcContextApi.runSql(sql)
            props.invalidateAllData()
            setResult(x)
            setErrorMessage(null)
          } catch (e) {
            setResult(null)
            setErrorMessage(e.toString())
          }
        }}
      >
        Run SQL
      </Button>
      </ButtonGroup>
      <TextField multiline minRows={3} label="sql" value={sql} onChange={e => setSql(e.target.value)}/>
      {errorMessage !== null && <>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{errorMessage}</pre>
      </>}
      {result !== null && <>
        <Table>
          <TableHead>
            <TableRow>
              {result.columns.map((c, cIdx) => <TableCell key={cIdx}><b>{c.name}</b></TableCell>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {result.rows.map((r, rIdx) => <TableRow key={rIdx}>
              {r.map((v, vIdx) => <TableCell key={vIdx}>{v}</TableCell>)}
            </TableRow>)}
          </TableBody>
        </Table>
      </>}
    </Stack>
  </Container>
}
