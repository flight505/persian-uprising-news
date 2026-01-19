import type { Metadata } from 'next'
import Script from 'next/script'
import { Inter, DM_Serif_Display } from 'next/font/google'
import { TorBanner } from '@/app/components/Layout/TorBanner'
import { Header } from '@/app/components/Layout/Header'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const dmSerif = DM_Serif_Display({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-dm-serif-display',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  title: 'Persian Uprising News',
  description: 'Real-time news aggregator and incident mapping for Persian protests',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Rise Up'
  },
  formatDetection: {
    telephone: false
  },
  openGraph: {
    title: 'Persian Uprising News',
    description: 'Real-time updates on Persian protests',
    images: ['/og-image.png']
  },
  icons: {
    icon: '/favicon.ico',
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180' }
    ]
  }
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

        {/* Theme color */}
        <meta name="theme-color" content="#1a202c" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
      </head>
      {/* Background pattern applied globally to body to match v0 */}
      <body className="antialiased min-h-screen bg-background bg-pattern text-foreground">
        <TorBanner />
        <Header />
        {children}

        {/* Twitter Widgets for embedded tweets */}
        <Script
          src="https://platform.twitter.com/widgets.js"
          strategy="lazyOnload"
          id="twitter-widgets"
        />
      </body>
    </html>
  )
}
