import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Unregister any stale service workers so cached broken builds don't persist
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((reg) => reg.unregister())
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)