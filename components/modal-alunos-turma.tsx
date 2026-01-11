'use client'

import { useEffect, useState, useMemo } from 'react'
import { X, Users, XCircle, Printer } from 'lucide-react'
import { obterDisciplinasPorSerieSync, Disciplina } from '@/lib/disciplinas-por-serie'

interface AlunoResultado {
  aluno_id: string
  aluno_nome: string
  escola_nome: string
  turma_codigo: string | null
  serie: string | null
  presenca: string
  total_acertos_lp: number | string
  total_acertos_ch: number | string
  total_acertos_mat: number | string
  total_acertos_cn: number | string
  nota_lp: number | string | null
  nota_ch: number | string | null
  nota_mat: number | string | null
  nota_cn: number | string | null
  nota_producao: number | string | null
  nivel_aprendizagem: string | null
  media_aluno: number | string | null
}

interface ModalAlunosTurmaProps {
  turmaId: string
  turmaCodigo: string
  escolaNome: string
  serie: string
  anoLetivo?: string
  isOpen: boolean
  onClose: () => void
}

export default function ModalAlunosTurma({
  turmaId,
  turmaCodigo,
  escolaNome,
  serie,
  anoLetivo,
  isOpen,
  onClose
}: ModalAlunosTurmaProps) {
  const [alunos, setAlunos] = useState<AlunoResultado[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && turmaId) {
      carregarAlunos()
    }
  }, [isOpen, turmaId, anoLetivo])

  const carregarAlunos = async () => {
    try {
      setCarregando(true)
      setErro(null)

      const params = new URLSearchParams()
      params.append('turma_id', turmaId)
      if (anoLetivo) {
        params.append('ano_letivo', anoLetivo)
      }

      const response = await fetch(`/api/admin/resultados-consolidados?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Erro ao carregar alunos da turma')
      }

      const data = await response.json()
      // A API retorna {resultados, estatisticas, paginacao}, então acessamos data.resultados
      const resultados = data.resultados || data
      setAlunos(Array.isArray(resultados) ? resultados : [])
    } catch (error: any) {
      console.error('Erro ao carregar alunos:', error)
      setErro(error.message || 'Erro ao carregar alunos da turma')
    } finally {
      setCarregando(false)
    }
  }

  const formatarNumero = (valor: number | string | null): string => {
    if (valor === null || valor === undefined) return '-'
    const num = typeof valor === 'string' ? parseFloat(valor) : valor
    if (isNaN(num)) return '-'
    return num.toFixed(2)
  }

  const getNotaColor = (nota: number | string | null) => {
    const num = typeof nota === 'string' ? parseFloat(nota) : nota
    if (num === null || isNaN(num)) return 'text-gray-500 dark:text-gray-400'
    if (num >= 7) return 'text-green-600 dark:text-green-400 font-semibold'
    if (num >= 5) return 'text-yellow-600 dark:text-yellow-400 font-semibold'
    return 'text-red-600 dark:text-red-400 font-semibold'
  }

  const getPresencaColor = (presenca: string) => {
    if (presenca === 'P' || presenca === 'p') {
      return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'
    }
    return 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'
  }

  if (!isOpen) return null

  // Verifica se a série é de anos iniciais (2º, 3º, 5º)
  const isAnosIniciais = (s: string | null | undefined): boolean => {
    if (!s) return false
    const numeroSerie = s.toString().replace(/[^0-9]/g, '')
    return ['2', '3', '5'].includes(numeroSerie)
  }

  // Obter disciplinas baseadas na série
  // Anos Iniciais: LP, MAT, PROD, NIVEL
  // Anos Finais: LP, MAT, CH, CN
  const disciplinas = useMemo(() => {
    const todasDisciplinas = obterDisciplinasPorSerieSync(serie)
    if (isAnosIniciais(serie)) {
      // Anos iniciais: incluir objetivas (LP, MAT), textual (PROD) e nivel (NIVEL)
      return todasDisciplinas.filter(d => d.tipo === 'objetiva' || d.tipo === 'textual' || d.tipo === 'nivel')
    } else {
      // Anos finais: apenas objetivas (LP, MAT, CH, CN)
      return todasDisciplinas.filter(d => d.tipo === 'objetiva')
    }
  }, [serie])

  // Função para imprimir
  const handlePrint = () => {
    window.print()
  }

  // Função para obter valor de nota/acertos dinamicamente
  const getValorAluno = (aluno: AlunoResultado, campo: string): number | string | null => {
    return (aluno as any)[campo] ?? null
  }

  const alunosPresentes = alunos.filter(a => a.presenca === 'P' || a.presenca === 'p').length
  const medias = alunos
    .map(a => typeof a.media_aluno === 'string' ? parseFloat(a.media_aluno) : a.media_aluno)
    .filter((m): m is number => m !== null && !isNaN(m))
  const mediaGeral = medias.length > 0 ? (medias.reduce((a, b) => a + b, 0) / medias.length) : 0
  const taxaPresenca = alunos.length > 0 ? (alunosPresentes / alunos.length) * 100 : 0

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-3 sm:px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-80"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="inline-block align-bottom bg-white dark:bg-slate-800 rounded-lg text-left overflow-hidden shadow-xl dark:shadow-slate-900/50 transform transition-all sm:my-8 sm:align-middle sm:max-w-7xl w-full mx-3 sm:mx-0">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 dark:from-indigo-700 dark:to-indigo-800 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
            <div className="flex-1 min-w-0 pr-2">
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white">Alunos da Turma</h3>
              <p className="text-indigo-100 text-xs sm:text-sm mt-1 truncate">
                {turmaCodigo} - {escolaNome} - {serie}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors p-1 flex-shrink-0"
              aria-label="Fechar"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="bg-white dark:bg-slate-800 px-3 sm:px-4 md:px-6 py-3 sm:py-4 max-h-[calc(100vh-200px)] overflow-y-auto">
            {carregando ? (
              <div className="text-center py-8 sm:py-12">
                <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
                <p className="text-gray-500 dark:text-gray-400 mt-4 text-sm sm:text-base">Carregando alunos...</p>
              </div>
            ) : erro ? (
              <div className="text-center py-8 sm:py-12">
                <XCircle className="w-10 h-10 sm:w-12 sm:h-12 text-red-500 dark:text-red-400 mx-auto mb-3 sm:mb-4" />
                <p className="text-red-600 dark:text-red-400 font-medium text-sm sm:text-base">{erro}</p>
              </div>
            ) : alunos.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <Users className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3 sm:mb-4" />
                <p className="text-gray-500 dark:text-gray-400 font-medium text-sm sm:text-base">Nenhum aluno encontrado nesta turma</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {/* Estatísticas da Turma */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
                  <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-lg p-3 sm:p-4 border border-indigo-200 dark:border-indigo-800">
                    <p className="text-xs sm:text-sm text-indigo-600 dark:text-indigo-400 font-medium">Total de Alunos</p>
                    <p className="text-xl sm:text-2xl font-bold text-indigo-900 dark:text-indigo-100 mt-1">{alunos.length}</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3 sm:p-4 border border-green-200 dark:border-green-800">
                    <p className="text-xs sm:text-sm text-green-600 dark:text-green-400 font-medium">Presentes</p>
                    <p className="text-xl sm:text-2xl font-bold text-green-900 dark:text-green-100 mt-1">{alunosPresentes}</p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">{taxaPresenca.toFixed(1)}%</p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 sm:p-4 border border-blue-200 dark:border-blue-800">
                    <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-medium">Média Geral</p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                      {mediaGeral.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-3 sm:p-4 border border-purple-200 dark:border-purple-800">
                    <p className="text-xs sm:text-sm text-purple-600 dark:text-purple-400 font-medium">Faltas</p>
                    <p className="text-xl sm:text-2xl font-bold text-purple-900 dark:text-purple-100 mt-1">
                      {alunos.length - alunosPresentes}
                    </p>
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                      {((alunos.length - alunosPresentes) / alunos.length * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Tabela de Alunos */}
                <div className="overflow-x-auto border border-gray-200 dark:border-slate-700 rounded-lg print:border-0">
                  <table className="w-full min-w-[400px]">
                    <thead className="bg-gray-50 dark:bg-slate-700 print:bg-gray-100">
                      <tr>
                        <th className="text-left py-2 px-2 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs sm:text-sm uppercase whitespace-nowrap">Aluno</th>
                        <th className="text-center py-2 px-1 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs sm:text-sm uppercase whitespace-nowrap hidden sm:table-cell print:table-cell">Presença</th>
                        {disciplinas.map((disc, idx) => (
                          <th
                            key={disc.codigo}
                            className={`text-center py-2 px-1 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs sm:text-sm uppercase whitespace-nowrap ${idx > 0 ? 'hidden sm:table-cell print:table-cell' : ''}`}
                          >
                            {disc.codigo}
                          </th>
                        ))}
                        <th className="text-center py-2 px-2 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs sm:text-sm uppercase whitespace-nowrap">Média</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                      {alunos
                        .sort((a, b) => {
                          const mediaA = typeof a.media_aluno === 'string' ? parseFloat(a.media_aluno) : a.media_aluno || 0
                          const mediaB = typeof b.media_aluno === 'string' ? parseFloat(b.media_aluno) : b.media_aluno || 0
                          return mediaB - mediaA
                        })
                        .map((aluno) => (
                          <tr key={aluno.aluno_id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                            <td className="py-2 px-2 md:px-4">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center mr-2">
                                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-[10px] sm:text-xs">
                                    {aluno.aluno_nome.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div className="min-w-0">
                                  <span className="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm block truncate max-w-[80px] sm:max-w-[120px] md:max-w-none">{aluno.aluno_nome}</span>
                                  <span className={`text-[10px] sm:hidden ${aluno.presenca === 'P' || aluno.presenca === 'p' ? 'text-green-600' : 'text-red-600'}`}>
                                    {aluno.presenca === 'P' || aluno.presenca === 'p' ? '✓ P' : '✗ F'}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-2 px-1 md:px-4 text-center hidden sm:table-cell">
                              <span
                                className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${getPresencaColor(
                                  aluno.presenca || 'P'
                                )}`}
                              >
                                {aluno.presenca === 'P' || aluno.presenca === 'p' ? '✓ P' : '✗ F'}
                              </span>
                            </td>
                            {disciplinas.map((disc, idx) => {
                              const nota = getValorAluno(aluno, disc.campo_nota)
                              const acertos = getValorAluno(aluno, disc.campo_acertos)
                              // Formatar acertos como número inteiro
                              const acertosInt = acertos !== null && acertos !== undefined
                                ? Math.round(typeof acertos === 'string' ? parseFloat(acertos) : acertos)
                                : '-'

                              // Tratamento especial para NIVEL
                              if (disc.tipo === 'nivel') {
                                return (
                                  <td
                                    key={disc.codigo}
                                    className={`py-2 px-1 md:px-4 text-center ${idx > 0 ? 'hidden sm:table-cell print:table-cell' : ''}`}
                                  >
                                    <span className="text-xs sm:text-sm font-semibold text-purple-600 dark:text-purple-400">
                                      {nota || '-'}
                                    </span>
                                  </td>
                                )
                              }

                              return (
                                <td
                                  key={disc.codigo}
                                  className={`py-2 px-1 md:px-4 text-center ${idx > 0 ? 'hidden sm:table-cell print:table-cell' : ''}`}
                                >
                                  <div className="flex flex-col items-center">
                                    {disc.tipo === 'objetiva' && disc.total_questoes && (
                                      <span className="text-[10px] text-gray-500 dark:text-gray-400 hidden md:block print:block">
                                        {acertosInt}/{disc.total_questoes}
                                      </span>
                                    )}
                                    <span className={`text-xs sm:text-sm font-bold ${getNotaColor(nota)}`}>
                                      {formatarNumero(nota)}
                                    </span>
                                  </div>
                                </td>
                              )
                            })}
                            <td className="py-2 px-2 md:px-4 text-center">
                              <div className={`inline-flex items-center justify-center px-2 sm:px-3 py-1 sm:py-2 rounded-lg ${
                                getNotaColor(aluno.media_aluno).includes('green') ? 'bg-green-50 dark:bg-green-900/30' :
                                getNotaColor(aluno.media_aluno).includes('yellow') ? 'bg-yellow-50 dark:bg-yellow-900/30' :
                                'bg-red-50 dark:bg-red-900/30'
                              }`}>
                                <span className={`text-sm sm:text-base md:text-lg font-extrabold ${getNotaColor(aluno.media_aluno)}`}>
                                  {formatarNumero(aluno.media_aluno)}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-slate-700 px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex justify-between print:hidden">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm sm:text-base"
              title="Imprimir lista de alunos"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm sm:text-base"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

