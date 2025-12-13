export interface Client {
  id: string
  barcode_id: string
  name: string
  address: string
  family_size: number
  num_children: number
  children_ages?: string
  reason?: string
  photo_url?: string
  appointment_day?: string
  appointment_time?: string
  pref_gluten_free: boolean
  pref_halal: boolean
  pref_vegetarian: boolean
  pref_no_cooking: boolean
  created_at: string
  created_by: string
}

export interface CreateClientRequest {
  name: string
  address: string
  family_size: number
  num_children: number
  children_ages?: string
  reason?: string
  photo_url?: string
  appointment_day?: string
  appointment_time?: string
  pref_gluten_free: boolean
  pref_halal: boolean
  pref_vegetarian: boolean
  pref_no_cooking: boolean
}

export interface ClientListResponse {
  clients: Client[]
  total: number
  limit: number
  offset: number
}

export interface Attendance {
  id: string
  client_id: string
  verified_by: string
  verified_at: string
  client_name?: string
  verified_by_name?: string
}
