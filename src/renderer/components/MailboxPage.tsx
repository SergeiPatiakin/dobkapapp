import { Mailbox } from '../../common/ipc-types'
import { Visibility, VisibilityOff } from '@mui/icons-material'
import { Alert, Button, ButtonGroup, Container, IconButton, InputAdornment, Stack, TextField } from '@mui/material'
import React, { useState } from 'react'
import { decrementCursor, formatMailboxCursor, incrementCursor } from '../../common/mailbox-cursor'
import ipcContextApi from '../ipc-context-api'
import { useQueryClient } from '@tanstack/react-query'

type Props = {
  mailbox: Mailbox
}

export const MailboxPage = (props: Props) => {
  const queryClient = useQueryClient()
  const [imapEmailAddress, setImapEmailAddress] = useState(props.mailbox.emailAddress)
  const [imapEmailPassword, setImapEmailPassword] = useState(props.mailbox.emailPassword)
  const [showPassword, setShowPassword] = useState(false)
  const [imapEmailHost, setImapEmailHost] = useState(props.mailbox.imapHost)
  const [imapEmailPort, setImapEmailPort] = useState(props.mailbox.imapPort.toString())
  const [cursor, setCursor] = useState(props.mailbox.cursor)

  const handleClickShowPassword = () => setShowPassword(show => !show)
  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
  }
  return <Container>
    <Stack spacing={1}>
      <h2 style={{ marginBottom: 0}}>Mailbox</h2>
      <TextField label="Email Address" value={imapEmailAddress} onChange={e => setImapEmailAddress(e.target.value)} />
      <TextField
        type={showPassword ? 'text' : 'password'}
        label="Email Password"
        value={imapEmailPassword}
        onChange={e => setImapEmailPassword(e.target.value)}
        InputProps={{
          endAdornment: <InputAdornment position="end">
            <IconButton
            aria-label="toggle password visibility"
            onClick={handleClickShowPassword}
            onMouseDown={handleMouseDownPassword}
            edge="end"
            >
            {showPassword ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </InputAdornment>
        }}
      />
      <Alert severity="info">If using Gmail this should be an <a
        href="#" onClick={() => {
          ipcContextApi.openUrl('https://support.google.com/mail/answer/185833?hl=en-GB')
        }}>Application Password</a> instead of your usual password
      </Alert>	
      <TextField label="IMAP host" value={imapEmailHost} onChange={e => setImapEmailHost(e.target.value)} />
      <TextField label="IMAP port" value={imapEmailPort} onChange={e => setImapEmailPort(e.target.value)} />
      <ButtonGroup>
        <TextField label="From Date Filter" value={formatMailboxCursor(cursor)} disabled />
        <Button variant="contained" onClick={() => {
          setCursor(decrementCursor(cursor))
        }}>
          &lt;
        </Button>
        <Button variant="contained" onClick={() => {
          setCursor({
            type: 'date',
            dateString: new Date().toISOString().slice(0, 10),
          })
        }}>
          Today
        </Button>
        <Button variant="contained" onClick={() => {
          setCursor(incrementCursor(cursor))
        }}>
          &gt;
        </Button>
      </ButtonGroup>
      <ButtonGroup>
        <Button variant="contained" onClick={async () => {
          const imapPort = parseInt(imapEmailPort)
          await ipcContextApi.updateMailbox({
            id: props.mailbox.id,
            emailAddress: imapEmailAddress,
            emailPassword: imapEmailPassword,
            imapHost: imapEmailHost,
            imapPort: Number.isNaN(imapPort) ? props.mailbox.imapPort : imapPort,
            cursor,
          })
          queryClient.invalidateQueries({ queryKey: ['mailbox'] })
        }}>
          Save
        </Button>
      </ButtonGroup>
    </Stack>
  </Container>
}
