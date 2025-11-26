"use client"

import { useState, useMemo, useEffect } from "react"
import { Eye, Play, Search } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Device as DBDevice } from "@/lib/types/database"
import { AddDeviceDialog } from "./add-device-dialog"

interface Device {
  id: number
  device_friendly_name: string
  device_serial: string
  status: 'online' | 'offline' | 'warning' | 'maintenance'
  group_name: string | null
}

const statusConfig = {
  online: { label: 'Online', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  offline: { label: 'Offline', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
  warning: { label: 'Warning', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  maintenance: { label: 'Maintenance', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
}

interface Group {
  id: number
  name: string
}

export function DeviceList() {
  const [devices, setDevices] = useState<Device[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [groupFilter, setGroupFilter] = useState<string>("all")

  useEffect(() => {
    fetchDevices()
    fetchGroups()
  }, [])

  async function fetchDevices() {
    try {
      setLoading(true)
      console.log("DEBUG::DeviceList", "Starting to fetch devices...")
      
      const { data, error } = await supabase
        .from('device')
        .select(`
          *,
          groups (
            name
          )
        `)
        .order('created_at', { ascending: false })

      console.log("DEBUG::DeviceList", "Supabase response:", { data, error })

      if (error) {
        console.log("DEBUG::DeviceList", "Error fetching devices:", error)
        throw error
      }

      console.log("DEBUG::DeviceList", `Received ${data?.length || 0} devices from database`)

      const mappedDevices: Device[] = (data || []).map((device: any) => ({
        id: device.id,
        device_friendly_name: device.friendly_name || 'Unknown Device',
        device_serial: device.serial || 'N/A',
        status: (device.status as Device['status']) || 'offline',
        group_name: device.groups?.name || null,
      }))

      console.log("DEBUG::DeviceList", "Mapped devices:", mappedDevices)
      setDevices(mappedDevices)
    } catch (err: any) {
      console.log("DEBUG::DeviceList", "Catch block error:", err)
      setError(err.message || 'Failed to fetch devices')
    } finally {
      setLoading(false)
    }
  }

  async function fetchGroups() {
    try {
      console.log("DEBUG::DeviceList", "Starting to fetch groups...")
      
      const { data, error } = await supabase
        .from('groups')
        .select('id, name')
        .order('name', { ascending: true })

      if (error) {
        console.log("DEBUG::DeviceList", "Error fetching groups:", error)
        throw error
      }

      console.log("DEBUG::DeviceList", `Received ${data?.length || 0} groups from database`)
      setGroups(data || [])
    } catch (err: any) {
      console.log("DEBUG::DeviceList", "Error fetching groups:", err)
    }
  }

  const filteredDevices = useMemo(() => {
    console.log("DEBUG::DeviceList", "Filtering devices:", {
      totalDevices: devices.length,
      searchTerm,
      statusFilter,
      groupFilter
    })
    
    const filtered = devices.filter((device) => {
      const matchesSearch = 
        device.device_friendly_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.device_serial.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === "all" || device.status === statusFilter
      
      const matchesGroup = groupFilter === "all" || device.group_name === groupFilter

      return matchesSearch && matchesStatus && matchesGroup
    })

    console.log("DEBUG::DeviceList", `Filtered to ${filtered.length} devices`)
    return filtered
  }, [devices, searchTerm, statusFilter, groupFilter])

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search devices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 text-sm"
          />
        </div>
        <div className="sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 text-sm bg-white"
          >
            <option value="all">All Status</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
            <option value="warning">Warning</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
        <div className="sm:w-48">
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 text-sm bg-white"
          >
            <option value="all">All Groups</option>
            {groups.map((group) => (
              <option key={group.id} value={group.name}>
                {group.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      <hr className="border-gray-300 mb-6" />
      
      <div className="mb-6 flex justify-end">
        <AddDeviceDialog groups={groups} onDeviceAdded={fetchDevices} />
      </div>

      {loading && (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading devices...</p>
        </div>
      )}

      {error && (
        <div className="text-center py-12">
          <p className="text-red-600">{error}</p>
          <button 
            onClick={fetchDevices}
            className="mt-4 px-4 py-2 text-sm text-white bg-gray-800 hover:bg-gray-700 rounded-md"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && filteredDevices.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600">No devices found</p>
        </div>
      )}
      
      {!loading && !error && filteredDevices.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDevices.map((device) => (
          <div
            key={device.id}
            className="bg-white/80 border border-gray-300 rounded-lg shadow-sm hover:shadow-md transition-all flex flex-col"
          >
            <div className="p-6 flex-1">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-base font-semibold text-gray-900">
                      {device.device_friendly_name}
                    </h3>
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                        statusConfig[device.status].color
                      }`}
                    >
                      {statusConfig[device.status].label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {device.device_serial}
                  </p>
                  {device.group_name && (
                    <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full border bg-gray-500/10 text-gray-700 border-gray-500/20">
                      {device.group_name}
                    </span>
                  )}
                </div>
                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-white font-bold flex-shrink-0 ml-3">
                  {device.device_friendly_name.charAt(0)}
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 p-4 bg-gray-50/50 rounded-b-lg">
              <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400 rounded-md transition-colors focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400">
                  <Eye className="w-4 h-4" />
                  View
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400 rounded-md transition-colors focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400">
                  <Play className="w-4 h-4" />
                  Stream
                </button>
              </div>
            </div>
          </div>
        ))}
        </div>
      )}
    </div>
  )
}

