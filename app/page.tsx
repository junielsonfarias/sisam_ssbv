'use client'

import { useEffect, useState } from 'react'
import SiteHeader from '@/components/site/site-header'
import SiteHero from '@/components/site/site-hero'
import SiteAbout from '@/components/site/site-about'
import SiteSocial from '@/components/site/site-social'
import SiteStats from '@/components/site/site-stats'
import SiteTestimonials from '@/components/site/site-testimonials'
import SiteServices from '@/components/site/site-services'
import SiteNews from '@/components/site/site-news'
import SitePublicacoes from '@/components/site/site-publicacoes'
import SiteSchoolsMap from '@/components/site/site-schools-map'
import SiteSchools from '@/components/site/site-schools'
import SiteFaq from '@/components/site/site-faq'
import SiteContact from '@/components/site/site-contact'
import SiteFooter from '@/components/site/site-footer'
import SiteManutencao from '@/components/site/site-manutencao'
import { ScrollAnimate } from '@/components/site/scroll-animate'

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
      fetch('/api/publicacoes?limite=6').then(r => r.json()).catch(() => ({ publicacoes: [] })),
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
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-800 to-blue-900 flex items-center justify-center shadow-xl shadow-blue-800/25 animate-pulse">
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

  // Verificar modo manutencao
  const manutencao = config.manutencao || {}
  if (manutencao.ativo) {
    return <SiteManutencao titulo={manutencao.titulo} mensagem={manutencao.mensagem} />
  }

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader data={config.header || {}} menuData={config.menu} escolas={escolas} faqPerguntas={config.faq?.perguntas} />
      <SiteHero data={config.hero || {}} />
      <ScrollAnimate animation="fade-up">
        <SiteAbout data={config.about || {}} />
      </ScrollAnimate>
      <SiteSocial data={config.social || {}} />
      <ScrollAnimate animation="fade">
        <SiteStats data={config.stats || {}} stats={stats} />
      </ScrollAnimate>
      <ScrollAnimate animation="fade-up">
        <SiteTestimonials data={config.testimonials || {}} />
      </ScrollAnimate>
      <ScrollAnimate animation="fade-up">
        <SiteServices data={config.services || {}} />
      </ScrollAnimate>
      <ScrollAnimate animation="fade-up">
        <SiteNews data={config.news || {}} />
      </ScrollAnimate>
      <ScrollAnimate animation="fade-up" delay={100}>
        <SitePublicacoes publicacoes={publicacoes} />
      </ScrollAnimate>
      <ScrollAnimate animation="fade-up">
        <SiteSchoolsMap escolas={escolas} />
      </ScrollAnimate>
      <ScrollAnimate animation="fade-up">
        <SiteSchools data={config.schools || {}} escolas={escolas} />
      </ScrollAnimate>
      <ScrollAnimate animation="fade-up">
        <SiteFaq data={config.faq || {}} />
      </ScrollAnimate>
      <ScrollAnimate animation="fade-up">
        <SiteContact data={config.contact || {}} />
      </ScrollAnimate>
      <SiteFooter data={{ ...(config.footer || {}), ...(config.social || {}) }} menuData={config.menu} />
    </div>
  )
}
