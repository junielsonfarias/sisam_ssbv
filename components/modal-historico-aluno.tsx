'use client'

import { X, User, Calendar, BookOpen, School, Users, Award, TrendingUp, BarChart3 } from 'lucide-react'

interface ModalHistoricoAlunoProps {
  mostrar: boolean
  historico: any
  carregando: boolean
  onClose: () => void
}

const formatarNota = (nota: any): string => {
  if (nota == null || nota === '') return '-'
  return parseFloat(String(nota)).toFixed(1)
}

const formatarMedia = (media: any): string => {
  if (media == null || media === '') return '-'
  return parseFloat(String(media)).toFixed(2)
}

export default function ModalHistoricoAluno({ mostrar, historico, carregando, onClose }: ModalHistoricoAlunoProps) {
  if (!mostrar) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-3 sm:px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl w-full mx-3 sm:mx-0">
          <div className="bg-white px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <User className="w-5 h-5 sm:w-6 sm:h-6" />
                Histórico do Aluno
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500 p-1">
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            {carregando ? (
              <div className="py-8 sm:py-12 text-center">
                <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="text-gray-500 mt-4 text-sm sm:text-base">Carregando histórico...</p>
              </div>
            ) : historico && historico.length > 0 ? (
              <div className="space-y-4 sm:space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                {historico.map((grupo: any, index: number) => (
                  <div key={index} className="border-b border-gray-200 pb-4 sm:pb-6 last:border-b-0 last:pb-0">
                    <div className="mb-3 sm:mb-4">
                      <h4 className="text-base sm:text-lg font-semibold text-gray-900">{grupo.nome}</h4>
                      {grupo.codigo && <p className="text-xs sm:text-sm text-gray-500 font-mono">Código: {grupo.codigo}</p>}
                    </div>

                    <div className="space-y-2 sm:space-y-3">
                      {grupo.registros.map((r: any, i: number) => (
                        <div key={i} className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200 hover:border-indigo-300 transition-colors">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <InfoItem icon={Calendar} label="Ano Letivo" value={r.ano_letivo || '-'} />
                            <InfoItem icon={BookOpen} label="Série" value={r.serie || '-'} />
                            <InfoItem icon={School} label="Escola" value={r.escola_nome || '-'} subValue={r.polo_nome ? `Polo: ${r.polo_nome}` : null} />
                            <InfoItem icon={Users} label="Turma" value={r.turma_codigo || '-'} subValue={r.turma_nome || null} />
                          </div>

                          {r.resultado_id ? (
                            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-indigo-200">
                              <div className="flex flex-wrap items-center gap-2 mb-2 sm:mb-3">
                                <Award className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                                <h5 className="text-xs sm:text-sm font-semibold text-gray-900">Resultados da Prova</h5>
                                {r.resultado_presenca && (
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    r.resultado_presenca === 'P' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {r.resultado_presenca === 'P' ? 'Presente' : 'Faltou'}
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-2 sm:mb-3">
                                <NotaCard titulo="Língua Portuguesa" nota={r.nota_lp} acertos={r.total_acertos_lp} cor="blue" />
                                <NotaCard titulo="Ciências Humanas" nota={r.nota_ch} acertos={r.total_acertos_ch} cor="green" />
                                <NotaCard titulo="Matemática" nota={r.nota_mat} acertos={r.total_acertos_mat} cor="orange" />
                                <NotaCard titulo="Ciências da Natureza" nota={r.nota_cn} acertos={r.total_acertos_cn} cor="purple" />
                              </div>

                              {r.media_aluno && (
                                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-2 sm:p-3 border border-indigo-300">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                                      <p className="text-xs sm:text-sm font-semibold text-gray-700">Média Geral</p>
                                    </div>
                                    <p className="text-xl sm:text-2xl font-bold text-indigo-600">{formatarMedia(r.media_aluno)}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
                              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
                                <BarChart3 className="w-4 h-4" />
                                <span>Nenhum resultado de prova registrado para este ano letivo</span>
                              </div>
                            </div>
                          )}

                          <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              r.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {r.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                            {r.criado_em && (
                              <span className="text-xs text-gray-500">
                                Criado em: {new Date(r.criado_em).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 text-sm text-gray-600">
                      <strong>Total de registros:</strong> {grupo.registros.length}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 sm:py-12 text-center">
                <User className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
                <p className="text-gray-500 text-sm sm:text-base lg:text-lg">Nenhum histórico encontrado para este aluno.</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 sm:pt-6 mt-4 sm:mt-6 border-t border-gray-200">
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm sm:text-base"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoItem({ icon: Icon, label, value, subValue }: any) {
  return (
    <div className="flex items-start gap-2 sm:gap-3">
      <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-500 uppercase">{label}</p>
        <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{value}</p>
        {subValue && <p className="text-xs text-gray-500 mt-1 truncate">{subValue}</p>}
      </div>
    </div>
  )
}

function NotaCard({ titulo, nota, acertos, cor }: any) {
  const cores = {
    blue: 'border-blue-200 text-blue-600',
    green: 'border-green-200 text-green-600',
    orange: 'border-orange-200 text-orange-600',
    purple: 'border-purple-200 text-purple-600',
  }

  return (
    <div className={`bg-white rounded-lg p-2 sm:p-3 border ${cores[cor as keyof typeof cores]}`}>
      <p className="text-xs font-medium text-gray-500 uppercase mb-1">{titulo}</p>
      <div className="flex items-baseline gap-1 sm:gap-2">
        <p className={`text-base sm:text-lg font-bold ${cores[cor as keyof typeof cores]}`}>{formatarNota(nota)}</p>
        {acertos != null && acertos !== '' && (
          <p className="text-xs text-gray-500">({acertos} acertos)</p>
        )}
      </div>
    </div>
  )
}

