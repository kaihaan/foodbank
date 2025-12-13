import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useApi } from '../../hooks/useApi'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useToast } from '../../hooks/useToast'
import { Skeleton } from '../../components/Skeleton'
import type { Staff } from './types'

function StaffDetailSkeleton() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center gap-4 mb-8">
        <Skeleton className="h-8 w-16" />
        <div className="flex-1">
          <Skeleton className="h-9 w-48" />
        </div>
        <Skeleton className="h-10 w-20" />
      </div>
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-3 w-20 mb-1" />
                <Skeleton className="h-5 w-40" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function StaffDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { fetchWithAuth } = useApi()
  const { currentUser, isAdmin } = useCurrentUser()
  const toast = useToast()
  const [staff, setStaff] = useState<Staff | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeactivating, setIsDeactivating] = useState(false)
  const [isReactivating, setIsReactivating] = useState(false)
  const [isChangingRole, setIsChangingRole] = useState(false)

  const loadStaff = useCallback(async () => {
    if (!id) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchWithAuth(`/api/staff/${id}`)
      setStaff(data)
    } catch (err) {
      console.error('Failed to load staff:', err)
      setError('Failed to load staff details')
    } finally {
      setIsLoading(false)
    }
  }, [fetchWithAuth, id])

  useEffect(() => {
    loadStaff()
  }, [loadStaff])

  const handleDeactivate = async () => {
    if (!staff || !confirm(`Are you sure you want to deactivate ${staff.name}? They will no longer be able to log in.`)) return
    setIsDeactivating(true)
    try {
      await fetchWithAuth(`/api/staff/${staff.id}`, { method: 'DELETE' })
      toast.success(`${staff.name} has been deactivated`)
      loadStaff()
    } catch (err) {
      console.error('Failed to deactivate staff:', err)
      toast.error('Failed to deactivate staff member')
    } finally {
      setIsDeactivating(false)
    }
  }

  const handleReactivate = async () => {
    if (!staff) return
    setIsReactivating(true)
    try {
      await fetchWithAuth(`/api/staff/${staff.id}/reactivate`, { method: 'POST' })
      toast.success(`${staff.name} has been reactivated`)
      loadStaff()
    } catch (err) {
      console.error('Failed to reactivate staff:', err)
      toast.error('Failed to reactivate staff member')
    } finally {
      setIsReactivating(false)
    }
  }

  const handleRoleChange = async (newRole: 'admin' | 'staff') => {
    if (!staff || staff.role === newRole) return
    setIsChangingRole(true)
    try {
      await fetchWithAuth(`/api/staff/${staff.id}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole }),
      })
      toast.success(`${staff.name} is now ${newRole === 'admin' ? 'an Admin' : 'Staff'}`)
      loadStaff()
    } catch (err) {
      console.error('Failed to change role:', err)
      toast.error('Failed to change role')
    } finally {
      setIsChangingRole(false)
    }
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

  const isSelf = currentUser?.id === staff?.id

  if (isLoading) {
    return <StaffDetailSkeleton />
  }

  if (error || !staff) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center min-h-[60vh] gap-4"
      >
        <p className="text-error text-lg">{error || 'Staff member not found'}</p>
        <button className="btn btn-ghost" onClick={() => navigate('/staff')}>
          Back to Staff
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
        <Link to="/staff" className="btn btn-ghost btn-sm">
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
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{staff.name}</h1>
            <span className={`badge ${staff.role === 'admin' ? 'badge-primary' : 'badge-ghost'}`}>
              {staff.role === 'admin' ? 'Admin' : 'Staff'}
            </span>
            {!staff.is_active && (
              <span className="badge badge-error">Deactivated</span>
            )}
            {isSelf && (
              <span className="badge badge-outline">You</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {(isSelf || isAdmin) && (
            <Link to={`/staff/${id}/edit`} className="btn btn-outline">
              Edit
            </Link>
          )}
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
            <h2 className="card-title text-lg mb-4">Staff Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs uppercase text-base-content/50 mb-1">Email</h3>
                <a href={`mailto:${staff.email}`} className="font-medium link link-hover">
                  {staff.email}
                </a>
              </div>

              <div>
                <h3 className="text-xs uppercase text-base-content/50 mb-1">Mobile</h3>
                <p className="font-medium">{staff.mobile || 'Not provided'}</p>
              </div>

              <div className="md:col-span-2">
                <h3 className="text-xs uppercase text-base-content/50 mb-1">Address</h3>
                <p className="font-medium">{staff.address || 'Not provided'}</p>
              </div>
            </div>

            <div className="divider"></div>

            <div className="text-sm text-base-content/50">
              Joined on {formatDate(staff.created_at)}
            </div>

            {!staff.is_active && staff.deactivated_at && (
              <div className="text-sm text-error/70 mt-1">
                Deactivated on {formatDateTime(staff.deactivated_at)}
              </div>
            )}
          </div>
        </motion.div>

        {/* Admin Actions */}
        {isAdmin && !isSelf && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card bg-base-100 shadow-xl"
          >
            <div className="card-body">
              <h2 className="card-title text-lg mb-4">Admin Actions</h2>

              {/* Role Change */}
              <div className="mb-6">
                <h3 className="text-xs uppercase text-base-content/50 mb-2">Role</h3>
                <select
                  className="select select-bordered w-full"
                  value={staff.role}
                  onChange={(e) => handleRoleChange(e.target.value as 'admin' | 'staff')}
                  disabled={isChangingRole}
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
                {isChangingRole && (
                  <span className="loading loading-spinner loading-sm ml-2"></span>
                )}
              </div>

              {/* Activation Status */}
              <div>
                <h3 className="text-xs uppercase text-base-content/50 mb-2">Account Status</h3>
                {staff.is_active ? (
                  <button
                    className="btn btn-error btn-outline w-full"
                    onClick={handleDeactivate}
                    disabled={isDeactivating}
                  >
                    {isDeactivating ? (
                      <span className="loading loading-spinner loading-sm"></span>
                    ) : (
                      'Deactivate Account'
                    )}
                  </button>
                ) : (
                  <button
                    className="btn btn-success w-full"
                    onClick={handleReactivate}
                    disabled={isReactivating}
                  >
                    {isReactivating ? (
                      <span className="loading loading-spinner loading-sm"></span>
                    ) : (
                      'Reactivate Account'
                    )}
                  </button>
                )}
                <p className="text-xs text-base-content/50 mt-2">
                  {staff.is_active
                    ? 'Deactivating will prevent this user from logging in.'
                    : 'Reactivating will allow this user to log in again.'}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
