import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Register service worker for instant page loads (cache-first for assets + shell)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)