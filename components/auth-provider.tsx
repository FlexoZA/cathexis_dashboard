"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { signIn } from '@/lib/auth'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check active session
    console.log("DEBUG::AuthProvider", "Checking for active session...")
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("DEBUG::AuthProvider", "Session:", session ? "Found" : "Not found")
      if (session?.user) {
        console.log("DEBUG::AuthProvider", "User:", session.user.email)
      }
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("DEBUG::AuthProvider", "Auth state changed:", event)
      console.log("DEBUG::AuthProvider", "New session:", session ? "Exists" : "None")
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    console.log("DEBUG::AuthProvider", "Attempting login for:", email)
    const data = await signIn(email, password)
    console.log("DEBUG::AuthProvider", "Login successful for:", data.user.email)
    setUser(data.user)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login }}>
      {children}
    </AuthContext.Provider>
  )
}

