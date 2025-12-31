import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SISAM - Sistema de Análise de Provas',
  description: 'Sistema para análise e gestão de dados de provas',
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

