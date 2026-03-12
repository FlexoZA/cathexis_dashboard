"use client"

import { useState, useEffect } from "react"
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

interface PrefillData {
  serial?: string
  device_model?: string
  friendly_name?: string
}

interface AddDeviceDialogProps {
  groups: Group[]
  onDeviceAdded: () => void
  prefillData?: PrefillData
  unknownDeviceId?: number
  onUnknownDeviceLinked?: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AddDeviceDialog({
  groups,
  onDeviceAdded,
  prefillData,
  unknownDeviceId,
  onUnknownDeviceLinked,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: AddDeviceDialogProps) {
  const { user } = useAuth()
  const [internalOpen, setInternalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isControlled = controlledOpen !== undefined
  const dialogOpen = isControlled ? controlledOpen : internalOpen

  const [formData, setFormData] = useState({
    serial: "",
    friendly_name: "",
    device_model: "",
    group_id: "none",
    protocol: "none",
  })

  useEffect(() => {
    if (dialogOpen && prefillData) {
      setFormData({
        serial: prefillData.serial || "",
        friendly_name: prefillData.friendly_name || "",
        device_model: prefillData.device_model || "",
        group_id: "none",
        protocol: "none",
      })
    }
  }, [dialogOpen, prefillData])

  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(newOpen)
    }
    controlledOnOpenChange?.(newOpen)
    if (!newOpen) {
      setError(null)
    }
  }

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
        protocol: formData.protocol !== "none" ? formData.protocol : null,
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

      if (unknownDeviceId !== undefined) {
        const { error: deleteError } = await supabase
          .from('mvr_unknown_devices')
          .delete()
          .eq('id', unknownDeviceId)

        if (deleteError) {
          console.log("DEBUG::AddDeviceDialog", "Error removing unknown device:", deleteError)
        } else {
          console.log("DEBUG::AddDeviceDialog", "Unknown device removed:", unknownDeviceId)
          onUnknownDeviceLinked?.()
        }
      }

      setFormData({
        serial: "",
        friendly_name: "",
        device_model: "",
        group_id: "none",
        protocol: "none",
      })

      handleOpenChange(false)
      onDeviceAdded()
    } catch (err: any) {
      console.log("DEBUG::AddDeviceDialog", "Catch block error:", err)
      setError(err.message || "Failed to add device")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button className="bg-blue-300 hover:bg-blue-500">
            <Plus className="w-4 h-4" />
            Add new device
          </Button>
        </DialogTrigger>
      )}
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
              <Select
                value={formData.device_model || "none"}
                onValueChange={(value) => setFormData({ ...formData, device_model: value === "none" ? "" : value })}
              >
                <SelectTrigger id="device_model">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Model</SelectItem>
                  <SelectItem value="MRV5">MRV5</SelectItem>
                  <SelectItem value="N62">N62</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="protocol">Protocol</Label>
              <Select
                value={formData.protocol}
                onValueChange={(value) => setFormData({ ...formData, protocol: value })}
              >
                <SelectTrigger id="protocol">
                  <SelectValue placeholder="Select a protocol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Protocol</SelectItem>
                  <SelectItem value="jt808_19">JT808_19</SelectItem>
                  <SelectItem value="cathexis">Cathexis</SelectItem>
                </SelectContent>
              </Select>
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
              onClick={() => handleOpenChange(false)}
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
