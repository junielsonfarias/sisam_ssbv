import type { Metadata, Viewport } from 'next'
import './globals.css'
import { PWAInstallPrompt, ConnectionStatus } from '@/components/pwa-install-prompt'
import { ThemeProvider } from '@/lib/theme-provider'
import { ToastProvider } from '@/components/toast'
import ErrorBoundary from '@/components/error-boundary'
import { OrganizationJsonLd } from '@/components/site/json-ld'
import AccessibilityBar from '@/components/site/accessibility-bar'

const siteUrl = 'https://educacaossbv.com.br'
const siteTitle = 'Educatec - SEMED Sao Sebastiao da Boa Vista'
const siteDescription =
  'Sistema de Gestao Escolar da Secretaria Municipal de Educacao de Sao Sebastiao da Boa Vista, Para. Acesse boletins, matriculas, publicacoes e servicos educacionais.'

export const metadata: Metadata = {
  title: siteTitle,
  description: siteDescription,
  manifest: '/manifest.json',
  metadataBase: new URL(siteUrl),
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Educatec',
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
  // Open Graph — compartilhamento em redes sociais
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: siteUrl,
    title: siteTitle,
    description: siteDescription,
    siteName: 'Educatec - SEMED SSBV',
    images: [
      {
        url: '/logo-semed.png',
        width: 512,
        height: 512,
        alt: 'Logo SEMED - Secretaria Municipal de Educacao',
      },
    ],
  },
  // Twitter Cards
  twitter: {
    card: 'summary',
    title: siteTitle,
    description: siteDescription,
    images: ['/logo-semed.png'],
  },
}

export const viewport: Viewport = {
  themeColor: '#F8FAFC',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover', // Suporte para notch (iPhone X+)
}

// Script para evitar flash de tema incorreto (executado antes do React)
const themeScript = `
(function() {
  try {
    var theme = localStorage.getItem('educatec-theme') || 'system';
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
  } catch (e) {
    // Expected: theme initialization may fail in some environments
  }
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
        {/* JSON-LD — dados estruturados para SEO */}
        <OrganizationJsonLd />
        {/* Skip to content — acessibilidade por teclado */}
        <a href="#main-content"
           className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100]
                      focus:bg-indigo-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg
                      focus:shadow-lg focus:text-sm focus:font-medium">
          Pular para conteudo principal
        </a>
        <ThemeProvider defaultTheme="light">
          <ToastProvider>
            <ErrorBoundary>
              <ConnectionStatus />
              {children}
              <AccessibilityBar />
              {/* PWA install prompt desabilitado temporariamente */}
              {/* <PWAInstallPrompt /> */}
            </ErrorBoundary>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
