import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { AudioProvider } from './context/AudioContext.jsx'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AudioProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </AudioProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
