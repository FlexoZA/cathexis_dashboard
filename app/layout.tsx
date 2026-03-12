import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { AuthProvider } from "@/components/auth-provider"
import { NotificationsProvider } from "@/components/notifications-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Cathexis Dashboard",
  description: "Dashboard for viewing and configuring dashcam devices",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <AuthProvider>
          <NotificationsProvider>
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </NotificationsProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

