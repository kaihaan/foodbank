import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useApi } from '../../hooks/useApi'
import { useToast } from '../../hooks/useToast'

interface RegistrationRequest {
  id: string
  name: string
  email: string
  mobile?: string
  address?: string
  status: string
  created_at: string
  reviewed_at?: string
  reviewed_by?: string
}

export default function PendingApprovalsPage() {
  const { fetchWithAuth } = useApi()
  const toast = useToast()
  const [requests, setRequests] = useState<RegistrationRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const fetchRequests = useCallback(async () => {
    try {
      const data = await fetchWithAuth('/api/registration-requests')
      setRequests(data || [])
    } catch (err) {
      console.error('Failed to fetch requests:', err)
      toast.error('Failed to load pending requests')
    } finally {
      setIsLoading(false)
    }
  }, [fetchWithAuth, toast])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setProcessingId(id)
    try {
      await fetchWithAuth(`/api/registration-requests/${id}/${action}`, {
        method: 'POST',
      })
      toast.success(action === 'approve' ? 'Request approved' : 'Request rejected')
      // Remove the processed request from the list
      setRequests((prev) => prev.filter((r) => r.id !== id))
      // Notify navbar to refresh count
      window.dispatchEvent(new Event('registration-requests-changed'))
    } catch (err) {
      console.error('Action failed:', err)
      toast.error(`Failed to ${action} request`)
    } finally {
      setProcessingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
    }
    if (diffHours > 0) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
    }
    return 'Just now'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
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
        <Link to="/" className="btn btn-ghost btn-sm">
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
        <h1 className="text-3xl font-bold">Pending Approvals</h1>
        {requests.length > 0 && (
          <span className="badge badge-primary badge-lg">{requests.length}</span>
        )}
      </div>

      {/* Empty State */}
      {requests.length === 0 && (
        <div className="text-center py-16">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 mx-auto text-base-content/30 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="text-xl font-semibold text-base-content/50 mb-2">No pending requests</h2>
          <p className="text-base-content/40">All registration requests have been processed.</p>
        </div>
      )}

      {/* Request Cards */}
      <div className="grid gap-4">
        <AnimatePresence mode="popLayout">
          {requests.map((request) => (
            <motion.div
              key={request.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, x: -20 }}
              transition={{ duration: 0.2 }}
              className="card bg-base-100 shadow-xl"
            >
              <div className="card-body">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* User Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="avatar placeholder">
                        <div className="bg-primary/10 text-primary rounded-full w-12">
                          <span className="text-lg font-bold">
                            {request.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{request.name}</h3>
                        <p className="text-sm text-base-content/70">{request.email}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-base-content/60 mt-3">
                      {request.mobile && (
                        <div className="flex items-center gap-1">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                            />
                          </svg>
                          {request.mobile}
                        </div>
                      )}
                      {request.address && (
                        <div className="flex items-center gap-1">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          {request.address}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span title={formatDate(request.created_at)}>{getTimeAgo(request.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(request.id, 'approve')}
                      className="btn btn-success"
                      disabled={processingId === request.id}
                    >
                      {processingId === request.id ? (
                        <span className="loading loading-spinner loading-sm"></span>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(request.id, 'reject')}
                      className="btn btn-error btn-outline"
                      disabled={processingId === request.id}
                    >
                      {processingId === request.id ? (
                        <span className="loading loading-spinner loading-sm"></span>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
