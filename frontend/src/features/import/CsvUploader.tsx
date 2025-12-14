import { useCallback, useRef, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import Papa from 'papaparse'
import { ImportClientRow, ParsedCsvRow } from './types'

const API_URL = import.meta.env.VITE_API_URL || ''

const REQUIRED_COLUMNS = ['name', 'address', 'family_size']
const OPTIONAL_COLUMNS = [
  'num_children', 'children_ages', 'reason', 'appointment_day', 'appointment_time',
  'pref_gluten_free', 'pref_halal', 'pref_vegetarian', 'pref_no_cooking'
]
const ALL_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS]

interface CsvUploaderProps {
  onParsed: (rows: ImportClientRow[], fileName: string, fileSize: number) => void
}

export function CsvUploader({ onParsed }: CsvUploaderProps) {
  const { getAccessTokenSilently } = useAuth0()
  const [isDragging, setIsDragging] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parseBoolean = (value: string): boolean => {
    const v = value?.toLowerCase()?.trim()
    return v === 'true' || v === '1' || v === 'yes'
  }

  const convertToImportRow = (row: ParsedCsvRow, index: number): ImportClientRow => {
    return {
      row_number: index + 1,
      name: row.name?.trim() || '',
      address: row.address?.trim() || '',
      family_size: parseInt(row.family_size, 10) || 0,
      num_children: parseInt(row.num_children, 10) || 0,
      children_ages: row.children_ages?.trim() || undefined,
      reason: row.reason?.trim() || undefined,
      appointment_day: row.appointment_day?.trim() || undefined,
      appointment_time: row.appointment_time?.trim() || undefined,
      pref_gluten_free: parseBoolean(row.pref_gluten_free),
      pref_halal: parseBoolean(row.pref_halal),
      pref_vegetarian: parseBoolean(row.pref_vegetarian),
      pref_no_cooking: parseBoolean(row.pref_no_cooking),
    }
  }

  const validateHeaders = (headers: string[]): string | null => {
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim())
    const missingRequired = REQUIRED_COLUMNS.filter(col => !normalizedHeaders.includes(col))

    if (missingRequired.length > 0) {
      return `Missing required columns: ${missingRequired.join(', ')}`
    }

    const unknownCols = normalizedHeaders.filter(h => !ALL_COLUMNS.includes(h) && h !== '')
    if (unknownCols.length > 0) {
      return `Unknown columns: ${unknownCols.join(', ')}`
    }

    return null
  }

  const processFile = useCallback((file: File) => {
    setParseError(null)

    if (!file.name.endsWith('.csv')) {
      setParseError('Please upload a CSV file')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setParseError('File too large (max 10MB)')
      return
    }

    Papa.parse<ParsedCsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.toLowerCase().trim(),
      complete: (results) => {
        if (results.errors.length > 0) {
          const errorMsg = results.errors.slice(0, 3).map(e => e.message).join('; ')
          setParseError(`CSV parsing error: ${errorMsg}`)
          return
        }

        if (results.meta.fields) {
          const headerError = validateHeaders(results.meta.fields)
          if (headerError) {
            setParseError(headerError)
            return
          }
        }

        if (results.data.length === 0) {
          setParseError('CSV file contains no data rows')
          return
        }

        if (results.data.length > 10000) {
          setParseError('Too many rows (max 10,000)')
          return
        }

        const importRows = results.data.map((row, idx) => convertToImportRow(row, idx))
        onParsed(importRows, file.name, file.size)
      },
      error: (error) => {
        setParseError(`Failed to read file: ${error.message}`)
      }
    })
  }, [onParsed])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      processFile(file)
    }
  }, [processFile])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }, [processFile])

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const downloadTemplate = async () => {
    try {
      const token = await getAccessTokenSilently()
      const response = await fetch(`${API_URL}/api/admin/import/template`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!response.ok) throw new Error('Failed to download template')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'client-import-template.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download template:', err)
      setParseError('Failed to download template. Please try again.')
    }
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
          transition-all duration-200
          ${isDragging
            ? 'border-primary bg-primary/10'
            : 'border-base-300 hover:border-primary/50 hover:bg-base-200/50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-3">
          <svg
            className={`w-12 h-12 ${isDragging ? 'text-primary' : 'text-base-content/40'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <div>
            <p className="text-lg font-medium">Drop CSV file here or click to browse</p>
            <p className="text-sm text-base-content/60 mt-1">Max 10,000 rows, 10MB file size</p>
          </div>
        </div>
      </div>

      {parseError && (
        <div className="alert alert-error">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{parseError}</span>
        </div>
      )}

      <div className="flex justify-center">
        <button
          onClick={downloadTemplate}
          className="btn btn-ghost btn-sm gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Template CSV
        </button>
      </div>
    </div>
  )
}
