/**
 * Converts an array of objects to CSV format and triggers download
 */
export function downloadCSV<T extends object>(
  data: T[],
  filename: string,
  columns: { key: keyof T; label: string }[]
): void {
  if (data.length === 0) {
    return
  }

  // Build header row
  const header = columns.map((col) => escapeCSV(col.label)).join(',')

  // Build data rows
  const rows = data.map((item) =>
    columns
      .map((col) => {
        const value = (item as Record<string, unknown>)[col.key as string]
        return escapeCSV(formatValue(value))
      })
      .join(',')
  )

  // Combine into CSV content
  const csvContent = [header, ...rows].join('\n')

  // Create blob and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Escapes a value for CSV format
 */
function escapeCSV(value: string): string {
  // If value contains comma, newline, or quotes, wrap in quotes and escape existing quotes
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Formats a value for CSV output
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }
  if (value instanceof Date) {
    return value.toISOString()
  }
  return String(value)
}
