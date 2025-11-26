"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase"
import { useAuth } from "./auth-provider"

interface Group {
  id: number
  name: string
}

interface AddDeviceDialogProps {
  groups: Group[]
  onDeviceAdded: () => void
}

export function AddDeviceDialog({ groups, onDeviceAdded }: AddDeviceDialogProps) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    serial: "",
    friendly_name: "",
    device_model: "",
    group_id: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!user) {
      setError("User not authenticated")
      setLoading(false)
      return
    }

    console.log("DEBUG::AddDeviceDialog", "Submitting form data:", formData)
    console.log("DEBUG::AddDeviceDialog", "User ID:", user.id)

    try {
      const { data, error } = await supabase
        .from('device')
        .insert([
          {
            serial: formData.serial || null,
            friendly_name: formData.friendly_name || null,
            device_model: formData.device_model || null,
            client_id: user.id ? parseInt(user.id) : null,
            status: "offline",
            group_id: formData.group_id ? parseInt(formData.group_id) : null,
          }
        ])
        .select()

      if (error) {
        console.log("DEBUG::AddDeviceDialog", "Error inserting device:", error)
        throw error
      }

      console.log("DEBUG::AddDeviceDialog", "Device added successfully:", data)

      // Reset form
      setFormData({
        serial: "",
        friendly_name: "",
        device_model: "",
        group_id: "",
      })

      setOpen(false)
      onDeviceAdded()
    } catch (err: any) {
      console.log("DEBUG::AddDeviceDialog", "Catch block error:", err)
      setError(err.message || "Failed to add device")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 rounded-md transition-colors focus:outline-none focus:ring-1 focus:ring-gray-400">
          <Plus className="w-4 h-4" />
          Add new device
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Device</DialogTitle>
          <DialogDescription>
            Enter the device information below to add it to your dashboard.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="friendly_name" className="text-sm font-medium text-gray-700">
                Device Name <span className="text-red-500">*</span>
              </label>
              <input
                id="friendly_name"
                type="text"
                value={formData.friendly_name}
                onChange={(e) => setFormData({ ...formData, friendly_name: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 text-sm"
                required
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="serial" className="text-sm font-medium text-gray-700">
                Serial Number
              </label>
              <input
                id="serial"
                type="text"
                value={formData.serial}
                onChange={(e) => setFormData({ ...formData, serial: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 text-sm"
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="device_model" className="text-sm font-medium text-gray-700">
                Device Model
              </label>
              <input
                id="device_model"
                type="text"
                value={formData.device_model}
                onChange={(e) => setFormData({ ...formData, device_model: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 text-sm"
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="group_id" className="text-sm font-medium text-gray-700">
                Group
              </label>
              <select
                id="group_id"
                value={formData.group_id}
                onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 text-sm bg-white"
              >
                <option value="">No Group</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-md transition-colors focus:outline-none focus:ring-1 focus:ring-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2.5 text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 rounded-md transition-colors focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Adding..." : "Add Device"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

