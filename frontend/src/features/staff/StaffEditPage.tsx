import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useApi } from '../../hooks/useApi'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useToast } from '../../hooks/useToast'
import { Skeleton } from '../../components/Skeleton'
import type { Staff, UpdateStaffRequest } from './types'

function StaffEditSkeleton() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center gap-4 mb-8">
        <Skeleton className="h-8 w-16" />
        <div>
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-4 w-48 mt-1" />
        </div>
      </div>
      <div className="card bg-base-100 shadow-xl max-w-2xl mx-auto">
        <div className="card-body space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

export default function StaffEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { fetchWithAuth } = useApi()
  const { currentUser, isAdmin, refetch: refetchCurrentUser } = useCurrentUser()
  const toast = useToast()
  const [staff, setStaff] = useState<Staff | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<UpdateStaffRequest>({
    name: '',
    email: '',
    mobile: '',
    address: '',
    theme: 'system',
  })

  const loadStaff = useCallback(async () => {
    if (!id) return
    setIsLoading(true)
    setError(null)
    try {
      const data: Staff = await fetchWithAuth(`/api/staff/${id}`)
      setStaff(data)
      setFormData({
        name: data.name,
        email: data.email,
        mobile: data.mobile || '',
        address: data.address || '',
        theme: data.theme || 'system',
      })
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

  const isSelf = currentUser?.id === staff?.id
  const canEdit = isSelf || isAdmin

  const handleChange = (field: keyof UpdateStaffRequest) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!staff) return
    setError(null)
    setIsSubmitting(true)

    try {
      await fetchWithAuth(`/api/staff/${staff.id}`, {
        method: 'PUT',
        body: JSON.stringify(formData),
      })
      toast.success('Profile updated successfully')
      if (isSelf) {
        await refetchCurrentUser()
      }
      navigate(`/staff/${staff.id}`)
    } catch (err) {
      console.error('Failed to update staff:', err)
      setError(err instanceof Error ? err.message : 'Failed to update profile')
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <StaffEditSkeleton />
  }

  if (error && !staff) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center min-h-[60vh] gap-4"
      >
        <p className="text-error text-lg">{error}</p>
        <button className="btn btn-ghost" onClick={() => navigate('/staff')}>
          Back to Staff
        </button>
      </motion.div>
    )
  }

  if (!staff) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center min-h-[60vh] gap-4"
      >
        <p className="text-error text-lg">Staff member not found</p>
        <button className="btn btn-ghost" onClick={() => navigate('/staff')}>
          Back to Staff
        </button>
      </motion.div>
    )
  }

  if (!canEdit) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center min-h-[60vh] gap-4"
      >
        <p className="text-error text-lg">You do not have permission to edit this profile</p>
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
        <Link to={`/staff/${id}`} className="btn btn-ghost btn-sm">
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
          <h1 className="text-3xl font-bold">Edit Profile</h1>
          <p className="text-base-content/50">{staff.name}</p>
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
            <div className="space-y-6">
              {/* Name */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Name *</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={formData.name}
                  onChange={handleChange('name')}
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* Email (readonly) */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Email</span>
                </label>
                <input
                  type="email"
                  className="input input-bordered bg-base-200"
                  value={formData.email}
                  readOnly
                  disabled
                />
                <label className="label">
                  <span className="label-text-alt text-base-content/50">
                    Email cannot be changed
                  </span>
                </label>
              </div>

              {/* Mobile */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Mobile</span>
                  <span className="label-text-alt">Optional</span>
                </label>
                <input
                  type="tel"
                  className="input input-bordered"
                  value={formData.mobile}
                  onChange={handleChange('mobile')}
                  placeholder="+44 7xxx xxxxxx"
                  disabled={isSubmitting}
                />
              </div>

              {/* Address */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Address</span>
                  <span className="label-text-alt">Optional</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={formData.address}
                  onChange={handleChange('address')}
                  placeholder="Enter address"
                  disabled={isSubmitting}
                />
              </div>

              {/* Theme (only for self) */}
              {isSelf && (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Theme Preference</span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={formData.theme}
                    onChange={handleChange('theme')}
                    disabled={isSubmitting}
                  >
                    <option value="system">System Default</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="cupcake">Cupcake</option>
                    <option value="forest">Forest</option>
                    <option value="aqua">Aqua</option>
                    <option value="luxury">Luxury</option>
                    <option value="dracula">Dracula</option>
                  </select>
                </div>
              )}
            </div>

            <div className="divider"></div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Link to={`/staff/${id}`} className="btn btn-ghost">
                Cancel
              </Link>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Saving...
                  </>
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
