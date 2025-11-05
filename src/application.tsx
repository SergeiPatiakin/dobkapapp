import { useMemo, useState } from "react";
import "./application.css";
import { AppBar, Button, CssBaseline, ListItemIcon, ListItemText, Menu, MenuItem, Toolbar } from "@mui/material";
import SettingsIcon from '@mui/icons-material/Settings'
import BuildIcon from '@mui/icons-material/Build'
import WorkIcon from '@mui/icons-material/Work'
import InboxIcon from '@mui/icons-material/Inbox'
import PersonIcon from '@mui/icons-material/Person'
import SyncIcon from '@mui/icons-material/Sync'
import EngineeringIcon from '@mui/icons-material/Engineering'
import SummarizeIcon from '@mui/icons-material/Summarize'
import CableIcon from '@mui/icons-material/Cable'
import { DevPage } from "./dev-page";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { Importer, Mailbox, TaxpayerProfile, TechnicalConf, Report, Filing } from "./ipc-types";
import { TechnicalPage } from "./technical-page";
import { MailboxPage } from "./mailbox-page";
import { TaxpayerProfilePage } from "./taxpayer-profile-page";
import { ImportersPage } from "./importer-page";
import { ReportsPage } from "./reports-page";
import { FilingsPage } from "./filings-page";
import { SyncPage } from "./sync-page";

type NavigationPage =
  | 'settings.taxpayer'
  | 'settings.mailbox'
  | 'settings.importers'
  | 'settings.technical'
  | 'sync'
  | 'reports'
  | 'filings'
  | 'dev'

const Application = () => {
  const [navigationPage, setNavigationPage] = useState<NavigationPage>('sync')
  const [navigationEnabled, setNavigationEnabled] = useState<boolean>(true)

  const technicalConfQuery = useQuery({
    queryKey: ['technical-conf'],
    queryFn: () => invoke("get_technical_conf") as Promise<TechnicalConf>,
    networkMode: 'always',
  })

  const mailboxQuery = useQuery({
    queryKey: ['mailbox'],
    queryFn: () => invoke("get_mailbox") as Promise<Mailbox>,
    networkMode: 'always',
  })

  const taxpayerProfileQuery = useQuery({
    queryKey: ['taxpayer-profile'],
    queryFn: () => invoke("get_taxpayer_profile") as Promise<TaxpayerProfile>,
    networkMode: 'always',
  })

  const importersQuery = useQuery({
    queryKey: ['importers'],
    queryFn: () => invoke("get_importers") as Promise<Array<Importer>>,
    networkMode: 'always',
  })

  const reportsQuery = useQuery({
    queryKey: ['reports'],
    queryFn: () => invoke("get_reports") as Promise<Array<Report>>,
    networkMode: 'always',
  })

  const filingsQuery = useQuery({
    queryKey: ['filings'],
    queryFn: () => invoke("get_filings") as Promise<Array<Filing>>,
    networkMode: 'always',
  })

  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null)
  const menuOpen = Boolean(menuAnchorEl)

  if (
    !technicalConfQuery.isSuccess ||
    !mailboxQuery.isSuccess ||
    !taxpayerProfileQuery.data ||
    !importersQuery.data ||
    !reportsQuery.data ||
    !filingsQuery.data
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
          case 'settings.technical':
            return <TechnicalPage technicalConf={technicalConfQuery.data} />
          case 'settings.mailbox':
            return <MailboxPage mailbox={mailboxQuery.data} />
          case 'settings.taxpayer':
            return <TaxpayerProfilePage taxpayerProfile={taxpayerProfileQuery.data} />
          case 'settings.importers':
            return <ImportersPage importers={importersQuery.data} />
          case 'sync':
            return <SyncPage setNavigationEnabled={setNavigationEnabled} />
          case 'reports':
            return <ReportsPage reports={reportsQuery.data} filings={filingsQuery.data} />
          case 'filings':
            return <FilingsPage reports={reportsQuery.data} filings={filingsQuery.data} />
          case 'dev':
            return <DevPage/>
          default:
            return null
        }
      })()}
  </>
}

export const ApplicationWrapper = () => {
  const queryClient = useMemo(() => new QueryClient(), [])
  return <QueryClientProvider client={queryClient}>
    <Application/>
  </QueryClientProvider>
}
