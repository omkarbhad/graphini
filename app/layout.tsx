import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { Toaster } from 'sonner'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Graphini — AI-powered diagram workspace',
  description: 'Turn ideas into diagrams instantly. Describe your system in plain English or Mermaid syntax and watch it render live on an infinite canvas.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body
        className={cn(
          'relative min-h-screen overflow-hidden antialiased',
          GeistSans.variable,
          GeistMono.variable
        )}
        style={{
          '--font-geist-sans': GeistSans.style.fontFamily,
          '--font-geist-mono': GeistMono.style.fontFamily,
        } as React.CSSProperties}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 -z-10 flex flex-col gap-12 bg-[radial-gradient(circle_at_top,_rgba(120,119,198,0.08),_transparent_55%),_linear-gradient(180deg,_rgba(255,255,255,0.9)_0%,_rgba(248,250,252,0.95)_60%,_rgba(248,250,252,1)_100%)]"
        >
          <div className="mx-auto h-64 w-[32rem] rounded-full bg-[radial-gradient(circle,_rgba(56,189,248,0.15),_transparent_65%)] blur-3xl" />
          <div className="mx-auto h-64 w-[26rem] rounded-full bg-[radial-gradient(circle,_rgba(147,197,253,0.12),_transparent_65%)] blur-3xl" />
        </div>
        <div className="relative z-10 flex min-h-screen flex-col">
          {children}
        </div>
        <Toaster position="bottom-center" richColors />
      </body>
    </html>
  )
}
