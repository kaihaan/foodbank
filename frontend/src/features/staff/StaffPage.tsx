import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useApi } from '../../hooks/useApi'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { Skeleton } from '../../components/Skeleton'
import type { Staff } from './types'

function StaffTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Joined</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              <td><Skeleton className="h-5 w-32" /></td>
              <td><Skeleton className="h-5 w-40" /></td>
              <td><Skeleton className="h-5 w-16" /></td>
              <td><Skeleton className="h-5 w-16" /></td>
              <td><Skeleton className="h-5 w-24" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function StaffPage() {
  const { fetchWithAuth } = useApi()
  const { isAdmin } = useCurrentUser()
  const [staff, setStaff] = useState<Staff[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  const loadStaff = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const url = isAdmin && showAll ? '/api/staff?all=true' : '/api/staff'
      const data = await fetchWithAuth(url)
      setStaff(data || [])
    } catch (err) {
      console.error('Failed to load staff:', err)
      setError('Failed to load staff members')
    } finally {
      setIsLoading(false)
    }
  }, [fetchWithAuth, isAdmin, showAll])

  useEffect(() => {
    loadStaff()
  }, [loadStaff])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const activeCount = staff.filter(s => s.is_active).length
  const totalCount = staff.length

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">Staff</h1>
          <div className="badge badge-neutral">
            {showAll ? `${activeCount} active / ${totalCount} total` : `${activeCount} members`}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <>
              <label className="label cursor-pointer gap-2">
                <span className="label-text text-sm">Show deactivated</span>
                <input
                  type="checkbox"
                  className="toggle toggle-sm"
                  checked={showAll}
                  onChange={(e) => setShowAll(e.target.checked)}
                />
              </label>
              <Link to="/staff/new" className="btn btn-primary">
                Invite Staff
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          {error && (
            <div className="alert alert-error mb-4">
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <StaffTableSkeleton rows={5} />
          ) : staff.length === 0 ? (
            <div className="text-center py-12 text-base-content/50">
              No staff members registered yet.
              {isAdmin && (
                <div className="mt-4">
                  <Link to="/staff/new" className="btn btn-primary btn-sm">
                    Invite your first staff member
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="overflow-x-auto"
            >
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((member, index) => (
                    <motion.tr
                      key={member.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`hover ${!member.is_active ? 'opacity-50' : ''}`}
                    >
                      <td>
                        <Link to={`/staff/${member.id}`} className="flex items-center gap-3 hover:underline">
                          <div className="avatar placeholder">
                            <div className={`${member.is_active ? 'bg-primary text-primary-content' : 'bg-base-300 text-base-content/50'} rounded-full w-10`}>
                              <span className="text-sm">{member.name.charAt(0).toUpperCase()}</span>
                            </div>
                          </div>
                          <div className="font-medium">{member.name}</div>
                        </Link>
                      </td>
                      <td>
                        <a href={`mailto:${member.email}`} className="link link-hover">
                          {member.email}
                        </a>
                      </td>
                      <td>
                        <span className={`badge ${member.role === 'admin' ? 'badge-primary' : 'badge-ghost'} badge-sm`}>
                          {member.role === 'admin' ? 'Admin' : 'Staff'}
                        </span>
                      </td>
                      <td>
                        {member.is_active ? (
                          <span className="badge badge-success badge-sm">Active</span>
                        ) : (
                          <span className="badge badge-error badge-sm">Deactivated</span>
                        )}
                      </td>
                      <td className="text-base-content/70">{formatDate(member.created_at)}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
