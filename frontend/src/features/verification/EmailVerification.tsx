import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useApi } from '../../hooks/useApi'
import { useToast } from '../../hooks/useToast'
import { useCurrentUser } from '../../hooks/useCurrentUser'

export default function EmailVerification() {
  const { currentUser, refetch } = useCurrentUser()
  const { fetchWithAuth } = useApi()
  const toast = useToast()

  const [isExpanded, setIsExpanded] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [codeSent, setCodeSent] = useState(false)

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Focus first input when expanded
  useEffect(() => {
    if (isExpanded && codeSent && inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [isExpanded, codeSent])

  const handleSendCode = async () => {
    setIsSending(true)
    setError('')
    try {
      await fetchWithAuth('/api/verification/send', { method: 'POST' })
      setCodeSent(true)
      toast.success('Verification code sent to your email')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send code'
      if (message.includes('429') || message.includes('too many')) {
        setError('Too many requests. Please wait a few minutes before trying again.')
      } else {
        setError('Failed to send verification code')
      }
      toast.error('Failed to send verification code')
    } finally {
      setIsSending(false)
    }
  }

  const handleCodeChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return

    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)
    setError('')

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all digits entered
    if (value && index === 5 && newCode.every((d) => d !== '')) {
      handleVerify(newCode.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pastedData.length === 6) {
      const newCode = pastedData.split('')
      setCode(newCode)
      inputRefs.current[5]?.focus()
      handleVerify(pastedData)
    }
  }

  const handleVerify = async (codeStr: string) => {
    setIsVerifying(true)
    setError('')
    try {
      await fetchWithAuth('/api/verification/verify', {
        method: 'POST',
        body: JSON.stringify({ code: codeStr }),
      })
      toast.success('Email verified successfully!')
      setIsExpanded(false)
      setCodeSent(false)
      setCode(['', '', '', '', '', ''])
      refetch()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed'
      if (message.includes('410') || message.includes('expired')) {
        setError('Code expired. Please request a new one.')
      } else if (message.includes('invalid') || message.includes('400')) {
        setError('Invalid code. Please check and try again.')
      } else if (message.includes('429') || message.includes('too many')) {
        setError('Too many attempts. Please request a new code.')
      } else {
        setError('Verification failed')
      }
      // Clear the code on error
      setCode(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setIsVerifying(false)
    }
  }

  const handleClose = () => {
    setIsExpanded(false)
    setCodeSent(false)
    setCode(['', '', '', '', '', ''])
    setError('')
  }

  // Already verified - show success state
  if (currentUser?.email_verified) {
    return (
      <div className="flex items-center justify-between bg-base-100 p-4 rounded-lg">
        <div className="flex items-center gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5 text-success"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
            />
          </svg>
          <div>
            <p className="font-medium text-sm">Email Verified</p>
            <p className="text-xs text-base-content/50">{currentUser.email}</p>
          </div>
        </div>
        <span className="badge badge-success gap-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-3 h-3"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          Verified
        </span>
      </div>
    )
  }

  // Not verified - show verify prompt
  return (
    <div className="bg-base-100 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5 text-warning"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
            />
          </svg>
          <div>
            <p className="font-medium text-sm">Email Verification</p>
            <p className="text-xs text-base-content/50">
              {currentUser?.email} - not verified
            </p>
          </div>
        </div>
        {!isExpanded && (
          <button
            className="btn btn-sm btn-primary"
            onClick={() => setIsExpanded(true)}
          >
            Verify
          </button>
        )}
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-base-200 pt-4">
              {!codeSent ? (
                <div className="space-y-3">
                  <p className="text-sm text-base-content/70">
                    We'll send a 6-digit code to{' '}
                    <span className="font-medium">{currentUser?.email}</span>
                  </p>
                  {error && (
                    <p className="text-sm text-error">{error}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={handleSendCode}
                      disabled={isSending}
                    >
                      {isSending ? (
                        <span className="loading loading-spinner loading-sm"></span>
                      ) : (
                        'Send Code'
                      )}
                    </button>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={handleClose}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-base-content/70">
                    Enter the 6-digit code sent to your email
                  </p>

                  {/* Code input */}
                  <div className="flex gap-2 justify-center" onPaste={handlePaste}>
                    {code.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => { inputRefs.current[index] = el }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleCodeChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        className={`w-10 h-12 text-center text-xl font-mono input input-bordered ${
                          error ? 'input-error' : ''
                        }`}
                        disabled={isVerifying}
                      />
                    ))}
                  </div>

                  {error && (
                    <p className="text-sm text-error text-center">{error}</p>
                  )}

                  {isVerifying && (
                    <div className="flex justify-center">
                      <span className="loading loading-spinner loading-sm"></span>
                    </div>
                  )}

                  <div className="flex justify-center gap-2">
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={handleSendCode}
                      disabled={isSending}
                    >
                      {isSending ? (
                        <span className="loading loading-spinner loading-xs"></span>
                      ) : (
                        'Resend Code'
                      )}
                    </button>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={handleClose}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
