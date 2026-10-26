import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { checkSessionExpiry } from './lib/actions'
import './styles.css'

checkSessionExpiry()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
