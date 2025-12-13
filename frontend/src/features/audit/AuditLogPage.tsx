import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useApi } from '../../hooks/useApi'
import { Skeleton } from '../../components/Skeleton'
import type { AuditLog, AuditLogListResponse } from './types'

function AuditTableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Action</th>
            <th>Record</th>
            <th>Changed By</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              <td><Skeleton className="h-5 w-32" /></td>
              <td><Skeleton className="h-5 w-16" /></td>
              <td><Skeleton className="h-5 w-28" /></td>
              <td><Skeleton className="h-5 w-24" /></td>
              <td><Skeleton className="h-5 w-20" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ActionBadge({ action }: { action: string }) {
  const colorMap: Record<string, string> = {
    INSERT: 'badge-success',
    UPDATE: 'badge-info',
    DELETE: 'badge-error',
  }
  return (
    <span className={`badge badge-sm ${colorMap[action] || 'badge-ghost'}`}>
      {action}
    </span>
  )
}

function ChangesModal({
  log,
  isOpen,
  onClose,
}: {
  log: AuditLog | null
  isOpen: boolean
  onClose: () => void
}) {
  if (!isOpen || !log) return null

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-'
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    return String(value)
  }

  const getChangedFields = () => {
    if (!log.old_values && !log.new_values) return []

    const oldVals = log.old_values || {}
    const newVals = log.new_values || {}
    const allKeys = new Set([...Object.keys(oldVals), ...Object.keys(newVals)])

    // Fields to skip in diff
    const skipFields = ['id', 'created_at', 'created_by', 'barcode_id']

    return Array.from(allKeys)
      .filter((key) => !skipFields.includes(key))
      .filter((key) => {
        if (log.action === 'INSERT') return true
        return JSON.stringify(oldVals[key]) !== JSON.stringify(newVals[key])
      })
      .map((key) => ({
        field: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        oldValue: formatValue(oldVals[key]),
        newValue: formatValue(newVals[key]),
      }))
  }

  const changes = getChangedFields()

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg mb-4">
          {log.action === 'INSERT' ? 'Created Record' : 'Changes'}
        </h3>

        {changes.length === 0 ? (
          <p className="text-base-content/60">No changes to display</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Field</th>
                  {log.action !== 'INSERT' && <th>Old Value</th>}
                  <th>{log.action === 'INSERT' ? 'Value' : 'New Value'}</th>
                </tr>
              </thead>
              <tbody>
                {changes.map((change) => (
                  <tr key={change.field}>
                    <td className="font-medium">{change.field}</td>
                    {log.action !== 'INSERT' && (
                      <td className="text-base-content/60">{change.oldValue}</td>
                    )}
                    <td>{change.newValue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="modal-action">
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  )
}

export default function AuditLogPage() {
  const { fetchWithAuth } = useApi()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [tableFilter, setTableFilter] = useState('')
  const limit = 20

  const loadLogs = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
      if (tableFilter) params.set('table', tableFilter)

      const data: AuditLogListResponse = await fetchWithAuth(`/api/audit?${params}`)
      setLogs(data.logs || [])
      setTotal(data.total)
    } catch (err) {
      console.error('Failed to load audit logs:', err)
    } finally {
      setIsLoading(false)
    }
  }, [fetchWithAuth, offset, tableFilter])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const totalPages = Math.ceil(total / limit)
  const currentPage = Math.floor(offset / limit) + 1

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Audit Log</h1>
          <p className="text-base-content/60 mt-1">Track all changes to client records</p>
        </div>
        <div className="flex gap-2">
          <select
            className="select select-bordered select-sm"
            value={tableFilter}
            onChange={(e) => {
              setTableFilter(e.target.value)
              setOffset(0)
            }}
          >
            <option value="">All Tables</option>
            <option value="clients">Clients</option>
          </select>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          {isLoading ? (
            <AuditTableSkeleton rows={10} />
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-base-content/50">
              No audit logs found.
            </div>
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="overflow-x-auto"
              >
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Action</th>
                      <th>Record</th>
                      <th>Changed By</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, index) => (
                      <motion.tr
                        key={log.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="hover"
                      >
                        <td className="text-sm">{formatDateTime(log.changed_at)}</td>
                        <td>
                          <ActionBadge action={log.action} />
                        </td>
                        <td>
                          <div className="flex flex-col">
                            {log.record_name ? (
                              <Link
                                to={`/clients/${log.record_id}`}
                                className="font-medium link link-hover"
                              >
                                {log.record_name}
                              </Link>
                            ) : (
                              <span className="text-base-content/60">
                                {log.table_name}
                              </span>
                            )}
                            <code className="text-xs text-base-content/40">
                              {log.record_id.slice(0, 8)}...
                            </code>
                          </div>
                        </td>
                        <td className="text-sm">
                          {log.changed_by_name || 'Unknown'}
                        </td>
                        <td>
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => setSelectedLog(log)}
                          >
                            View
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </motion.div>

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

      <ChangesModal
        log={selectedLog}
        isOpen={selectedLog !== null}
        onClose={() => setSelectedLog(null)}
      />
    </motion.div>
  )
}
