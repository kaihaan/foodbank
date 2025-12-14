import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import { useBackground } from '../hooks/useBackground'

export default function Layout() {
  const { backgroundUrl, isAuthenticated } = useBackground()

  return (
    <div className="min-h-screen relative">
      {/* Background layer */}
      {backgroundUrl ? (
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-20 transition-all duration-500"
          style={{
            backgroundImage: `url(${backgroundUrl})`,
            filter: isAuthenticated
              ? 'brightness(0.25) saturate(0.7)'
              : 'brightness(0.2) saturate(0.3)',
          }}
        />
      ) : (
        <div className="fixed inset-0 -z-20 bg-gradient-to-br from-base-200 to-base-300" />
      )}
      {/* Content */}
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
