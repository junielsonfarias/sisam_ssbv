'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState, useCallback } from 'react'
import {
  ClipboardList, Plus, Edit, Trash2, ChevronDown, ChevronRight,
  Save, X, AlertTriangle, GraduationCap
} from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

// ============================================
// Tipos
// ============================================

interface TipoAvaliacao {
  id: string
  codigo: string
  nome: string
  descricao: string | null
  tipo_resultado: 'parecer' | 'conceito' | 'numerico' | 'misto'
  escala_conceitos: ConceitoEscala[] | null
  nota_minima: number
  nota_maxima: number
  permite_decimal: boolean
  ativo: boolean
}

interface ConceitoEscala {
  codigo: string
  nome: string
  valor_numerico: number
}

interface RegraAvaliacao {
  id: string
  nome: string
  descricao: string | null
  tipo_avaliacao_id: string
  tipo_avaliacao_nome: string
  tipo_avaliacao_codigo: string
  tipo_resultado: string
  tipo_periodo: string
  qtd_periodos: number
  media_aprovacao: number | null
  media_recuperacao: number | null
  nota_maxima: number | null
  permite_recuperacao: boolean
  recuperacao_por_periodo: boolean
  max_dependencias: number
  formula_media: string
  pesos_periodos: any[] | null
  arredondamento: string
  casas_decimais: number
  aprovacao_automatica: boolean
  ativo: boolean
  total_series: number
}

// ============================================
// Constantes
// ============================================

