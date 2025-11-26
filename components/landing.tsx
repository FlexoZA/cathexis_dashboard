"use client"

export function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-200 to-gray-300">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
              Cathexis Dashboard
            </h1>
            <p className="mx-auto max-w-[700px] text-slate-500 md:text-xl dark:text-slate-400">
              View and configure your dashcam device with ease
            </p>
          </div>
          <div className="space-y-4 w-full max-w-sm">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-2">Device Status</h2>
              <p className="text-sm text-muted-foreground">
                Waiting for device connection...
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

