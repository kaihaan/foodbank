import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { useBarcodeScannerInput } from './useBarcodeScannerInput'
import { useToast } from './useToast'
import { useApi } from './useApi'
import type { Client } from '../features/clients/types'

type ScanResult = 'success' | 'not-found' | 'error'

interface LastScan {
  barcode: string
  timestamp: Date
  result: ScanResult
  clientName?: string
}

interface BarcodeScannerContextType {
  scannerEnabled: boolean
  setScannerEnabled: (enabled: boolean) => void
  isProcessing: boolean
  lastScan: LastScan | null
}

const BarcodeScannerContext = createContext<BarcodeScannerContextType | null>(null)

export function BarcodeScannerProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth0()
  const { fetchWithAuth } = useApi()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  const [scannerEnabled, setScannerEnabled] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastScan, setLastScan] = useState<LastScan | null>(null)

  const handleScan = useCallback(
    async (barcode: string) => {
      if (isProcessing) return

      // Don't process if we're on the camera scanner page (it has its own handling)
      // Actually, let hardware scanner work everywhere including /scan

      setIsProcessing(true)

      try {
        const client: Client = await fetchWithAuth(
          `/api/clients/barcode/${encodeURIComponent(barcode)}`
        )

        setLastScan({
          barcode,
          timestamp: new Date(),
          result: 'success',
          clientName: client.name,
        })

        toast.success(`Found: ${client.name}`)

        // Navigate to client detail page
        navigate(`/clients/${client.id}`)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'

        if (errorMessage.includes('404')) {
          setLastScan({
            barcode,
            timestamp: new Date(),
            result: 'not-found',
          })
          toast.warning(`Client not found: ${barcode}`)
        } else {
          setLastScan({
            barcode,
            timestamp: new Date(),
            result: 'error',
          })
          toast.error('Scanner error. Please try again.')
        }
      } finally {
        setIsProcessing(false)
      }
    },
    [fetchWithAuth, navigate, toast, isProcessing, location.pathname]
  )

  // Only enable keyboard scanner when authenticated and enabled
  useBarcodeScannerInput({
    onScan: handleScan,
    enabled: isAuthenticated && scannerEnabled && !isProcessing,
  })

  return (
    <BarcodeScannerContext.Provider
      value={{
        scannerEnabled,
        setScannerEnabled,
        isProcessing,
        lastScan,
      }}
    >
      {children}
    </BarcodeScannerContext.Provider>
  )
}

export function useBarcodeScanner() {
  const context = useContext(BarcodeScannerContext)
  if (!context) {
    throw new Error('useBarcodeScanner must be used within a BarcodeScannerProvider')
  }
  return context
}
