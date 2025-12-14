import { ValidationResult, ValidationError, ValidationWarning } from './types'

interface ValidationReportProps {
  result: ValidationResult
  onSkipDuplicatesChange: (skip: boolean) => void
  skipDuplicates: boolean
}

export function ValidationReport({ result, onSkipDuplicatesChange, skipDuplicates }: ValidationReportProps) {
  const errorCount = result.errors.length
  const warningCount = result.warnings.length
  const validCount = result.valid_rows

  return (
    <div className="space-y-4">
      {/* Summary badges */}
      <div className="flex flex-wrap gap-3">
        <div className="badge badge-success gap-1 p-3">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {validCount} valid
        </div>
        {warningCount > 0 && (
          <div className="badge badge-warning gap-1 p-3">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {warningCount} warning{warningCount !== 1 ? 's' : ''}
          </div>
        )}
        {errorCount > 0 && (
          <div className="badge badge-error gap-1 p-3">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            {errorCount} error{errorCount !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Errors section */}
      {errorCount > 0 && (
        <div className="bg-error/10 rounded-lg p-4">
          <h4 className="font-semibold text-error mb-2">Errors (must be fixed)</h4>
          <ul className="space-y-1 text-sm">
            {result.errors.slice(0, 10).map((error: ValidationError, idx: number) => (
              <li key={idx} className="flex gap-2">
                <span className="text-error font-mono">Row {error.row}:</span>
                <span className="text-base-content/80">
                  {error.field} - {error.message}
                  {error.value && <span className="text-error/70"> (got: "{error.value}")</span>}
                </span>
              </li>
            ))}
            {errorCount > 10 && (
              <li className="text-error/70">...and {errorCount - 10} more errors</li>
            )}
          </ul>
        </div>
      )}

      {/* Warnings section */}
      {warningCount > 0 && (
        <div className="bg-warning/10 rounded-lg p-4">
          <h4 className="font-semibold text-warning mb-2">Warnings (potential duplicates)</h4>
          <ul className="space-y-1 text-sm">
            {result.warnings.slice(0, 10).map((warning: ValidationWarning, idx: number) => (
              <li key={idx} className="flex gap-2">
                <span className="text-warning font-mono">Row {warning.row}:</span>
                <span className="text-base-content/80">{warning.message}</span>
              </li>
            ))}
            {warningCount > 10 && (
              <li className="text-warning/70">...and {warningCount - 10} more warnings</li>
            )}
          </ul>

          {/* Skip duplicates toggle */}
          <div className="mt-4 pt-3 border-t border-warning/20">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={(e) => onSkipDuplicatesChange(e.target.checked)}
                className="checkbox checkbox-warning checkbox-sm"
              />
              <span className="text-sm">Skip duplicate entries during import</span>
            </label>
          </div>
        </div>
      )}

      {/* Success message when all valid */}
      {result.valid && errorCount === 0 && warningCount === 0 && (
        <div className="bg-success/10 rounded-lg p-4 text-center">
          <svg className="w-8 h-8 text-success mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-medium text-success">All {result.total_rows} rows are valid and ready to import</p>
        </div>
      )}
    </div>
  )
}
