import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Auth0Provider } from '@auth0/auth0-react'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './hooks/useTheme'
import { ToastProvider } from './hooks/useToast'
import { BarcodeScannerProvider } from './hooks/useBarcodeScanner'
import { CurrentUserProvider } from './hooks/useCurrentUser'
import { BackgroundProvider } from './hooks/useBackground'
import './index.css'
import App from './App'

const domain = import.meta.env.VITE_AUTH0_DOMAIN
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID
const audience = import.meta.env.VITE_AUTH0_AUDIENCE

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <Auth0Provider
          domain={domain || ''}
          clientId={clientId || ''}
          authorizationParams={{
            redirect_uri: window.location.origin,
            audience: audience,
          }}
        >
          <BrowserRouter>
            <CurrentUserProvider>
              <BackgroundProvider>
                <BarcodeScannerProvider>
                  <App />
                </BarcodeScannerProvider>
              </BackgroundProvider>
            </CurrentUserProvider>
          </BrowserRouter>
        </Auth0Provider>
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>,
)
