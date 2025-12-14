import { useAuth0 } from '@auth0/auth0-react'
import { ReactNode } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useCurrentUser } from '../../hooks/useCurrentUser'

interface ProtectedRouteProps {
  children: ReactNode
  requireAdmin?: boolean
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading: isAuthLoading, loginWithRedirect, logout } = useAuth0()
  const { isAdmin, isLoading: isUserLoading, registrationStatus } = useCurrentUser()

  if (isAuthLoading || (isAuthenticated && isUserLoading)) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  if (!isAuthenticated) {
    loginWithRedirect()
    return null
  }

  // Handle unregistered users
  if (registrationStatus === 'not_registered') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-[60vh] flex items-center justify-center"
      >
        <div className="text-center max-w-md">
          <div className="mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 mx-auto text-warning"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-4">Registration Required</h1>
          <p className="text-base-content/70 mb-6">
            Your account is not registered with the Finchley Foodbank system.
            Please submit a registration request to gain access.
          </p>
          <div className="flex flex-col gap-3">
            <Link to="/register" className="btn btn-primary">
              Request Access
            </Link>
            <button
              onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
              className="btn btn-ghost"
            >
              Sign Out
            </button>
          </div>
        </div>
      </motion.div>
    )
  }

  // Handle pending registration
  if (registrationStatus === 'pending') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-[60vh] flex items-center justify-center"
      >
        <div className="text-center max-w-md">
          <div className="mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 mx-auto text-info"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-4">Approval Pending</h1>
          <p className="text-base-content/70 mb-6">
            Your registration request is pending approval from an administrator.
            You will receive an email once your request has been processed.
          </p>
          <button
            onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
            className="btn btn-ghost"
          >
            Sign Out
          </button>
        </div>
      </motion.div>
    )
  }

  // Handle inactive accounts
  if (registrationStatus === 'inactive') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-[60vh] flex items-center justify-center"
      >
        <div className="text-center max-w-md">
          <div className="mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 mx-auto text-error"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-4">Account Deactivated</h1>
          <p className="text-base-content/70 mb-6">
            Your account has been deactivated. Please contact an administrator for assistance.
          </p>
          <button
            onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
            className="btn btn-ghost"
          >
            Sign Out
          </button>
        </div>
      </motion.div>
    )
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
