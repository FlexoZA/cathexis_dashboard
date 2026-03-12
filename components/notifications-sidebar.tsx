"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNotifications } from "./notifications-provider"

export function NotificationsSidebar() {
  const { notifications, removeNotification } = useNotifications()

  return (
    <aside className="hidden lg:flex bg-white border border-gray-200 rounded-lg shadow-sm flex-col lg:fixed lg:right-0 lg:top-16 lg:w-[320px] lg:h-[calc(100vh-4rem)] lg:rounded-r-none">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
            {notifications.length}
          </span>
        </div>
        <p className="text-sm text-gray-500">
          System and device updates will appear here.
        </p>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-3">
        {notifications.length === 0 && (
          <p className="text-sm text-gray-600">No notifications yet.</p>
        )}

        {notifications.map((notification) => (
          <div key={notification.id} className="border border-gray-200 rounded-lg p-3 bg-white">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 break-words">{notification.title}</p>
                <p className="text-sm text-gray-600 break-words">{notification.message}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                aria-label="Close notification"
                onClick={() => removeNotification(notification.id)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}
