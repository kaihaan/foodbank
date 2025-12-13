import { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { BarcodeScanner, BarcodeFormat } from 'react-barcode-scanner'
import 'react-barcode-scanner/polyfill'
import { useApi } from '../../hooks/useApi'
import type { Client } from './types'

type ScanState = 'scanning' | 'loading' | 'not-found' | 'error'

export default function BarcodeScannerPage() {
  const navigate = useNavigate()
  const { fetchWithAuth } = useApi()
  const [scanState, setScanState] = useState<ScanState>('scanning')
  const [lastScanned, setLastScanned] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const options = useMemo(
    () => ({
      delay: 500,
      formats: [
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.QR_CODE,
      ],
    }),
    []
  )

  const handleCapture = useCallback(
    async (barcodes: { rawValue: string }[]) => {
      if (!barcodes || barcodes.length === 0) return
      if (scanState !== 'scanning') return

      const barcode = barcodes[0].rawValue
      if (barcode === lastScanned) return

      setLastScanned(barcode)
      setScanState('loading')
      setError(null)

      try {
        const client: Client = await fetchWithAuth(`/api/clients/barcode/${encodeURIComponent(barcode)}`)
        navigate(`/clients/${client.id}`)
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('404')) {
          setScanState('not-found')
        } else {
          setScanState('error')
          setError('Failed to look up client')
        }
      }
    },
    [fetchWithAuth, navigate, scanState, lastScanned]
  )

  const handleRetry = () => {
    setScanState('scanning')
    setLastScanned(null)
    setError(null)
  }

  const handleRegisterNew = () => {
    navigate('/clients', { state: { openForm: true, barcode: lastScanned } })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-2xl mx-auto"
    >
      <h1 className="text-3xl font-bold mb-2">Scan Barcode</h1>
      <p className="text-base-content/60 mb-6">Use your device camera or a USB barcode scanner</p>

      <div className="card bg-base-100 shadow-xl overflow-hidden">
        <div className="relative aspect-[4/3] bg-base-300">
          {scanState === 'scanning' && (
            <>
              <BarcodeScanner
                onCapture={handleCapture}
                options={options}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              {/* Scanning overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-48 border-2 border-primary rounded-lg">
                  <div className="absolute inset-x-0 top-1/2 h-0.5 bg-primary animate-pulse" />
                </div>
              </div>
            </>
          )}

          {scanState === 'loading' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <span className="loading loading-spinner loading-lg"></span>
              <p className="text-base-content/70">Looking up client...</p>
              <code className="text-sm bg-base-200 px-3 py-1 rounded">{lastScanned}</code>
            </div>
          )}

          {scanState === 'not-found' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8">
              <div className="w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-8 h-8 text-warning"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                  />
                </svg>
              </div>
              <p className="text-lg font-medium">Client Not Found</p>
              <code className="text-sm bg-base-200 px-3 py-1 rounded">{lastScanned}</code>
              <div className="flex gap-3 mt-2">
                <button className="btn btn-outline" onClick={handleRetry}>
                  Scan Again
                </button>
                <button className="btn btn-primary" onClick={handleRegisterNew}>
                  Register New Client
                </button>
              </div>
            </div>
          )}

          {scanState === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8">
              <div className="w-16 h-16 rounded-full bg-error/20 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-8 h-8 text-error"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
              </div>
              <p className="text-lg font-medium">Error</p>
              <p className="text-base-content/70">{error}</p>
              <button className="btn btn-outline mt-2" onClick={handleRetry}>
                Try Again
              </button>
            </div>
          )}
        </div>

        <div className="card-body">
          <p className="text-center text-base-content/70">
            {scanState === 'scanning'
              ? 'Position the barcode within the frame'
              : scanState === 'loading'
                ? 'Please wait...'
                : 'Scan a client barcode to view their details'}
          </p>
        </div>
      </div>

      {/* Hardware Scanner Info */}
      <div className="alert mt-6">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info shrink-0 w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <div>
          <p className="font-medium">USB Barcode Scanner</p>
          <p className="text-sm text-base-content/70">
            Hardware scanners work from any page. Look for the scanner icon in the navbar.
          </p>
        </div>
      </div>

      <div className="mt-6 text-center">
        <button className="btn btn-ghost" onClick={() => navigate('/clients')}>
          Back to Clients
        </button>
      </div>
    </motion.div>
  )
}
