import type { Metadata, Viewport } from 'next'

import './globals.css'

export const metadata: Metadata = {
  title: 'Boarding Pass',
  description: 'Plan the trip, then carry it. Every document clipped to the moment it is needed.',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#e9ecf1' },
    { media: '(prefers-color-scheme: dark)', color: '#0e1524' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
