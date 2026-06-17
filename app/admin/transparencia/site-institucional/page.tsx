'use client'

import React from 'react'
import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState } from 'react'
import {
  Globe, Save, ExternalLink, Eye, RefreshCw
} from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { TabProps, cardClass } from './components/types'
import { TabManutencao } from './components/TabManutencao'
import { TabHero } from './components/TabHero'
import { TabSobre } from './components/TabSobre'
import { TabSocial } from './components/TabSocial'
import { TabEstatisticas } from './components/TabEstatisticas'
import { TabServicos } from './components/TabServicos'
import { TabNoticias } from './components/TabNoticias'
import { TabEscolas } from './components/TabEscolas'
import { TabContato } from './components/TabContato'
import { TabRodape } from './components/TabRodape'
import { TabMenu } from './components/TabMenu'

const TABS = [
  { key: 'manutencao', label: 'Manutencao' },
  { key: 'menu', label: 'Menu' },
  { key: 'hero', label: 'Hero' },
  { key: 'sobre', label: 'Sobre' },
  { key: 'social', label: 'Redes Sociais' },
  { key: 'estatisticas', label: 'Estatisticas' },
  { key: 'servicos', label: 'Servicos' },
  { key: 'noticias', label: 'Noticias' },
  { key: 'escolas', label: 'Escolas' },
  { key: 'contato', label: 'Contato' },
  { key: 'rodape', label: 'Rodape' },
] as const

type TabKey = typeof TABS[number]['key']

const TAB_COMPONENTS: Record<TabKey, React.ComponentType<TabProps>> = {
  manutencao: TabManutencao,
  menu: TabMenu,
  hero: TabHero,
  sobre: TabSobre,
  social: TabSocial,
  estatisticas: TabEstatisticas,
  servicos: TabServicos,
  noticias: TabNoticias,
  escolas: TabEscolas,
  contato: TabContato,
  rodape: TabRodape,
}

