'use client'

import { useState, useEffect, useCallback } from 'react'
import ProtectedRoute from '@/components/protected-route'
import LayoutDashboard from '@/components/layout-dashboard'
import { useToast } from '@/components/toast'
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  History,
  Download,
  Settings,
  Loader2,
  Users,
  School,
  MapPin,
  FileText,
  Calculator,
  Calendar,
  Upload,
  HelpCircle,
  UserX,
  FileX,
  Building,
  Hash,
  Award,
  UserCheck,
  UserCog,
  Building2,
  GitBranch,
  UserMinus,
  FileQuestion,
  Check,
  X
} from 'lucide-react'
import {
  Divergencia,
  DivergenciaDetalhe,
  ResumoDivergencias,
  NivelDivergencia,
  TipoDivergencia,
  CORES_NIVEL,
  LABELS_NIVEL,
  CONFIGURACOES_DIVERGENCIAS,
  HistoricoDivergencia
} from '@/lib/divergencias/tipos'

// Mapeamento de ícones
const ICONES: Record<string, any> = {
  Users, School, MapPin, FileText, Calculator, Calendar, Upload, HelpCircle,
  UserX, FileX, Building, Hash, Award, UserCheck, UserCog, Building2,
  GitBranch, UserMinus, FileQuestion, AlertTriangle, Settings
}

