// Database types for Supabase tables

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      mvr_devices: {
        Row: {
          id: number
          created_at: string
          serial: string | null
          client_id: number | null
          friendly_name: string | null
          device_model: string | null
          protocol: string | null
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
          protocol?: string | null
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
          protocol?: string | null
          status?: DeviceStatus | null
          group_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'mvr_devices_group_id_fkey'
            columns: ['group_id']
            isOneToOne: false
            referencedRelation: 'mvr_device_groups'
            referencedColumns: ['id']
          },
        ]
      }
      mvr_device_groups: {
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
        Relationships: []
      }
      mvr_clips: {
        Row: {
          id: number
          created_at: string
          serial: string
          camera: number
          profile: number
          start_utc: number
          end_utc: number
          duration_seconds: number
          file_size: number
          storage_path: string
          signed_url: string | null
          signed_url_expires_at: string | null
          status: string
          progress_percent: number
          bytes_received: number
          error_message: string | null
        }
        Insert: {
          id?: number
          created_at?: string
          serial: string
          camera: number
          profile: number
          start_utc: number
          end_utc: number
          duration_seconds?: number
          file_size?: number
          storage_path: string
          signed_url?: string | null
          signed_url_expires_at?: string | null
          status?: string
          progress_percent?: number
          bytes_received?: number
          error_message?: string | null
        }
        Update: {
          id?: number
          created_at?: string
          serial?: string
          camera?: number
          profile?: number
          start_utc?: number
          end_utc?: number
          duration_seconds?: number
          file_size?: number
          storage_path?: string
          signed_url?: string | null
          signed_url_expires_at?: string | null
          status?: string
          progress_percent?: number
          bytes_received?: number
          error_message?: string | null
        }
        Relationships: []
      }
      mvr_unknown_devices: {
        Row: {
          id: number
          created_at: string
          serial: string | null
          device_model: string | null
        }
        Insert: {
          id?: number
          created_at?: string
          serial?: string | null
          device_model?: string | null
        }
        Update: {
          id?: number
          created_at?: string
          serial?: string | null
          device_model?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Device status enum
export type DeviceStatus = 'online' | 'offline' | 'sleep' | 'warning' | 'maintenance'

// Convenience types
export type Device = Database['public']['Tables']['mvr_devices']['Row']
export type DeviceInsert = Database['public']['Tables']['mvr_devices']['Insert']
export type DeviceUpdate = Database['public']['Tables']['mvr_devices']['Update']

export type Group = Database['public']['Tables']['mvr_device_groups']['Row']
export type GroupInsert = Database['public']['Tables']['mvr_device_groups']['Insert']
export type GroupUpdate = Database['public']['Tables']['mvr_device_groups']['Update']

export type UnknownDevice = Database['public']['Tables']['mvr_unknown_devices']['Row']
export type UnknownDeviceInsert = Database['public']['Tables']['mvr_unknown_devices']['Insert']

