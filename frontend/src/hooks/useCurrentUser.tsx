import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { useApi } from './useApi'
import type { Staff } from '../features/staff/types'

type RegistrationStatus = 'unknown' | 'registered' | 'not_registered' | 'pending' | 'inactive'

interface CurrentUserContextType {
  currentUser: Staff | null
  isLoading: boolean
  isAdmin: boolean
  registrationStatus: RegistrationStatus
  refetch: () => Promise<void>
}

const CurrentUserContext = createContext<CurrentUserContextType | undefined>(undefined)

interface CurrentUserProviderProps {
  children: ReactNode
}

export function CurrentUserProvider({ children }: CurrentUserProviderProps) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth0()
  const { fetchWithAuth } = useApi()
  const [currentUser, setCurrentUser] = useState<Staff | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [registrationStatus, setRegistrationStatus] = useState<RegistrationStatus>('unknown')

  const fetchCurrentUser = useCallback(async () => {
    if (!isAuthenticated) {
      setCurrentUser(null)
      setRegistrationStatus('unknown')
      setIsLoading(false)
      return
    }

    try {
      const user = await fetchWithAuth('/api/me')
      setCurrentUser(user)
      setRegistrationStatus(user?.is_active === false ? 'inactive' : 'registered')
    } catch (err) {
      console.error('Failed to fetch current user:', err)
      setCurrentUser(null)

      // Check if this is a 403 (not registered) or other error
      if (err instanceof Error && err.message.includes('403')) {
        // Check error message for specific status
        if (err.message.includes('pending')) {
          setRegistrationStatus('pending')
        } else {
          setRegistrationStatus('not_registered')
        }
      } else {
        setRegistrationStatus('unknown')
      }
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, fetchWithAuth])

  useEffect(() => {
    if (!isAuthLoading) {
      fetchCurrentUser()
    }
  }, [isAuthLoading, fetchCurrentUser])

  const value: CurrentUserContextType = {
    currentUser,
    isLoading: isAuthLoading || isLoading,
    isAdmin: currentUser?.role === 'admin',
    registrationStatus,
    refetch: fetchCurrentUser,
  }

  return (
    <CurrentUserContext.Provider value={value}>
      {children}
    </CurrentUserContext.Provider>
  )
}

export function useCurrentUser(): CurrentUserContextType {
  const context = useContext(CurrentUserContext)
  if (context === undefined) {
    throw new Error('useCurrentUser must be used within a CurrentUserProvider')
  }
  return context
}
