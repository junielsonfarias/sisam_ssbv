'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState, useCallback } from 'react'
import { GraduationCap } from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import SidebarSeries from './components/SidebarSeries'
import PainelSerie from './components/PainelSerie'

// ============================================
// Tipos
// ============================================

interface SerieEscolar {
  id: string
  codigo: string
  nome: string
  etapa: string
  ordem: number
  media_aprovacao: number | null
  media_recuperacao: number | null
  nota_maxima: number | null
  max_dependencias: number
  formula_nota_final: string
  permite_recuperacao: boolean
  idade_minima: number | null
  idade_maxima: number | null
  ativo: boolean
  total_disciplinas: number
  tipo_avaliacao_id: string | null
  regra_avaliacao_id: string | null
}

interface TipoAvaliacao {
  id: string
  codigo: string
  nome: string
  tipo_resultado: string
}

interface RegraAvaliacao {
  id: string
  nome: string
  tipo_avaliacao_id: string
  tipo_avaliacao_nome: string
  tipo_periodo: string
  qtd_periodos: number
  media_aprovacao: number | null
  media_recuperacao: number | null
  nota_maxima: number | null
  permite_recuperacao: boolean
  max_dependencias: number
  formula_media: string
  aprovacao_automatica: boolean
}

interface Disciplina {
  id: string
  nome: string
  codigo: string | null
  abreviacao: string | null
}

interface DisciplinaForm {
  disciplina_id: string
  habilitada: boolean
  obrigatoria: boolean
  carga_horaria_semanal: number
}

interface SerieDisciplina {
  id: string
  serie_id: string
  disciplina_id: string
  obrigatoria: boolean
  carga_horaria_semanal: number
  ativo: boolean
  disciplina_nome: string
}

// ============================================
// Constantes
// ============================================

const ETAPAS = [
  { valor: 'educacao_infantil', label: 'Educacao Infantil', cor: 'bg-pink-100 text-pink-800' },
  { valor: 'fundamental_anos_iniciais', label: 'Fund. Anos Iniciais', cor: 'bg-blue-100 text-blue-800' },
  { valor: 'fundamental_anos_finais', label: 'Fund. Anos Finais', cor: 'bg-indigo-100 text-indigo-800' },
  { valor: 'eja', label: 'EJA', cor: 'bg-amber-100 text-amber-800' },
]

const FORMULAS = [
  { valor: 'media_aritmetica', label: 'Media Aritmetica' },
  { valor: 'media_ponderada', label: 'Media Ponderada' },
  { valor: 'soma', label: 'Soma' },
]

// ============================================
// Componente Principal
// ============================================

