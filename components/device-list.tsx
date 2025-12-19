"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { Eye, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { Device as DBDevice } from "@/lib/types/database"
import { AddDeviceDialog } from "./add-device-dialog"
import { LiveStreamDialog } from "./live-stream-dialog"

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
        .from('mvr_devices')
        .select(`
          *,
          mvr_device_groups (
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

      let onlineUnits: string[] = []

      try {
        const gatewayResponse = await fetch("/api/units", {
          cache: "no-store",
        })

        if (!gatewayResponse.ok) {
          throw new Error(`Gateway returned ${gatewayResponse.status}`)
        }

        const gatewayData = await gatewayResponse.json()
        onlineUnits = Array.isArray(gatewayData.units)
          ? gatewayData.units.map((unit: any) => String(unit))
          : []

        console.log("DEBUG::DeviceList", "Gateway online units:", onlineUnits)
      } catch (gatewayError) {
        console.log("DEBUG::DeviceList", "Error fetching gateway units:", gatewayError)
      }

      const mappedDevices: Device[] = (data || []).map((device: any) => {
        const serial = device.serial || ''
        const isOnline = onlineUnits.includes(serial)

        return {
          id: device.id,
          device_friendly_name: device.friendly_name || 'Unknown Device',
          device_serial: serial || 'N/A',
          status: isOnline ? 'online' : 'offline',
          group_name: device.mvr_device_groups?.name || null,
        }
      })

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
        .from('mvr_device_groups')
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
    <div className="w-full">
      <div className="mb-6 flex justify-end">
        <AddDeviceDialog groups={groups} onDeviceAdded={fetchDevices} />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder="Search devices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="sm:w-48">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:w-48">
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Groups" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.name}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading devices...</p>
        </div>
      )}

      {error && (
        <div className="text-center py-12">
          <p className="text-destructive">{error}</p>
          <Button 
            onClick={fetchDevices}
            className="mt-4"
          >
            Retry
          </Button>
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
                  <h3 className="text-base font-semibold text-gray-900 mb-1">
                    {device.device_friendly_name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {device.device_serial}
                  </p>
                  {device.group_name && (
                    <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full border bg-gray-500/10 text-gray-700 border-gray-500/20">
                      {device.group_name}
                    </span>
                  )}
                </div>
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ml-3 h-fit ${
                    statusConfig[device.status].color
                  }`}
                >
                  {statusConfig[device.status].label}
                </span>
              </div>
            </div>
            <div className="border-t border-gray-200 p-4 bg-gray-50/50 rounded-b-lg">
              <div className="flex gap-2">
                {device.status === 'offline' ? (
                  <Button variant="outline" className="flex-1" disabled>
                    <Eye className="w-4 h-4" />
                    View
                  </Button>
                ) : (
                  <Button variant="outline" className="flex-1" asChild>
                    <Link href={`/device/${device.id}`}>
                      <Eye className="w-4 h-4" />
                      View
                    </Link>
                  </Button>
                )}
                
                <LiveStreamDialog 
                  serial={device.device_serial}
                  deviceName={device.device_friendly_name}
                  disabled={device.status === 'offline'}
                />
              </div>
            </div>
          </div>
        ))}
        </div>
      )}
    </div>
  )
}

