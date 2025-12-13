import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useApi } from '../../hooks/useApi'
import { useToast } from '../../hooks/useToast'
import type { InviteStaffRequest, InviteStaffResponse } from './types'

export default function StaffCreatePage() {
  const navigate = useNavigate()
  const { fetchWithAuth } = useApi()
  const toast = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<InviteStaffRequest>({
    name: '',
    email: '',
    role: 'staff',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    try {
      const response: InviteStaffResponse = await fetchWithAuth('/api/staff', {
        method: 'POST',
        body: JSON.stringify(formData),
      })
      toast.success(`Invitation sent to ${formData.email}`)
      navigate(`/staff/${response.staff.id}`)
    } catch (err: unknown) {
      console.error('Failed to invite staff:', err)
      const message = err instanceof Error ? err.message : 'Failed to send invitation'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (field: keyof InviteStaffRequest) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
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
        <h1 className="text-3xl font-bold">Invite Staff Member</h1>
      </div>

      <div className="max-w-2xl">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <p className="text-base-content/70 mb-6">
              Send an email invitation to a new staff member. They will receive a link to set their password and log in.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {/* Name */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Name *</span>
                  </label>
                  <input
                    type="text"
                    className={`input input-bordered ${errors.name ? 'input-error' : ''}`}
                    value={formData.name}
                    onChange={handleChange('name')}
                    placeholder="Enter full name"
                    disabled={isSubmitting}
                  />
                  {errors.name && (
                    <label className="label">
                      <span className="label-text-alt text-error">{errors.name}</span>
                    </label>
                  )}
                </div>

                {/* Email */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Email *</span>
                  </label>
                  <input
                    type="email"
                    className={`input input-bordered ${errors.email ? 'input-error' : ''}`}
                    value={formData.email}
                    onChange={handleChange('email')}
                    placeholder="email@example.com"
                    disabled={isSubmitting}
                  />
                  {errors.email && (
                    <label className="label">
                      <span className="label-text-alt text-error">{errors.email}</span>
                    </label>
                  )}
                </div>

                {/* Role */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Role *</span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={formData.role}
                    onChange={handleChange('role')}
                    disabled={isSubmitting}
                  >
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                  <label className="label">
                    <span className="label-text-alt text-base-content/50">
                      Admins can manage other staff members
                    </span>
                  </label>
                </div>

                {/* Mobile (optional) */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Mobile</span>
                    <span className="label-text-alt">Optional</span>
                  </label>
                  <input
                    type="tel"
                    className="input input-bordered"
                    value={formData.mobile || ''}
                    onChange={handleChange('mobile')}
                    placeholder="+44 7xxx xxxxxx"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Address (optional) */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Address</span>
                    <span className="label-text-alt">Optional</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered"
                    value={formData.address || ''}
                    onChange={handleChange('address')}
                    placeholder="Enter address"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="divider"></div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <Link to="/staff" className="btn btn-ghost">
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
                      Sending...
                    </>
                  ) : (
                    'Send Invitation'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
