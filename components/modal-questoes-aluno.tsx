'use client'

import { useEffect, useState, memo, useCallback } from 'react'
import { X, CheckCircle2, XCircle, BookOpen, TrendingUp, Award, AlertCircle, WifiOff, BarChart3 } from 'lucide-react'
import * as offlineStorage from '@/lib/offline-storage'
import { isAnosIniciais } from '@/lib/dados/utils'

interface Questao {
  codigo: string
  acertou: boolean
  resposta_aluno: string | null
  descricao: string | null
  gabarito: string | null
  numero: number
}

interface EstatisticasPorArea {
  total: number
  acertos: number
  erros: number
  media?: number
}

interface ItemProducao {
  item: number
  nota: number | null
}

interface DadosAluno {
  aluno: {
    id: string
    nome: string
    codigo: string | null
    serie: string | null
    ano_letivo: string | null
    escola_nome: string
    turma_codigo: string | null
  }
  questoes?: {
    'Língua Portuguesa': Questao[]
    'Ciências Humanas': Questao[]
    'Matemática': Questao[]
    'Ciências da Natureza': Questao[]
    [key: string]: Questao[]
  }
  estatisticas: {
    total: number
    acertos: number
    erros: number
    por_area: {
      [key: string]: EstatisticasPorArea
    }
    media_geral?: number
    nivel_aprendizagem?: string | null
    nota_producao?: number | null
    itens_producao?: ItemProducao[]
  }
}

interface NotasDisciplinas {
  nota_lp?: number | string | null
  nota_ch?: number | string | null
  nota_mat?: number | string | null
  nota_cn?: number | string | null
}

interface NiveisDisciplinas {
  nivel_lp?: string | null
  nivel_mat?: string | null
  nivel_prod?: string | null
  nivel_aluno?: string | null
}

interface ModalQuestoesAlunoProps {
  alunoId: string | number
  anoLetivo?: string
  mediaAluno?: number | string | null  // Média do aluno passada diretamente do resultado consolidado
  notasDisciplinas?: NotasDisciplinas  // Notas por disciplina do resultado consolidado
  niveisDisciplinas?: NiveisDisciplinas  // Níveis por disciplina (Anos Iniciais)
  isOpen: boolean
  onClose: () => void
}

/**
 * Calcula o nível de produção baseado na nota
 * Faixas: 0-4 = N1, 4-6 = N2, 6-8 = N3, 8-10 = N4
 */
function calcularNivelPorNota(nota: number | null | undefined): string | null {
  if (nota === null || nota === undefined) return null

  const notaNum = Number(nota)
  if (isNaN(notaNum)) return null

  if (notaNum < 4) return 'N1'
  if (notaNum < 6) return 'N2'
  if (notaNum < 8) return 'N3'
  return 'N4'
}

