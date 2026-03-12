"use client"

import { DeviceList } from "@/components/device-list"
import { useAuth } from "@/components/auth-provider"
import { LoginForm } from "@/components/login-form"

export function Landing() {
  const { user, loading } = useAuth()

  console.log("DEBUG::Landing", "Render state:", { 
    hasUser: !!user, 
    userEmail: user?.email,
    loading 
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-200 to-gray-300">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  if (!user) {
    console.log("DEBUG::Landing", "No user found, showing login form")
    return <LoginForm />
  }

  console.log("DEBUG::Landing", "User authenticated, showing device list")

  return (
    <div className="min-h-full">
      <DeviceList />
    </div>
  )
}

