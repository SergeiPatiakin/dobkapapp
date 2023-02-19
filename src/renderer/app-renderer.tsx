import React from 'react'
import { createRoot } from 'react-dom/client'
import Application from './components/Application'
import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'

// Say something
console.log('[Dobkapapp] : Renderer execution started')

// Render application in DOM
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const rootDomNode = document.getElementById('app')!
createRoot(rootDomNode).render(<Application />)
