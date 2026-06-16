import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { ConversationsProvider } from './lib/ConversationsContext'
import { ThemeProvider } from './lib/ThemeContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ConversationsProvider>
          <App />
        </ConversationsProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
