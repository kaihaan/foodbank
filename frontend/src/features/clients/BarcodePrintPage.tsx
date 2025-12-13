import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useApi } from '../../hooks/useApi'
import BarcodeLabel from './BarcodeLabel'
import type { Client } from './types'

export default function BarcodePrintPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { fetchWithAuth } = useApi()
  const [client, setClient] = useState<Client | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadClient = useCallback(async () => {
    if (!id) return
    setIsLoading(true)
    setError(null)
    try {
      const clientData = await fetchWithAuth(`/api/clients/${id}`)
      setClient(clientData)
    } catch (err) {
      console.error('Failed to load client:', err)
      setError('Failed to load client details')
    } finally {
      setIsLoading(false)
    }
  }, [fetchWithAuth, id])

  useEffect(() => {
    loadClient()
  }, [loadClient])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] print:hidden">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  if (error || !client) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center min-h-[60vh] gap-4 print:hidden"
      >
        <p className="text-error text-lg">{error || 'Client not found'}</p>
        <button className="btn btn-ghost" onClick={() => navigate('/clients')}>
          Back to Clients
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center"
    >
      {/* Header - hidden when printing */}
      <div className="w-full flex items-center gap-4 mb-8 print:hidden">
        <Link to={`/clients/${id}`} className="btn btn-ghost btn-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>
        <h1 className="text-2xl font-bold flex-1">Print Barcode Label</h1>
      </div>

      {/* Barcode Label */}
      <BarcodeLabel client={client} />

      {/* Instructions - hidden when printing */}
      <div className="mt-8 text-center text-base-content/60 text-sm print:hidden">
        <p>Position label paper in your printer before clicking Print.</p>
        <p className="mt-1">Recommended: 62mm x 29mm label size</p>
      </div>
    </motion.div>
  )
}
