'use client'

import { useEffect, useState } from 'react'
import SiteHeader from '@/components/site/site-header'
import SiteHero from '@/components/site/site-hero'
import SiteAbout from '@/components/site/site-about'
import SiteStats from '@/components/site/site-stats'
import SiteServices from '@/components/site/site-services'
import SiteNews from '@/components/site/site-news'
import SiteSchools from '@/components/site/site-schools'
import SiteContact from '@/components/site/site-contact'
import SiteFooter from '@/components/site/site-footer'

interface SiteData {
  config: Record<string, any>
  stats: { escolas: number; alunos: number; turmas: number; professores: number }
  escolas: any[]
}

const defaultStats = { escolas: 0, alunos: 0, turmas: 0, professores: 0 }

export default function HomePage() {
  const [data, setData] = useState<SiteData | null>(null)

  useEffect(() => {
    fetch('/api/site-config')
      .then(r => r.json())
      .then(d => {
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
        })
      })
      .catch(() => {
        setData({ config: {}, stats: defaultStats, escolas: [] })
      })
  }, [])

  if (!data) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  const { config, stats, escolas } = data

  return (
    <div className="min-h-screen bg-white" style={{ scrollBehavior: 'smooth' }}>
      <SiteHeader data={config.header || {}} />
      <SiteHero data={config.hero || {}} />
      <SiteAbout data={config.about || {}} />
      <SiteStats data={config.stats || {}} stats={stats} />
      <SiteServices data={config.services || {}} />
      <SiteNews data={config.news || {}} />
      <SiteSchools data={config.schools || {}} escolas={escolas} />
      <SiteContact data={config.contact || {}} />
      <SiteFooter data={config.footer || {}} />
    </div>
  )
}
