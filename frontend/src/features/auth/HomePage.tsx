import { useAuth0 } from '@auth0/auth0-react'
import { motion } from 'motion/react'
import DashboardPage from '../dashboard/DashboardPage'

export default function HomePage() {
  const { isAuthenticated, loginWithRedirect } = useAuth0()

  // Show Dashboard for authenticated users
  if (isAuthenticated) {
    return <DashboardPage />
  }

  // Show landing page for unauthenticated users
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="hero min-h-[60vh]"
    >
      <div className="hero-content text-center">
        <div className="max-w-md">
          <h1 className="text-5xl font-bold">Finchley Foodbank</h1>
          <p className="py-6">
            Client registration system for managing foodbank clients, appointments, and attendance.
          </p>
          <button className="btn btn-primary btn-lg" onClick={() => loginWithRedirect()}>
            Login to Get Started
          </button>
        </div>
      </div>
    </motion.div>
  )
}
