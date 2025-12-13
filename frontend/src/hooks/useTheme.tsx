import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

// DaisyUI themes - curated selection for foodbank use
const THEMES = [
  { id: 'light', name: 'Light', icon: '☀️' },
  { id: 'dark', name: 'Dark', icon: '🌙' },
  { id: 'cupcake', name: 'Cupcake', icon: '🧁' },
  { id: 'emerald', name: 'Emerald', icon: '💚' },
  { id: 'corporate', name: 'Corporate', icon: '🏢' },
  { id: 'retro', name: 'Retro', icon: '📺' },
  { id: 'valentine', name: 'Valentine', icon: '💕' },
  { id: 'garden', name: 'Garden', icon: '🌷' },
  { id: 'forest', name: 'Forest', icon: '🌲' },
  { id: 'pastel', name: 'Pastel', icon: '🎨' },
  { id: 'wireframe', name: 'Wireframe', icon: '📐' },
  { id: 'luxury', name: 'Luxury', icon: '💎' },
  { id: 'dracula', name: 'Dracula', icon: '🧛' },
  { id: 'autumn', name: 'Autumn', icon: '🍂' },
  { id: 'business', name: 'Business', icon: '💼' },
  { id: 'nord', name: 'Nord', icon: '❄️' },
] as const

export type ThemeId = (typeof THEMES)[number]['id']

interface ThemeContextType {
  theme: ThemeId
  setTheme: (theme: ThemeId) => void
  themes: typeof THEMES
}

const ThemeContext = createContext<ThemeContextType | null>(null)

const STORAGE_KEY = 'foodbank-theme'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored && THEMES.some((t) => t.id === stored)) {
        return stored as ThemeId
      }
    }
    return 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const setTheme = (newTheme: ThemeId) => {
    setThemeState(newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
