import pool from '@/database/connection'
import SiteHeader from '@/components/site/site-header'
import SiteHero from '@/components/site/site-hero'
import SiteAbout from '@/components/site/site-about'
import SiteStats from '@/components/site/site-stats'
import SiteServices from '@/components/site/site-services'
import SiteNews from '@/components/site/site-news'
import SiteSchools from '@/components/site/site-schools'
import SiteContact from '@/components/site/site-contact'
import SiteFooter from '@/components/site/site-footer'

// Revalidate every 5 minutes
export const revalidate = 300

interface SiteConfig {
  [key: string]: any
}

async function getSiteConfig(): Promise<SiteConfig> {
  try {
    const result = await pool.query(
      `SELECT chave, valor FROM site_config WHERE ativo = true`
    )
    const config: SiteConfig = {}
    for (const row of result.rows) {
      try {
        config[row.chave] = JSON.parse(row.valor)
      } catch {
        config[row.chave] = row.valor
      }
    }
    return config
  } catch {
    // Table might not exist yet or DB unavailable - use defaults
    return {}
  }
}

async function getStats(): Promise<{ escolas: number; alunos: number; turmas: number; professores: number }> {
  try {
    const [escolasRes, alunosRes, turmasRes, professoresRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) as total FROM escolas`).catch(() => ({ rows: [{ total: 0 }] })),
      pool.query(`SELECT COUNT(*) as total FROM alunos`).catch(() => ({ rows: [{ total: 0 }] })),
      pool.query(`SELECT COUNT(*) as total FROM turmas`).catch(() => ({ rows: [{ total: 0 }] })),
      pool.query(`SELECT COUNT(*) as total FROM usuarios WHERE perfil = 'professor'`).catch(() => ({ rows: [{ total: 0 }] })),
    ])
    return {
      escolas: parseInt(escolasRes.rows[0]?.total) || 0,
      alunos: parseInt(alunosRes.rows[0]?.total) || 0,
      turmas: parseInt(turmasRes.rows[0]?.total) || 0,
      professores: parseInt(professoresRes.rows[0]?.total) || 0,
    }
  } catch {
    return { escolas: 0, alunos: 0, turmas: 0, professores: 0 }
  }
}

async function getEscolas(): Promise<any[]> {
  try {
    const result = await pool.query(
      `SELECT id, nome, endereco FROM escolas ORDER BY nome ASC LIMIT 50`
    )
    return result.rows
  } catch {
    return []
  }
}

export default async function HomePage() {
  const [config, stats, escolas] = await Promise.all([
    getSiteConfig(),
    getStats(),
    getEscolas(),
  ])

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
