import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SISAM - Sistema de Avaliação Municipal',
  description: 'Sistema de Avaliação Municioal',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}

