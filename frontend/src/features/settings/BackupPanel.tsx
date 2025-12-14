import { useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { useToast } from '../../hooks/useToast'

export default function BackupPanel() {
  const { getAccessTokenSilently } = useAuth0()
  const toast = useToast()
  const [isDownloadingJson, setIsDownloadingJson] = useState(false)
  const [isDownloadingCsv, setIsDownloadingCsv] = useState(false)

  const downloadFile = async (format: 'json' | 'csv') => {
    const setLoading = format === 'json' ? setIsDownloadingJson : setIsDownloadingCsv
    setLoading(true)

    try {
      const token = await getAccessTokenSilently()
      const response = await fetch(`/api/admin/backup?format=${format}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(`Download failed: ${response.status} - ${text}`)
      }

      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `foodbank-backup.${format === 'csv' ? 'zip' : format}`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename=([^;]+)/)
        if (match) {
          filename = match[1].trim()
        }
      }

      // Download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success(`${format.toUpperCase()} backup downloaded successfully`)
    } catch (err) {
      console.error('Download failed:', err)
      toast.error(`Failed to download ${format.toUpperCase()} backup`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title text-lg mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
          </svg>
          Database Backup
        </h2>

        <p className="text-sm text-base-content/70 mb-4">
          Export database for disaster recovery or data review. JSON backups can be restored; CSV exports are for viewing data in spreadsheets.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* JSON Backup Button */}
          <button
            className="btn btn-primary flex-1"
            onClick={() => downloadFile('json')}
            disabled={isDownloadingJson || isDownloadingCsv}
          >
            {isDownloadingJson ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Downloading...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download JSON Backup
              </>
            )}
          </button>

          {/* CSV Export Button */}
          <button
            className="btn btn-outline flex-1"
            onClick={() => downloadFile('csv')}
            disabled={isDownloadingJson || isDownloadingCsv}
          >
            {isDownloadingCsv ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Downloading...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125" />
                </svg>
                Export to CSV
              </>
            )}
          </button>
        </div>

        <div className="mt-4 text-xs text-base-content/50 space-y-1">
          <p><strong>JSON:</strong> Full backup for disaster recovery. Can be restored via API.</p>
          <p><strong>CSV:</strong> ZIP file with spreadsheets for each table. Open in Excel or Google Sheets.</p>
        </div>
      </div>
    </div>
  )
}
