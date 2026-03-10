"use client"

import { useState } from "react"
import { FolderPlus } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"

interface AddGroupDialogProps {
  onGroupAdded: () => void
}

export function AddGroupDialog({ onGroupAdded }: AddGroupDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    console.log("DEBUG::AddGroupDialog", "Submitting form data:", formData)

    try {
      const { data, error } = await supabase
        .from('mvr_device_groups')
        .insert({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
        })
        .select()

      if (error) {
        console.log("DEBUG::AddGroupDialog", "Error inserting group:", error)
        throw error
      }

      console.log("DEBUG::AddGroupDialog", "Group added successfully:", data)

      setFormData({ name: "", description: "" })
      setOpen(false)
      onGroupAdded()
    } catch (err: any) {
      console.log("DEBUG::AddGroupDialog", "Catch block error:", err)
      setError(err.message || "Failed to create group")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) setError(null) }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-gray-300 hover:bg-gray-100">
          <FolderPlus className="w-4 h-4" />
          Create new group
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
          <DialogDescription>
            Add a new device group to help organise your devices.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="group_name">
                Group Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="group_name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Head Office"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="group_description">Description</Label>
              <Textarea
                id="group_description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description for this group"
                rows={3}
              />
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
              onClick={() => { setOpen(false); setError(null) }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