export default function SiteInstitucionalPage() {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<TabKey>('manutencao')
  const [sections, setSections] = useState<Record<string, any>>({})
  const [formData, setFormData] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchAllSections()
  }, [])

  const fetchAllSections = async () => {
    setLoading(true)
    try {
      const results: Record<string, any> = {}
      await Promise.all(
        TABS.map(async (tab) => {
          try {
            const res = await fetch(`/api/admin/site-config?secao=${tab.key}`)
            if (res.ok) {
              const data = await res.json()
              results[tab.key] = data.conteudo || {}
            }
          } catch {
            results[tab.key] = {}
          }
        })
      )
      setSections(results)
      setFormData(results['manutencao'] || getDefaultData('manutencao'))
    } catch {
      toast.error('Erro ao carregar configuracoes do site')
    } finally {
      setLoading(false)
    }
  }

  const getDefaultData = (tab: TabKey): any => {
    const defaults: Record<TabKey, any> = {
      manutencao: {
        ativo: false,
        titulo: 'Site em Manutencao',
        mensagem: 'Estamos trabalhando para melhorar sua experiencia. O site estara de volta em breve!',
      },
      menu: {
        logo_semed_url: '/',
        logo_prefeitura_url: 'https://saosebastiaodaboavista.pa.gov.br',
        items: [
          { label: 'Sobre', href: '#sobre', ordem: 0, visivel: true, abrir_nova_aba: false, children: [] },
          { label: 'Serviços', href: '#servicos', ordem: 1, visivel: true, abrir_nova_aba: false, children: [
            { label: 'Boletim Online', href: '/boletim', ordem: 0, visivel: true, abrir_nova_aba: false },
            { label: 'Pré-Matrícula', href: '/matricula', ordem: 1, visivel: true, abrir_nova_aba: false },
            { label: 'Ouvidoria', href: '/ouvidoria', ordem: 2, visivel: true, abrir_nova_aba: false },
          ]},
          { label: 'Escolas', href: '#escolas', ordem: 2, visivel: true, abrir_nova_aba: false, children: [] },
          { label: 'Notícias', href: '#noticias', ordem: 3, visivel: true, abrir_nova_aba: false, children: [] },
          { label: 'Institucional', href: '#', ordem: 4, visivel: true, abrir_nova_aba: false, children: [
            { label: 'Publicações', href: '/publicacoes', ordem: 0, visivel: true, abrir_nova_aba: false },
            { label: 'Transparência', href: '/transparencia', ordem: 1, visivel: true, abrir_nova_aba: false },
            { label: 'Eventos', href: '/eventos', ordem: 2, visivel: true, abrir_nova_aba: false },
          ]},
          { label: 'Contato', href: '#contato', ordem: 5, visivel: true, abrir_nova_aba: false, children: [] },
        ],
      },
      hero: {
        titulo: '', subtitulo: '', descricao: '',
        cta_primario: { texto: '', href: '' },
        cta_secundario: { texto: '', href: '' },
      },
      sobre: { titulo: '', texto: '', missao: '', visao: '' },
      social: {
        facebook_url: 'https://www.facebook.com/semedssbvpa/',
        instagram_url: '', youtube_url: '', twitter_url: '',
        tiktok_url: '', telegram_url: '', whatsapp_numero: '',
        mostrar_feed_facebook: false,
      },
      estatisticas: { auto_count: true, items: [{ label: '', valor: '' }] },
      servicos: { items: [{ titulo: '', descricao: '', icone: '' }] },
      noticias: { items: [{ titulo: '', data: '', resumo: '', conteudo: '' }] },
      escolas: { mostrar_do_banco: true, titulo: '' },
      contato: { endereco: '', telefone: '', email: '', horario_funcionamento: '', mapa_embed_url: '' },
      rodape: { texto_copyright: '', links_uteis: [{ label: '', href: '' }], redes_sociais: [{ nome: '', url: '' }] },
    }
    return defaults[tab]
  }

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab)
    const stored = sections[tab]
    if (stored && Object.keys(stored).length > 0) {
      setFormData(stored)
    } else {
      setFormData(getDefaultData(tab))
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/site-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secao: activeTab, conteudo: formData }),
      })
      if (res.ok) {
        setSections(prev => ({ ...prev, [activeTab]: formData }))
        toast.success('Secao salva com sucesso!')
      } else {
        const data = await res.json()
        toast.error(data.mensagem || 'Erro ao salvar secao')
      }
    } catch {
      toast.error('Erro ao salvar secao')
    } finally {
      setSaving(false)
    }
  }

  const updateField = (path: string, value: any) => {
    setFormData((prev: any) => {
      const keys = path.split('.')
      const updated = JSON.parse(JSON.stringify(prev))
      let obj = updated
      for (let i = 0; i < keys.length - 1; i++) {
        if (obj[keys[i]] === undefined) obj[keys[i]] = {}
        obj = obj[keys[i]]
      }
      obj[keys[keys.length - 1]] = value
      return updated
    })
  }

  const addItem = (arrayPath: string, template: any) => {
    setFormData((prev: any) => {
      const updated = JSON.parse(JSON.stringify(prev))
      const keys = arrayPath.split('.')
      let obj = updated
      for (const k of keys.slice(0, -1)) obj = obj[k]
      const lastKey = keys[keys.length - 1]
      if (!Array.isArray(obj[lastKey])) obj[lastKey] = []
      obj[lastKey].push(template)
      return updated
    })
  }

  const removeItem = (arrayPath: string, index: number) => {
    setFormData((prev: any) => {
      const updated = JSON.parse(JSON.stringify(prev))
      const keys = arrayPath.split('.')
      let obj = updated
      for (const k of keys.slice(0, -1)) obj = obj[k]
      const lastKey = keys[keys.length - 1]
      if (Array.isArray(obj[lastKey]) && obj[lastKey].length > 1) {
        obj[lastKey].splice(index, 1)
      }
      return updated
    })
  }

  if (loading) {
    return (
      <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </ProtectedRoute>
    )
  }

  const TabComponent = TAB_COMPONENTS[activeTab]

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-xl shadow-lg p-6 text-white">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-2 rounded-lg">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">Site Institucional</h1>
                <p className="text-slate-300 text-sm mt-1">Gerencie o conteudo do site publico</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchAllSections}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Recarregar
              </button>
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
              >
                <Eye className="w-4 h-4" />
                Visualizar Site
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-slate-700 overflow-x-auto">
          <nav className="flex gap-1 -mb-px" aria-label="Tabs">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className={cardClass}>
          <TabComponent formData={formData} updateField={updateField} addItem={addItem} removeItem={removeItem} />
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto bg-indigo-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium shadow-sm transition-colors text-sm sm:text-base"
          >
            <Save className="w-4 h-4 sm:w-5 sm:h-5" />
            {saving ? 'Salvando...' : 'Salvar Secao'}
          </button>
        </div>
      </div>
    </ProtectedRoute>
  )
}
