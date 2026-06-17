'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Save, School, Building2, MapPin,
  BookOpen, Calendar, Users, BarChart3, ClipboardList
} from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import {
  AbaDadosGerais,
  AbaInfraestrutura,
  AbaSeriesOferecidas,
  AbaAvaliacao,
  AbaCalendarioLetivo,
  AbaTurmas,
  AbaEstatisticas,
} from './components'
import type { AbaId, EscolaDetalhe, SerieEscola, PoloSimples } from './components'

// ============================================
// Componente Principal
// ============================================

export default function EscolaDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const escolaId = params.id as string
  const anoLetivo = new Date().getFullYear().toString()

  const [abaAtiva, setAbaAtiva] = useState<AbaId>('dados')
  const [escola, setEscola] = useState<EscolaDetalhe | null>(null)
  const [seriesEscola, setSeriesEscola] = useState<SerieEscola[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  // Form data state (mirrors escola fields)
  const [formData, setFormData] = useState<Partial<EscolaDetalhe>>({})
  const [polos, setPolos] = useState<PoloSimples[]>([])

  const carregarEscola = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/escolas/${escolaId}?ano_letivo=${anoLetivo}`)
      if (!res.ok) {
        toast.error('Escola nao encontrada')
        router.push('/admin/escolas')
        return
      }
      const data = await res.json()
      setEscola(data)
      setFormData(data)
    } catch (error) {
      toast.error('Erro ao carregar dados da escola')
    }
  }, [escolaId, anoLetivo])

  const carregarSeries = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/escolas/${escolaId}/series?ano_letivo=${anoLetivo}`)
      if (res.ok) {
        const data = await res.json()
        setSeriesEscola(data.series || [])
      }
    } catch (error) {
    }
  }, [escolaId, anoLetivo])

  const carregarPolos = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/polos')
      if (res.ok) {
        const data = await res.json()
        setPolos(data)
      }
    } catch (error) {
    }
  }, [])

  useEffect(() => {
    const carregarTudo = async () => {
      setCarregando(true)
      await Promise.all([carregarEscola(), carregarSeries(), carregarPolos()])
      setCarregando(false)
    }
    carregarTudo()
  }, [carregarEscola, carregarSeries, carregarPolos])

  const handleSalvar = async () => {
    setSalvando(true)
    try {
      // Remover campos computados/readonly que nao sao colunas da tabela
      const { total_turmas, total_alunos, total_pcd, polo_nome, id, criado_em, atualizado_em, ...dadosParaSalvar } = formData as any
      const res = await fetch(`/api/admin/escolas/${escolaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosParaSalvar),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Escola atualizada com sucesso!')
        await carregarEscola()
      } else {
        toast.error(data.mensagem || 'Erro ao salvar escola')
      }
    } catch (error) {
      toast.error('Erro ao salvar escola')
    } finally {
      setSalvando(false)
    }
  }

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const abas: { id: AbaId; label: string; icon: any }[] = [
    { id: 'dados', label: 'Dados Gerais', icon: Building2 },
    { id: 'infraestrutura', label: 'Infraestrutura', icon: MapPin },
    { id: 'series', label: 'Series Oferecidas', icon: BookOpen },
    { id: 'avaliacao', label: 'Avaliacao', icon: ClipboardList },
    { id: 'calendario', label: 'Calendario Letivo', icon: Calendar },
    { id: 'turmas', label: 'Turmas', icon: Users },
    { id: 'estatisticas', label: 'Estatisticas', icon: BarChart3 },
  ]

  if (carregando) {
    return (
      <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola']}>
        <LoadingSpinner text="Carregando escola..." centered />
      </ProtectedRoute>
    )
  }

  if (!escola) {
    return (
      <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola']}>
        <div className="text-center py-12">
          <School className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-lg font-medium text-gray-500">Escola nao encontrada</p>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin/escolas')}
                className="bg-white/20 hover:bg-white/30 rounded-lg p-2 transition-colors"
                title="Voltar"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="bg-white/20 rounded-lg p-2">
                <School className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{escola.nome}</h1>
                <div className="flex items-center gap-2 mt-1">
                  {escola.codigo_inep && (
                    <span className="bg-white/20 text-white text-xs font-mono px-2 py-0.5 rounded">
                      INEP: {escola.codigo_inep}
                    </span>
                  )}
                  {escola.codigo && (
                    <span className="bg-white/20 text-white text-xs font-mono px-2 py-0.5 rounded">
                      Cod: {escola.codigo}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={handleSalvar}
              disabled={salvando}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition-all font-medium"
            >
              <Save className="w-4 h-4" />
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>

        {/* Abas */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
          <div className="flex border-b border-gray-200 dark:border-slate-700 overflow-x-auto">
            {abas.map(aba => {
              const Icon = aba.icon
              return (
                <button
                  key={aba.id}
                  onClick={() => setAbaAtiva(aba.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors whitespace-nowrap min-w-[120px]
                    ${abaAtiva === aba.id
                      ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/20'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{aba.label}</span>
                </button>
              )
            })}
          </div>

          <div className="p-4 sm:p-6">
            {abaAtiva === 'dados' && (
              <AbaDadosGerais formData={formData} updateField={updateField} polos={polos} />
            )}
            {abaAtiva === 'infraestrutura' && (
              <AbaInfraestrutura formData={formData} updateField={updateField} />
            )}
            {abaAtiva === 'series' && (
              <AbaSeriesOferecidas
                escolaId={escolaId}
                anoLetivo={anoLetivo}
                seriesEscola={seriesEscola}
                onRecarregar={carregarSeries}
                toast={toast}
              />
            )}
            {abaAtiva === 'avaliacao' && (
              <AbaAvaliacao escolaId={escolaId} toast={toast} />
            )}
            {abaAtiva === 'calendario' && (
              <AbaCalendarioLetivo escolaId={escolaId} anoLetivo={anoLetivo} />
            )}
            {abaAtiva === 'turmas' && (
              <AbaTurmas escolaId={escolaId} anoLetivo={anoLetivo} />
            )}
            {abaAtiva === 'estatisticas' && (
              <AbaEstatisticas escola={escola} escolaId={escolaId} anoLetivo={anoLetivo} />
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
