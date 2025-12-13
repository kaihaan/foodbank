import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useApi } from '../../hooks/useApi'
import { useToast } from '../../hooks/useToast'
import ClientFormFields, { initialFormState } from './ClientFormFields'
import type { CreateClientRequest, Client } from './types'

export default function ClientCreatePage() {
  const navigate = useNavigate()
  const { fetchWithAuth } = useApi()
  const toast = useToast()
  const [form, setForm] = useState<CreateClientRequest>(initialFormState)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateField = <K extends keyof CreateClientRequest>(
    field: K,
    value: CreateClientRequest[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const newClient: Client = await fetchWithAuth('/api/clients', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      toast.success('Client registered successfully')
      navigate(`/clients/${newClient.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register client')
      setIsSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link to="/clients" className="btn btn-ghost btn-sm">
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
        <h1 className="text-3xl font-bold">Register New Client</h1>
      </div>

      {/* Form Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card bg-base-100 shadow-xl max-w-2xl mx-auto"
      >
        <div className="card-body">
          {error && (
            <div className="alert alert-error mb-4">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <ClientFormFields
              form={form}
              updateField={updateField}
              isSubmitting={isSubmitting}
            />

            <div className="flex justify-end gap-3 mt-6">
              <Link to="/clients" className="btn" tabIndex={isSubmitting ? -1 : 0}>
                Cancel
              </Link>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  'Register Client'
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  )
}
