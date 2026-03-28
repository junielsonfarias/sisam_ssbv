'use client'

import { useEffect, useState } from 'react'
import SiteHeader from '@/components/site/site-header'
import SiteHero from '@/components/site/site-hero'
import SiteAbout from '@/components/site/site-about'
import SiteStats from '@/components/site/site-stats'
import SiteServices from '@/components/site/site-services'
import SiteNews from '@/components/site/site-news'
import SitePublicacoes from '@/components/site/site-publicacoes'
import SiteSchools from '@/components/site/site-schools'
import SiteContact from '@/components/site/site-contact'
import SiteFooter from '@/components/site/site-footer'

interface SiteData {
  config: Record<string, any>
  stats: { escolas: number; alunos: number; turmas: number; professores: number }
  escolas: any[]
  publicacoes: any[]
}

const defaultStats = { escolas: 0, alunos: 0, turmas: 0, professores: 0 }

export default function HomePage() {
  const [data, setData] = useState<SiteData | null>(null)

  useEffect(() => {
    // Enable smooth scrolling on the html element
    document.documentElement.style.scrollBehavior = 'smooth'
    return () => {
      document.documentElement.style.scrollBehavior = ''
    }
  }, [])

  useEffect(() => {
    Promise.all([
      fetch('/api/site-config').then(r => r.json()).catch(() => ({})),
      fetch('/api/publicacoes?limit=6').then(r => r.json()).catch(() => ({ publicacoes: [] })),
    ]).then(([d, pubData]) => {
      const config: Record<string, any> = {}
      if (Array.isArray(d.secoes)) {
        for (const s of d.secoes) {
          config[s.secao] = s.conteudo
        }
      }
      setData({
        config,
        stats: d.stats || defaultStats,
        escolas: d.escolas || [],
        publicacoes: pubData.publicacoes || [],
      })
    }).catch(() => {
      setData({ config: {}, stats: defaultStats, escolas: [], publicacoes: [] })
    })
  }, [])

  if (!data) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-500/25 animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-400">Carregando SEMED...</p>
        </div>
      </div>
    )
  }

  const { config, stats, escolas, publicacoes } = data

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader data={config.header || {}} />
      <SiteHero data={config.hero || {}} />
      <SiteAbout data={config.about || {}} />
      <SiteStats data={config.stats || {}} stats={stats} />
      <SiteServices data={config.services || {}} />
      <SiteNews data={config.news || {}} />
      <SitePublicacoes publicacoes={publicacoes} />
      <SiteSchools data={config.schools || {}} escolas={escolas} />
      <SiteContact data={config.contact || {}} />
      <SiteFooter data={config.footer || {}} />
    </div>
  )
}