function ModalQuestoesAluno({ alunoId, anoLetivo, mediaAluno, notasDisciplinas, niveisDisciplinas, isOpen, onClose }: ModalQuestoesAlunoProps) {
  const [dados, setDados] = useState<DadosAluno | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [modoOffline, setModoOffline] = useState(false)

  useEffect(() => {
    if (isOpen && alunoId) {
      carregarQuestoes()
    }
  }, [isOpen, alunoId, anoLetivo])

  // Carregar dados offline usando estatísticas do resultado
  const carregarDadosOffline = (): DadosAluno | null => {
    const estatisticas = offlineStorage.getEstatisticasAluno(alunoId, anoLetivo)
    if (!estatisticas) return null

    return {
      aluno: {
        id: estatisticas.aluno.id,
        nome: estatisticas.aluno.nome,
        codigo: null,
        serie: estatisticas.aluno.serie,
        ano_letivo: estatisticas.aluno.ano_letivo,
        escola_nome: estatisticas.aluno.escola_nome,
        turma_codigo: estatisticas.aluno.turma_codigo
      },
      estatisticas: {
        total: estatisticas.estatisticas.total,
        acertos: estatisticas.estatisticas.acertos,
        erros: estatisticas.estatisticas.erros,
        por_area: estatisticas.estatisticas.por_area,
        media_geral: estatisticas.estatisticas.media_geral,
        nivel_aprendizagem: estatisticas.estatisticas.nivel_aprendizagem,
        nota_producao: estatisticas.estatisticas.nota_producao
      }
    }
  }

  const carregarQuestoes = async () => {
    try {
      setCarregando(true)
      setErro(null)
      setModoOffline(false)

      // Verificar se está offline
      const online = offlineStorage.isOnline()

      if (!online) {
        // Modo offline - usar estatísticas do localStorage
        setModoOffline(true)
        const dadosOffline = carregarDadosOffline()

        if (!dadosOffline) {
          setErro('Dados do aluno não disponíveis offline.')
          setDados(null)
          setCarregando(false)
          return
        }

        setDados(dadosOffline)
        setCarregando(false)
        return
      }

      // Modo online - buscar da API
      const params = new URLSearchParams()
      params.append('aluno_id', String(alunoId))
      if (anoLetivo) {
        params.append('ano_letivo', anoLetivo)
      }

      const response = await fetch(`/api/admin/aluno-questoes?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ mensagem: 'Erro desconhecido' }))
        throw new Error(errorData.mensagem || 'Erro ao carregar questões do aluno')
      }

      const data = await response.json()

      // Se não houver questões, mostrar mensagem específica
      if (!data.estatisticas || data.estatisticas.total === 0) {
        setErro('Nenhuma questão encontrada para este aluno. Verifique se os resultados foram importados corretamente.')
        setDados(null)
        return
      }

      setDados(data)
    } catch (error: any) {
      console.error('Erro ao carregar questões:', error)

      // Se falhou, tentar dados offline
      const dadosOffline = carregarDadosOffline()
      if (dadosOffline) {
        setModoOffline(true)
        setDados(dadosOffline)
      } else {
        setErro(error.message || 'Erro ao carregar questões do aluno')
      }
    } finally {
      setCarregando(false)
    }
  }

  if (!isOpen) return null

  // Mapeamento de disciplinas para configurações visuais
  const configDisciplinas: Record<string, { notaKey: keyof NotasDisciplinas; corClasses: string; bgColor: string; borderColor: string; textColor: string; icon: any }> = {
    'Língua Portuguesa': { notaKey: 'nota_lp', corClasses: 'from-indigo-500 to-indigo-600', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200', textColor: 'text-indigo-600', icon: BookOpen },
    'Ciências Humanas': { notaKey: 'nota_ch', corClasses: 'from-green-500 to-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200', textColor: 'text-green-600', icon: TrendingUp },
    'Matemática': { notaKey: 'nota_mat', corClasses: 'from-yellow-500 to-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200', textColor: 'text-yellow-600', icon: Award },
    'Ciências da Natureza': { notaKey: 'nota_cn', corClasses: 'from-purple-500 to-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200', textColor: 'text-purple-600', icon: AlertCircle },
  }

  // Gerar áreas dinamicamente baseadas nas disciplinas que existem nos dados
  const areas = dados?.questoes
    ? Object.keys(dados.questoes)
        .filter(nome => nome !== 'Outras') // Ignorar categoria "Outras"
        .map(nome => {
          const config = configDisciplinas[nome] || {
            notaKey: 'nota_lp' as keyof NotasDisciplinas, // fallback
            corClasses: 'from-gray-500 to-gray-600',
            bgColor: 'bg-gray-50',
            borderColor: 'border-gray-200',
            textColor: 'text-gray-600',
            icon: BookOpen
          }
          return { nome, ...config }
        })
    : [
        { nome: 'Língua Portuguesa', ...configDisciplinas['Língua Portuguesa'] },
        { nome: 'Ciências Humanas', ...configDisciplinas['Ciências Humanas'] },
        { nome: 'Matemática', ...configDisciplinas['Matemática'] },
        { nome: 'Ciências da Natureza', ...configDisciplinas['Ciências da Natureza'] },
      ]

  // Verificar se tem questões detalhadas ou apenas estatísticas
  const temQuestoesDetalhadas = dados?.questoes && Object.values(dados.questoes).some(arr => arr.length > 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      {/* Overlay */}
      <div
        className="fixed inset-0 transition-opacity bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-80"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-800 rounded-lg text-left overflow-hidden shadow-xl dark:shadow-slate-900/50 w-full max-w-4xl max-h-[95vh] flex flex-col">
        {/* Header - compacto */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 dark:from-indigo-700 dark:to-indigo-800 px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex-1 min-w-0 pr-2">
            <h3 className="text-base sm:text-lg font-bold text-white truncate">
              {modoOffline ? 'Estatísticas do Aluno' : 'Detalhes das Questões'}
            </h3>
            {dados && (
              <p className="text-indigo-100 text-[10px] sm:text-xs truncate">
                {dados.aluno.nome} - {dados.aluno.serie} - {dados.aluno.turma_codigo || dados.aluno.escola_nome}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors p-1 flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-slate-800 px-3 sm:px-4 py-2 sm:py-3 flex-1 overflow-y-auto">
            {carregando ? (
              <div className="text-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
                <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">Carregando...</p>
              </div>
            ) : erro ? (
              <div className="text-center py-6">
                <XCircle className="w-8 h-8 text-red-500 dark:text-red-400 mx-auto mb-2" />
                <p className="text-red-600 dark:text-red-400 font-medium text-sm">{erro}</p>
              </div>
            ) : dados ? (
              <div className="space-y-3 sm:space-y-4">
                {/* Indicador de modo offline - Compacto */}
                {modoOffline && (
                  <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded p-2 flex items-center gap-2">
                    <WifiOff className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <p className="text-xs text-blue-600 dark:text-blue-400">Modo Offline - estatísticas resumidas</p>
                  </div>
                )}

                {/* Estatísticas Gerais - Compacto */}
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                  <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded p-2 border border-indigo-200 dark:border-indigo-800">
                    <p className="text-[10px] sm:text-xs text-indigo-600 dark:text-indigo-400 font-medium">Total</p>
                    <p className="text-lg sm:text-xl font-bold text-indigo-900 dark:text-indigo-100">{dados.estatisticas.total}</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/30 rounded p-2 border border-green-200 dark:border-green-800">
                    <p className="text-[10px] sm:text-xs text-green-600 dark:text-green-400 font-medium">Acertos</p>
                    <p className="text-lg sm:text-xl font-bold text-green-900 dark:text-green-100">{dados.estatisticas.acertos}</p>
                    <p className="text-[10px] text-green-600 dark:text-green-400">
                      {dados.estatisticas.total > 0
                        ? ((dados.estatisticas.acertos / dados.estatisticas.total) * 100).toFixed(0)
                        : 0}%
                    </p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/30 rounded p-2 border border-red-200 dark:border-red-800">
                    <p className="text-[10px] sm:text-xs text-red-600 dark:text-red-400 font-medium">Erros</p>
                    <p className="text-lg sm:text-xl font-bold text-red-900 dark:text-red-100">{dados.estatisticas.erros}</p>
                    <p className="text-[10px] text-red-600 dark:text-red-400">
                      {dados.estatisticas.total > 0
                        ? ((dados.estatisticas.erros / dados.estatisticas.total) * 100).toFixed(0)
                        : 0}%
                    </p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/30 rounded p-2 border border-blue-200 dark:border-blue-800">
                    <p className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 font-medium">Média</p>
                    <p className="text-lg sm:text-xl font-bold text-blue-900 dark:text-blue-100">
                      {mediaAluno !== undefined && mediaAluno !== null
                        ? Number(mediaAluno).toFixed(1)
                        : (dados.estatisticas.media_geral?.toFixed(1) || '-')}
                    </p>
                    {dados.estatisticas.nivel_aprendizagem && (
                      <p className="text-[10px] text-blue-600 dark:text-blue-400">{dados.estatisticas.nivel_aprendizagem}</p>
                    )}
                  </div>
                </div>

                {/* Níveis por Disciplina (apenas Anos Iniciais - 2º, 3º, 5º) */}
                {(() => {
                  // Níveis só existem para anos iniciais
                  if (!isAnosIniciais(dados.aluno.serie)) return null

                  // Calcular nível de produção como fallback se não vier do banco
                  const nivelProdCalculado = niveisDisciplinas?.nivel_prod || calcularNivelPorNota(dados.estatisticas.nota_producao)

                  // Verificar se há níveis para exibir
                  const temNiveisParaExibir = niveisDisciplinas && (
                    niveisDisciplinas.nivel_lp ||
                    niveisDisciplinas.nivel_mat ||
                    nivelProdCalculado ||
                    niveisDisciplinas.nivel_aluno
                  )

                  if (!temNiveisParaExibir) return null

                  return (
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded p-2 sm:p-3 border border-indigo-200 dark:border-indigo-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <h4 className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">Níveis por Disciplina</h4>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                        {/* Nível LP */}
                        <div className="text-center bg-white dark:bg-slate-800 rounded p-1.5 sm:p-2 border border-indigo-100 dark:border-indigo-700">
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">LP</p>
                          <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold ${
                            niveisDisciplinas.nivel_lp === 'N4' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            niveisDisciplinas.nivel_lp === 'N3' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                            niveisDisciplinas.nivel_lp === 'N2' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            niveisDisciplinas.nivel_lp === 'N1' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            {niveisDisciplinas.nivel_lp || '-'}
                          </span>
                        </div>
                        {/* Nível MAT */}
                        <div className="text-center bg-white dark:bg-slate-800 rounded p-1.5 sm:p-2 border border-indigo-100 dark:border-indigo-700">
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">MAT</p>
                          <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold ${
                            niveisDisciplinas.nivel_mat === 'N4' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            niveisDisciplinas.nivel_mat === 'N3' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                            niveisDisciplinas.nivel_mat === 'N2' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            niveisDisciplinas.nivel_mat === 'N1' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            {niveisDisciplinas.nivel_mat || '-'}
                          </span>
                        </div>
                        {/* Nível PROD */}
                        <div className="text-center bg-white dark:bg-slate-800 rounded p-1.5 sm:p-2 border border-indigo-100 dark:border-indigo-700">
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">PROD</p>
                          <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold ${
                            nivelProdCalculado === 'N4' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            nivelProdCalculado === 'N3' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                            nivelProdCalculado === 'N2' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            nivelProdCalculado === 'N1' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            {nivelProdCalculado || '-'}
                          </span>
                        </div>
                        {/* Nível Geral */}
                        <div className="text-center bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-800/50 dark:to-purple-800/50 rounded p-1.5 sm:p-2 border-2 border-indigo-300 dark:border-indigo-600">
                          <p className="text-[10px] text-indigo-600 dark:text-indigo-300 mb-0.5 font-semibold">Geral</p>
                          <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-extrabold ${
                            niveisDisciplinas.nivel_aluno === 'N4' ? 'bg-green-500 text-white' :
                            niveisDisciplinas.nivel_aluno === 'N3' ? 'bg-blue-500 text-white' :
                            niveisDisciplinas.nivel_aluno === 'N2' ? 'bg-yellow-500 text-white' :
                            niveisDisciplinas.nivel_aluno === 'N1' ? 'bg-red-500 text-white' :
                            'bg-gray-400 text-white'
                          }`}>
                            {niveisDisciplinas.nivel_aluno || '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* Estatísticas por Área - Compacto */}
                <div className="grid grid-cols-2 gap-2">
                  {areas.map((area) => {
                    const stats = dados.estatisticas.por_area[area.nome] || { total: 0, acertos: 0, erros: 0, media: 0 }
                    const questoes = dados.questoes?.[area.nome] || []
                    const Icon = area.icon
                    const taxaAcerto = stats.total > 0 ? ((stats.acertos / stats.total) * 100) : 0
                    const notaDisciplina = notasDisciplinas?.[area.notaKey]
                    const notaExibir = notaDisciplina !== undefined && notaDisciplina !== null
                      ? Number(notaDisciplina)
                      : (stats.media !== undefined && stats.media > 0 ? stats.media : null)

                    return (
                      <div key={area.nome} className={`${area.bgColor} dark:bg-opacity-30 rounded p-2 border ${area.borderColor} dark:border-opacity-50`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className={`p-1 rounded bg-gradient-to-r ${area.corClasses}`}>
                              <Icon className="w-3 h-3 text-white" />
                            </div>
                            <h4 className="text-xs font-semibold text-gray-800 dark:text-white truncate">{area.nome}</h4>
                          </div>
                          {notaExibir !== null && (
                            <div className={`px-1.5 py-0.5 rounded bg-gradient-to-r ${area.corClasses} text-white`}>
                              <span className="text-sm font-bold">{notaExibir.toFixed(1)}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between text-center mb-1.5">
                          <div className="flex-1">
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">Q</p>
                            <p className="text-sm font-bold text-gray-800 dark:text-white">{stats.total}</p>
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] text-green-600 dark:text-green-400">✓</p>
                            <p className="text-sm font-bold text-green-700 dark:text-green-400">{stats.acertos}</p>
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] text-red-600 dark:text-red-400">✗</p>
                            <p className="text-sm font-bold text-red-700 dark:text-red-400">{stats.erros}</p>
                          </div>
                        </div>

                        {/* Barra de progresso */}
                        <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-1.5 mb-1">
                          <div
                            className="bg-gradient-to-r from-green-500 to-green-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${taxaAcerto}%` }}
                          ></div>
                        </div>

                        <p className={`text-[10px] ${area.textColor}`}>{taxaAcerto.toFixed(0)}% acerto</p>

                        {/* Grid de questões detalhadas */}
                        {questoes.length > 0 && (
                          <div className="mt-1.5 pt-1.5 border-t border-gray-200 dark:border-slate-600">
                            <div className="grid grid-cols-8 sm:grid-cols-10 gap-0.5">
                              {questoes.map((questao) => (
                                <div
                                  key={questao.codigo}
                                  className={`w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold ${
                                    questao.acertou
                                      ? 'bg-green-500 text-white'
                                      : 'bg-red-500 text-white'
                                  }`}
                                  title={`${questao.codigo}: ${questao.acertou ? 'Acertou' : 'Errou'}`}
                                >
                                  {questao.numero}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Produção Textual (apenas para anos iniciais - 2º, 3º, 5º) */}
                {isAnosIniciais(dados.aluno.serie) && dados.estatisticas.nota_producao !== undefined && dados.estatisticas.nota_producao !== null && (
                  <div className="bg-orange-50 dark:bg-orange-900/30 rounded p-2 border border-orange-200 dark:border-orange-800">
                    {/* Cabeçalho com título e nota */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded bg-gradient-to-r from-orange-500 to-orange-600">
                          <BarChart3 className="w-3 h-3 text-white" />
                        </div>
                        <h4 className="text-xs font-semibold text-gray-800 dark:text-white">Produção Textual</h4>
                      </div>
                      <div className="px-2 py-0.5 rounded bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                        <span className="text-sm font-bold">{dados.estatisticas.nota_producao.toFixed(1)}</span>
                      </div>
                    </div>

                    {/* Estatísticas compactas */}
                    {dados.estatisticas.itens_producao && dados.estatisticas.itens_producao.some(item => item.nota !== null) && (() => {
                      const itensValidos = dados.estatisticas.itens_producao!.filter(item => item.nota !== null)
                      const totalItens = itensValidos.length
                      const acertos = itensValidos.filter(item => item.nota !== null && item.nota >= 1).length
                      const erros = totalItens - acertos
                      const pontuacaoTotal = itensValidos.reduce((sum, item) => sum + (item.nota || 0), 0)

                      return (
                        <>
                          {/* Stats inline */}
                          <div className="flex justify-between text-center mb-2 bg-white dark:bg-slate-800 rounded p-1.5">
                            <div className="flex-1 border-r border-gray-200 dark:border-slate-600">
                              <p className="text-[10px] text-gray-500 dark:text-gray-400">Itens</p>
                              <p className="text-sm font-bold text-orange-600 dark:text-orange-400">{totalItens}</p>
                            </div>
                            <div className="flex-1 border-r border-gray-200 dark:border-slate-600">
                              <p className="text-[10px] text-green-600 dark:text-green-400">✓</p>
                              <p className="text-sm font-bold text-green-600 dark:text-green-400">{acertos}</p>
                            </div>
                            <div className="flex-1 border-r border-gray-200 dark:border-slate-600">
                              <p className="text-[10px] text-red-600 dark:text-red-400">✗</p>
                              <p className="text-sm font-bold text-red-600 dark:text-red-400">{erros}</p>
                            </div>
                            <div className="flex-1">
                              <p className="text-[10px] text-blue-600 dark:text-blue-400">Pts</p>
                              <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{pontuacaoTotal}/{totalItens}</p>
                            </div>
                          </div>

                          {/* Itens individuais - compacto */}
                          <div className="grid grid-cols-8 sm:grid-cols-10 gap-1">
                            {dados.estatisticas.itens_producao!.map((itemProd) => {
                              const isAcerto = itemProd.nota !== null && itemProd.nota >= 1
                              return (
                                <div
                                  key={itemProd.item}
                                  className={`p-1 rounded text-center ${
                                    itemProd.nota !== null
                                      ? isAcerto
                                        ? 'bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-600'
                                        : 'bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600'
                                      : 'bg-gray-100 dark:bg-gray-700/30 border border-gray-300 dark:border-gray-600'
                                  }`}
                                  title={`Item ${itemProd.item}: ${itemProd.nota !== null ? (isAcerto ? 'ACERTO' : 'ERRO') : 'Não avaliado'}`}
                                >
                                  <p className="text-[8px] text-gray-500 dark:text-gray-400">{itemProd.item}</p>
                                  <div className="flex items-center justify-center">
                                    {itemProd.nota !== null ? (
                                      isAcerto ? (
                                        <CheckCircle2 className="w-3 h-3 text-green-600 dark:text-green-400" />
                                      ) : (
                                        <XCircle className="w-3 h-3 text-red-600 dark:text-red-400" />
                                      )
                                    ) : (
                                      <span className="text-[10px] text-gray-400">-</span>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </>
                      )
                    })()}

                    {/* Fallback se não houver itens individuais */}
                    {(!dados.estatisticas.itens_producao || !dados.estatisticas.itens_producao.some(item => item.nota !== null)) && (
                      <div className="text-center text-sm text-orange-600 dark:text-orange-400">
                        Nota: {dados.estatisticas.nota_producao.toFixed(2)}
                      </div>
                    )}
                  </div>
                )}

                {/* Legenda - Compacta */}
                {(temQuestoesDetalhadas || (dados.estatisticas.itens_producao && dados.estatisticas.itens_producao.some(item => item.nota !== null))) && (
                  <div className="bg-gray-50 dark:bg-slate-700 rounded p-2 border border-gray-200 dark:border-slate-600">
                    <div className="flex flex-wrap gap-3 text-[10px] sm:text-xs items-center">
                      <span className="text-gray-500 dark:text-gray-400 font-medium">Legenda:</span>
                      {temQuestoesDetalhadas && (
                        <>
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
                            <span className="text-gray-700 dark:text-gray-300">Acerto</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-red-500 rounded mr-1"></div>
                            <span className="text-gray-700 dark:text-gray-300">Erro</span>
                          </div>
                        </>
                      )}
                      {isAnosIniciais(dados.aluno.serie) && dados.estatisticas.itens_producao && dados.estatisticas.itens_producao.some(item => item.nota !== null) && (
                        <>
                          <div className="flex items-center">
                            <CheckCircle2 className="w-3 h-3 text-green-500 mr-1" />
                            <span className="text-gray-700 dark:text-gray-300">PROD ✓</span>
                          </div>
                          <div className="flex items-center">
                            <XCircle className="w-3 h-3 text-red-500 mr-1" />
                            <span className="text-gray-700 dark:text-gray-300">PROD ✗</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
        </div>

        {/* Footer - Compacto */}
        <div className="bg-gray-50 dark:bg-slate-700 px-3 py-2 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition-colors font-medium"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

// Memoizar para evitar re-renders desnecessarios quando o parent atualiza
export default memo(ModalQuestoesAluno)
