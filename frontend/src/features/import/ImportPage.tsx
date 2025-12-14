import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useApi } from '../../hooks/useApi'
import { useToast } from '../../hooks/useToast'
import { CsvUploader } from './CsvUploader'
import { ValidationReport } from './ValidationReport'
import type {
  ImportClientRow,
  ImportStep,
  ValidationResult,
  ImportResult,
  BatchResult,
} from './types'

const API_URL = import.meta.env.VITE_API_URL || ''

export default function ImportPage() {
  const { fetchWithAuth } = useApi()
  const toast = useToast()

  // Workflow state
  const [step, setStep] = useState<ImportStep>('upload')
  const [parsedRows, setParsedRows] = useState<ImportClientRow[]>([])
  const [fileName, setFileName] = useState('')
  const [fileSize, setFileSize] = useState(0)

  // Validation state
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [skipDuplicates, setSkipDuplicates] = useState(true)

  // Import state
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [currentBatch, setCurrentBatch] = useState(0)
  const [totalBatches, setTotalBatches] = useState(0)

  const handleParsed = useCallback((rows: ImportClientRow[], name: string, size: number) => {
    setParsedRows(rows)
    setFileName(name)
    setFileSize(size)
    setStep('preview')
  }, [])

  const handleValidate = async () => {
    setStep('validating')

    try {
      const result: ValidationResult = await fetchWithAuth(`${API_URL}/api/admin/import/validate`, {
        method: 'POST',
        body: JSON.stringify({ clients: parsedRows }),
      })

      setValidationResult(result)
      setStep('validated')
    } catch (err) {
      console.error('Validation failed:', err)
      toast.error('Validation failed. Please try again.')
      setStep('preview')
    }
  }

  const handleImport = async () => {
    if (!validationResult) return

    const rowsToImport = validationResult.errors.length > 0
      ? parsedRows.filter((_, idx) => !validationResult.errors.some(e => e.row === idx + 1))
      : parsedRows

    if (rowsToImport.length === 0) {
      toast.error('No valid rows to import')
      return
    }

    setStep('importing')
    const batchSize = 50
    setTotalBatches(Math.ceil(rowsToImport.length / batchSize))
    setCurrentBatch(0)

    try {
      const result: ImportResult = await fetchWithAuth(`${API_URL}/api/admin/import/clients`, {
        method: 'POST',
        body: JSON.stringify({
          clients: rowsToImport,
          skip_duplicates: skipDuplicates,
          batch_size: batchSize,
        }),
      })

      setImportResult(result)
      setStep('complete')

      if (result.success) {
        toast.success(`Successfully imported ${result.imported} clients`)
      } else {
        toast.error(`Import completed with ${result.failed} failures`)
      }
    } catch (err) {
      console.error('Import failed:', err)
      toast.error('Import failed. Please try again.')
      setStep('validated')
    }
  }

  const handleReset = () => {
    setStep('upload')
    setParsedRows([])
    setFileName('')
    setFileSize(0)
    setValidationResult(null)
    setImportResult(null)
    setCurrentBatch(0)
    setTotalBatches(0)
    setSkipDuplicates(true)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getImportableCount = () => {
    if (!validationResult) return parsedRows.length
    const errorRows = new Set(validationResult.errors.map(e => e.row))
    return parsedRows.filter((_, idx) => !errorRows.has(idx + 1)).length
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Import Clients</h1>
          <p className="text-base-content/60 mt-1">Bulk import client records from a CSV file</p>
        </div>
        {step !== 'upload' && step !== 'complete' && (
          <button className="btn btn-ghost" onClick={handleReset}>
            Start Over
          </button>
        )}
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          {/* Step indicator */}
          <ul className="steps w-full mb-8">
            <li className={`step ${step !== 'upload' ? 'step-primary' : ''}`}>Upload</li>
            <li className={`step ${['validating', 'validated', 'importing', 'complete'].includes(step) ? 'step-primary' : ''}`}>Validate</li>
            <li className={`step ${['importing', 'complete'].includes(step) ? 'step-primary' : ''}`}>Import</li>
            <li className={`step ${step === 'complete' ? 'step-primary' : ''}`}>Complete</li>
          </ul>

          {/* Upload step */}
          {step === 'upload' && (
            <CsvUploader onParsed={handleParsed} />
          )}

          {/* Preview step */}
          {step === 'preview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-base-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div>
                    <p className="font-medium">{fileName}</p>
                    <p className="text-sm text-base-content/60">
                      {parsedRows.length} rows &bull; {formatFileSize(fileSize)}
                    </p>
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={handleReset}>
                  Change File
                </button>
              </div>

              {/* Preview table */}
              <div>
                <h3 className="font-semibold mb-2">Preview (first 5 rows)</h3>
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>Address</th>
                        <th>Family Size</th>
                        <th>Children</th>
                        <th>Appointment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.slice(0, 5).map((row) => (
                        <tr key={row.row_number}>
                          <td className="text-base-content/50">{row.row_number}</td>
                          <td className="font-medium">{row.name}</td>
                          <td className="max-w-xs truncate">{row.address}</td>
                          <td>{row.family_size}</td>
                          <td>{row.num_children}</td>
                          <td>
                            {row.appointment_day
                              ? `${row.appointment_day}${row.appointment_time ? ` ${row.appointment_time}` : ''}`
                              : '-'
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedRows.length > 5 && (
                  <p className="text-sm text-base-content/60 mt-2">
                    ...and {parsedRows.length - 5} more rows
                  </p>
                )}
              </div>

              <div className="flex justify-end">
                <button className="btn btn-primary" onClick={handleValidate}>
                  Validate Data
                </button>
              </div>
            </div>
          )}

          {/* Validating step */}
          {step === 'validating' && (
            <div className="text-center py-12">
              <progress className="progress progress-primary w-64 mx-auto"></progress>
              <p className="mt-4 text-base-content/60">Validating {parsedRows.length} rows...</p>
            </div>
          )}

          {/* Validated step */}
          {step === 'validated' && validationResult && (
            <div className="space-y-6">
              <ValidationReport
                result={validationResult}
                skipDuplicates={skipDuplicates}
                onSkipDuplicatesChange={setSkipDuplicates}
              />

              <div className="flex justify-between items-center pt-4 border-t border-base-200">
                <button className="btn btn-ghost" onClick={handleReset}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleImport}
                  disabled={validationResult.errors.length > 0 && getImportableCount() === 0}
                >
                  Import {getImportableCount()} Client{getImportableCount() !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          )}

          {/* Importing step */}
          {step === 'importing' && (
            <div className="text-center py-12">
              <p className="text-lg font-medium mb-4">
                Importing... Batch {currentBatch + 1} of {totalBatches || '?'}
              </p>
              <progress
                className="progress progress-primary w-64 mx-auto"
                value={totalBatches > 0 ? ((currentBatch + 1) / totalBatches) * 100 : undefined}
                max="100"
              ></progress>
              <p className="mt-4 text-base-content/60">
                Please wait, this may take a moment for large imports...
              </p>
            </div>
          )}

          {/* Complete step */}
          {step === 'complete' && importResult && (
            <div className="space-y-6">
              <div className={`text-center py-8 rounded-lg ${importResult.success ? 'bg-success/10' : 'bg-warning/10'}`}>
                {importResult.success ? (
                  <svg className="w-16 h-16 text-success mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-16 h-16 text-warning mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
                <h2 className="text-2xl font-bold mb-2">
                  {importResult.success ? 'Import Complete' : 'Import Completed with Issues'}
                </h2>
                <p className="text-lg text-base-content/80">
                  {importResult.imported} client{importResult.imported !== 1 ? 's' : ''} imported successfully
                </p>
              </div>

              {/* Import summary */}
              <div className="stats stats-vertical md:stats-horizontal shadow w-full">
                <div className="stat">
                  <div className="stat-title">Total Processed</div>
                  <div className="stat-value">{importResult.total}</div>
                </div>
                <div className="stat">
                  <div className="stat-title">Imported</div>
                  <div className="stat-value text-success">{importResult.imported}</div>
                </div>
                <div className="stat">
                  <div className="stat-title">Skipped</div>
                  <div className="stat-value text-warning">{importResult.skipped}</div>
                </div>
                <div className="stat">
                  <div className="stat-title">Failed</div>
                  <div className="stat-value text-error">{importResult.failed}</div>
                </div>
              </div>

              {/* Batch details */}
              {importResult.results.length > 1 && (
                <div className="collapse collapse-arrow bg-base-200">
                  <input type="checkbox" />
                  <div className="collapse-title font-medium">
                    Batch Details ({importResult.results.length} batches)
                  </div>
                  <div className="collapse-content">
                    <div className="overflow-x-auto">
                      <table className="table table-sm">
                        <thead>
                          <tr>
                            <th>Batch</th>
                            <th>Rows</th>
                            <th>Success</th>
                            <th>Skipped</th>
                            <th>Failed</th>
                            <th>Error</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importResult.results.map((batch: BatchResult) => (
                            <tr key={batch.batch}>
                              <td>{batch.batch}</td>
                              <td>{batch.start}-{batch.end}</td>
                              <td className="text-success">{batch.success}</td>
                              <td className="text-warning">{batch.skipped}</td>
                              <td className="text-error">{batch.failed}</td>
                              <td className="text-error text-sm">{batch.error || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-center gap-4 pt-4">
                <Link to="/clients" className="btn btn-primary">
                  View Clients
                </Link>
                <button className="btn btn-ghost" onClick={handleReset}>
                  Import More
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
