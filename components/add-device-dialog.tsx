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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { useAuth } from "./auth-provider"
import { DeviceInsert } from "@/lib/types/database"

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
    group_id: "none",
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
      const deviceData = {
        serial: formData.serial || null,
        friendly_name: formData.friendly_name || null,
        device_model: formData.device_model || null,
        client_id: user.id ? parseInt(user.id) : null,
        status: "offline" as const,
        group_id: formData.group_id !== "none" ? parseInt(formData.group_id) : null,
      }

      const { data, error } = await supabase
        .from('mvr_devices')
        .insert(deviceData as any)
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
        group_id: "none",
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
        <Button className="bg-blue-300 hover:bg-blue-500">
          <Plus className="w-4 h-4" />
          Add new device
        </Button>
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
              <Label htmlFor="friendly_name">
                Device Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="friendly_name"
                type="text"
                value={formData.friendly_name}
                onChange={(e) => setFormData({ ...formData, friendly_name: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="serial">Serial Number</Label>
              <Input
                id="serial"
                type="text"
                value={formData.serial}
                onChange={(e) => setFormData({ ...formData, serial: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="device_model">Device Model</Label>
              <Input
                id="device_model"
                type="text"
                value={formData.device_model}
                onChange={(e) => setFormData({ ...formData, device_model: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="group_id">Group</Label>
              <Select
                value={formData.group_id}
                onValueChange={(value) => setFormData({ ...formData, group_id: value })}
              >
                <SelectTrigger id="group_id">
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Group</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id.toString()}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? "Adding..." : "Add Device"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

