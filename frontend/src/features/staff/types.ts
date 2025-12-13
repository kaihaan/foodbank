export type StaffRole = 'admin' | 'staff'

export interface Staff {
  id: string
  auth0_id: string
  name: string
  email: string
  mobile?: string
  address?: string
  theme: string
  role: StaffRole
  is_active: boolean
  created_at: string
  created_by?: string
  deactivated_at?: string
  deactivated_by?: string
}

export interface InviteStaffRequest {
  name: string
  email: string
  role: StaffRole
  mobile?: string
  address?: string
}

export interface UpdateStaffRequest {
  name: string
  email: string
  mobile?: string
  address?: string
  theme: string
}

export interface UpdateRoleRequest {
  role: StaffRole
}

export interface MFAStatus {
  enrolled: boolean
  factors: string[]
}

export interface InviteStaffResponse {
  staff: Staff
  ticket_url: string
  message: string
}
