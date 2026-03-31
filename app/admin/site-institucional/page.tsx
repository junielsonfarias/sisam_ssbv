'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState } from 'react'
import {
  Globe, Save, Plus, Trash2, ExternalLink, Eye, RefreshCw, Construction
} from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

const TABS = [
  { key: 'manutencao', label: 'Manutencao' },
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

const inputClass = 'w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
const labelClass = 'block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
const cardClass = 'bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6'

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
      hero: {
        titulo: '',
        subtitulo: '',
        descricao: '',
        cta_primario: { texto: '', href: '' },
        cta_secundario: { texto: '', href: '' },
      },
      sobre: {
        titulo: '',
        texto: '',
        missao: '',
        visao: '',
      },
      social: {
        facebook_url: 'https://www.facebook.com/semedssbvpa/',
        instagram_url: '',
        youtube_url: '',
        twitter_url: '',
        tiktok_url: '',
        telegram_url: '',
        whatsapp_numero: '',
        mostrar_feed_facebook: false,
      },
      estatisticas: {
        auto_count: true,
        items: [{ label: '', valor: '' }],
      },
      servicos: {
        items: [{ titulo: '', descricao: '', icone: '' }],
      },
      noticias: {
        items: [{ titulo: '', data: '', resumo: '', conteudo: '' }],
      },
      escolas: {
        mostrar_do_banco: true,
        titulo: '',
      },
      contato: {
        endereco: '',
        telefone: '',
        email: '',
        horario_funcionamento: '',
        mapa_embed_url: '',
      },
      rodape: {
        texto_copyright: '',
        links_uteis: [{ label: '', href: '' }],
        redes_sociais: [{ nome: '', url: '' }],
      },
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

  const renderManutencaoTab = () => (
    <div className="space-y-6">
      {/* Toggle principal */}
      <div className={`p-4 rounded-xl border-2 transition-colors ${formData.ativo ? 'border-red-400 bg-red-50 dark:bg-red-900/20 dark:border-red-600' : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50'}`}>
        <label className="flex items-center gap-4 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={formData.ativo ?? false}
              onChange={e => updateField('ativo', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-gray-300 dark:bg-slate-600 peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-red-500"></div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Construction className={`w-5 h-5 ${formData.ativo ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`} />
              <span className={`text-base font-semibold ${formData.ativo ? 'text-red-700 dark:text-red-300' : 'text-gray-700 dark:text-gray-300'}`}>
                Modo Manutencao {formData.ativo ? 'ATIVADO' : 'Desativado'}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {formData.ativo
                ? 'O site esta exibindo a tela de manutencao para todos os visitantes.'
                : 'O site esta funcionando normalmente para os visitantes.'}
            </p>
          </div>
        </label>
      </div>

      {formData.ativo && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg p-4">
          <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
            Atencao: O painel administrativo e as APIs internas continuam funcionando normalmente. Apenas a pagina principal do site sera substituida pela tela de manutencao.
          </p>
        </div>
      )}

      <div>
        <label className={labelClass}>Titulo da Pagina de Manutencao</label>
        <input type="text" className={inputClass} value={formData.titulo || ''} onChange={e => updateField('titulo', e.target.value)} placeholder="Ex: Site em Manutencao" />
      </div>
      <div>
        <label className={labelClass}>Mensagem para os Visitantes</label>
        <textarea className={inputClass} rows={4} value={formData.mensagem || ''} onChange={e => updateField('mensagem', e.target.value)} placeholder="Mensagem que sera exibida na tela de manutencao" />
      </div>
    </div>
  )

  const renderHeroTab = () => (
    <div className="space-y-4">
      <div>
        <label className={labelClass}>Titulo</label>
        <input type="text" className={inputClass} value={formData.titulo || ''} onChange={e => updateField('titulo', e.target.value)} placeholder="Titulo principal do site" />
      </div>
      <div>
        <label className={labelClass}>Subtitulo</label>
        <input type="text" className={inputClass} value={formData.subtitulo || ''} onChange={e => updateField('subtitulo', e.target.value)} placeholder="Subtitulo do hero" />
      </div>
      <div>
        <label className={labelClass}>Descricao</label>
        <textarea className={inputClass} rows={4} value={formData.descricao || ''} onChange={e => updateField('descricao', e.target.value)} placeholder="Descricao do hero" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>CTA Primario - Texto</label>
          <input type="text" className={inputClass} value={formData.cta_primario?.texto || ''} onChange={e => updateField('cta_primario.texto', e.target.value)} placeholder="Ex: Acessar Sistema" />
        </div>
        <div>
          <label className={labelClass}>CTA Primario - Link</label>
          <input type="text" className={inputClass} value={formData.cta_primario?.href || ''} onChange={e => updateField('cta_primario.href', e.target.value)} placeholder="Ex: /login" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>CTA Secundario - Texto</label>
          <input type="text" className={inputClass} value={formData.cta_secundario?.texto || ''} onChange={e => updateField('cta_secundario.texto', e.target.value)} placeholder="Ex: Saiba Mais" />
        </div>
        <div>
          <label className={labelClass}>CTA Secundario - Link</label>
          <input type="text" className={inputClass} value={formData.cta_secundario?.href || ''} onChange={e => updateField('cta_secundario.href', e.target.value)} placeholder="Ex: #sobre" />
        </div>
      </div>
    </div>
  )

  const renderSobreTab = () => (
    <div className="space-y-4">
      <div>
        <label className={labelClass}>Titulo</label>
        <input type="text" className={inputClass} value={formData.titulo || ''} onChange={e => updateField('titulo', e.target.value)} placeholder="Titulo da secao Sobre" />
      </div>
      <div>
        <label className={labelClass}>Texto</label>
        <textarea className={inputClass} rows={6} value={formData.texto || ''} onChange={e => updateField('texto', e.target.value)} placeholder="Texto principal da secao sobre" />
      </div>
      <div>
        <label className={labelClass}>Missao</label>
        <textarea className={inputClass} rows={3} value={formData.missao || ''} onChange={e => updateField('missao', e.target.value)} placeholder="Missao da instituicao" />
      </div>
      <div>
        <label className={labelClass}>Visao</label>
        <textarea className={inputClass} rows={3} value={formData.visao || ''} onChange={e => updateField('visao', e.target.value)} placeholder="Visao da instituicao" />
      </div>
    </div>
  )

  const renderSocialTab = () => (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">Configure os links das redes sociais da SEMED. Apenas redes com URL preenchida serao exibidas no site.</p>
      </div>
      <div>
        <label className={labelClass}>Facebook (URL da pagina)</label>
        <input type="url" className={inputClass} value={formData.facebook_url || ''} onChange={e => updateField('facebook_url', e.target.value)} placeholder="https://www.facebook.com/semedssbvpa/" />
      </div>
      <div>
        <label className={labelClass}>Instagram (URL do perfil)</label>
        <input type="url" className={inputClass} value={formData.instagram_url || ''} onChange={e => updateField('instagram_url', e.target.value)} placeholder="https://www.instagram.com/semed_ssbv/" />
      </div>
      <div>
        <label className={labelClass}>YouTube (URL do canal)</label>
        <input type="url" className={inputClass} value={formData.youtube_url || ''} onChange={e => updateField('youtube_url', e.target.value)} placeholder="https://www.youtube.com/@semed" />
      </div>
      <div>
        <label className={labelClass}>X / Twitter (URL do perfil)</label>
        <input type="url" className={inputClass} value={formData.twitter_url || ''} onChange={e => updateField('twitter_url', e.target.value)} placeholder="https://x.com/semed_ssbv" />
      </div>
      <div>
        <label className={labelClass}>TikTok (URL do perfil)</label>
        <input type="url" className={inputClass} value={formData.tiktok_url || ''} onChange={e => updateField('tiktok_url', e.target.value)} placeholder="https://www.tiktok.com/@semed_ssbv" />
      </div>
      <div>
        <label className={labelClass}>Telegram (URL do canal/grupo)</label>
        <input type="url" className={inputClass} value={formData.telegram_url || ''} onChange={e => updateField('telegram_url', e.target.value)} placeholder="https://t.me/semed_ssbv" />
      </div>
      <div>
        <label className={labelClass}>WhatsApp (numero com DDD e codigo do pais)</label>
        <input type="text" className={inputClass} value={formData.whatsapp_numero || ''} onChange={e => updateField('whatsapp_numero', e.target.value)} placeholder="5591999999999" />
      </div>
      <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.mostrar_feed_facebook ?? false}
            onChange={e => updateField('mostrar_feed_facebook', e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className={labelClass + ' mb-0'}>Exibir feed do Facebook no site (publicacoes recentes)</span>
        </label>
      </div>
    </div>
  )

  const renderEstatisticasTab = () => (
    <div className="space-y-4">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={formData.auto_count ?? true}
          onChange={e => updateField('auto_count', e.target.checked)}
          className="w-4 h-4 text-indigo-600 border-gray-300 dark:border-slate-600 rounded focus:ring-indigo-500"
        />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Calcular automaticamente dos dados do sistema</span>
      </label>

      {!formData.auto_count && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className={labelClass}>Itens de Estatistica</label>
            <button
              type="button"
              onClick={() => addItem('items', { label: '', valor: '' })}
              className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
            >
              <Plus className="w-4 h-4" /> Adicionar
            </button>
          </div>
          {(formData.items || []).map((item: any, i: number) => (
            <div key={i} className="flex items-start gap-2">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <input type="text" className={inputClass} value={item.label || ''} onChange={e => updateField(`items.${i}.label`, e.target.value)} placeholder="Label (ex: Alunos)" />
                <input type="text" className={inputClass} value={item.valor || ''} onChange={e => updateField(`items.${i}.valor`, e.target.value)} placeholder="Valor (ex: 1500)" />
              </div>
              <button type="button" onClick={() => removeItem('items', i)} className="mt-1 p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderServicosTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className={labelClass}>Servicos</label>
        <button
          type="button"
          onClick={() => addItem('items', { titulo: '', descricao: '', icone: '' })}
          className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
        >
          <Plus className="w-4 h-4" /> Adicionar
        </button>
      </div>
      {(formData.items || []).map((item: any, i: number) => (
        <div key={i} className={`${cardClass} relative`}>
          <button type="button" onClick={() => removeItem('items', i)} className="absolute top-3 right-3 p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg">
            <Trash2 className="w-4 h-4" />
          </button>
          <div className="space-y-3 pr-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Titulo</label>
                <input type="text" className={inputClass} value={item.titulo || ''} onChange={e => updateField(`items.${i}.titulo`, e.target.value)} placeholder="Nome do servico" />
              </div>
              <div>
                <label className={labelClass}>Icone</label>
                <input type="text" className={inputClass} value={item.icone || ''} onChange={e => updateField(`items.${i}.icone`, e.target.value)} placeholder="Nome do icone (ex: BookOpen)" />
              </div>
            </div>
            <div>
              <label className={labelClass}>Descricao</label>
              <textarea className={inputClass} rows={2} value={item.descricao || ''} onChange={e => updateField(`items.${i}.descricao`, e.target.value)} placeholder="Descricao do servico" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  const renderNoticiasTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className={labelClass}>Noticias</label>
        <button
          type="button"
          onClick={() => addItem('items', { titulo: '', data: '', resumo: '', conteudo: '' })}
          className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
        >
          <Plus className="w-4 h-4" /> Adicionar
        </button>
      </div>
      {(formData.items || []).map((item: any, i: number) => (
        <div key={i} className={`${cardClass} relative`}>
          <button type="button" onClick={() => removeItem('items', i)} className="absolute top-3 right-3 p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg">
            <Trash2 className="w-4 h-4" />
          </button>
          <div className="space-y-3 pr-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Titulo</label>
                <input type="text" className={inputClass} value={item.titulo || ''} onChange={e => updateField(`items.${i}.titulo`, e.target.value)} placeholder="Titulo da noticia" />
              </div>
              <div>
                <label className={labelClass}>Data</label>
                <input type="text" className={inputClass} value={item.data || ''} onChange={e => updateField(`items.${i}.data`, e.target.value)} placeholder="Ex: 2026-03-18" />
              </div>
            </div>
            <div>
              <label className={labelClass}>Resumo</label>
              <input type="text" className={inputClass} value={item.resumo || ''} onChange={e => updateField(`items.${i}.resumo`, e.target.value)} placeholder="Resumo breve da noticia" />
            </div>
            <div>
              <label className={labelClass}>Conteudo</label>
              <textarea className={inputClass} rows={4} value={item.conteudo || ''} onChange={e => updateField(`items.${i}.conteudo`, e.target.value)} placeholder="Conteudo completo da noticia" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  const renderEscolasTab = () => (
    <div className="space-y-4">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={formData.mostrar_do_banco ?? true}
          onChange={e => updateField('mostrar_do_banco', e.target.checked)}
          className="w-4 h-4 text-indigo-600 border-gray-300 dark:border-slate-600 rounded focus:ring-indigo-500"
        />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Mostrar escolas cadastradas no sistema</span>
      </label>
      <div>
        <label className={labelClass}>Titulo da Secao</label>
        <input type="text" className={inputClass} value={formData.titulo || ''} onChange={e => updateField('titulo', e.target.value)} placeholder="Ex: Nossas Escolas" />
      </div>
    </div>
  )

  const renderContatoTab = () => (
    <div className="space-y-4">
      <div>
        <label className={labelClass}>Endereco</label>
        <input type="text" className={inputClass} value={formData.endereco || ''} onChange={e => updateField('endereco', e.target.value)} placeholder="Endereco completo" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Telefone</label>
          <input type="text" className={inputClass} value={formData.telefone || ''} onChange={e => updateField('telefone', e.target.value)} placeholder="(00) 0000-0000" />
        </div>
        <div>
          <label className={labelClass}>E-mail</label>
          <input type="text" className={inputClass} value={formData.email || ''} onChange={e => updateField('email', e.target.value)} placeholder="contato@exemplo.com" />
        </div>
      </div>
      <div>
        <label className={labelClass}>Horario de Funcionamento</label>
        <input type="text" className={inputClass} value={formData.horario_funcionamento || ''} onChange={e => updateField('horario_funcionamento', e.target.value)} placeholder="Ex: Seg a Sex, 8h as 17h" />
      </div>
      <div>
        <label className={labelClass}>URL do Mapa (embed, opcional)</label>
        <input type="text" className={inputClass} value={formData.mapa_embed_url || ''} onChange={e => updateField('mapa_embed_url', e.target.value)} placeholder="https://www.google.com/maps/embed?..." />
      </div>
    </div>
  )

  const renderRodapeTab = () => (
    <div className="space-y-6">
      <div>
        <label className={labelClass}>Texto de Copyright</label>
        <input type="text" className={inputClass} value={formData.texto_copyright || ''} onChange={e => updateField('texto_copyright', e.target.value)} placeholder="Ex: 2026 Educatec. Todos os direitos reservados." />
      </div>

      {/* Links Uteis */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className={labelClass}>Links Uteis</label>
          <button
            type="button"
            onClick={() => addItem('links_uteis', { label: '', href: '' })}
            className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
          >
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        </div>
        {(formData.links_uteis || []).map((item: any, i: number) => (
          <div key={i} className="flex items-start gap-2">
            <div className="flex-1 grid grid-cols-2 gap-2">
              <input type="text" className={inputClass} value={item.label || ''} onChange={e => updateField(`links_uteis.${i}.label`, e.target.value)} placeholder="Label do link" />
              <input type="text" className={inputClass} value={item.href || ''} onChange={e => updateField(`links_uteis.${i}.href`, e.target.value)} placeholder="URL do link" />
            </div>
            <button type="button" onClick={() => removeItem('links_uteis', i)} className="mt-1 p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Redes Sociais */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className={labelClass}>Redes Sociais</label>
          <button
            type="button"
            onClick={() => addItem('redes_sociais', { nome: '', url: '' })}
            className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
          >
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        </div>
        {(formData.redes_sociais || []).map((item: any, i: number) => (
          <div key={i} className="flex items-start gap-2">
            <div className="flex-1 grid grid-cols-2 gap-2">
              <input type="text" className={inputClass} value={item.nome || ''} onChange={e => updateField(`redes_sociais.${i}.nome`, e.target.value)} placeholder="Nome (ex: Instagram)" />
              <input type="text" className={inputClass} value={item.url || ''} onChange={e => updateField(`redes_sociais.${i}.url`, e.target.value)} placeholder="URL do perfil" />
            </div>
            <button type="button" onClick={() => removeItem('redes_sociais', i)} className="mt-1 p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'manutencao': return renderManutencaoTab()
      case 'hero': return renderHeroTab()
      case 'sobre': return renderSobreTab()
      case 'social': return renderSocialTab()
      case 'estatisticas': return renderEstatisticasTab()
      case 'servicos': return renderServicosTab()
      case 'noticias': return renderNoticiasTab()
      case 'escolas': return renderEscolasTab()
      case 'contato': return renderContatoTab()
      case 'rodape': return renderRodapeTab()
      default: return null
    }
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
          {renderTabContent()}
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
