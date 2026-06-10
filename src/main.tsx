import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@knadh/oat/oat.min.css'
import '@knadh/oat/oat.min.js'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
