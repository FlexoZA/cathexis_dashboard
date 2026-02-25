"use client"

import { RefreshCw, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DeviceBreadcrumb } from "@/components/device-breadcrumb"

interface ConfigShellProps {
  deviceId: number
  deviceName: string
  serial: string
  hasChanges: boolean
  saving: boolean
  onReset: () => void
  children: React.ReactNode
}

export function ConfigShell({
  deviceId,
  deviceName,
  serial,
  hasChanges,
  saving,
  onReset,
  children,
}: ConfigShellProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="w-full max-w-7xl mx-auto px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-700" />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Device Configuration</h1>
              <p className="text-sm text-gray-600 truncate">{deviceName} • {serial}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            disabled={!hasChanges || saving}
            className="w-full sm:w-auto"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset changes
          </Button>
        </div>
      </div>
      <div className="bg-white border-b border-gray-200">
        <div className="w-full max-w-7xl mx-auto px-4 py-3">
          <DeviceBreadcrumb
            items={[
              { label: "Devices", href: "/" },
              { label: deviceName || "Device", href: `/device/${deviceId}` },
              { label: "Configuration" },
            ]}
          />
        </div>
      </div>
      <div className="w-full max-w-7xl mx-auto px-4 py-6 space-y-6">{children}</div>
    </div>
  )
}
