import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useApi } from '../../hooks/useApi'
import { useToast } from '../../hooks/useToast'
import { ClientDetailSkeleton } from '../../components/Skeleton'
import type { Client, Attendance } from './types'

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { fetchWithAuth } = useApi()
  const toast = useToast()
  const [client, setClient] = useState<Client | null>(null)
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadClient = useCallback(async () => {
    if (!id) return
    setIsLoading(true)
    setError(null)
    try {
      const [clientData, attendanceData] = await Promise.all([
        fetchWithAuth(`/api/clients/${id}`),
        fetchWithAuth(`/api/clients/${id}/attendance?limit=20`),
      ])
      setClient(clientData)
      setAttendance(attendanceData)
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

  const handleRecordAttendance = async () => {
    if (!client) return
    try {
      await fetchWithAuth(`/api/clients/${client.id}/attendance`, {
        method: 'POST',
      })
      toast.success(`${client.name} checked in`)
      loadClient()
    } catch (err) {
      console.error('Failed to record attendance:', err)
      toast.error('Failed to record attendance')
    }
  }

  const formatPreferences = (c: Client) => {
    const prefs = []
    if (c.pref_halal) prefs.push('Halal')
    if (c.pref_vegetarian) prefs.push('Vegetarian')
    if (c.pref_gluten_free) prefs.push('Gluten Free')
    if (c.pref_no_cooking) prefs.push('No Cooking Facilities')
    return prefs
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isLoading) {
    return <ClientDetailSkeleton />
  }

  if (error || !client) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center min-h-[60vh] gap-4"
      >
        <p className="text-error text-lg">{error || 'Client not found'}</p>
        <button className="btn btn-ghost" onClick={() => navigate('/clients')}>
          Back to Clients
        </button>
      </motion.div>
    )
  }

  const preferences = formatPreferences(client)

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
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{client.name}</h1>
          <code className="text-sm bg-base-200 px-2 py-1 rounded mt-1 inline-block">
            {client.barcode_id}
          </code>
        </div>
        <div className="flex gap-2">
          <Link to={`/clients/${client.id}/print`} className="btn btn-outline btn-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z"
              />
            </svg>
            Print
          </Link>
          <Link to={`/clients/${id}/edit`} className="btn btn-outline">
            Edit
          </Link>
          <button className="btn btn-success" onClick={handleRecordAttendance}>
            Check In
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 card bg-base-100 shadow-xl"
        >
          <div className="card-body">
            <h2 className="card-title text-lg mb-4">Client Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs uppercase text-base-content/50 mb-1">Address</h3>
                <p className="font-medium">{client.address}</p>
              </div>

              <div>
                <h3 className="text-xs uppercase text-base-content/50 mb-1">Appointment</h3>
                <p className="font-medium">
                  {client.appointment_day
                    ? `${client.appointment_day}${client.appointment_time ? ` at ${client.appointment_time}` : ''}`
                    : 'Not scheduled'}
                </p>
              </div>

              <div>
                <h3 className="text-xs uppercase text-base-content/50 mb-1">Family Size</h3>
                <p className="font-medium">{client.family_size} people</p>
              </div>

              <div>
                <h3 className="text-xs uppercase text-base-content/50 mb-1">Children</h3>
                <p className="font-medium">
                  {client.num_children > 0
                    ? `${client.num_children} ${client.num_children === 1 ? 'child' : 'children'}${client.children_ages ? ` (ages: ${client.children_ages})` : ''}`
                    : 'None'}
                </p>
              </div>

              {client.reason && (
                <div className="md:col-span-2">
                  <h3 className="text-xs uppercase text-base-content/50 mb-1">Reason</h3>
                  <p className="font-medium">{client.reason}</p>
                </div>
              )}
            </div>

            {preferences.length > 0 && (
              <div className="mt-6">
                <h3 className="text-xs uppercase text-base-content/50 mb-2">Food Preferences</h3>
                <div className="flex flex-wrap gap-2">
                  {preferences.map((pref) => (
                    <span key={pref} className="badge badge-outline">
                      {pref}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="divider"></div>

            <div className="text-sm text-base-content/50">
              Registered on {formatDate(client.created_at)}
            </div>
          </div>
        </motion.div>

        {/* Attendance History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card bg-base-100 shadow-xl"
        >
          <div className="card-body">
            <h2 className="card-title text-lg mb-4">
              Attendance
              <span className="badge badge-neutral">{attendance.length}</span>
            </h2>

            {attendance.length === 0 ? (
              <p className="text-base-content/50 text-center py-8">No visits recorded</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {attendance.map((record, index) => (
                  <motion.div
                    key={record.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                    className="flex items-center gap-3 p-3 bg-base-200 rounded-lg"
                  >
                    <div className="w-2 h-2 bg-success rounded-full"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{formatDateTime(record.verified_at)}</p>
                      {record.verified_by_name && (
                        <p className="text-xs text-base-content/50 truncate">
                          by {record.verified_by_name}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

    </motion.div>
  )
}
