import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Link } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import type { MFAStatus } from '../features/staff/types'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { theme, setTheme, themes } = useTheme()
  const { currentUser, isAdmin } = useCurrentUser()
  const { fetchWithAuth } = useApi()
  const toast = useToast()
  const [mfaStatus, setMfaStatus] = useState<MFAStatus | null>(null)
  const [isLoadingMfa, setIsLoadingMfa] = useState(false)
  const [isTogglingMfa, setIsTogglingMfa] = useState(false)

  const loadMfaStatus = useCallback(async () => {
    if (!currentUser) return
    setIsLoadingMfa(true)
    try {
      const status = await fetchWithAuth('/api/me/mfa')
      setMfaStatus(status)
    } catch (err) {
      console.error('Failed to load MFA status:', err)
    } finally {
      setIsLoadingMfa(false)
    }
  }, [currentUser, fetchWithAuth])

  useEffect(() => {
    if (isOpen && currentUser) {
      loadMfaStatus()
    }
  }, [isOpen, currentUser, loadMfaStatus])

  const handleEnableMfa = async () => {
    setIsTogglingMfa(true)
    try {
      const response = await fetchWithAuth('/api/me/mfa/enroll', { method: 'POST' })
      if (response.ticket_url) {
        window.open(response.ticket_url, '_blank')
        toast.success('MFA enrollment started. Complete setup in the new tab.')
      }
      setTimeout(loadMfaStatus, 3000)
    } catch (err) {
      console.error('Failed to enable MFA:', err)
      toast.error('Failed to start MFA enrollment')
    } finally {
      setIsTogglingMfa(false)
    }
  }

  const handleDisableMfa = async () => {
    if (!confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
      return
    }
    setIsTogglingMfa(true)
    try {
      await fetchWithAuth('/api/me/mfa', { method: 'DELETE' })
      toast.success('Two-factor authentication disabled')
      loadMfaStatus()
    } catch (err) {
      console.error('Failed to disable MFA:', err)
      toast.error('Failed to disable MFA')
    } finally {
      setIsTogglingMfa(false)
    }
  }

  const handleThemeSelect = (themeId: string) => {
    setTheme(themeId as typeof theme)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40"
            onClick={onClose}
          />

          {/* Settings Panel */}
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="relative z-50 bg-base-200 border-b border-base-300 overflow-hidden"
          >
            <div className="container mx-auto px-4 py-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Settings</h2>
                <button
                  onClick={onClose}
                  className="btn btn-ghost btn-sm btn-circle"
                  aria-label="Close settings"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Security Section */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-base-content/70 mb-3">Security</h3>
                <div className="flex items-center justify-between bg-base-100 p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-primary">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    <div>
                      <p className="font-medium text-sm">Two-Factor Authentication</p>
                      <p className="text-xs text-base-content/50">
                        {isLoadingMfa
                          ? 'Loading...'
                          : mfaStatus?.enrolled
                          ? `Enabled (${mfaStatus.factors.join(', ')})`
                          : 'Add an extra layer of security'}
                      </p>
                    </div>
                  </div>
                  {isLoadingMfa ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : mfaStatus?.enrolled ? (
                    <button
                      className="btn btn-sm btn-error btn-outline"
                      onClick={handleDisableMfa}
                      disabled={isTogglingMfa}
                    >
                      {isTogglingMfa ? (
                        <span className="loading loading-spinner loading-sm"></span>
                      ) : (
                        'Disable'
                      )}
                    </button>
                  ) : (
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={handleEnableMfa}
                      disabled={isTogglingMfa}
                    >
                      {isTogglingMfa ? (
                        <span className="loading loading-spinner loading-sm"></span>
                      ) : (
                        'Enable'
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Admin Links */}
              {isAdmin && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-base-content/70 mb-3">Admin</h3>
                <div className="flex gap-2">
                  <Link
                    to="/staff"
                    onClick={onClose}
                    className="btn btn-sm btn-outline"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                    Staff
                  </Link>
                  <Link
                    to="/audit"
                    onClick={onClose}
                    className="btn btn-sm btn-outline"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    Audit Log
                  </Link>
                </div>
              </div>
              )}

              {/* Theme Selection */}
              <div>
                <h3 className="text-sm font-medium text-base-content/70 mb-3">Theme</h3>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {themes.map((t) => (
                    <motion.button
                      key={t.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleThemeSelect(t.id)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-colors ${
                        theme === t.id
                          ? 'bg-primary text-primary-content'
                          : 'bg-base-100 hover:bg-base-300'
                      }`}
                    >
                      <span className="text-xl">{t.icon}</span>
                      <span className="text-xs font-medium truncate w-full text-center">
                        {t.name}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
