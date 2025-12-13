import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { useApi } from './useApi'
import type { Staff } from '../features/staff/types'

interface CurrentUserContextType {
  currentUser: Staff | null
  isLoading: boolean
  isAdmin: boolean
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

  const fetchCurrentUser = useCallback(async () => {
    if (!isAuthenticated) {
      setCurrentUser(null)
      setIsLoading(false)
      return
    }

    try {
      const user = await fetchWithAuth('/api/me')
      setCurrentUser(user)
    } catch (err) {
      console.error('Failed to fetch current user:', err)
      setCurrentUser(null)
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
