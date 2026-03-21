import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Educatec - Terminal Facial',
  description: 'Terminal de reconhecimento facial para registro de frequencia escolar',
  manifest: '/manifest-terminal.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Terminal',
  },
}

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function TerminalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
