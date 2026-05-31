import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Artha — Wealth with Purpose',
  description: 'AI-powered personal finance for part-time workers',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
