"use client"

import { useEffect, useState } from "react"
import { Menu, LogOut, Server, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { signOut } from "@/lib/auth"
import { useAuth } from "./auth-provider"

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [serverStatus, setServerStatus] = useState<"unknown" | "up" | "down">("unknown")
  const [portTest, setPortTest] = useState<{
    status: "unknown" | "pass" | "warn" | "fail"
    checks: Array<{
      host?: string
      port?: number
      description?: string
      ok?: boolean
      error?: string
    }>
  }>({ status: "unknown", checks: [] })
  const { user } = useAuth()

  useEffect(() => {
    let disposed = false
    let intervalId: ReturnType<typeof setInterval> | null = null

    const controller = new AbortController()

    void (async () => {
      try {
        const res = await fetch("/api/health", { method: "GET", cache: "no-store", signal: controller.signal })
        if (disposed) return
        setServerStatus(res.ok ? "up" : "down")
      } catch {
        if (disposed) return
        setServerStatus("down")
      }

      try {
        const res = await fetch("/api/test/system/port-test", {
          method: "POST",
          cache: "no-store",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ host: "localhost" }),
        })
        const data = await res.json().catch(() => null)
        if (disposed) return

        if (!res.ok || !data?.ok) {
          setPortTest({ status: "fail", checks: [] })
          return
        }

        const checks = data?.result?.checks
        if (Array.isArray(checks) && checks.length > 0) {
          const failed = checks.filter((c: any) => !c?.ok)
          if (failed.length === 0) {
            setPortTest({ status: "pass", checks })
          } else {
            setPortTest({ status: "warn", checks })
          }
        } else {
          const resultOk = Boolean(data?.result?.ok)
          setPortTest({ status: resultOk ? "pass" : "warn", checks: [] })
        }
      } catch {
        if (disposed) return
        setPortTest({ status: "fail", checks: [] })
      }
    })()

    intervalId = setInterval(() => {
      void (async () => {
        try {
          const res = await fetch("/api/health", { method: "GET", cache: "no-store", signal: controller.signal })
          if (disposed) return
          setServerStatus(res.ok ? "up" : "down")
        } catch {
          if (disposed) return
          setServerStatus("down")
        }

        try {
          const res = await fetch("/api/test/system/port-test", {
            method: "POST",
            cache: "no-store",
            signal: controller.signal,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ host: "localhost" }),
          })
          const data = await res.json().catch(() => null)
          if (disposed) return

          if (!res.ok || !data?.ok) {
            setPortTest({ status: "fail", checks: [] })
            return
          }

          const checks = data?.result?.checks
          if (Array.isArray(checks) && checks.length > 0) {
            const failed = checks.filter((c: any) => !c?.ok)
            if (failed.length === 0) {
              setPortTest({ status: "pass", checks })
            } else {
              setPortTest({
                status: "warn",
                checks,
              })
            }
          } else {
            const resultOk = Boolean(data?.result?.ok)
            setPortTest({ status: resultOk ? "pass" : "warn", checks: [] })
          }
        } catch {
          if (disposed) return
          setPortTest({ status: "fail", checks: [] })
        }
      })()
    }, 30000)

    return () => {
      disposed = true
      controller.abort()
      if (intervalId) clearInterval(intervalId)
    }
  }, [])

  const handleLogout = async () => {
    try {
      console.log("DEBUG::Header", "Logging out...")
      await signOut()
      setIsMenuOpen(false)
      window.location.href = '/'
    } catch (error) {
      console.log("DEBUG::Header", "Logout error:", error)
    }
  }

  return (
    <header className="w-full border-b bg-background">
      <div className="w-full max-w-7xl mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">Cathexis Dashboard</h1>
        </div>
        <nav className="flex items-center gap-4 relative">
          <div className="flex items-center gap-3 text-muted-foreground">
            <div
              className="flex items-center gap-2"
              title={`Server status: ${serverStatus}`}
              aria-label={`Server status: ${serverStatus}`}
            >
              <div className="relative">
                <Server className="w-5 h-5" />
                <span
                  className={[
                    "absolute -right-1 -bottom-1 h-3.5 w-3.5 rounded-full ring-2 ring-background",
                    serverStatus === "up"
                      ? "bg-emerald-500"
                      : serverStatus === "down"
                        ? "bg-red-500"
                        : "bg-gray-400",
                  ].join(" ")}
                />
              </div>
            </div>

            <div
              className="flex items-center gap-2"
              title={`Port test: ${portTest.status}`}
              aria-label={`Port test: ${portTest.status}`}
            >
              <div className="relative">
                <Activity className="w-5 h-5" />
                <span
                  className={[
                    "absolute -right-1 -bottom-1 h-3.5 w-3.5 rounded-full ring-2 ring-background",
                    portTest.status === "pass"
                      ? "bg-emerald-500"
                      : portTest.status === "warn"
                        ? "bg-amber-500"
                        : portTest.status === "fail"
                          ? "bg-red-500"
                          : "bg-gray-400",
                  ].join(" ")}
                />
              </div>

              <div className="flex items-center gap-1">
                {portTest.checks.length > 0 ? (
                  portTest.checks.map((check, idx) => (
                    <span
                      // eslint-disable-next-line react/no-array-index-key
                      key={idx}
                      title={`${check.description || "Port"}${typeof check.port === "number" ? ` (${check.port})` : ""}: ${
                        check.ok ? "ok" : `fail${check.error ? ` (${check.error})` : ""}`
                      }`}
                      aria-label={`${check.description || "Port"}${typeof check.port === "number" ? ` (${check.port})` : ""}: ${
                        check.ok ? "ok" : `fail${check.error ? ` (${check.error})` : ""}`
                      }`}
                      className={[
                        "h-3.5 w-3.5 rounded-full",
                        check.ok ? "bg-emerald-500" : "bg-red-500",
                      ].join(" ")}
                    />
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground/70">—</span>
                )}
              </div>
            </div>
          </div>
          {user && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Menu"
              >
                <Menu className="w-8 h-8" />
              </Button>
              
              {isMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setIsMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white border rounded-md shadow-lg z-20">
                    <div className="py-1">
                      <div className="px-4 py-2 text-sm text-muted-foreground border-b">
                        {user.email}
                      </div>
                      <Button
                        variant="ghost"
                        onClick={handleLogout}
                        className="w-full justify-start hover:bg-gray-100"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  )
}

