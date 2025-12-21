import React from 'react'
import ReactDOM from 'react-dom/client'

import { Settings } from './Settings'

import '../shared/css/tailwind.css'

const rootEl = document.getElementById('root')
if (!rootEl) {
  throw new Error('Root element not found')
}
const root = ReactDOM.createRoot(rootEl)
root.render(
  <React.StrictMode>
    <Settings />
  </React.StrictMode>,
)
