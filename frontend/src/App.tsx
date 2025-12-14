import { Routes, Route } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import Layout from './components/Layout'
import HomePage from './features/auth/HomePage'
import ClientsPage from './features/clients/ClientsPage'
import ClientCreatePage from './features/clients/ClientCreatePage'
import ClientDetailPage from './features/clients/ClientDetailPage'
import ClientEditPage from './features/clients/ClientEditPage'
import BarcodePrintPage from './features/clients/BarcodePrintPage'
import BarcodeScannerPage from './features/clients/BarcodeScannerPage'
import StaffPage from './features/staff/StaffPage'
import StaffDetailPage from './features/staff/StaffDetailPage'
import StaffCreatePage from './features/staff/StaffCreatePage'
import StaffEditPage from './features/staff/StaffEditPage'
import AuditLogPage from './features/audit/AuditLogPage'
import RegistrationRequestPage from './features/registration/RegistrationRequestPage'
import TokenActionPage from './features/registration/TokenActionPage'
import PendingApprovalsPage from './features/registration/PendingApprovalsPage'
import SettingsPage from './features/settings/SettingsPage'
import ImportPage from './features/import/ImportPage'
import ProtectedRoute from './features/auth/ProtectedRoute'

function App() {
  const { isLoading } = useAuth0()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        {/* Public registration routes */}
        <Route path="register" element={<RegistrationRequestPage />} />
        <Route path="registration/action/:token" element={<TokenActionPage />} />
        <Route
          path="clients"
          element={
            <ProtectedRoute>
              <ClientsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="clients/new"
          element={
            <ProtectedRoute>
              <ClientCreatePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="clients/:id"
          element={
            <ProtectedRoute>
              <ClientDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="clients/:id/edit"
          element={
            <ProtectedRoute>
              <ClientEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="clients/:id/print"
          element={
            <ProtectedRoute>
              <BarcodePrintPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="scan"
          element={
            <ProtectedRoute>
              <BarcodeScannerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="staff"
          element={
            <ProtectedRoute>
              <StaffPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="staff/new"
          element={
            <ProtectedRoute requireAdmin>
              <StaffCreatePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="staff/:id"
          element={
            <ProtectedRoute>
              <StaffDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="staff/:id/edit"
          element={
            <ProtectedRoute>
              <StaffEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="audit"
          element={
            <ProtectedRoute>
              <AuditLogPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="approvals"
          element={
            <ProtectedRoute requireAdmin>
              <PendingApprovalsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="import"
          element={
            <ProtectedRoute requireAdmin>
              <ImportPage />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  )
}

export default App
