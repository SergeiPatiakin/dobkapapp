import ipcContextApi from '../ipc-context-api'
import React, { useMemo, useState } from 'react'
import { AppBar, Button, CssBaseline, ListItemIcon, ListItemText, Menu, MenuItem, Toolbar } from '@mui/material'
import { TaxpayerProfilePage } from './TaxpayerProfilePage'
import { DevPage } from './DevPage'
import BuildIcon from '@mui/icons-material/Build'
import WorkIcon from '@mui/icons-material/Work'
import InboxIcon from '@mui/icons-material/Inbox'
import PersonIcon from '@mui/icons-material/Person'
import SettingsIcon from '@mui/icons-material/Settings'
import SyncIcon from '@mui/icons-material/Sync'
import EngineeringIcon from '@mui/icons-material/Engineering'
import SummarizeIcon from '@mui/icons-material/Summarize'
import CableIcon from '@mui/icons-material/Cable'
import { FilingsPage } from './FilingsPage'
import { MailboxPage } from './MailboxPage'
import { SyncPage } from './SyncPage'
import { TechnicalPage } from './TechnicalPage'
import { ReportsPage } from './ReportsPage'
import { ImportersPage } from './ImportersPage'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'

type NavigationPage =
  | 'settings.taxpayer'
  | 'settings.mailbox'
  | 'settings.importers'
  | 'settings.technical'
  | 'sync'
  | 'reports'
  | 'filings'
  | 'dev'

const Application: React.FC = () => {
  const [navigationPage, setNavigationPage] = useState<NavigationPage>('sync')
  const [navigationEnabled, setNavigationEnabled] = useState<boolean>(true)
  
  const reportsQuery = useQuery({
    queryKey: ['reports'],
    queryFn: () => ipcContextApi.getReports(),
    networkMode: 'always',
  })

  const filingsQuery = useQuery({
    queryKey: ['filings'],
    queryFn: () => ipcContextApi.getFilings(),
    networkMode: 'always',
  })

  const taxpayerProfileQuery = useQuery({
    queryKey: ['taxpayer-profile'],
    queryFn: () => ipcContextApi.getTaxpayerProfile(),
    networkMode: 'always',
  })

  const mailboxQuery = useQuery({
    queryKey: ['mailbox'],
    queryFn: () => ipcContextApi.getMailbox(),
    networkMode: 'always',
  })

  const technicalConfQuery = useQuery({
    queryKey: ['technical-conf'],
    queryFn: () => ipcContextApi.getTechnicalConf(),
    networkMode: 'always',
  })
  
  const importersQuery = useQuery({
    queryKey: ['importers'],
    queryFn: () => ipcContextApi.getImporters(),
    networkMode: 'always',
  })

  const [menuAnchorEl, setMenuAnchorEl] = React.useState<HTMLElement | null>(null)
  const menuOpen = Boolean(menuAnchorEl)

  if (
    !taxpayerProfileQuery.isSuccess ||
    !mailboxQuery.isSuccess ||
    !technicalConfQuery.isSuccess ||
    !reportsQuery.isSuccess ||
    !filingsQuery.isSuccess ||
    !importersQuery.isSuccess
  ) {
    return <>
      <CssBaseline />
      <p>Loading</p>
    </>
  }

  return <>
    <CssBaseline />
    <AppBar position='sticky'>
      <Toolbar>
        <Button
          color="inherit"
          disabled={!navigationEnabled}
          onClick={e => { setMenuAnchorEl(e.currentTarget) }}
        >
          <SettingsIcon />
          Settings
        </Button>
        <Menu open={menuOpen} anchorEl={menuAnchorEl} onClose={() => setMenuAnchorEl(null)}>
          <MenuItem
            disabled={navigationPage === 'settings.taxpayer'}
            onClick={() => {
              setNavigationPage('settings.taxpayer')
              setMenuAnchorEl(null)
            }}
          >
            <ListItemIcon>
              <PersonIcon />
            </ListItemIcon>
            <ListItemText>Taxpayer</ListItemText>
          </MenuItem>
          <MenuItem
            disabled={navigationPage === 'settings.mailbox'}
            onClick={() => {
              setNavigationPage('settings.mailbox')
              setMenuAnchorEl(null)
            }}
          >
            <ListItemIcon>
              <InboxIcon />
            </ListItemIcon>
            <ListItemText>Mailbox</ListItemText>
          </MenuItem>
          <MenuItem
            disabled={navigationPage === 'settings.importers'}
            onClick={() => {
              setNavigationPage('settings.importers')
              setMenuAnchorEl(null)
            }}
          >
            <ListItemIcon>
              <CableIcon />
            </ListItemIcon>
            <ListItemText>Importers</ListItemText>
          </MenuItem>
          <MenuItem
            disabled={navigationPage === 'settings.technical'}
            onClick={() => {
              setNavigationPage('settings.technical')
              setMenuAnchorEl(null)
            }}
          >
            <ListItemIcon>
              <BuildIcon />
            </ListItemIcon>
            <ListItemText>Technical</ListItemText>
          </MenuItem>
        </Menu>
        <Button
          color="inherit"
          disabled={!navigationEnabled || navigationPage === 'sync'}
          onClick={() => setNavigationPage('sync')}
        >
          <SyncIcon />
          Sync
        </Button>
        <Button
          color="inherit"
          disabled={!navigationEnabled || navigationPage === 'reports'}
          onClick={() => setNavigationPage('reports')}
        >
          <SummarizeIcon />
          Reports
        </Button>
        <Button
          color="inherit"
          disabled={!navigationEnabled || navigationPage === 'filings'}
          onClick={() => setNavigationPage('filings')}
        >
          <WorkIcon />
          Filings
        </Button>
        <Button
          color="inherit"
          disabled={!navigationEnabled || navigationPage === 'dev'}
          onClick={() => setNavigationPage('dev')}
        >
          <EngineeringIcon />
          Dev
        </Button>
      </Toolbar>
    </AppBar>
    {(() => {
      switch (navigationPage) {
        case 'settings.taxpayer':
          return <TaxpayerProfilePage taxpayerProfile={taxpayerProfileQuery.data} />
        case 'settings.mailbox':
          return <MailboxPage mailbox={mailboxQuery.data} />
        case 'settings.technical':
          return <TechnicalPage technicalConf={technicalConfQuery.data} />
        case 'settings.importers':
          return <ImportersPage importers={importersQuery.data} />
        case 'sync':
          return <SyncPage setNavigationEnabled={setNavigationEnabled} />
        case 'reports':
          return <ReportsPage reports={reportsQuery.data} filings={filingsQuery.data} />
        case 'filings':
          return <FilingsPage reports={reportsQuery.data} filings={filingsQuery.data} />
        case 'dev':
          return <DevPage />
      }
    })()}
  </>
}

const ApplicationWrapper = () => {
  const queryClient = useMemo(() => new QueryClient(), [])
  return <QueryClientProvider client={queryClient}>
    <Application/>
  </QueryClientProvider>
}

export default ApplicationWrapper
