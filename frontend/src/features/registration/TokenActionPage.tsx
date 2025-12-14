import { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useToast } from '../../hooks/useToast'

interface RegistrationRequest {
  id: string
  name: string
  email: string
  mobile?: string
  address?: string
  status: string
  created_at: string
  valid: boolean
  expired: boolean
}

type ActionState = 'loading' | 'pending' | 'processing' | 'success' | 'error' | 'expired' | 'already_processed'

export default function TokenActionPage() {
  const { token } = useParams<{ token: string }>()
  const [searchParams] = useSearchParams()
  const action = searchParams.get('action') as 'approve' | 'reject' | null
  const toast = useToast()

  const [request, setRequest] = useState<RegistrationRequest | null>(null)
  const [state, setState] = useState<ActionState>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  // Fetch the registration request details
  useEffect(() => {
    const fetchRequest = async () => {
      if (!token) {
        setErrorMessage('Invalid link')
        setState('error')
        return
      }

      try {
        const response = await fetch(`/api/registration-requests/action/${token}`)
        if (!response.ok) {
          if (response.status === 404) {
            setErrorMessage('This registration request was not found')
            setState('error')
            return
          }
          throw new Error('Failed to fetch request')
        }

        const data: RegistrationRequest = await response.json()
        setRequest(data)

        if (data.expired) {
          setState('expired')
        } else if (!data.valid) {
          setState('already_processed')
        } else {
          setState('pending')
        }
      } catch (err) {
        console.error('Failed to fetch request:', err)
        setErrorMessage('Failed to load request details')
        setState('error')
      }
    }

    fetchRequest()
  }, [token])

  const handleAction = async (actionType: 'approve' | 'reject') => {
    if (!token) return

    setState('processing')
    try {
      const response = await fetch(`/api/registration-requests/action/${token}/${actionType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const data = await response.json()
        if (response.status === 410) {
          setState('expired')
          return
        }
        if (response.status === 400) {
          setState('already_processed')
          return
        }
        throw new Error(data.error || 'Action failed')
      }

      setState('success')
      toast.success(actionType === 'approve' ? 'Request approved successfully' : 'Request rejected')
    } catch (err) {
      console.error('Action failed:', err)
      setErrorMessage(err instanceof Error ? err.message : 'Action failed')
      setState('error')
    }
  }

  // Auto-execute action if provided in URL and request is valid
  useEffect(() => {
    if (state === 'pending' && action && ['approve', 'reject'].includes(action)) {
      // Don't auto-execute, let user confirm first
    }
  }, [state, action])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Loading state
  if (state === 'loading') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  // Error state
  if (state === 'error') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-[60vh] flex items-center justify-center"
      >
        <div className="text-center max-w-md">
          <div className="mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 mx-auto text-error"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-4">Error</h1>
          <p className="text-base-content/70 mb-6">{errorMessage}</p>
          <Link to="/" className="btn btn-primary">
            Return to Home
          </Link>
        </div>
      </motion.div>
    )
  }

  // Expired state
  if (state === 'expired') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-[60vh] flex items-center justify-center"
      >
        <div className="text-center max-w-md">
          <div className="mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 mx-auto text-warning"
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
          </div>
          <h1 className="text-3xl font-bold mb-4">Link Expired</h1>
          <p className="text-base-content/70 mb-6">
            This approval link has expired. Registration requests expire after 7 days.
            You can still manage pending requests from the admin dashboard.
          </p>
          <Link to="/" className="btn btn-primary">
            Return to Home
          </Link>
        </div>
      </motion.div>
    )
  }

  // Already processed state
  if (state === 'already_processed') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-[60vh] flex items-center justify-center"
      >
        <div className="text-center max-w-md">
          <div className="mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 mx-auto text-info"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-4">Already Processed</h1>
          <p className="text-base-content/70 mb-6">
            This registration request has already been {request?.status || 'processed'}.
          </p>
          <Link to="/" className="btn btn-primary">
            Return to Home
          </Link>
        </div>
      </motion.div>
    )
  }

  // Success state
  if (state === 'success') {
    const wasApproved = action === 'approve'
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-[60vh] flex items-center justify-center"
      >
        <div className="text-center max-w-md">
          <div className="mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-16 w-16 mx-auto ${wasApproved ? 'text-success' : 'text-error'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={wasApproved
                  ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  : "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                }
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-4">
            {wasApproved ? 'Request Approved' : 'Request Rejected'}
          </h1>
          <p className="text-base-content/70 mb-6">
            {wasApproved
              ? `${request?.name} has been approved and will receive an email with instructions to set their password.`
              : `The registration request from ${request?.name} has been rejected.`
            }
          </p>
          <Link to="/" className="btn btn-primary">
            Return to Home
          </Link>
        </div>
      </motion.div>
    )
  }

  // Processing state
  if (state === 'processing') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg"></span>
          <p className="mt-4 text-base-content/70">Processing...</p>
        </div>
      </div>
    )
  }

  // Pending state - show request details and action buttons
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Staff Registration Request</h1>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <p className="text-base-content/70 mb-6">
              The following person has requested access to the Finchley Foodbank staff system.
            </p>

            {/* Request Details */}
            <div className="bg-base-200 rounded-lg p-6 space-y-4">
              <div>
                <div className="text-sm text-base-content/50 uppercase tracking-wider">Name</div>
                <div className="text-lg font-medium">{request?.name}</div>
              </div>
              <div>
                <div className="text-sm text-base-content/50 uppercase tracking-wider">Email</div>
                <div className="text-lg font-medium">{request?.email}</div>
              </div>
              {request?.mobile && (
                <div>
                  <div className="text-sm text-base-content/50 uppercase tracking-wider">Mobile</div>
                  <div className="text-lg font-medium">{request.mobile}</div>
                </div>
              )}
              {request?.address && (
                <div>
                  <div className="text-sm text-base-content/50 uppercase tracking-wider">Address</div>
                  <div className="text-lg font-medium">{request.address}</div>
                </div>
              )}
              <div>
                <div className="text-sm text-base-content/50 uppercase tracking-wider">Submitted</div>
                <div className="text-lg font-medium">{request?.created_at ? formatDate(request.created_at) : '-'}</div>
              </div>
            </div>

            <div className="divider"></div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => handleAction('approve')}
                className="btn btn-success flex-1"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Approve Request
              </button>
              <button
                onClick={() => handleAction('reject')}
                className="btn btn-error flex-1"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Reject Request
              </button>
            </div>

            <p className="text-sm text-base-content/50 text-center mt-4">
              Approving will create a staff account and send login instructions to the applicant.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
