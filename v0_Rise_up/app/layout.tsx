import type React from "react"
import type { Metadata } from "next"
import Script from "next/script"
import { Inter, DM_Serif_Display } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const dmSerif = DM_Serif_Display({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-serif",
})

export const metadata: Metadata = {
  title: "Persian Uprising News",
  description: "Real-time news aggregator and incident mapping for Persian protests",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Rise Up",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "Persian Uprising News",
    description: "Real-time updates on Persian protests",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSerif.variable} dark`}>
      <head>
        {/* iOS PWA meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Rise Up" />

        <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#1e4d40" media="(prefers-color-scheme: light)" />
      </head>
      <body className="antialiased font-sans">
        {children}

        {/* Twitter Widgets for embedded tweets */}
        <Script src="https://platform.twitter.com/widgets.js" strategy="lazyOnload" id="twitter-widgets" />
      </body>
    </html>
  )
}