const TIPO_RESULTADO_BADGE: Record<string, { label: string; cor: string }> = {
  parecer: { label: 'Parecer', cor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300' },
  conceito: { label: 'Conceito', cor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' },
  numerico: { label: 'Numerico', cor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300' },
  misto: { label: 'Misto', cor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300' },
}

const TIPO_PERIODO_BADGE: Record<string, { label: string; cor: string }> = {
  anual: { label: 'Anual', cor: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
  semestral: { label: 'Semestral', cor: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300' },
  trimestral: { label: 'Trimestral', cor: 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300' },
  bimestral: { label: 'Bimestral', cor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300' },
}

const FORMULA_LABELS: Record<string, string> = {
  media_aritmetica: 'Media Aritmetica',
  media_ponderada: 'Media Ponderada',
  maior_nota: 'Maior Nota',
  soma_dividida: 'Soma Dividida',
}

const ARREDONDAMENTO_LABELS: Record<string, string> = {
  normal: 'Normal',
  cima: 'Para Cima',
  baixo: 'Para Baixo',
  nenhum: 'Nenhum',
}

// ============================================
// Componente Principal
// ============================================

export default function RegrasAvaliacaoPage() {
  const toast = useToast()
  const [abaAtiva, setAbaAtiva] = useState<'tipos' | 'regras'>('tipos')
  const [tipos, setTipos] = useState<TipoAvaliacao[]>([])
  const [regras, setRegras] = useState<RegraAvaliacao[]>([])
  const [carregando, setCarregando] = useState(true)

  // Modal tipo
  const [modalTipo, setModalTipo] = useState(false)
  const [tipoEditando, setTipoEditando] = useState<TipoAvaliacao | null>(null)
  const [formTipo, setFormTipo] = useState({
    codigo: '', nome: '', descricao: '', tipo_resultado: 'numerico' as string,
    nota_minima: 0, nota_maxima: 10, permite_decimal: true,
    escala_conceitos: [] as ConceitoEscala[],
  })
  const [salvandoTipo, setSalvandoTipo] = useState(false)

  // Modal regra
  const [modalRegra, setModalRegra] = useState(false)
  const [regraEditando, setRegraEditando] = useState<RegraAvaliacao | null>(null)
  const [formRegra, setFormRegra] = useState({
    nome: '', descricao: '', tipo_avaliacao_id: '',
    tipo_periodo: 'bimestral', qtd_periodos: 4,
    media_aprovacao: 6, media_recuperacao: 5, nota_maxima: 10,
    permite_recuperacao: true, recuperacao_por_periodo: false,
    max_dependencias: 0, formula_media: 'media_aritmetica',
    arredondamento: 'normal', casas_decimais: 1, aprovacao_automatica: false,
  })
  const [salvandoRegra, setSalvandoRegra] = useState(false)

  // Regras expandidas
  const [regrasExpandidas, setRegrasExpandidas] = useState<string[]>([])

  // ============================================
  // Carregar dados
  // ============================================

  const carregarDados = useCallback(async () => {
    try {
      const [tiposRes, regrasRes] = await Promise.all([
        fetch('/api/admin/tipos-avaliacao?todos=true'),
        fetch('/api/admin/regras-avaliacao?todos=true'),
      ])
      if (tiposRes.ok) setTipos(await tiposRes.json())
      if (regrasRes.ok) setRegras(await regrasRes.json())
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar dados')
    } finally {
      setCarregando(false)
    }
  }, [toast])

  useEffect(() => { carregarDados() }, [carregarDados])

  // ============================================
  // Tipos - CRUD
  // ============================================

  const abrirModalTipo = (tipo?: TipoAvaliacao) => {
    if (tipo) {
      setTipoEditando(tipo)
      setFormTipo({
        codigo: tipo.codigo,
        nome: tipo.nome,
        descricao: tipo.descricao || '',
        tipo_resultado: tipo.tipo_resultado,
        nota_minima: parseFloat(String(tipo.nota_minima)) || 0,
        nota_maxima: parseFloat(String(tipo.nota_maxima)) || 10,
        permite_decimal: tipo.permite_decimal,
        escala_conceitos: tipo.escala_conceitos || [],
      })
    } else {
      setTipoEditando(null)
      setFormTipo({
        codigo: '', nome: '', descricao: '', tipo_resultado: 'numerico',
        nota_minima: 0, nota_maxima: 10, permite_decimal: true,
        escala_conceitos: [],
      })
    }
    setModalTipo(true)
  }

  const salvarTipo = async () => {
    if (!formTipo.codigo || !formTipo.nome || !formTipo.tipo_resultado) {
      toast.error('Preencha codigo, nome e tipo de resultado')
      return
    }
    setSalvandoTipo(true)
    try {
      const payload = {
        ...formTipo,
        escala_conceitos: formTipo.tipo_resultado === 'conceito' ? formTipo.escala_conceitos : null,
        ...(tipoEditando ? { id: tipoEditando.id } : {}),
      }
      const res = await fetch('/api/admin/tipos-avaliacao', {
        method: tipoEditando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(tipoEditando ? 'Tipo atualizado com sucesso' : 'Tipo criado com sucesso')
        setModalTipo(false)
        await carregarDados()
      } else {
        toast.error(data.mensagem || 'Erro ao salvar tipo')
      }
    } catch (error) {
      toast.error('Erro ao salvar tipo')
    } finally {
      setSalvandoTipo(false)
    }
  }

  // ============================================
  // Regras - CRUD
  // ============================================

  const abrirModalRegra = (regra?: RegraAvaliacao) => {
    if (regra) {
      setRegraEditando(regra)
      setFormRegra({
        nome: regra.nome,
        descricao: regra.descricao || '',
        tipo_avaliacao_id: regra.tipo_avaliacao_id,
        tipo_periodo: regra.tipo_periodo,
        qtd_periodos: regra.qtd_periodos,
        media_aprovacao: parseFloat(String(regra.media_aprovacao)) || 0,
        media_recuperacao: parseFloat(String(regra.media_recuperacao)) || 0,
        nota_maxima: parseFloat(String(regra.nota_maxima)) || 10,
        permite_recuperacao: regra.permite_recuperacao,
        recuperacao_por_periodo: regra.recuperacao_por_periodo,
        max_dependencias: regra.max_dependencias,
        formula_media: regra.formula_media,
        arredondamento: regra.arredondamento,
        casas_decimais: regra.casas_decimais,
        aprovacao_automatica: regra.aprovacao_automatica,
      })
    } else {
      setRegraEditando(null)
      setFormRegra({
        nome: '', descricao: '', tipo_avaliacao_id: '',
        tipo_periodo: 'bimestral', qtd_periodos: 4,
        media_aprovacao: 6, media_recuperacao: 5, nota_maxima: 10,
        permite_recuperacao: true, recuperacao_por_periodo: false,
        max_dependencias: 0, formula_media: 'media_aritmetica',
        arredondamento: 'normal', casas_decimais: 1, aprovacao_automatica: false,
      })
    }
    setModalRegra(true)
  }

  const salvarRegra = async () => {
    if (!formRegra.nome || !formRegra.tipo_avaliacao_id) {
      toast.error('Preencha nome e tipo de avaliacao')
      return
    }
    setSalvandoRegra(true)
    try {
      const payload = {
        ...formRegra,
        ...(regraEditando ? { id: regraEditando.id } : {}),
      }
      const res = await fetch('/api/admin/regras-avaliacao', {
        method: regraEditando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(regraEditando ? 'Regra atualizada com sucesso' : 'Regra criada com sucesso')
        setModalRegra(false)
        await carregarDados()
      } else {
        toast.error(data.mensagem || 'Erro ao salvar regra')
      }
    } catch (error) {
      toast.error('Erro ao salvar regra')
    } finally {
      setSalvandoRegra(false)
    }
  }

  const excluirRegra = async (regra: RegraAvaliacao) => {
    if (parseInt(String(regra.total_series)) > 0) {
      toast.warning(`Esta regra esta vinculada a ${regra.total_series} serie(s). Desvincule antes de excluir.`)
      return
    }
    if (!confirm(`Deseja desativar a regra "${regra.nome}"?`)) return
    try {
      const res = await fetch(`/api/admin/regras-avaliacao?id=${regra.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        toast.success('Regra desativada com sucesso')
        await carregarDados()
      } else {
        toast.error(data.mensagem || 'Erro ao desativar regra')
      }
    } catch (error) {
      toast.error('Erro ao desativar regra')
    }
  }

  const toggleRegraExpandida = (id: string) => {
    setRegrasExpandidas(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    )
  }

  // ============================================
  // Conceitos helpers
  // ============================================

  const adicionarConceito = () => {
    setFormTipo(prev => ({
      ...prev,
      escala_conceitos: [...prev.escala_conceitos, { codigo: '', nome: '', valor_numerico: 0 }],
    }))
  }

  const removerConceito = (idx: number) => {
    setFormTipo(prev => ({
      ...prev,
      escala_conceitos: prev.escala_conceitos.filter((_, i) => i !== idx),
    }))
  }

  const atualizarConceito = (idx: number, campo: string, valor: any) => {
    setFormTipo(prev => ({
      ...prev,
      escala_conceitos: prev.escala_conceitos.map((c, i) =>
        i === idx ? { ...c, [campo]: campo === 'valor_numerico' ? parseFloat(valor) || 0 : valor } : c
      ),
    }))
  }

  // ============================================
  // Ajustar qtd_periodos automaticamente
  // ============================================

  const handleTipoPeriodoChange = (valor: string) => {
    const mapa: Record<string, number> = { anual: 1, semestral: 2, trimestral: 3, bimestral: 4 }
    setFormRegra(prev => ({
      ...prev,
      tipo_periodo: valor,
      qtd_periodos: mapa[valor] || 4,
    }))
  }

  // ============================================
  // Conceito chips colors
  // ============================================

  const getConceitoColor = (codigo: string) => {
    const cores: Record<string, string> = {
      E: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      B: 'bg-blue-100 text-blue-800 border-blue-300',
      R: 'bg-amber-100 text-amber-800 border-amber-300',
      I: 'bg-red-100 text-red-800 border-red-300',
    }
    return cores[codigo] || 'bg-gray-100 text-gray-800 border-gray-300'
  }

  // ============================================
  // Render
  // ============================================

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-900 text-white p-6 rounded-b-lg shadow-lg">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <ClipboardList className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Regras de Avaliacao</h1>
                <p className="text-slate-300 text-sm mt-1">Gerencie os tipos e regras de avaliacao do municipio (padrao INEP)</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-4">
          {/* Abas */}
          <div className="flex border-b border-gray-200 dark:border-slate-700 mb-6">
            <button
              onClick={() => setAbaAtiva('tipos')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                abaAtiva === 'tipos'
                  ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              Tipos de Avaliacao
            </button>
            <button
              onClick={() => setAbaAtiva('regras')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                abaAtiva === 'regras'
                  ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              Regras de Avaliacao
            </button>
          </div>

          {carregando ? (
            <div className="flex justify-center items-center py-20">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              {/* ============================================ */}
              {/* TAB 1: TIPOS DE AVALIACAO */}
              {/* ============================================ */}
              {abaAtiva === 'tipos' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Tipos de Avaliacao</h2>
                    <button
                      onClick={() => abrirModalTipo()}
                      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Novo Tipo
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tipos.map(tipo => (
                      <div
                        key={tipo.id}
                        className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm border dark:border-slate-700 p-5 transition-all hover:shadow-md ${
                          !tipo.ativo ? 'opacity-60' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-800 dark:text-white">{tipo.nome}</h3>
                            <span className="text-xs text-gray-400 font-mono">{tipo.codigo}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TIPO_RESULTADO_BADGE[tipo.tipo_resultado]?.cor || ''}`}>
                              {TIPO_RESULTADO_BADGE[tipo.tipo_resultado]?.label || tipo.tipo_resultado}
                            </span>
                            <button
                              onClick={() => abrirModalTipo(tipo)}
                              className="p-1 text-gray-400 hover:text-emerald-600 transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {tipo.descricao && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{tipo.descricao}</p>
                        )}

                        {tipo.tipo_resultado === 'numerico' && (
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            Escala: <strong>{parseFloat(String(tipo.nota_minima))}</strong> a <strong>{parseFloat(String(tipo.nota_maxima))}</strong>
                            {tipo.permite_decimal && <span className="text-xs text-gray-400 ml-2">(decimais)</span>}
                          </div>
                        )}

                        {tipo.tipo_resultado === 'conceito' && tipo.escala_conceitos && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {tipo.escala_conceitos.map((c: ConceitoEscala) => (
                              <span
                                key={c.codigo}
                                className={`text-xs font-semibold px-2 py-1 rounded border ${getConceitoColor(c.codigo)}`}
                                title={`${c.nome} = ${c.valor_numerico}`}
                              >
                                {c.codigo} - {c.nome}
                              </span>
                            ))}
                          </div>
                        )}

                        {!tipo.ativo && (
                          <span className="text-xs text-red-500 font-medium mt-2 block">Inativo</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {tipos.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                      <ClipboardList className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>Nenhum tipo de avaliacao cadastrado</p>
                    </div>
                  )}
                </div>
              )}

              {/* ============================================ */}
              {/* TAB 2: REGRAS DE AVALIACAO */}
              {/* ============================================ */}
              {abaAtiva === 'regras' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Regras de Avaliacao</h2>
                    <button
                      onClick={() => abrirModalRegra()}
                      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Nova Regra
                    </button>
                  </div>

                  <div className="space-y-3">
                    {regras.map(regra => {
                      const expandida = regrasExpandidas.includes(regra.id)
                      return (
                        <div
                          key={regra.id}
                          className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm border dark:border-slate-700 transition-all ${
                            !regra.ativo ? 'opacity-60' : ''
                          }`}
                        >
                          {/* Header do card */}
                          <div
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors rounded-t-lg"
                            onClick={() => toggleRegraExpandida(regra.id)}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {expandida ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                              <div className="min-w-0">
                                <h3 className="font-semibold text-gray-800 dark:text-white truncate">{regra.nome}</h3>
                                {regra.descricao && (
                                  <p className="text-xs text-gray-400 truncate">{regra.descricao}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TIPO_RESULTADO_BADGE[regra.tipo_resultado]?.cor || ''}`}>
                                {regra.tipo_avaliacao_nome}
                              </span>
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TIPO_PERIODO_BADGE[regra.tipo_periodo]?.cor || ''}`}>
                                {TIPO_PERIODO_BADGE[regra.tipo_periodo]?.label} ({regra.qtd_periodos}p)
                              </span>
                              {parseInt(String(regra.total_series)) > 0 && (
                                <span className="text-xs bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                                  {regra.total_series} serie(s)
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Detalhes expandidos */}
                          {expandida && (
                            <div className="border-t dark:border-slate-700 p-4">
                              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-400 text-xs block">Media Aprovacao</span>
                                  <strong className="text-gray-800 dark:text-white">
                                    {regra.media_aprovacao != null ? parseFloat(String(regra.media_aprovacao)) : 'N/A'}
                                  </strong>
                                </div>
                                <div>
                                  <span className="text-gray-400 text-xs block">Media Recuperacao</span>
                                  <strong className="text-gray-800 dark:text-white">
                                    {regra.media_recuperacao != null ? parseFloat(String(regra.media_recuperacao)) : 'N/A'}
                                  </strong>
                                </div>
                                <div>
                                  <span className="text-gray-400 text-xs block">Nota Maxima</span>
                                  <strong className="text-gray-800 dark:text-white">
                                    {regra.nota_maxima != null ? parseFloat(String(regra.nota_maxima)) : 'N/A'}
                                  </strong>
                                </div>
                                <div>
                                  <span className="text-gray-400 text-xs block">Formula</span>
                                  <strong className="text-gray-800 dark:text-white">{FORMULA_LABELS[regra.formula_media] || regra.formula_media}</strong>
                                </div>
                                <div>
                                  <span className="text-gray-400 text-xs block">Recuperacao</span>
                                  <strong className="text-gray-800 dark:text-white">
                                    {regra.permite_recuperacao ? (regra.recuperacao_por_periodo ? 'Por periodo' : 'Final') : 'Nao'}
                                  </strong>
                                </div>
                                <div>
                                  <span className="text-gray-400 text-xs block">Max. Dependencias</span>
                                  <strong className="text-gray-800 dark:text-white">{regra.max_dependencias}</strong>
                                </div>
                                <div>
                                  <span className="text-gray-400 text-xs block">Arredondamento</span>
                                  <strong className="text-gray-800 dark:text-white">{ARREDONDAMENTO_LABELS[regra.arredondamento] || regra.arredondamento}</strong>
                                </div>
                                <div>
                                  <span className="text-gray-400 text-xs block">Casas Decimais</span>
                                  <strong className="text-gray-800 dark:text-white">{regra.casas_decimais}</strong>
                                </div>
                                {regra.aprovacao_automatica && (
                                  <div>
                                    <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded">
                                      Aprovacao automatica
                                    </span>
                                  </div>
                                )}
                              </div>

                              {regra.pesos_periodos && regra.pesos_periodos.length > 0 && (
                                <div className="mt-3">
                                  <span className="text-gray-400 text-xs block mb-1">Pesos por Periodo</span>
                                  <div className="flex gap-2">
                                    {regra.pesos_periodos.map((p: any) => (
                                      <span key={p.periodo} className="text-xs bg-gray-100 dark:bg-slate-600 text-gray-700 dark:text-gray-200 px-2 py-1 rounded">
                                        P{p.periodo}: {p.peso}x
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="mt-4 flex gap-2 justify-end">
                                <button
                                  onClick={(e) => { e.stopPropagation(); abrirModalRegra(regra) }}
                                  className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                  Editar
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); excluirRegra(regra) }}
                                  className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600 font-medium"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Desativar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {regras.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                      <ClipboardList className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>Nenhuma regra de avaliacao cadastrada</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* ============================================ */}
        {/* MODAL: TIPO DE AVALIACAO */}
        {/* ============================================ */}
        {modalTipo && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b dark:border-slate-700">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                  {tipoEditando ? 'Editar Tipo de Avaliacao' : 'Novo Tipo de Avaliacao'}
                </h2>
                <button onClick={() => setModalTipo(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Codigo *</label>
                    <input
                      type="text"
                      value={formTipo.codigo}
                      onChange={e => setFormTipo(prev => ({ ...prev, codigo: e.target.value.toUpperCase() }))}
                      className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
                      placeholder="Ex: NUMERICO_10"
                      disabled={!!tipoEditando}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Tipo Resultado *</label>
                    <select
                      value={formTipo.tipo_resultado}
                      onChange={e => setFormTipo(prev => ({ ...prev, tipo_resultado: e.target.value }))}
                      className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
                    >
                      <option value="numerico">Numerico</option>
                      <option value="conceito">Conceito</option>
                      <option value="parecer">Parecer</option>
                      <option value="misto">Misto</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Nome *</label>
                  <input
                    type="text"
                    value={formTipo.nome}
                    onChange={e => setFormTipo(prev => ({ ...prev, nome: e.target.value }))}
                    className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
                    placeholder="Nome do tipo"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Descricao</label>
                  <textarea
                    value={formTipo.descricao}
                    onChange={e => setFormTipo(prev => ({ ...prev, descricao: e.target.value }))}
                    rows={2}
                    className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
                  />
                </div>

                {(formTipo.tipo_resultado === 'numerico' || formTipo.tipo_resultado === 'misto') && (
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Nota Minima</label>
                      <input
                        type="number"
                        value={formTipo.nota_minima}
                        onChange={e => setFormTipo(prev => ({ ...prev, nota_minima: parseFloat(e.target.value) || 0 }))}
                        className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Nota Maxima</label>
                      <input
                        type="number"
                        value={formTipo.nota_maxima}
                        onChange={e => setFormTipo(prev => ({ ...prev, nota_maxima: parseFloat(e.target.value) || 10 }))}
                        className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
                      />
                    </div>
                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formTipo.permite_decimal}
                          onChange={e => setFormTipo(prev => ({ ...prev, permite_decimal: e.target.checked }))}
                          className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                        />
                        Decimais
                      </label>
                    </div>
                  </div>
                )}

                {formTipo.tipo_resultado === 'conceito' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Escala de Conceitos</label>
                      <button
                        onClick={adicionarConceito}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                      >
                        + Adicionar
                      </button>
                    </div>
                    <div className="space-y-2">
                      {formTipo.escala_conceitos.map((c, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={c.codigo}
                            onChange={e => atualizarConceito(idx, 'codigo', e.target.value.toUpperCase())}
                            className="w-16 border dark:border-slate-600 rounded px-2 py-1.5 text-xs text-center dark:bg-slate-700 dark:text-white"
                            placeholder="Cod"
                          />
                          <input
                            type="text"
                            value={c.nome}
                            onChange={e => atualizarConceito(idx, 'nome', e.target.value)}
                            className="flex-1 border dark:border-slate-600 rounded px-2 py-1.5 text-xs dark:bg-slate-700 dark:text-white"
                            placeholder="Nome do conceito"
                          />
                          <input
                            type="number"
                            value={c.valor_numerico}
                            onChange={e => atualizarConceito(idx, 'valor_numerico', e.target.value)}
                            className="w-16 border dark:border-slate-600 rounded px-2 py-1.5 text-xs text-center dark:bg-slate-700 dark:text-white"
                            placeholder="Valor"
                          />
                          <button
                            onClick={() => removerConceito(idx)}
                            className="text-red-400 hover:text-red-600 p-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 p-5 border-t dark:border-slate-700">
                <button
                  onClick={() => setModalTipo(false)}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarTipo}
                  disabled={salvandoTipo}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {salvandoTipo ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* MODAL: REGRA DE AVALIACAO */}
        {/* ============================================ */}
        {modalRegra && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b dark:border-slate-700">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                  {regraEditando ? 'Editar Regra de Avaliacao' : 'Nova Regra de Avaliacao'}
                </h2>
                <button onClick={() => setModalRegra(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Nome *</label>
                  <input
                    type="text"
                    value={formRegra.nome}
                    onChange={e => setFormRegra(prev => ({ ...prev, nome: e.target.value }))}
                    className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
                    placeholder="Ex: Nota Bimestral (6o ao 9o Ano)"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Descricao</label>
                  <textarea
                    value={formRegra.descricao}
                    onChange={e => setFormRegra(prev => ({ ...prev, descricao: e.target.value }))}
                    rows={2}
                    className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Tipo de Avaliacao *</label>
                    <select
                      value={formRegra.tipo_avaliacao_id}
                      onChange={e => setFormRegra(prev => ({ ...prev, tipo_avaliacao_id: e.target.value }))}
                      className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
                    >
                      <option value="">Selecione...</option>
                      {tipos.filter(t => t.ativo).map(t => (
                        <option key={t.id} value={t.id}>{t.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Periodo</label>
                    <select
                      value={formRegra.tipo_periodo}
                      onChange={e => handleTipoPeriodoChange(e.target.value)}
                      className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
                    >
                      <option value="anual">Anual (1 periodo)</option>
                      <option value="semestral">Semestral (2 periodos)</option>
                      <option value="trimestral">Trimestral (3 periodos)</option>
                      <option value="bimestral">Bimestral (4 periodos)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Media Aprovacao</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formRegra.media_aprovacao}
                      onChange={e => setFormRegra(prev => ({ ...prev, media_aprovacao: parseFloat(e.target.value) || 0 }))}
                      className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Media Recuperacao</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formRegra.media_recuperacao}
                      onChange={e => setFormRegra(prev => ({ ...prev, media_recuperacao: parseFloat(e.target.value) || 0 }))}
                      className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Nota Maxima</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formRegra.nota_maxima}
                      onChange={e => setFormRegra(prev => ({ ...prev, nota_maxima: parseFloat(e.target.value) || 0 }))}
                      className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Formula da Media</label>
                    <select
                      value={formRegra.formula_media}
                      onChange={e => setFormRegra(prev => ({ ...prev, formula_media: e.target.value }))}
                      className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
                    >
                      <option value="media_aritmetica">Media Aritmetica</option>
                      <option value="media_ponderada">Media Ponderada</option>
                      <option value="maior_nota">Maior Nota</option>
                      <option value="soma_dividida">Soma Dividida</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Arredondamento</label>
                    <select
                      value={formRegra.arredondamento}
                      onChange={e => setFormRegra(prev => ({ ...prev, arredondamento: e.target.value }))}
                      className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
                    >
                      <option value="normal">Normal</option>
                      <option value="cima">Para Cima</option>
                      <option value="baixo">Para Baixo</option>
                      <option value="nenhum">Nenhum</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Max. Dependencias</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={formRegra.max_dependencias}
                      onChange={e => setFormRegra(prev => ({ ...prev, max_dependencias: parseInt(e.target.value) || 0 }))}
                      className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Casas Decimais</label>
                    <input
                      type="number"
                      min="0"
                      max="3"
                      value={formRegra.casas_decimais}
                      onChange={e => setFormRegra(prev => ({ ...prev, casas_decimais: parseInt(e.target.value) || 0 }))}
                      className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formRegra.permite_recuperacao}
                      onChange={e => setFormRegra(prev => ({ ...prev, permite_recuperacao: e.target.checked }))}
                      className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                    />
                    Permite Recuperacao
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formRegra.recuperacao_por_periodo}
                      onChange={e => setFormRegra(prev => ({ ...prev, recuperacao_por_periodo: e.target.checked }))}
                      className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                    />
                    Recuperacao por Periodo
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formRegra.aprovacao_automatica}
                      onChange={e => setFormRegra(prev => ({ ...prev, aprovacao_automatica: e.target.checked }))}
                      className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                    />
                    Aprovacao Automatica
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 p-5 border-t dark:border-slate-700">
                <button
                  onClick={() => setModalRegra(false)}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarRegra}
                  disabled={salvandoRegra}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {salvandoRegra ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
