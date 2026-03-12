"use client"

import { useState, useMemo, useEffect, useRef } from "react"
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
import { UnknownDevice } from "@/lib/types/database"
import { AddDeviceDialog } from "./add-device-dialog"
import { AddGroupDialog } from "./add-group-dialog"
import { LiveStreamDialog } from "./live-stream-dialog"
import { UnknownDevicesSidebar } from "./unknown-devices-sidebar"
import { NotificationsSidebar } from "./notifications-sidebar"
import { useNotifications } from "./notifications-provider"

interface Device {
  id: number
  device_friendly_name: string
  device_serial: string
  device_model: string | null
  protocol: string | null
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
  const { addNotification } = useNotifications()
  const [devices, setDevices] = useState<Device[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [groupFilter, setGroupFilter] = useState<string>("all")
  const [unknownDevices, setUnknownDevices] = useState<UnknownDevice[]>([])
  const [unknownDevicesLoading, setUnknownDevicesLoading] = useState(true)
  const [unknownDialogOpen, setUnknownDialogOpen] = useState(false)
  const [selectedUnknownDevice, setSelectedUnknownDevice] = useState<UnknownDevice | null>(null)
  const [rejectingUnknownDeviceId, setRejectingUnknownDeviceId] = useState<number | null>(null)
  const hasFetchedDevicesRef = useRef(false)
  const previousDeviceStatusRef = useRef<Record<number, Device["status"]>>({})

  useEffect(() => {
    fetchDevices()
    fetchGroups()
    fetchUnknownDevices()

    const unknownDevicesChannel = supabase
      .channel('mvr_unknown_devices_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mvr_unknown_devices' }, () => {
        fetchUnknownDevices()
      })
      .subscribe()

    const devicesChannel = supabase
      .channel('mvr_devices_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mvr_devices' }, () => {
        fetchDevices()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(unknownDevicesChannel)
      supabase.removeChannel(devicesChannel)
    }
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

      const mappedDevices: Device[] = (data || []).map((device: any) => {
        const serial = device.serial || ''
        const rawStatus = device.status
        const status =
          rawStatus === 'online' ||
          rawStatus === 'offline' ||
          rawStatus === 'warning' ||
          rawStatus === 'maintenance'
            ? rawStatus
            : 'offline'

        return {
          id: device.id,
          device_friendly_name: device.friendly_name || 'Unknown Device',
          device_serial: serial || 'N/A',
          device_model: device.device_model || null,
          protocol: device.protocol || null,
          status,
          group_name: device.mvr_device_groups?.name || null,
        }
      })

      if (hasFetchedDevicesRef.current) {
        mappedDevices.forEach((device) => {
          const previousStatus = previousDeviceStatusRef.current[device.id]
          const statusChanged = previousStatus !== undefined && previousStatus !== device.status
          const isOnlineOfflineEvent = device.status === "online" || device.status === "offline"

          if (statusChanged && isOnlineOfflineEvent) {
            const stateLabel = device.status === "online" ? "online" : "offline"
            addNotification("Device Status Update", `${device.device_friendly_name} is now ${stateLabel}.`)
          }
        })
      }

      previousDeviceStatusRef.current = mappedDevices.reduce<Record<number, Device["status"]>>((acc, device) => {
        acc[device.id] = device.status
        return acc
      }, {})
      hasFetchedDevicesRef.current = true

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

  async function fetchUnknownDevices() {
    try {
      setUnknownDevicesLoading(true)
      console.log("DEBUG::DeviceList", "Starting to fetch unknown devices...")

      const { data, error } = await supabase
        .from('mvr_unknown_devices')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.log("DEBUG::DeviceList", "Error fetching unknown devices:", error)
        throw error
      }

      console.log("DEBUG::DeviceList", `Received ${data?.length || 0} unknown devices from database`)
      setUnknownDevices(data || [])
    } catch (err: any) {
      console.log("DEBUG::DeviceList", "Error fetching unknown devices:", err)
    } finally {
      setUnknownDevicesLoading(false)
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
    <div className="w-full px-4 py-6 lg:pl-[360px] lg:pr-[360px]">
      <UnknownDevicesSidebar
        unknownDevices={unknownDevices}
        unknownDevicesLoading={unknownDevicesLoading}
        onAddDevice={(device) => {
          setSelectedUnknownDevice(device)
          setUnknownDialogOpen(true)
        }}
        onRejectDevice={async (device) => {
          try {
            setRejectingUnknownDeviceId(device.id)
            console.log("DEBUG::DeviceList", "Rejecting unknown device:", device.id)

            const { error: deleteError } = await supabase
              .from("mvr_unknown_devices")
              .delete()
              .eq("id", device.id)

            if (deleteError) {
              throw deleteError
            }

            if (selectedUnknownDevice?.id === device.id) {
              setUnknownDialogOpen(false)
              setSelectedUnknownDevice(null)
            }

            await fetchUnknownDevices()
          } catch (rejectError) {
            console.log("DEBUG::DeviceList", "Error rejecting unknown device:", rejectError)
          } finally {
            setRejectingUnknownDeviceId(null)
          }
        }}
        rejectingDeviceId={rejectingUnknownDeviceId}
      />

      <NotificationsSidebar />

      <section className="min-w-0 max-w-7xl mx-auto">
          <div className="mb-6 flex justify-end gap-3">
            <AddGroupDialog onGroupAdded={fetchGroups} />
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredDevices.map((device) => (
              <div
                key={device.id}
                className="bg-white border border-gray-300 rounded-lg shadow-sm hover:shadow-md transition-all flex flex-col"
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
                <div className="border-t border-gray-200 p-4 bg-white rounded-b-lg">
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
                      deviceModel={device.device_model}
                      protocol={device.protocol}
                      disabled={device.status === 'offline'}
                    />
                  </div>
                </div>
              </div>
            ))}
            </div>
          )}
      </section>

      <AddDeviceDialog
        groups={groups}
        onDeviceAdded={fetchDevices}
        prefillData={selectedUnknownDevice ? {
          serial: selectedUnknownDevice.serial || '',
          device_model: selectedUnknownDevice.device_model || '',
        } : undefined}
        unknownDeviceId={selectedUnknownDevice?.id}
        onUnknownDeviceLinked={fetchUnknownDevices}
        open={unknownDialogOpen}
        onOpenChange={(open) => {
          setUnknownDialogOpen(open)
          if (!open) setSelectedUnknownDevice(null)
        }}
      />
    </div>
  )
}

