import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useToast } from '../../hooks/useToast'

interface RegistrationFormData {
  name: string
  email: string
  mobile?: string
  address?: string
}

export default function RegistrationRequestPage() {
  const toast = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [formData, setFormData] = useState<RegistrationFormData>({
    name: '',
    email: '',
    mobile: '',
    address: '',
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
      const response = await fetch('/api/registration-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          mobile: formData.mobile || undefined,
          address: formData.address || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        if (response.status === 409) {
          toast.error(data.error || 'A request for this email already exists')
        } else {
          toast.error(data.error || 'Failed to submit registration request')
        }
        return
      }

      setIsSubmitted(true)
      toast.success('Registration request submitted successfully')
    } catch (err) {
      console.error('Failed to submit registration:', err)
      toast.error('Failed to submit registration request')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (field: keyof RegistrationFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  // Show success message after submission
  if (isSubmitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="min-h-[60vh] flex items-center justify-center"
      >
        <div className="text-center max-w-md">
          <div className="mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 mx-auto text-success"
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
          </div>
          <h1 className="text-3xl font-bold mb-4">Request Submitted</h1>
          <p className="text-base-content/70 mb-6">
            Your registration request has been submitted successfully. An administrator will review your request
            and you will receive an email once a decision has been made.
          </p>
          <Link to="/" className="btn btn-primary">
            Return to Home
          </Link>
        </div>
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
        <h1 className="text-3xl font-bold">Staff Registration</h1>
      </div>

      <div className="max-w-2xl">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <p className="text-base-content/70 mb-6">
              Request access to the Finchley Foodbank staff system. Your request will be reviewed by an administrator.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {/* Name */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Full Name *</span>
                  </label>
                  <input
                    type="text"
                    className={`input input-bordered ${errors.name ? 'input-error' : ''}`}
                    value={formData.name}
                    onChange={handleChange('name')}
                    placeholder="Enter your full name"
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
                    placeholder="your.email@example.com"
                    disabled={isSubmitting}
                  />
                  {errors.email && (
                    <label className="label">
                      <span className="label-text-alt text-error">{errors.email}</span>
                    </label>
                  )}
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
                    value={formData.mobile}
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
                  <textarea
                    className="textarea textarea-bordered"
                    value={formData.address}
                    onChange={handleChange('address')}
                    placeholder="Enter your address"
                    rows={2}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="divider"></div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <Link to="/" className="btn btn-ghost">
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
                      Submitting...
                    </>
                  ) : (
                    'Submit Request'
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
