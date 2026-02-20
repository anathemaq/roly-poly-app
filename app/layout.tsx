import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { DayProvider } from "@/lib/day-context"
import { Suspense } from "react"
import "./globals.css"
import { MobileNav } from "@/components/mobile-nav"
import { RegisterSW } from "@/components/register-sw"

export const metadata: Metadata = {
  title: "Roly-Poly - Адаптивное планирование дня",
  description: "Гибкое управление вашим днем",
  generator: "v0.app",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru">
        <head>
          <link rel="manifest" href="/manifest.json" />
          <meta name="theme-color" content="#090218" media="(prefers-color-scheme: dark)" />
          <meta name="theme-color" content="#c7cbcb" media="(prefers-color-scheme: light)" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
          <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
          <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
        </head>
        <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <Suspense fallback={<div>Loading...</div>}>
          <DayProvider>
            <div className="min-h-screen bg-background max-w-md mx-auto relative">
              <div className="pb-20">{children}</div>
              <MobileNav />
            </div>
          </DayProvider>
        </Suspense>
          <Analytics />
          <RegisterSW />
      </body>
    </html>
  )
}
