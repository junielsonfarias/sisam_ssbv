import type { Metadata, Viewport } from 'next'
import './globals.css'
import { PWAInstallPrompt, ConnectionStatus } from '@/components/pwa-install-prompt'
import { ThemeProvider } from '@/lib/theme-provider'

export const metadata: Metadata = {
  title: 'SISAM - Sistema de Avaliacao Municipal',
  description: 'Sistema de Avaliacao Municipal - Gestao de resultados educacionais',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SISAM',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/icon-180x180.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: '#F8FAFC', // Cor do tema claro (será atualizado dinamicamente)
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

// Script para evitar flash de tema incorreto (executado antes do React)
const themeScript = `
(function() {
  try {
    var theme = localStorage.getItem('sisam-theme') || 'system';
    var resolved = theme;
    if (theme === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.classList.add(resolved);
    // Atualiza theme-color meta tag
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', resolved === 'dark' ? '#0F172A' : '#F8FAFC');
    }
  } catch (e) {}
})();
`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Script para evitar flash de tema - executado antes do React */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="apple-touch-icon" href="/icons/icon-180x180.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SISAM" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#1e40af" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body className="bg-theme-primary text-theme-primary">
        <ThemeProvider defaultTheme="system">
          <ConnectionStatus />
          {children}
          <PWAInstallPrompt />
        </ThemeProvider>
      </body>
    </html>
  )
}
