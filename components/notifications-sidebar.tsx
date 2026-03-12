"use client"

export function NotificationsSidebar() {
  return (
    <aside className="hidden lg:flex bg-white border border-gray-200 rounded-lg shadow-sm flex-col lg:fixed lg:right-0 lg:top-16 lg:w-[320px] lg:h-[calc(100vh-4rem)] lg:rounded-r-none">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
            0
          </span>
        </div>
        <p className="text-sm text-gray-500">
          System and device updates will appear here.
        </p>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        <p className="text-sm text-gray-600">No notifications yet.</p>
      </div>
    </aside>
  )
}
