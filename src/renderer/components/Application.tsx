import ipcContextApi from '../ipc-context-api'
import React, { useEffect, useState } from 'react'
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
import { Filing, Mailbox, Report, TechnicalConf, TaxpayerProfile, Importer } from '../../common/ipc-types'
import { fireAndForget } from '../../common/helpers'
import { FilingsPage } from './FilingsPage'
import { MailboxPage } from './MailboxPage'
import { SyncPage } from './SyncPage'
import { TechnicalPage } from './TechnicalPage'
import { ReportsPage } from './ReportsPage'
import { ImportersPage } from './ImportersPage'

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
  const [reports, setReports] = useState<Array<Report>>([])
  const [reportsTag, setReportsTag] = useState(Math.random())
  const invalidateReports = () => setReportsTag(Math.random())

  const [filings, setFilings] = useState<Array<Filing>>([])
  const [filingsTag, setFilingsTag] = useState(Math.random())
  const invalidateFilings = () => setFilingsTag(Math.random())

  const [taxpayerProfile, setTaxpayerProfile] = useState<TaxpayerProfile | null>()
  const [taxpayerProfileTag, setTaxpayerProfileTag] = useState(Math.random())
  const invalidateTaxpayerProfile = () => setTaxpayerProfileTag(Math.random())

  const [mailbox, setMailbox] = useState<Mailbox | null>()
  const [mailboxTag, setMailboxTag] = useState(Math.random())
  const invalidateMailbox = () => setMailboxTag(Math.random())

  const [technicalConf, setTechnicalConf] = useState<TechnicalConf | null>()
  const [technicalConfTag, setTechnicalConfTag] = useState(Math.random())
  const invalideTechnicalConf = () => setTechnicalConfTag(Math.random())

  const [importers, setImporters] = useState<Array<Importer>>([])
  const [importersTag, setImportersTag] = useState(Math.random())
  const invalidateImporters = () => setImportersTag(Math.random())

  const [menuAnchorEl, setMenuAnchorEl] = React.useState<HTMLElement | null>(null)
  const menuOpen = Boolean(menuAnchorEl)

  useEffect(() => fireAndForget(async () => {
    setReports(await ipcContextApi.getReports())
  }), [reportsTag])
  useEffect(() => fireAndForget(async () => {
    setFilings(await ipcContextApi.getFilings())
  }), [filingsTag])
  useEffect(() => fireAndForget(async () => {
    setTaxpayerProfile(await ipcContextApi.getTaxpayerProfile())
  }), [taxpayerProfileTag])
  useEffect(() => fireAndForget(async () => {
    setMailbox(await ipcContextApi.getMailbox())
  }), [mailboxTag])
  useEffect(() => fireAndForget(async () => {
    setTechnicalConf(await ipcContextApi.getTechnicalConf())
  }), [technicalConfTag])
  useEffect(() => fireAndForget(async () => {
    setImporters(await ipcContextApi.getImporters())
  }), [importersTag])

  const invalidateAllData = () => {
    invalidateReports()
    invalidateFilings()
    invalidateTaxpayerProfile()
    invalidateMailbox()
    invalideTechnicalConf()
    invalidateImporters()
  }

  if (!taxpayerProfile || !mailbox || !technicalConf) {
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
          return <TaxpayerProfilePage taxpayerProfile={taxpayerProfile} invalidateTaxpayerProfile={invalidateTaxpayerProfile} />
        case 'settings.mailbox':
          return <MailboxPage mailbox={mailbox} invalidateMailbox={invalidateMailbox} />
        case 'settings.technical':
          return <TechnicalPage technicalConf={technicalConf} invalidateTechnicalConf={invalideTechnicalConf} />
        case 'settings.importers':
          return <ImportersPage importers={importers} invalidateImporters={invalidateImporters} />
        case 'sync':
          return <SyncPage setNavigationEnabled={setNavigationEnabled} invalidateReports={invalidateReports} invalidateFilings={invalidateFilings} invalidateMailbox={invalidateMailbox} />
        case 'reports':
          return <ReportsPage reports={reports} filings={filings} invalidateFilings={invalidateFilings} invalidateReports={invalidateReports} />
        case 'filings':
          return <FilingsPage reports={reports} filings={filings} invalidateFilings={invalidateFilings} />
        case 'dev':
          return <DevPage invalidateAllData={invalidateAllData} />
      }
    })()}
  </>
}

export default Application
