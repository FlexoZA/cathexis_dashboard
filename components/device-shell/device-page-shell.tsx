"use client"

import Link from "next/link"
import { Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DeviceBreadcrumb } from "@/components/device-breadcrumb"

interface DevicePageShellProps {
  deviceId: number
  deviceName: string
  statusLabel: string
  statusClassName: string
  children: React.ReactNode
}

export function DevicePageShell({
  deviceId,
  deviceName,
  statusLabel,
  statusClassName,
  children,
}: DevicePageShellProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="w-full max-w-7xl mx-auto px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{deviceName}</h1>
              <p className="text-sm text-gray-600">Device #{deviceId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/device/${deviceId}/config`}>
                <Settings className="w-4 h-4 mr-2" />
                Device Config
              </Link>
            </Button>
            <span className={`text-sm font-medium px-3 py-1 rounded-full border ${statusClassName}`}>
              {statusLabel}
            </span>
          </div>
        </div>
      </div>
      <div className="bg-white border-b border-gray-200">
        <div className="w-full max-w-7xl mx-auto px-4 py-3">
          <DeviceBreadcrumb
            items={[
              { label: "Devices", href: "/" },
              { label: deviceName || "Device" },
            ]}
          />
        </div>
      </div>
      <div className="w-full max-w-7xl mx-auto px-4 py-6">{children}</div>
    </div>
  )
}
