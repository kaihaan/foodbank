import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { useCurrentUser } from './useCurrentUser'
import { useApi } from './useApi'

// Available background options
const BACKGROUNDS = [
  { id: 'none', name: 'None', file: null },
  { id: 'david-bayliss', name: 'Abstract', file: 'david-bayliss-GFX1JgiYd60-unsplash.jpg' },
  { id: 'jonas-kakaroto', name: 'Sunset', file: 'jonas-kakaroto-5JQH9Iqnm9o-unsplash.jpg' },
  { id: 'kenny-eliason', name: 'Food', file: 'kenny-eliason-SvhXD3kPSTY-unsplash.jpg' },
  { id: 'pornprom', name: 'Nature', file: 'pornprom-lertwasana-0wad0iZa_Zc-unsplash.jpg' },
  { id: 'scott-warman', name: 'Groceries', file: 'scott-warman-NpNvI4ilT4A-unsplash.jpg' },
  { id: 'shumilov', name: 'Hands', file: 'shumilov-ludmila-j7X_hySaUa4-unsplash.jpg' },
  { id: 'will-kennard', name: 'Vegetables', file: 'will-kennard--Dm5hKCohGU-unsplash.jpg' },
] as const

export type BackgroundId = (typeof BACKGROUNDS)[number]['id']

interface BackgroundContextType {
  background: BackgroundId
  setBackground: (bg: BackgroundId) => void
  backgrounds: typeof BACKGROUNDS
  backgroundUrl: string | null
  isAuthenticated: boolean
}

const BackgroundContext = createContext<BackgroundContextType | null>(null)

const STORAGE_KEY = 'foodbank-background'

export function BackgroundProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth0()
  const { currentUser, refetch } = useCurrentUser()
  const { fetchWithAuth } = useApi()

  const [background, setBackgroundState] = useState<BackgroundId>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored && BACKGROUNDS.some((b) => b.id === stored)) {
        return stored as BackgroundId
      }
    }
    return 'none'
  })

  // Sync from user profile on login
  useEffect(() => {
    if (currentUser?.background_image) {
      const userBg = currentUser.background_image as BackgroundId
      if (BACKGROUNDS.some((b) => b.id === userBg)) {
        setBackgroundState(userBg)
        localStorage.setItem(STORAGE_KEY, userBg)
      }
    }
  }, [currentUser?.background_image])

  const setBackground = useCallback(async (newBackground: BackgroundId) => {
    setBackgroundState(newBackground)
    localStorage.setItem(STORAGE_KEY, newBackground)

    // Sync to backend if authenticated
    if (isAuthenticated && currentUser) {
      try {
        await fetchWithAuth(`/api/staff/${currentUser.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: currentUser.name,
            email: currentUser.email,
            mobile: currentUser.mobile || null,
            address: currentUser.address || null,
            theme: currentUser.theme,
            background_image: newBackground,
          }),
        })
        refetch()
      } catch (err) {
        console.error('Failed to save background preference:', err)
      }
    }
  }, [isAuthenticated, currentUser, fetchWithAuth, refetch])

  const currentBg = BACKGROUNDS.find(b => b.id === background) || BACKGROUNDS[0]
  const backgroundUrl = currentBg.file ? `/backgrounds/${currentBg.file}` : null

  return (
    <BackgroundContext.Provider value={{
      background,
      setBackground,
      backgrounds: BACKGROUNDS,
      backgroundUrl,
      isAuthenticated
    }}>
      {children}
    </BackgroundContext.Provider>
  )
}

export function useBackground() {
  const context = useContext(BackgroundContext)
  if (!context) {
    throw new Error('useBackground must be used within a BackgroundProvider')
  }
  return context
}
