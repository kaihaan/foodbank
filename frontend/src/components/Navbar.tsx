import { Link } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { useBarcodeScanner } from '../hooks/useBarcodeScanner'

interface NavbarProps {
  onSettingsClick: () => void
  isSettingsOpen: boolean
}

export default function Navbar({ onSettingsClick, isSettingsOpen }: NavbarProps) {
  const { isAuthenticated, loginWithRedirect, logout, user } = useAuth0()
  const { scannerEnabled, setScannerEnabled, isProcessing, lastScan } = useBarcodeScanner()

  return (
    <div className="navbar bg-base-100 shadow-lg">
      <div className="flex-1">
        <Link to="/" className="btn btn-ghost text-xl">
          Finchley Foodbank
        </Link>
      </div>
      <div className="flex-none gap-2">
        {isAuthenticated ? (
          <>
            <Link to="/clients" className="btn btn-ghost">
              Clients
            </Link>
            <Link to="/scan" className="btn btn-ghost">
              Scan
            </Link>
            <Link to="/staff" className="btn btn-ghost">
              Staff
            </Link>
            {/* Scanner Status Indicator */}
            <div className="tooltip tooltip-bottom" data-tip={
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
            {/* Settings Toggle */}
            <button
              onClick={onSettingsClick}
              className={`btn btn-ghost btn-circle ${isSettingsOpen ? 'bg-base-200' : ''}`}
              aria-label="Toggle settings"
              aria-expanded={isSettingsOpen}
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
            </button>
            {/* User Avatar */}
            <div className="dropdown dropdown-end">
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
  )
}
