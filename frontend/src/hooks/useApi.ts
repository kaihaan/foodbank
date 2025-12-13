import { useAuth0 } from '@auth0/auth0-react'
import { useCallback } from 'react'

export function useApi() {
  const { getAccessTokenSilently } = useAuth0()

  const fetchWithAuth = useCallback(
    async (url: string, options: RequestInit = {}) => {
      try {
        const token = await getAccessTokenSilently()

        // Debug: log token info (remove in production)
        console.log('Token preview:', token.substring(0, 50) + '...')

        const response = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          const text = await response.text()
          console.error('API error:', response.status, text)
          throw new Error(`API error: ${response.status} - ${text}`)
        }

        return response.json()
      } catch (err) {
        console.error('Fetch error:', err)
        throw err
      }
    },
    [getAccessTokenSilently]
  )

  return { fetchWithAuth }
}
