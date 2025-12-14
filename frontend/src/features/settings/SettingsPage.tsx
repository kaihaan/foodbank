import { useState, useEffect, useCallback } from 'react'
import { motion } from 'motion/react'
import { useTheme } from '../../hooks/useTheme'
import { useBackground } from '../../hooks/useBackground'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useApi } from '../../hooks/useApi'
import { useToast } from '../../hooks/useToast'
import type { MFAStatus } from '../staff/types'
import EmailVerification from '../verification/EmailVerification'

export default function SettingsPage() {
  const { theme, setTheme, themes } = useTheme()
  const { background, setBackground, backgrounds } = useBackground()
  const { currentUser } = useCurrentUser()
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
    if (currentUser) {
      loadMfaStatus()
    }
  }, [currentUser, loadMfaStatus])

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

  const handleBackgroundSelect = (bgId: string) => {
    setBackground(bgId as typeof background)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      <div className="space-y-6 max-w-4xl">
        {/* Security Section */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-lg mb-4">Security</h2>
            <div className="space-y-3">
              {/* Email Verification */}
              <EmailVerification />

              {/* Two-Factor Authentication */}
              <div className="flex items-center justify-between bg-base-200 p-4 rounded-lg">
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
          </div>
        </div>

        {/* Appearance Section */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-lg mb-4">Appearance</h2>

            {/* Background Selection */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-base-content/70 mb-3">Background</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {backgrounds.map((bg) => (
                  <motion.button
                    key={bg.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleBackgroundSelect(bg.id)}
                    className={`relative aspect-video rounded-lg overflow-hidden transition-all ${
                      background === bg.id
                        ? 'ring-2 ring-primary ring-offset-2 ring-offset-base-100'
                        : 'hover:ring-2 hover:ring-base-content/20'
                    }`}
                  >
                    {bg.file ? (
                      <img
                        src={`/backgrounds/${bg.file}`}
                        alt={bg.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-base-200 to-base-300 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-base-content/30">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                      <span className="text-xs font-medium text-white">{bg.name}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Theme Selection */}
            <div>
              <h3 className="text-sm font-medium text-base-content/70 mb-3">Theme</h3>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                {themes.map((t) => (
                  <motion.button
                    key={t.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleThemeSelect(t.id)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-colors ${
                      theme === t.id
                        ? 'bg-primary text-primary-content'
                        : 'bg-base-200 hover:bg-base-300'
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
        </div>
      </div>
    </motion.div>
  )
}
