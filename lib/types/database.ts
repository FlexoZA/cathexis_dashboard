// Database types for Supabase tables

export interface Database {
  public: {
    Tables: {
      device: {
        Row: {
          id: number
          created_at: string
          serial: string | null
          client_id: number | null
          friendly_name: string | null
          device_model: string | null
          status: DeviceStatus | null
          group_id: number | null
        }
        Insert: {
          id?: number
          created_at?: string
          serial?: string | null
          client_id?: number | null
          friendly_name?: string | null
          device_model?: string | null
          status?: DeviceStatus | null
          group_id?: number | null
        }
        Update: {
          id?: number
          created_at?: string
          serial?: string | null
          client_id?: number | null
          friendly_name?: string | null
          device_model?: string | null
          status?: DeviceStatus | null
          group_id?: number | null
        }
      }
      groups: {
        Row: {
          id: number
          created_at: string
          name: string
          description: string | null
        }
        Insert: {
          id?: number
          created_at?: string
          name: string
          description?: string | null
        }
        Update: {
          id?: number
          created_at?: string
          name?: string
          description?: string | null
        }
      }
    }
  }
}

// Device status enum
export type DeviceStatus = 'online' | 'offline' | 'warning' | 'maintenance'

// Convenience types
export type Device = Database['public']['Tables']['device']['Row']
export type DeviceInsert = Database['public']['Tables']['device']['Insert']
export type DeviceUpdate = Database['public']['Tables']['device']['Update']

export type Group = Database['public']['Tables']['groups']['Row']
export type GroupInsert = Database['public']['Tables']['groups']['Insert']
export type GroupUpdate = Database['public']['Tables']['groups']['Update']