export default function DivergenciasPage() {
  const toast = useToast()

  // Estados
  const [carregando, setCarregando] = useState(true)
  const [verificando, setVerificando] = useState(false)
  const [resumo, setResumo] = useState<ResumoDivergencias | null>(null)
  const [divergencias, setDivergencias] = useState<Divergencia[]>([])
  const [dataVerificacao, setDataVerificacao] = useState<string | null>(null)

  // Filtros
  const [filtroNivel, setFiltroNivel] = useState<NivelDivergencia | ''>('')
  const [filtroTipo, setFiltroTipo] = useState<TipoDivergencia | ''>('')

  // UI
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())
  const [corrigindo, setCorrigindo] = useState<string | null>(null)
  const [mostrarHistorico, setMostrarHistorico] = useState(false)
  const [historico, setHistorico] = useState<HistoricoDivergencia[]>([])
  const [carregandoHistorico, setCarregandoHistorico] = useState(false)

  // Carregar divergências
  const carregarDivergencias = useCallback(async () => {
    try {
      setCarregando(true)
      const params = new URLSearchParams()
      if (filtroNivel) params.append('nivel', filtroNivel)
      if (filtroTipo) params.append('tipo', filtroTipo)

      const response = await fetch(`/api/admin/divergencias?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setResumo(data.resumo)
        setDivergencias(data.divergencias || [])
        setDataVerificacao(data.dataVerificacao)
      } else {
        toast.error(data.mensagem || 'Erro ao carregar divergências')
      }
    } catch (error) {
      toast.error('Erro ao carregar divergências')
    } finally {
      setCarregando(false)
    }
  }, [filtroNivel, filtroTipo, toast])

  // Executar nova verificação
  const executarVerificacao = async () => {
    try {
      setVerificando(true)
      const response = await fetch('/api/admin/divergencias', { method: 'POST' })
      const data = await response.json()

      if (response.ok) {
        setResumo(data.resumo)
        setDivergencias(data.divergencias || [])
        setDataVerificacao(data.dataVerificacao)
        toast.success('Verificação concluída')
      } else {
        toast.error(data.mensagem || 'Erro ao executar verificação')
      }
    } catch (error) {
      toast.error('Erro ao executar verificação')
    } finally {
      setVerificando(false)
    }
  }

  // Corrigir divergência
  const corrigirDivergencia = async (
    tipo: TipoDivergencia,
    corrigirTodos: boolean = false,
    ids?: string[],
    dadosCorrecao?: any
  ) => {
    try {
      setCorrigindo(tipo)
      const response = await fetch('/api/admin/divergencias/corrigir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, corrigirTodos, ids, dadosCorrecao })
      })
      const data = await response.json()

      if (response.ok && data.sucesso) {
        toast.success(data.mensagem)
        // Recarregar divergências
        await carregarDivergencias()
      } else {
        toast.error(data.mensagem || 'Erro ao corrigir divergência')
      }
    } catch (error) {
      toast.error('Erro ao corrigir divergência')
    } finally {
      setCorrigindo(null)
    }
  }

  // Carregar histórico
  const carregarHistorico = async () => {
    try {
      setCarregandoHistorico(true)
      const response = await fetch('/api/admin/divergencias/historico?limite=50')
      const data = await response.json()

      if (response.ok) {
        setHistorico(data.historico || [])
      }
    } catch (error) {
      toast.error('Erro ao carregar histórico')
    } finally {
      setCarregandoHistorico(false)
    }
  }

  // Toggle expandir/colapsar
  const toggleExpandido = (id: string) => {
    const novosExpandidos = new Set(expandidos)
    if (novosExpandidos.has(id)) {
      novosExpandidos.delete(id)
    } else {
      novosExpandidos.add(id)
    }
    setExpandidos(novosExpandidos)
  }

  // Carregar ao montar e quando filtros mudam
  useEffect(() => {
    carregarDivergencias()
  }, [carregarDivergencias])

  // Carregar histórico quando abrir modal
  useEffect(() => {
    if (mostrarHistorico) {
      carregarHistorico()
    }
  }, [mostrarHistorico])

  // Renderizar ícone do nível
  const renderIconeNivel = (nivel: NivelDivergencia) => {
    const cores = CORES_NIVEL[nivel]
    switch (nivel) {
      case 'critico':
        return <AlertTriangle className={`w-5 h-5 ${cores.icon}`} />
      case 'importante':
        return <AlertCircle className={`w-5 h-5 ${cores.icon}`} />
      case 'aviso':
        return <Info className={`w-5 h-5 ${cores.icon}`} />
      case 'informativo':
        return <CheckCircle className={`w-5 h-5 ${cores.icon}`} />
    }
  }

  // Renderizar ícone da divergência
  const renderIconeDivergencia = (icone: string) => {
    const Icon = ICONES[icone] || AlertTriangle
    return <Icon className="w-4 h-4" />
  }

  // Formatar data
  const formatarData = (data: string) => {
    return new Date(data).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <ProtectedRoute tiposPermitidos={['administrador']}>
      <LayoutDashboard tipoUsuario="admin">
        <div className="space-y-6">
          {/* Cabeçalho */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Divergências
              </h1>
              {dataVerificacao && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Última verificação: {formatarData(dataVerificacao)}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setMostrarHistorico(true)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2"
              >
                <History className="w-4 h-4" />
                Histórico
              </button>
              <button
                onClick={executarVerificacao}
                disabled={verificando}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                {verificando ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {verificando ? 'Verificando...' : 'Verificar'}
              </button>
            </div>
          </div>

          {/* Cards de Resumo */}
          {resumo && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div
                className={`p-4 rounded-lg border ${CORES_NIVEL.critico.bg} ${CORES_NIVEL.critico.border} cursor-pointer transition-all hover:shadow-md ${filtroNivel === 'critico' ? 'ring-2 ring-red-500' : ''}`}
                onClick={() => setFiltroNivel(filtroNivel === 'critico' ? '' : 'critico')}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${CORES_NIVEL.critico.text}`}>
                    Críticos
                  </span>
                  <AlertTriangle className={`w-5 h-5 ${CORES_NIVEL.critico.icon}`} />
                </div>
                <p className={`text-3xl font-bold mt-2 ${CORES_NIVEL.critico.text}`}>
                  {resumo.criticos}
                </p>
              </div>

              <div
                className={`p-4 rounded-lg border ${CORES_NIVEL.importante.bg} ${CORES_NIVEL.importante.border} cursor-pointer transition-all hover:shadow-md ${filtroNivel === 'importante' ? 'ring-2 ring-orange-500' : ''}`}
                onClick={() => setFiltroNivel(filtroNivel === 'importante' ? '' : 'importante')}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${CORES_NIVEL.importante.text}`}>
                    Importantes
                  </span>
                  <AlertCircle className={`w-5 h-5 ${CORES_NIVEL.importante.icon}`} />
                </div>
                <p className={`text-3xl font-bold mt-2 ${CORES_NIVEL.importante.text}`}>
                  {resumo.importantes}
                </p>
              </div>

              <div
                className={`p-4 rounded-lg border ${CORES_NIVEL.aviso.bg} ${CORES_NIVEL.aviso.border} cursor-pointer transition-all hover:shadow-md ${filtroNivel === 'aviso' ? 'ring-2 ring-yellow-500' : ''}`}
                onClick={() => setFiltroNivel(filtroNivel === 'aviso' ? '' : 'aviso')}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${CORES_NIVEL.aviso.text}`}>
                    Avisos
                  </span>
                  <Info className={`w-5 h-5 ${CORES_NIVEL.aviso.icon}`} />
                </div>
                <p className={`text-3xl font-bold mt-2 ${CORES_NIVEL.aviso.text}`}>
                  {resumo.avisos}
                </p>
              </div>

              <div
                className={`p-4 rounded-lg border ${CORES_NIVEL.informativo.bg} ${CORES_NIVEL.informativo.border} cursor-pointer transition-all hover:shadow-md ${filtroNivel === 'informativo' ? 'ring-2 ring-blue-500' : ''}`}
                onClick={() => setFiltroNivel(filtroNivel === 'informativo' ? '' : 'informativo')}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${CORES_NIVEL.informativo.text}`}>
                    Informativos
                  </span>
                  <CheckCircle className={`w-5 h-5 ${CORES_NIVEL.informativo.icon}`} />
                </div>
                <p className={`text-3xl font-bold mt-2 ${CORES_NIVEL.informativo.text}`}>
                  {resumo.informativos}
                </p>
              </div>
            </div>
          )}

          {/* Filtros */}
          <div className="flex flex-wrap gap-4 items-center bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Filtrar:
              </label>
              <select
                value={filtroNivel}
                onChange={(e) => setFiltroNivel(e.target.value as NivelDivergencia | '')}
                className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="">Todos os níveis</option>
                <option value="critico">Críticos</option>
                <option value="importante">Importantes</option>
                <option value="aviso">Avisos</option>
                <option value="informativo">Informativos</option>
              </select>
            </div>

            {filtroNivel && (
              <button
                onClick={() => {
                  setFiltroNivel('')
                  setFiltroTipo('')
                }}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Limpar filtros
              </button>
            )}

            <div className="ml-auto text-sm text-gray-500 dark:text-gray-400">
              {resumo?.total || 0} divergência(s) encontrada(s)
            </div>
          </div>

          {/* Lista de Divergências */}
          <div className="space-y-4">
            {carregando ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : divergencias.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Nenhuma divergência encontrada
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  O sistema está configurado corretamente.
                </p>
              </div>
            ) : (
              divergencias.map((divergencia) => {
                const config = CONFIGURACOES_DIVERGENCIAS[divergencia.tipo]
                const cores = CORES_NIVEL[divergencia.nivel]
                const expandido = expandidos.has(divergencia.id)
                const estaCorrigindo = corrigindo === divergencia.tipo

                return (
                  <div
                    key={divergencia.id}
                    className={`bg-white dark:bg-slate-800 rounded-lg border ${cores.border} overflow-hidden`}
                  >
                    {/* Cabeçalho da divergência */}
                    <div
                      className={`p-4 ${cores.bg} cursor-pointer`}
                      onClick={() => toggleExpandido(divergencia.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {expandido ? (
                            <ChevronDown className={`w-5 h-5 ${cores.text}`} />
                          ) : (
                            <ChevronRight className={`w-5 h-5 ${cores.text}`} />
                          )}
                          {renderIconeNivel(divergencia.nivel)}
                          <div>
                            <h3 className={`font-medium ${cores.text}`}>
                              {divergencia.titulo}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {divergencia.descricao}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${cores.bg} ${cores.text} border ${cores.border}`}>
                            {divergencia.quantidade} {divergencia.quantidade === 1 ? 'item' : 'itens'}
                          </span>
                          {config.corrigivel && config.correcaoAutomatica && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (confirm(`Deseja corrigir todas as ${divergencia.quantidade} ocorrências de "${divergencia.titulo}"?`)) {
                                  corrigirDivergencia(divergencia.tipo, true)
                                }
                              }}
                              disabled={estaCorrigindo}
                              className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
                            >
                              {estaCorrigindo ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                              Corrigir Todos
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Detalhes expandidos */}
                    {expandido && (
                      <div className="border-t border-gray-200 dark:border-slate-700">
                        <div className="max-h-96 overflow-y-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-slate-700 sticky top-0">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                  Identificação
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                  Problema
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                  Valor Atual
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                  Esperado
                                </th>
                                {config.corrigivel && !config.correcaoAutomatica && (
                                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                    Ação
                                  </th>
                                )}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                              {divergencia.detalhes.slice(0, 50).map((detalhe, idx) => (
                                <tr key={detalhe.id || idx} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                  <td className="px-4 py-3 text-sm">
                                    <div className="font-medium text-gray-900 dark:text-white">
                                      {detalhe.nome || detalhe.codigo || detalhe.entidadeId}
                                    </div>
                                    {detalhe.escola && (
                                      <div className="text-gray-500 dark:text-gray-400 text-xs">
                                        {detalhe.escola}
                                      </div>
                                    )}
                                    {detalhe.serie && (
                                      <div className="text-gray-500 dark:text-gray-400 text-xs">
                                        {detalhe.serie} {detalhe.anoLetivo && `- ${detalhe.anoLetivo}`}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                    {detalhe.descricaoProblema}
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    {detalhe.valorAtual !== undefined && detalhe.valorAtual !== null ? (
                                      <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-xs">
                                        {String(detalhe.valorAtual)}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    {detalhe.valorEsperado !== undefined && detalhe.valorEsperado !== null ? (
                                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs">
                                        {String(detalhe.valorEsperado)}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                  {config.corrigivel && !config.correcaoAutomatica && (
                                    <td className="px-4 py-3 text-center">
                                      <button
                                        onClick={() => {
                                          // Para correções manuais, podemos abrir um modal
                                          toast.info('Correção manual: selecione os dados corretos')
                                        }}
                                        className="px-2 py-1 text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded hover:bg-indigo-200 dark:hover:bg-indigo-900/50"
                                      >
                                        Corrigir
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {divergencia.detalhes.length > 50 && (
                            <div className="p-3 text-center text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-700">
                              Mostrando 50 de {divergencia.detalhes.length} itens
                            </div>
                          )}
                        </div>
                        {config.acaoCorrecao && (
                          <div className="p-3 bg-gray-50 dark:bg-slate-700 border-t border-gray-200 dark:border-slate-600">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              <strong>Sugestão:</strong> {config.acaoCorrecao}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Modal de Histórico */}
        {mostrarHistorico && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden m-4">
              <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Histórico de Correções
                </h2>
                <button
                  onClick={() => setMostrarHistorico(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="overflow-y-auto max-h-[60vh]">
                {carregandoHistorico ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                  </div>
                ) : historico.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Nenhum registro de correção nos últimos 30 dias
                    </p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-slate-700 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Data
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Tipo
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Ação
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Usuário
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Modo
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                      {historico.map((item) => {
                        const cores = CORES_NIVEL[item.nivel]
                        return (
                          <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                              {formatarData(item.createdAt)}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${cores.bg} ${cores.text}`}>
                                {item.titulo}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                              {item.acaoRealizada}
                              {item.entidadeNome && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {item.entidadeNome}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                              {item.usuarioNome || 'Sistema'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {item.correcaoAutomatica ? (
                                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs">
                                  Auto
                                </span>
                              ) : (
                                <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-xs">
                                  Manual
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex justify-end">
                <button
                  onClick={() => setMostrarHistorico(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </LayoutDashboard>
    </ProtectedRoute>
  )
}
