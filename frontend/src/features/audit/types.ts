export interface AuditLog {
  id: string
  table_name: string
  record_id: string
  action: string
  old_values?: Record<string, unknown>
  new_values?: Record<string, unknown>
  changed_by: string
  changed_at: string
  changed_by_name?: string
  record_name?: string
}

export interface AuditLogListResponse {
  logs: AuditLog[]
  total: number
  limit: number
  offset: number
}
