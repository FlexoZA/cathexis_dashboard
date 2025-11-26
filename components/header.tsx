"use client"

export function Header() {
  return (
    <header className="w-full border-b bg-background">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">Cathexis Dashboard</h1>
        </div>
        <nav className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">Dashboard</span>
        </nav>
      </div>
    </header>
  )
}

