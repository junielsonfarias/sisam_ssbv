'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState, useCallback } from 'react'
import { GraduationCap, ChevronDown, ChevronRight, Save, BookOpen, Check, X } from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

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
}

interface Disciplina {
  id: string
  nome: string
  codigo: string | null
  abreviacao: string | null
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

interface DisciplinaForm {
  disciplina_id: string
  habilitada: boolean
  obrigatoria: boolean
  carga_horaria_semanal: number
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

  // ============================================
  // Carregar dados
  // ============================================

  const carregarSeries = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/series-escolares')
      if (res.ok) {
        const data = await res.json()
        setSeries(data)
      }
    } catch (error) {
      console.error('Erro ao carregar séries:', error)
      toast.error('Erro ao carregar séries escolares')
    }
  }, [toast])

  const carregarDisciplinas = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/disciplinas-escolares?ativas=false')
      if (res.ok) {
        const data = await res.json()
        setDisciplinas(data)
      }
    } catch (error) {
      console.error('Erro ao carregar disciplinas:', error)
    }
  }, [])

  const carregarDisciplinasSerie = useCallback(async (serieId: string) => {
    try {
      const res = await fetch(`/api/admin/series-escolares/${serieId}/disciplinas`)
      if (res.ok) {
        const data: SerieDisciplina[] = await res.json()
        // Montar form com todas disciplinas
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
      console.error('Erro ao carregar disciplinas da série:', error)
    }
  }, [disciplinas])

  useEffect(() => {
    const init = async () => {
      setCarregando(true)
      await Promise.all([carregarSeries(), carregarDisciplinas()])
      setCarregando(false)
    }
    init()
  }, [carregarSeries, carregarDisciplinas])

  // ============================================
  // Selecionar série
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
    })
    carregarDisciplinasSerie(serie.id)
  }, [carregarDisciplinasSerie])

  // ============================================
  // Salvar série
  // ============================================

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

  // ============================================
  // Salvar disciplinas
  // ============================================

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

  // ============================================
  // Helpers
  // ============================================

  const toggleEtapa = (etapa: string) => {
    setEtapasAbertas(prev =>
      prev.includes(etapa) ? prev.filter(e => e !== etapa) : [...prev, etapa]
    )
  }

  const getEtapaInfo = (etapa: string) => ETAPAS.find(e => e.valor === etapa)

  const seriesPorEtapa = (etapa: string) => series.filter(s => s.etapa === etapa)

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
              {/* Sidebar - Lista de séries por etapa */}
              <div className="lg:w-1/3 space-y-3">
                {ETAPAS.map(etapa => {
                  const seriesEtapa = seriesPorEtapa(etapa.valor)
                  const aberta = etapasAbertas.includes(etapa.valor)

                  return (
                    <div key={etapa.valor} className="bg-white rounded-lg shadow-sm border">
                      <button
                        onClick={() => toggleEtapa(etapa.valor)}
                        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {aberta ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${etapa.cor}`}>
                            {etapa.label}
                          </span>
                          <span className="text-xs text-gray-400">({seriesEtapa.length})</span>
                        </div>
                      </button>

                      {aberta && (
                        <div className="border-t">
                          {seriesEtapa.map(serie => (
                            <button
                              key={serie.id}
                              onClick={() => selecionarSerie(serie)}
                              className={`w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors border-b last:border-b-0 ${
                                serieSelecionada?.id === serie.id ? 'bg-emerald-50 border-l-4 border-l-emerald-500' : ''
                              }`}
                            >
                              <div>
                                <span className="font-medium text-sm">{serie.nome}</span>
                                <span className="text-xs text-gray-400 ml-2">({serie.codigo})</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {serie.total_disciplinas > 0 && (
                                  <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                    {serie.total_disciplinas} disc.
                                  </span>
                                )}
                                {!serie.ativo && (
                                  <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Inativo</span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Painel de detalhes */}
              <div className="lg:w-2/3">
                {serieSelecionada ? (
                  <div className="space-y-4">
                    {/* Cabeçalho da série */}
                    <div className="bg-white rounded-lg shadow-sm border p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h2 className="text-xl font-bold text-gray-800">{serieSelecionada.nome}</h2>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-500">Codigo: <strong>{serieSelecionada.codigo}</strong></span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getEtapaInfo(serieSelecionada.etapa)?.cor}`}>
                              {getEtapaInfo(serieSelecionada.etapa)?.label}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Campos editáveis */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Media Aprovacao</label>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="10"
                            value={formSerie.media_aprovacao ?? ''}
                            onChange={e => setFormSerie(prev => ({ ...prev, media_aprovacao: e.target.value ? parseFloat(e.target.value) : null }))}
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            placeholder="Ex: 6.0"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Media Recuperacao</label>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="10"
                            value={formSerie.media_recuperacao ?? ''}
                            onChange={e => setFormSerie(prev => ({ ...prev, media_recuperacao: e.target.value ? parseFloat(e.target.value) : null }))}
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            placeholder="Ex: 5.0"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Nota Maxima</label>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={formSerie.nota_maxima ?? ''}
                            onChange={e => setFormSerie(prev => ({ ...prev, nota_maxima: e.target.value ? parseFloat(e.target.value) : null }))}
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            placeholder="Ex: 10.0"
                          />
                        </div>

                        {serieSelecionada.etapa === 'fundamental_anos_finais' && (
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Max. Dependencias</label>
                            <input
                              type="number"
                              min="0"
                              max="5"
                              value={formSerie.max_dependencias ?? 0}
                              onChange={e => setFormSerie(prev => ({ ...prev, max_dependencias: parseInt(e.target.value) || 0 }))}
                              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Formula Nota Final</label>
                          <select
                            value={formSerie.formula_nota_final ?? 'media_aritmetica'}
                            onChange={e => setFormSerie(prev => ({ ...prev, formula_nota_final: e.target.value }))}
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          >
                            {FORMULAS.map(f => (
                              <option key={f.valor} value={f.valor}>{f.label}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-3 pt-5">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formSerie.permite_recuperacao ?? true}
                              onChange={e => setFormSerie(prev => ({ ...prev, permite_recuperacao: e.target.checked }))}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                            <span className="ml-2 text-sm text-gray-600">Permite Recuperacao</span>
                          </label>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Idade Minima</label>
                          <input
                            type="number"
                            min="0"
                            max="99"
                            value={formSerie.idade_minima ?? ''}
                            onChange={e => setFormSerie(prev => ({ ...prev, idade_minima: e.target.value ? parseInt(e.target.value) : null }))}
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            placeholder="Opcional"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Idade Maxima</label>
                          <input
                            type="number"
                            min="0"
                            max="99"
                            value={formSerie.idade_maxima ?? ''}
                            onChange={e => setFormSerie(prev => ({ ...prev, idade_maxima: e.target.value ? parseInt(e.target.value) : null }))}
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            placeholder="Opcional"
                          />
                        </div>
                      </div>

                      <div className="mt-5 flex justify-end">
                        <button
                          onClick={salvarSerie}
                          disabled={salvando}
                          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                        >
                          <Save className="w-4 h-4" />
                          {salvando ? 'Salvando...' : 'Salvar Serie'}
                        </button>
                      </div>
                    </div>

                    {/* Disciplinas */}
                    <div className="bg-white rounded-lg shadow-sm border p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-slate-600" />
                          <h3 className="text-lg font-semibold text-gray-800">Disciplinas</h3>
                        </div>
                        <span className="text-xs text-gray-400">
                          {disciplinasForm.filter(d => d.habilitada).length} de {disciplinasForm.length} habilitadas
                        </span>
                      </div>

                      {disciplinasForm.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">
                          Nenhuma disciplina cadastrada. Cadastre disciplinas em &quot;Disciplinas e Periodos&quot;.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {disciplinasForm.map((df, idx) => {
                            const disc = disciplinas.find(d => d.id === df.disciplina_id)
                            if (!disc) return null
                            return (
                              <div
                                key={df.disciplina_id}
                                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                                  df.habilitada ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'
                                }`}
                              >
                                <button
                                  onClick={() => toggleDisciplina(idx)}
                                  className={`flex-shrink-0 w-6 h-6 rounded flex items-center justify-center border-2 transition-colors ${
                                    df.habilitada
                                      ? 'bg-emerald-500 border-emerald-500 text-white'
                                      : 'bg-white border-gray-300'
                                  }`}
                                >
                                  {df.habilitada && <Check className="w-4 h-4" />}
                                </button>

                                <span className={`flex-1 text-sm font-medium ${df.habilitada ? 'text-gray-800' : 'text-gray-400'}`}>
                                  {disc.nome}
                                  {disc.abreviacao && <span className="text-xs text-gray-400 ml-1">({disc.abreviacao})</span>}
                                </span>

                                {df.habilitada && (
                                  <div className="flex items-center gap-3">
                                    <label className="flex items-center gap-1 text-xs">
                                      <input
                                        type="checkbox"
                                        checked={df.obrigatoria}
                                        onChange={e => atualizarDisciplina(idx, 'obrigatoria', e.target.checked)}
                                        className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                                      />
                                      Obrig.
                                    </label>
                                    <div className="flex items-center gap-1">
                                      <label className="text-xs text-gray-500">CH:</label>
                                      <input
                                        type="number"
                                        min="1"
                                        max="20"
                                        value={df.carga_horaria_semanal}
                                        onChange={e => atualizarDisciplina(idx, 'carga_horaria_semanal', parseInt(e.target.value) || 1)}
                                        className="w-14 border rounded px-2 py-1 text-xs text-center focus:ring-2 focus:ring-emerald-500"
                                      />
                                      <span className="text-xs text-gray-400">h/sem</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {disciplinasForm.length > 0 && (
                        <div className="mt-4 flex justify-end">
                          <button
                            onClick={salvarDisciplinas}
                            disabled={salvandoDisciplinas}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                          >
                            <Save className="w-4 h-4" />
                            {salvandoDisciplinas ? 'Salvando...' : 'Salvar Disciplinas'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
                    <GraduationCap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-500">Selecione uma serie</h3>
                    <p className="text-sm text-gray-400 mt-1">Clique em uma serie na lista ao lado para ver e editar seus detalhes</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
