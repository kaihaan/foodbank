import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useApi } from '../../hooks/useApi'
import { useToast } from '../../hooks/useToast'
import { ClientDetailSkeleton } from '../../components/Skeleton'
import ClientFormFields, { initialFormState } from './ClientFormFields'
import type { Client, CreateClientRequest } from './types'

export default function ClientEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { fetchWithAuth } = useApi()
  const toast = useToast()
  const [client, setClient] = useState<Client | null>(null)
  const [form, setForm] = useState<CreateClientRequest>(initialFormState)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadClient = useCallback(async () => {
    if (!id) return
    setIsLoading(true)
    setError(null)
    try {
      const clientData: Client = await fetchWithAuth(`/api/clients/${id}`)
      setClient(clientData)
      setForm({
        name: clientData.name,
        address: clientData.address,
        family_size: clientData.family_size,
        num_children: clientData.num_children,
        children_ages: clientData.children_ages || '',
        reason: clientData.reason || '',
        appointment_day: clientData.appointment_day || '',
        appointment_time: clientData.appointment_time || '',
        pref_gluten_free: clientData.pref_gluten_free,
        pref_halal: clientData.pref_halal,
        pref_vegetarian: clientData.pref_vegetarian,
        pref_no_cooking: clientData.pref_no_cooking,
      })
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

  const updateField = <K extends keyof CreateClientRequest>(
    field: K,
    value: CreateClientRequest[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!client) return
    setError(null)
    setIsSubmitting(true)

    try {
      await fetchWithAuth(`/api/clients/${client.id}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      })
      toast.success('Client updated successfully')
      navigate(`/clients/${client.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update client')
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <ClientDetailSkeleton />
  }

  if (error && !client) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center min-h-[60vh] gap-4"
      >
        <p className="text-error text-lg">{error}</p>
        <button className="btn btn-ghost" onClick={() => navigate('/clients')}>
          Back to Clients
        </button>
      </motion.div>
    )
  }

  if (!client) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center min-h-[60vh] gap-4"
      >
        <p className="text-error text-lg">Client not found</p>
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
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
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
        <div>
          <h1 className="text-3xl font-bold">Edit Client</h1>
          <p className="text-base-content/50">{client.name}</p>
        </div>
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
              <Link to={`/clients/${id}`} className="btn" tabIndex={isSubmitting ? -1 : 0}>
                Cancel
              </Link>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  )
}
