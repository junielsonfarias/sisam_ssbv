'use client'

import { useEffect, useState } from 'react'
import { X, Users, XCircle } from 'lucide-react'

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
      setAlunos(Array.isArray(data) ? data : [])
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
    return num.toFixed(1)
  }

  const getNotaColor = (nota: number | string | null) => {
    const num = typeof nota === 'string' ? parseFloat(nota) : nota
    if (num === null || isNaN(num)) return 'text-gray-500'
    if (num >= 7) return 'text-green-600 font-semibold'
    if (num >= 5) return 'text-yellow-600 font-semibold'
    return 'text-red-600 font-semibold'
  }

  const getPresencaColor = (presenca: string) => {
    if (presenca === 'P' || presenca === 'p') {
      return 'bg-green-100 text-green-800'
    }
    return 'bg-red-100 text-red-800'
  }

  if (!isOpen) return null

  const alunosPresentes = alunos.filter(a => a.presenca === 'P' || a.presenca === 'p').length
  const medias = alunos
    .map(a => typeof a.media_aluno === 'string' ? parseFloat(a.media_aluno) : a.media_aluno)
    .filter((m): m is number => m !== null && !isNaN(m))
  const mediaGeral = medias.length > 0 ? (medias.reduce((a, b) => a + b, 0) / medias.length) : 0
  const taxaPresenca = alunos.length > 0 ? (alunosPresentes / alunos.length) * 100 : 0

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-7xl sm:w-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white">Alunos da Turma</h3>
              <p className="text-indigo-100 text-sm mt-1">
                {turmaCodigo} - {escolaNome} - {serie}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
              aria-label="Fechar"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="bg-white px-6 py-4 max-h-[calc(100vh-200px)] overflow-y-auto">
            {carregando ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="text-gray-500 mt-4">Carregando alunos...</p>
              </div>
            ) : erro ? (
              <div className="text-center py-12">
                <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 font-medium">{erro}</p>
              </div>
            ) : alunos.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">Nenhum aluno encontrado nesta turma</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Estatísticas da Turma */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                    <p className="text-sm text-indigo-600 font-medium">Total de Alunos</p>
                    <p className="text-2xl font-bold text-indigo-900 mt-1">{alunos.length}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <p className="text-sm text-green-600 font-medium">Presentes</p>
                    <p className="text-2xl font-bold text-green-900 mt-1">{alunosPresentes}</p>
                    <p className="text-xs text-green-600 mt-1">{taxaPresenca.toFixed(1)}%</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <p className="text-sm text-blue-600 font-medium">Média Geral</p>
                    <p className="text-2xl font-bold text-blue-900 mt-1">
                      {mediaGeral.toFixed(1)}
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <p className="text-sm text-purple-600 font-medium">Faltas</p>
                    <p className="text-2xl font-bold text-purple-900 mt-1">
                      {alunos.length - alunosPresentes}
                    </p>
                    <p className="text-xs text-purple-600 mt-1">
                      {((alunos.length - alunosPresentes) / alunos.length * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Tabela de Alunos */}
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm uppercase">Aluno</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm uppercase">Presença</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm uppercase">LP</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm uppercase">CH</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm uppercase">MAT</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm uppercase">CN</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm uppercase">Média Geral</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {alunos
                        .sort((a, b) => {
                          const mediaA = typeof a.media_aluno === 'string' ? parseFloat(a.media_aluno) : a.media_aluno || 0
                          const mediaB = typeof b.media_aluno === 'string' ? parseFloat(b.media_aluno) : b.media_aluno || 0
                          return mediaB - mediaA
                        })
                        .map((aluno) => (
                          <tr key={aluno.aluno_id} className="hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                                  <span className="text-indigo-600 font-semibold text-sm">
                                    {aluno.aluno_nome.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <span className="font-semibold text-gray-900">{aluno.aluno_nome}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${getPresencaColor(
                                  aluno.presenca || 'P'
                                )}`}
                              >
                                {aluno.presenca === 'P' || aluno.presenca === 'p' ? '✓ Presente' : '✗ Falta'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex flex-col items-center">
                                <span className="text-xs text-gray-500">{aluno.total_acertos_lp}/20</span>
                                <span className={`text-sm font-bold ${getNotaColor(aluno.nota_lp)}`}>
                                  {formatarNumero(aluno.nota_lp)}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex flex-col items-center">
                                <span className="text-xs text-gray-500">{aluno.total_acertos_ch}/10</span>
                                <span className={`text-sm font-bold ${getNotaColor(aluno.nota_ch)}`}>
                                  {formatarNumero(aluno.nota_ch)}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex flex-col items-center">
                                <span className="text-xs text-gray-500">{aluno.total_acertos_mat}/20</span>
                                <span className={`text-sm font-bold ${getNotaColor(aluno.nota_mat)}`}>
                                  {formatarNumero(aluno.nota_mat)}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex flex-col items-center">
                                <span className="text-xs text-gray-500">{aluno.total_acertos_cn}/10</span>
                                <span className={`text-sm font-bold ${getNotaColor(aluno.nota_cn)}`}>
                                  {formatarNumero(aluno.nota_cn)}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className={`inline-flex items-center justify-center px-3 py-2 rounded-lg ${
                                getNotaColor(aluno.media_aluno).includes('green') ? 'bg-green-50' : 
                                getNotaColor(aluno.media_aluno).includes('yellow') ? 'bg-yellow-50' : 
                                'bg-red-50'
                              }`}>
                                <span className={`text-lg font-extrabold ${getNotaColor(aluno.media_aluno)}`}>
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
          <div className="bg-gray-50 px-6 py-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

