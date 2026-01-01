'use client'

import { useEffect, useState } from 'react'
import { X, CheckCircle2, XCircle, BookOpen, TrendingUp, Award, AlertCircle } from 'lucide-react'

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
  questoes: {
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
  }
}

interface ModalQuestoesAlunoProps {
  alunoId: string
  anoLetivo?: string
  isOpen: boolean
  onClose: () => void
}

export default function ModalQuestoesAluno({ alunoId, anoLetivo, isOpen, onClose }: ModalQuestoesAlunoProps) {
  const [dados, setDados] = useState<DadosAluno | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && alunoId) {
      carregarQuestoes()
    }
  }, [isOpen, alunoId, anoLetivo])

  const carregarQuestoes = async () => {
    try {
      setCarregando(true)
      setErro(null)

      const params = new URLSearchParams()
      params.append('aluno_id', alunoId)
      if (anoLetivo) {
        params.append('ano_letivo', anoLetivo)
      }

      const response = await fetch(`/api/admin/aluno-questoes?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Erro ao carregar questões do aluno')
      }

      const data = await response.json()
      setDados(data)
    } catch (error: any) {
      console.error('Erro ao carregar questões:', error)
      setErro(error.message || 'Erro ao carregar questões do aluno')
    } finally {
      setCarregando(false)
    }
  }

  if (!isOpen) return null

  const areas = [
    { nome: 'Língua Portuguesa', corClasses: 'from-indigo-500 to-indigo-600', icon: BookOpen },
    { nome: 'Ciências Humanas', corClasses: 'from-green-500 to-green-600', icon: TrendingUp },
    { nome: 'Matemática', corClasses: 'from-yellow-500 to-yellow-600', icon: Award },
    { nome: 'Ciências da Natureza', corClasses: 'from-purple-500 to-purple-600', icon: AlertCircle },
  ]

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-3 sm:px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl w-full mx-3 sm:mx-0">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
            <div className="flex-1 min-w-0 pr-2">
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white truncate">Detalhes das Questões</h3>
              {dados && (
                <p className="text-indigo-100 text-xs sm:text-sm mt-1 truncate">
                  {dados.aluno.nome} - {dados.aluno.escola_nome}
                  {dados.aluno.turma_codigo && ` - Turma ${dados.aluno.turma_codigo}`}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors p-1 flex-shrink-0"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="bg-white px-3 sm:px-4 md:px-6 py-3 sm:py-4 max-h-[calc(100vh-200px)] overflow-y-auto">
            {carregando ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="text-gray-500 mt-4">Carregando questões...</p>
              </div>
            ) : erro ? (
              <div className="text-center py-12">
                <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 font-medium">{erro}</p>
              </div>
            ) : dados ? (
              <div className="space-y-6">
                {/* Estatísticas Gerais */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                  <div className="bg-indigo-50 rounded-lg p-3 sm:p-4 border border-indigo-200">
                    <p className="text-xs sm:text-sm text-indigo-600 font-medium">Total de Questões</p>
                    <p className="text-xl sm:text-2xl font-bold text-indigo-900 mt-1">{dados.estatisticas.total}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 sm:p-4 border border-green-200">
                    <p className="text-xs sm:text-sm text-green-600 font-medium">Acertos</p>
                    <p className="text-xl sm:text-2xl font-bold text-green-900 mt-1">{dados.estatisticas.acertos}</p>
                    <p className="text-xs text-green-600 mt-1">
                      {dados.estatisticas.total > 0
                        ? ((dados.estatisticas.acertos / dados.estatisticas.total) * 100).toFixed(1)
                        : 0}
                      %
                    </p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 sm:p-4 border border-red-200">
                    <p className="text-xs sm:text-sm text-red-600 font-medium">Erros</p>
                    <p className="text-xl sm:text-2xl font-bold text-red-900 mt-1">{dados.estatisticas.erros}</p>
                    <p className="text-xs text-red-600 mt-1">
                      {dados.estatisticas.total > 0
                        ? ((dados.estatisticas.erros / dados.estatisticas.total) * 100).toFixed(1)
                        : 0}
                      %
                    </p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 sm:p-4 border border-blue-200">
                    <p className="text-xs sm:text-sm text-blue-600 font-medium">Taxa de Acerto</p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-900 mt-1">
                      {dados.estatisticas.total > 0
                        ? ((dados.estatisticas.acertos / dados.estatisticas.total) * 100).toFixed(1)
                        : 0}
                      %
                    </p>
                  </div>
                </div>

                {/* Questões por Área */}
                {areas.map((area) => {
                  const questoes = dados.questoes[area.nome] || []
                  const stats = dados.estatisticas.por_area[area.nome] || { total: 0, acertos: 0, erros: 0 }
                  const Icon = area.icon

                  if (questoes.length === 0) return null

                  return (
                    <div key={area.nome} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Header da Área */}
                      <div className={`bg-gradient-to-r ${area.corClasses} px-6 py-4 flex items-center justify-between`}>
                        <div className="flex items-center space-x-3">
                          <Icon className="w-6 h-6 text-white" />
                          <h4 className="text-xl font-bold text-white">{area.nome}</h4>
                        </div>
                        <div className="flex items-center space-x-4 text-white text-sm">
                          <span className="flex items-center">
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            {stats.acertos} acertos
                          </span>
                          <span className="flex items-center">
                            <XCircle className="w-4 h-4 mr-1" />
                            {stats.erros} erros
                          </span>
                          <span className="font-semibold">
                            {stats.total > 0 ? ((stats.acertos / stats.total) * 100).toFixed(1) : 0}%
                          </span>
                        </div>
                      </div>

                      {/* Grid de Questões */}
                      <div className="p-4 bg-gray-50">
                        <div className="grid grid-cols-5 md:grid-cols-10 lg:grid-cols-12 gap-2">
                          {questoes.map((questao) => (
                            <div
                              key={questao.codigo}
                              className={`relative p-3 rounded-lg border-2 transition-all ${
                                questao.acertou
                                  ? 'bg-green-50 border-green-300 hover:border-green-400'
                                  : 'bg-red-50 border-red-300 hover:border-red-400'
                              }`}
                              title={`${questao.codigo}: ${questao.acertou ? 'Acertou' : 'Errou'}`}
                            >
                              <div className="flex flex-col items-center">
                                <span className="text-xs font-mono font-semibold text-gray-600 mb-1">
                                  {questao.codigo}
                                </span>
                                {questao.acertou ? (
                                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                                ) : (
                                  <XCircle className="w-6 h-6 text-red-600" />
                                )}
                              </div>
                              {/* Badge de número */}
                              <div className="absolute -top-1 -right-1 bg-gray-800 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                                {questao.numero}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Legenda */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Legenda:</p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center">
                      <CheckCircle2 className="w-5 h-5 text-green-600 mr-2" />
                      <span className="text-gray-700">Questão acertada</span>
                    </div>
                    <div className="flex items-center">
                      <XCircle className="w-5 h-5 text-red-600 mr-2" />
                      <span className="text-gray-700">Questão errada</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-5 h-5 bg-gray-800 text-white rounded-full flex items-center justify-center text-xs font-bold mr-2">
                        #
                      </div>
                      <span className="text-gray-700">Número da questão</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
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

