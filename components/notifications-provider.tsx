"use client"

import { createContext, useContext, useMemo, useRef, useState } from "react"

export interface AppNotification {
  id: string
  title: string
  message: string
  createdAt: number
}

interface NotificationsContextValue {
  notifications: AppNotification[]
  addNotification: (title: string, message: string) => void
  removeNotification: (id: string) => void
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined)

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const timeoutIdsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const removeNotification = (id: string) => {
    const timeoutId = timeoutIdsRef.current[id]
    if (timeoutId) {
      clearTimeout(timeoutId)
      delete timeoutIdsRef.current[id]
    }

    setNotifications((current) => current.filter((notification) => notification.id !== id))
  }

  const addNotification = (title: string, message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const createdAt = Date.now()

    setNotifications((current) => [{ id, title, message, createdAt }, ...current])

    timeoutIdsRef.current[id] = setTimeout(() => {
      setNotifications((current) => current.filter((notification) => notification.id !== id))
      delete timeoutIdsRef.current[id]
    }, 50000)
  }

  const value = useMemo(
    () => ({
      notifications,
      addNotification,
      removeNotification,
    }),
    [notifications],
  )

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export function useNotifications() {
  const context = useContext(NotificationsContext)

  if (!context) {
    throw new Error("useNotifications must be used within NotificationsProvider")
  }

  return context
}
