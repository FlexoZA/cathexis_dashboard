import { supabase } from './supabase'

export async function signIn(email: string, password: string) {
  console.log("DEBUG::auth.ts", "Signing in with email:", email)
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.log("DEBUG::auth.ts", "Sign in error:", error)
    throw error
  }

  console.log("DEBUG::auth.ts", "Sign in successful:", data.user?.email)
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  
  if (error) {
    console.log("DEBUG::auth.ts", { error })
    throw error
  }
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) {
    console.log("DEBUG::auth.ts", { error })
    return null
  }
  
  return user
}

export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error) {
    console.log("DEBUG::auth.ts", { error })
    return null
  }
  
  return session
}

