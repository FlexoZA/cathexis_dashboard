"use client"

import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UnknownDevice } from "@/lib/types/database"

interface UnknownDevicesSidebarProps {
  unknownDevices: UnknownDevice[]
  unknownDevicesLoading: boolean
  onAddDevice: (device: UnknownDevice) => void
  onRejectDevice: (device: UnknownDevice) => Promise<void>
  rejectingDeviceId: number | null
}

export function UnknownDevicesSidebar({
  unknownDevices,
  unknownDevicesLoading,
  onAddDevice,
  onRejectDevice,
  rejectingDeviceId,
}: UnknownDevicesSidebarProps) {
  return (
    <aside className="bg-slate-50 border border-slate-200 rounded-lg shadow-sm flex flex-col max-h-none lg:fixed lg:left-0 lg:top-16 lg:w-[320px] lg:h-[calc(100vh-4rem)] lg:rounded-l-none">
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-lg font-semibold text-gray-900">Approve Devices</h2>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {unknownDevices.length}
          </span>
        </div>
        <p className="text-sm text-gray-500">
          Devices detected on the network but not yet registered.
        </p>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-3">
        {unknownDevicesLoading && (
          <p className="text-sm text-gray-600">Loading unknown devices...</p>
        )}

        {!unknownDevicesLoading && unknownDevices.length === 0 && (
          <p className="text-sm text-gray-600">No unknown devices found.</p>
        )}

        {!unknownDevicesLoading && unknownDevices.length > 0 && unknownDevices.map((device) => {
          const deviceWithActivity = device as UnknownDevice & {
            last_communication_at?: string | null
            updated_at?: string | null
          }
          const lastCommunicationRaw =
            deviceWithActivity.last_communication_at ||
            deviceWithActivity.updated_at ||
            device.created_at
          const lastCommunicationDate = lastCommunicationRaw ? new Date(lastCommunicationRaw) : null
          const hasValidLastCommunication =
            lastCommunicationDate !== null && !Number.isNaN(lastCommunicationDate.getTime())
          const isToday =
            hasValidLastCommunication &&
            lastCommunicationDate.toDateString() === new Date().toDateString()

          return (
            <div
              key={device.id}
              className="bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col"
            >
              <div className="p-4 flex-1">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 mb-1 break-words">
                      {device.serial || "Unknown Serial"}
                    </p>
                    {device.device_model && (
                      <p className="text-sm text-gray-500 break-words">{device.device_model}</p>
                    )}
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full border bg-slate-100 text-slate-700 border-slate-200 flex-shrink-0 h-fit">
                    Pending
                  </span>
                </div>

                <p className="text-xs text-gray-500">
                  Last communication:{" "}
                  <span className="font-medium text-gray-700">
                    {hasValidLastCommunication
                      ? isToday
                        ? "Today"
                        : lastCommunicationDate.toLocaleDateString()
                      : "Unknown"}
                  </span>
                </p>
              </div>
              <div className="border-t border-slate-200 p-3 bg-slate-50 rounded-b-lg">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                    onClick={() => onAddDevice(device)}
                    disabled={rejectingDeviceId === device.id}
                  >
                    <Plus className="w-4 h-4" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => {
                      void onRejectDevice(device)
                    }}
                    disabled={rejectingDeviceId === device.id}
                  >
                    {rejectingDeviceId === device.id ? "Rejecting..." : "Reject"}
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
