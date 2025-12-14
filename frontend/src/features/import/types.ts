// Client row from CSV
export interface ImportClientRow {
  row_number: number
  name: string
  address: string
  family_size: number
  num_children: number
  children_ages?: string
  reason?: string
  appointment_day?: string
  appointment_time?: string
  pref_gluten_free: boolean
  pref_halal: boolean
  pref_vegetarian: boolean
  pref_no_cooking: boolean
}

// Validation error for a specific field
export interface ValidationError {
  row: number
  field: string
  message: string
  value?: string
}

// Validation warning (e.g., potential duplicate)
export interface ValidationWarning {
  row: number
  field: string
  message: string
  existing_id?: string
}

// Result of validation
export interface ValidationResult {
  valid: boolean
  total_rows: number
  valid_rows: number
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

// Request to validate clients
export interface ValidateRequest {
  clients: ImportClientRow[]
}

// Request to import clients
export interface ImportRequest {
  clients: ImportClientRow[]
  skip_duplicates: boolean
  batch_size: number
}

// Successfully imported client
export interface ImportedClient {
  row: number
  id: string
  barcode_id: string
  name: string
}

// Result of a single batch
export interface BatchResult {
  batch: number
  start: number
  end: number
  success: number
  failed: number
  skipped: number
  error?: string
}

// Complete import result
export interface ImportResult {
  success: boolean
  total: number
  imported: number
  skipped: number
  failed: number
  results: BatchResult[]
  imported_clients?: ImportedClient[]
}

// Import workflow state
export type ImportStep = 'upload' | 'preview' | 'validating' | 'validated' | 'importing' | 'complete'

// Parsed CSV row (before converting to ImportClientRow)
export interface ParsedCsvRow {
  name: string
  address: string
  family_size: string
  num_children: string
  children_ages: string
  reason: string
  appointment_day: string
  appointment_time: string
  pref_gluten_free: string
  pref_halal: string
  pref_vegetarian: string
  pref_no_cooking: string
}
