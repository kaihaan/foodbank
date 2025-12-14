import { Link } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { useBarcodeScanner } from '../hooks/useBarcodeScanner'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { useState, useEffect } from 'react'
import { useApi } from '../hooks/useApi'

export default function Navbar() {
  const { isAuthenticated, loginWithRedirect, logout, user } = useAuth0()
  const { scannerEnabled, setScannerEnabled, isProcessing, lastScan } = useBarcodeScanner()
  const { isAdmin } = useCurrentUser()
  const { fetchWithAuth } = useApi()
  const [pendingCount, setPendingCount] = useState(0)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Fetch pending approvals count for admins
  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return

    const fetchCount = async () => {
      try {
        const data = await fetchWithAuth('/api/registration-requests/count')
        setPendingCount(data.count || 0)
      } catch {
        // Silently ignore errors
      }
    }

    fetchCount()
    // Refresh every 60 seconds
    const interval = setInterval(fetchCount, 60000)
    // Listen for approval events to refresh immediately
    window.addEventListener('registration-requests-changed', fetchCount)
    return () => {
      clearInterval(interval)
      window.removeEventListener('registration-requests-changed', fetchCount)
    }
  }, [isAuthenticated, isAdmin, fetchWithAuth])

  const closeDrawer = () => setIsDrawerOpen(false)

  const handleLogout = () => {
    closeDrawer()
    logout({ logoutParams: { returnTo: window.location.origin } })
  }

  return (
    <div className="drawer drawer-end">
      <input
        id="mobile-drawer"
        type="checkbox"
        className="drawer-toggle"
        checked={isDrawerOpen}
        onChange={(e) => setIsDrawerOpen(e.target.checked)}
      />

      {/* Main navbar content */}
      <div className="drawer-content">
        <div className="navbar bg-base-100 shadow-lg">
          <div className="flex-1">
            <Link to="/" className="btn btn-ghost text-xl">
              Finchley Foodbank
            </Link>
          </div>
          <div className="flex-none gap-2">
            {isAuthenticated ? (
              <>
                {/* Mobile: Burger Menu Button Only */}
                <label
                  htmlFor="mobile-drawer"
                  className="btn btn-ghost btn-circle md:hidden cursor-pointer"
                  aria-label="Open menu"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-6 h-6"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  </svg>
                  {/* Badge for pending approvals */}
                  {isAdmin && pendingCount > 0 && (
                    <span className="badge badge-error badge-xs absolute top-1 right-1">
                      {pendingCount}
                    </span>
                  )}
                </label>

                {/* Desktop Navigation Links */}
                <div className="hidden md:flex gap-2">
                  <Link to="/clients" className="btn btn-ghost">
                    Clients
                  </Link>
                  <Link to="/scan" className="btn btn-ghost">
                    Scan
                  </Link>
                  <Link to="/staff" className="btn btn-ghost">
                    Staff
                  </Link>
                  {/* Pending Approvals - Admin Only */}
                  {isAdmin && (
                    <Link to="/approvals" className="btn btn-ghost relative">
                      Approvals
                      {pendingCount > 0 && (
                        <span className="badge badge-error badge-sm absolute -top-1 -right-1">
                          {pendingCount}
                        </span>
                      )}
                    </Link>
                  )}
                  {/* Import - Admin Only */}
                  {isAdmin && (
                    <Link to="/import" className="btn btn-ghost">
                      Import
                    </Link>
                  )}
                </div>

                {/* Desktop: Scanner Status Indicator */}
                <div className="hidden md:block tooltip tooltip-bottom" data-tip={
                  !scannerEnabled
                    ? 'Hardware scanner disabled'
                    : isProcessing
                      ? 'Scanning...'
                      : lastScan
                        ? `Last scan: ${lastScan.clientName || lastScan.barcode}`
                        : 'Hardware scanner ready'
                }>
                  <button
                    onClick={() => setScannerEnabled(!scannerEnabled)}
                    className="btn btn-ghost btn-circle relative"
                    aria-label={scannerEnabled ? 'Disable hardware scanner' : 'Enable hardware scanner'}
                  >
                    {/* Barcode Scanner Icon */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className={`w-5 h-5 ${!scannerEnabled ? 'opacity-50' : ''}`}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
                    </svg>
                    {/* Status Dot */}
                    <span
                      className={`absolute top-1 right-1 w-2.5 h-2.5 rounded-full ${
                        !scannerEnabled
                          ? 'bg-base-content/30'
                          : isProcessing
                            ? 'bg-warning animate-pulse'
                            : 'bg-success animate-pulse'
                      }`}
                    />
                  </button>
                </div>

                {/* Desktop: Settings Link */}
                <Link
                  to="/settings"
                  className="hidden md:flex btn btn-ghost btn-circle"
                  aria-label="Settings"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </Link>

                {/* Desktop: User Avatar */}
                <div className="hidden md:block dropdown dropdown-end">
                  <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
                    <div className="w-10 rounded-full">
                      {user?.picture ? (
                        <img alt={user.name || 'User'} src={user.picture} />
                      ) : (
                        <div className="bg-primary text-primary-content flex items-center justify-center w-full h-full">
                          {user?.name?.charAt(0) || 'U'}
                        </div>
                      )}
                    </div>
                  </div>
                  <ul
                    tabIndex={0}
                    className="menu menu-sm dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-52 p-2 shadow"
                  >
                    <li className="menu-title">{user?.name}</li>
                    <li>
                      <button
                        onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                      >
                        Logout
                      </button>
                    </li>
                  </ul>
                </div>
              </>
            ) : (
              <button className="btn btn-primary" onClick={() => loginWithRedirect()}>
                Login
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Drawer Sidebar */}
      <div className="drawer-side z-50">
        <label htmlFor="mobile-drawer" aria-label="Close sidebar" className="drawer-overlay" />
        <div className="bg-base-100 min-h-full w-80 p-4 flex flex-col">
          {/* Close button */}
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-semibold">Menu</span>
            <button
              onClick={closeDrawer}
              className="btn btn-ghost btn-circle btn-sm"
              aria-label="Close menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* User greeting */}
          {user && (
            <div className="flex items-center gap-3 p-3 bg-base-200 rounded-lg mb-4">
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                {user.picture ? (
                  <img alt={user.name || 'User'} src={user.picture} className="w-full h-full object-cover" />
                ) : (
                  <div className="bg-primary text-primary-content flex items-center justify-center w-full h-full">
                    {user.name?.charAt(0) || 'U'}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate">{user.name}</p>
                <p className="text-xs text-base-content/60 truncate">{user.email}</p>
              </div>
            </div>
          )}

          {/* Navigation links */}
          <ul className="menu menu-lg gap-1 p-0 flex-1">
            <li>
              <Link to="/clients" onClick={closeDrawer}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
                Clients
              </Link>
            </li>
            <li>
              <Link to="/scan" onClick={closeDrawer}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
                </svg>
                Scan
              </Link>
            </li>
            <li>
              <Link to="/staff" onClick={closeDrawer}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                Staff
              </Link>
            </li>
            {isAdmin && (
              <li>
                <Link to="/approvals" onClick={closeDrawer} className="justify-between">
                  <span className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Approvals
                  </span>
                  {pendingCount > 0 && (
                    <span className="badge badge-error badge-sm">{pendingCount}</span>
                  )}
                </Link>
              </li>
            )}
            {isAdmin && (
              <li>
                <Link to="/import" onClick={closeDrawer}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  Import Clients
                </Link>
              </li>
            )}

            <li className="menu-title mt-4">
              <span>Tools</span>
            </li>

            {/* Scanner toggle in drawer */}
            <li>
              <button
                onClick={() => setScannerEnabled(!scannerEnabled)}
                className="justify-between"
              >
                <span className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${!scannerEnabled ? 'opacity-50' : ''}`}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
                  </svg>
                  Hardware Scanner
                </span>
                <span className={`badge ${scannerEnabled ? 'badge-success' : 'badge-ghost'}`}>
                  {scannerEnabled ? 'ON' : 'OFF'}
                </span>
              </button>
            </li>

            <li>
              <Link to="/settings" onClick={closeDrawer}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </Link>
            </li>
          </ul>

          {/* Logout button at bottom */}
          <div className="pt-4 border-t border-base-300">
            <button
              onClick={handleLogout}
              className="btn btn-outline btn-error w-full"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