export default function SeriesEscolaresPage() {
  const toast = useToast()
  const [series, setSeries] = useState<SerieEscolar[]>([])
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [serieSelecionada, setSerieSelecionada] = useState<SerieEscolar | null>(null)
  const [etapasAbertas, setEtapasAbertas] = useState<string[]>(['educacao_infantil', 'fundamental_anos_iniciais', 'fundamental_anos_finais', 'eja'])
  const [formSerie, setFormSerie] = useState<Partial<SerieEscolar>>({})
  const [disciplinasForm, setDisciplinasForm] = useState<DisciplinaForm[]>([])
  const [salvandoDisciplinas, setSalvandoDisciplinas] = useState(false)
  const [tiposAvaliacao, setTiposAvaliacao] = useState<TipoAvaliacao[]>([])
  const [regrasAvaliacao, setRegrasAvaliacao] = useState<RegraAvaliacao[]>([])
  const [regrasFiltradas, setRegrasFiltradas] = useState<RegraAvaliacao[]>([])

  // ============================================
  // Carregar dados
  // ============================================

  const carregarSeries = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/series-escolares')
      if (res.ok) setSeries(await res.json())
    } catch (error) {
      toast.error('Erro ao carregar séries escolares')
    }
  }, [toast])

  const carregarDisciplinas = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/disciplinas-escolares?ativas=false')
      if (res.ok) setDisciplinas(await res.json())
    } catch (error) {
      console.error('[SeriesEscolares] Erro ao carregar disciplinas:', (error as Error).message)
    }
  }, [])

  const carregarTiposRegras = useCallback(async () => {
    try {
      const [tiposRes, regrasRes] = await Promise.all([
        fetch('/api/admin/tipos-avaliacao'),
        fetch('/api/admin/regras-avaliacao'),
      ])
      if (tiposRes.ok) setTiposAvaliacao(await tiposRes.json())
      if (regrasRes.ok) setRegrasAvaliacao(await regrasRes.json())
    } catch (error) {
      console.error('[SeriesEscolares] Erro ao carregar tipos/regras:', (error as Error).message)
    }
  }, [])

  const carregarDisciplinasSerie = useCallback(async (serieId: string) => {
    try {
      const res = await fetch(`/api/admin/series-escolares/${serieId}/disciplinas`)
      if (res.ok) {
        const data: SerieDisciplina[] = await res.json()
        const form: DisciplinaForm[] = disciplinas.map(d => {
          const vinculada = data.find(sd => sd.disciplina_id === d.id && sd.ativo)
          return {
            disciplina_id: d.id,
            habilitada: !!vinculada,
            obrigatoria: vinculada?.obrigatoria ?? true,
            carga_horaria_semanal: vinculada?.carga_horaria_semanal ?? 4,
          }
        })
        setDisciplinasForm(form)
      }
    } catch (error) {
      console.error('[SeriesEscolares] Erro ao carregar disciplinas da série:', (error as Error).message)
    }
  }, [disciplinas])

  useEffect(() => {
    const init = async () => {
      setCarregando(true)
      await Promise.all([carregarSeries(), carregarDisciplinas(), carregarTiposRegras()])
      setCarregando(false)
    }
    init()
  }, [carregarSeries, carregarDisciplinas, carregarTiposRegras])

  // ============================================
  // Handlers
  // ============================================

  const selecionarSerie = useCallback((serie: SerieEscolar) => {
    setSerieSelecionada(serie)
    setFormSerie({
      media_aprovacao: serie.media_aprovacao,
      media_recuperacao: serie.media_recuperacao,
      nota_maxima: serie.nota_maxima,
      max_dependencias: serie.max_dependencias,
      formula_nota_final: serie.formula_nota_final,
      permite_recuperacao: serie.permite_recuperacao,
      idade_minima: serie.idade_minima,
      idade_maxima: serie.idade_maxima,
      tipo_avaliacao_id: serie.tipo_avaliacao_id,
      regra_avaliacao_id: serie.regra_avaliacao_id,
    })
    if (serie.tipo_avaliacao_id) {
      setRegrasFiltradas(regrasAvaliacao.filter(r => r.tipo_avaliacao_id === serie.tipo_avaliacao_id))
    } else {
      setRegrasFiltradas(regrasAvaliacao)
    }
    carregarDisciplinasSerie(serie.id)
  }, [carregarDisciplinasSerie, regrasAvaliacao])

  const salvarSerie = async () => {
    if (!serieSelecionada) return
    setSalvando(true)
    try {
      const res = await fetch('/api/admin/series-escolares', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: serieSelecionada.id, ...formSerie }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Serie atualizada com sucesso')
        await carregarSeries()
        setSerieSelecionada(data)
      } else {
        toast.error(data.mensagem || 'Erro ao salvar')
      }
    } catch (error) {
      toast.error('Erro ao salvar série')
    } finally {
      setSalvando(false)
    }
  }

  const salvarDisciplinas = async () => {
    if (!serieSelecionada) return
    setSalvandoDisciplinas(true)
    try {
      const habilitadas = disciplinasForm.filter(d => d.habilitada).map(d => ({
        disciplina_id: d.disciplina_id,
        obrigatoria: d.obrigatoria,
        carga_horaria_semanal: d.carga_horaria_semanal,
      }))
      const res = await fetch(`/api/admin/series-escolares/${serieSelecionada.id}/disciplinas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disciplinas: habilitadas }),
      })
      if (res.ok) {
        toast.success('Disciplinas salvas com sucesso')
        await carregarSeries()
      } else {
        const data = await res.json()
        toast.error(data.mensagem || 'Erro ao salvar disciplinas')
      }
    } catch (error) {
      toast.error('Erro ao salvar disciplinas')
    } finally {
      setSalvandoDisciplinas(false)
    }
  }

  const toggleEtapa = (etapa: string) => {
    setEtapasAbertas(prev =>
      prev.includes(etapa) ? prev.filter(e => e !== etapa) : [...prev, etapa]
    )
  }

  const toggleDisciplina = (idx: number) => {
    setDisciplinasForm(prev => {
      const novo = [...prev]
      novo[idx] = { ...novo[idx], habilitada: !novo[idx].habilitada }
      return novo
    })
  }

  const atualizarDisciplina = (idx: number, campo: string, valor: any) => {
    setDisciplinasForm(prev => {
      const novo = [...prev]
      novo[idx] = { ...novo[idx], [campo]: valor }
      return novo
    })
  }

  // ============================================
  // Render
  // ============================================

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-900 text-white p-6 rounded-b-lg shadow-lg">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <GraduationCap className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Series Escolares</h1>
                <p className="text-slate-300 text-sm mt-1">Gerencie as series e etapas de ensino do municipio</p>
              </div>
            </div>
          </div>
        </div>

        {carregando ? (
          <div className="flex justify-center items-center py-20">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="max-w-7xl mx-auto p-4">
            <div className="flex gap-6 flex-col lg:flex-row">
              <SidebarSeries
                etapas={ETAPAS}
                series={series}
                etapasAbertas={etapasAbertas}
                serieSelecionada={serieSelecionada}
                onToggleEtapa={toggleEtapa}
                onSelecionarSerie={selecionarSerie}
              />
              <PainelSerie
                serieSelecionada={serieSelecionada}
                formSerie={formSerie}
                setFormSerie={setFormSerie}
                disciplinas={disciplinas}
                disciplinasForm={disciplinasForm}
                tiposAvaliacao={tiposAvaliacao}
                regrasAvaliacao={regrasAvaliacao}
                regrasFiltradas={regrasFiltradas}
                setRegrasFiltradas={setRegrasFiltradas}
                salvando={salvando}
                salvandoDisciplinas={salvandoDisciplinas}
                etapas={ETAPAS}
                formulas={FORMULAS}
                onSalvarSerie={salvarSerie}
                onSalvarDisciplinas={salvarDisciplinas}
                onToggleDisciplina={toggleDisciplina}
                onAtualizarDisciplina={atualizarDisciplina}
              />
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
