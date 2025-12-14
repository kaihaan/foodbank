import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useApi } from '../../hooks/useApi'
import { useToast } from '../../hooks/useToast'
import { ClientTableSkeleton } from '../../components/Skeleton'
import { downloadCSV } from '../../lib/csv'
import type { Client, ClientListResponse } from './types'

export default function ClientsPage() {
  const { fetchWithAuth } = useApi()
  const toast = useToast()
  const [clients, setClients] = useState<Client[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [offset, setOffset] = useState(0)
  const [isExporting, setIsExporting] = useState(false)
  const limit = 20

  const loadClients = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
      if (searchQuery) params.set('q', searchQuery)

      const data: ClientListResponse = await fetchWithAuth(`/api/clients?${params}`)
      setClients(data.clients)
      setTotal(data.total)
    } catch (err) {
      console.error('Failed to load clients:', err)
    } finally {
      setIsLoading(false)
    }
  }, [fetchWithAuth, searchQuery, offset])

  useEffect(() => {
    loadClients()
  }, [loadClients])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setOffset(0)
    loadClients()
  }

  const handleRecordAttendance = async (clientId: string, clientName: string) => {
    try {
      await fetchWithAuth(`/api/clients/${clientId}/attendance`, {
        method: 'POST',
      })
      toast.success(`${clientName} checked in`)
      loadClients()
    } catch (err) {
      console.error('Failed to record attendance:', err)
      toast.error('Failed to record attendance')
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      // Fetch all clients for export (up to 10000)
      const data: ClientListResponse = await fetchWithAuth('/api/clients?limit=10000&offset=0')

      if (!data.clients || data.clients.length === 0) {
        toast.info('No clients to export')
        return
      }

      const columns: { key: keyof Client; label: string }[] = [
        { key: 'barcode_id', label: 'Barcode' },
        { key: 'name', label: 'Name' },
        { key: 'address', label: 'Address' },
        { key: 'family_size', label: 'Family Size' },
        { key: 'num_children', label: 'Children' },
        { key: 'children_ages', label: 'Children Ages' },
        { key: 'appointment_day', label: 'Appointment Day' },
        { key: 'appointment_time', label: 'Appointment Time' },
        { key: 'pref_halal', label: 'Halal' },
        { key: 'pref_vegetarian', label: 'Vegetarian' },
        { key: 'pref_gluten_free', label: 'Gluten Free' },
        { key: 'pref_no_cooking', label: 'No Cooking' },
        { key: 'reason', label: 'Reason' },
        { key: 'created_at', label: 'Registered' },
      ]

      const filename = `foodbank-clients-${new Date().toISOString().split('T')[0]}`
      downloadCSV(data.clients, filename, columns)
      toast.success(`Exported ${data.clients.length} clients`)
    } catch (err) {
      console.error('Failed to export clients:', err)
      toast.error('Failed to export clients')
    } finally {
      setIsExporting(false)
    }
  }

  const formatPreferences = (client: Client) => {
    const prefs = []
    if (client.pref_halal) prefs.push('Halal')
    if (client.pref_vegetarian) prefs.push('Veg')
    if (client.pref_gluten_free) prefs.push('GF')
    if (client.pref_no_cooking) prefs.push('No Cook')
    return prefs.length > 0 ? prefs.join(', ') : '-'
  }

  const totalPages = Math.ceil(total / limit)
  const currentPage = Math.floor(offset / limit) + 1

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Clients</h1>
        <div className="flex gap-2">
          <button
            className="hidden md:inline-flex btn btn-outline"
            onClick={handleExport}
            disabled={isExporting || total === 0}
          >
            {isExporting ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                />
              </svg>
            )}
            Export CSV
          </button>
          <Link to="/clients/new" className="btn btn-primary">
            Register New Client
          </Link>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <form onSubmit={handleSearch} className="form-control">
            <div className="input-group flex gap-2">
              <input
                type="text"
                placeholder="Search by name, address, or barcode..."
                className="input input-bordered flex-1"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="btn btn-primary">
                Search
              </button>
            </div>
          </form>

          {isLoading ? (
            <div className="mt-4">
              <ClientTableSkeleton rows={5} />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto mt-4">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="hidden md:table-cell">Barcode</th>
                      <th>Name</th>
                      <th className="hidden md:table-cell">Address</th>
                      <th className="hidden md:table-cell">Family</th>
                      <th className="hidden md:table-cell">Preferences</th>
                      <th className="hidden md:table-cell">Appointment</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-base-content/50">
                          {searchQuery
                            ? 'No clients found matching your search.'
                            : 'No clients registered yet. Click "Register New Client" to add one.'}
                        </td>
                      </tr>
                    ) : (
                      clients.map((client) => (
                        <tr key={client.id} className="hover">
                          <td className="hidden md:table-cell">
                            <code className="text-xs bg-base-200 px-2 py-1 rounded">
                              {client.barcode_id}
                            </code>
                          </td>
                          <td className="font-medium">{client.name}</td>
                          <td className="hidden md:table-cell max-w-xs truncate">{client.address}</td>
                          <td className="hidden md:table-cell">
                            {client.family_size}
                            {client.num_children > 0 && (
                              <span className="text-xs text-base-content/60 ml-1">
                                ({client.num_children} children)
                              </span>
                            )}
                          </td>
                          <td className="hidden md:table-cell text-sm">{formatPreferences(client)}</td>
                          <td className="hidden md:table-cell">
                            {client.appointment_day ? (
                              <span>
                                {client.appointment_day}
                                {client.appointment_time && ` ${client.appointment_time}`}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td>
                            <div className="flex gap-1">
                              <Link
                                to={`/clients/${client.id}`}
                                className="btn btn-ghost btn-xs"
                              >
                                View
                              </Link>
                              <Link
                                to={`/clients/${client.id}/edit`}
                                className="btn btn-ghost btn-xs"
                              >
                                Edit
                              </Link>
                              <button
                                className="btn btn-success btn-xs"
                                onClick={() => handleRecordAttendance(client.id, client.name)}
                              >
                                Check In
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center mt-4">
                  <div className="join">
                    <button
                      className="join-item btn btn-sm"
                      disabled={currentPage === 1}
                      onClick={() => setOffset(Math.max(0, offset - limit))}
                    >
                      Previous
                    </button>
                    <button className="join-item btn btn-sm">
                      Page {currentPage} of {totalPages}
                    </button>
                    <button
                      className="join-item btn btn-sm"
                      disabled={currentPage === totalPages}
                      onClick={() => setOffset(offset + limit)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

    </motion.div>
  )
}
