'use client'

import { X, User, Calendar, BookOpen, School, Users, Award, TrendingUp, BarChart3 } from 'lucide-react'
import { useMemo } from 'react'
import { obterDisciplinasPorSerieSync } from '@/lib/disciplinas-por-serie'

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
        <div className="fixed inset-0 transition-opacity bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-80" onClick={onClose}></div>
        <div className="inline-block align-bottom bg-white dark:bg-slate-800 rounded-lg text-left overflow-hidden shadow-xl dark:shadow-slate-900/50 transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl w-full mx-3 sm:mx-0">
          <div className="bg-white dark:bg-slate-800 px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <User className="w-5 h-5 sm:w-6 sm:h-6" />
                Histórico do Aluno
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 p-1">
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            {carregando ? (
              <div className="py-8 sm:py-12 text-center">
                <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
                <p className="text-gray-500 dark:text-gray-400 mt-4 text-sm sm:text-base">Carregando histórico...</p>
              </div>
            ) : historico && historico.length > 0 ? (
              <div className="space-y-4 sm:space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                {historico.map((grupo: any, index: number) => (
                  <div key={index} className="border-b border-gray-200 dark:border-slate-700 pb-4 sm:pb-6 last:border-b-0 last:pb-0">
                    <div className="mb-3 sm:mb-4">
                      <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">{grupo.nome}</h4>
                      {grupo.codigo && <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-mono">Código: {grupo.codigo}</p>}
                    </div>

                    <div className="space-y-2 sm:space-y-3">
                      {grupo.registros.map((r: any, i: number) => (
                        <div key={i} className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <InfoItem icon={Calendar} label="Ano Letivo" value={r.ano_letivo || '-'} />
                            <InfoItem icon={BookOpen} label="Série" value={r.serie || '-'} />
                            <InfoItem icon={School} label="Escola" value={r.escola_nome || '-'} subValue={r.polo_nome ? `Polo: ${r.polo_nome}` : null} />
                            <InfoItem icon={Users} label="Turma" value={r.turma_codigo || '-'} subValue={r.turma_nome || null} />
                          </div>

                          {(() => {
                            // Obter disciplinas dinâmicas baseadas na série
                            const disciplinasExibidas = obterDisciplinasPorSerieSync(r.serie)
                            
                            // Verificar se há dados para exibir (qualquer nota ou acertos das disciplinas exibidas ou presença)
                            const temDados = r.resultado_presenca != null || disciplinasExibidas.some((disc: any) => {
                              const campoNota = disc.campo_nota
                              const campoAcertos = disc.campo_acertos
                              return (r[campoNota] != null && r[campoNota] !== '') || 
                                     (campoAcertos && r[campoAcertos] != null && r[campoAcertos] !== '')
                            })
                            
                            if (!temDados) return null
                            
                            return (
                              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-indigo-200 dark:border-indigo-800">
                                <div className="flex flex-wrap items-center gap-2 mb-2 sm:mb-3">
                                  <Award className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400" />
                                  <h5 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">Resultados da Prova</h5>
                                  {r.resultado_presenca && (
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      r.resultado_presenca === 'P' || r.resultado_presenca === 'p'
                                        ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'
                                        : r.resultado_presenca === '-'
                                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                                        : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'
                                    }`}>
                                      {r.resultado_presenca === 'P' || r.resultado_presenca === 'p'
                                        ? 'Presente'
                                        : r.resultado_presenca === '-'
                                        ? 'Sem dados'
                                        : 'Faltou'}
                                    </span>
                                  )}
                                </div>

                                <div className={`grid gap-2 sm:gap-3 mb-2 sm:mb-3 ${
                                  disciplinasExibidas.length === 2 ? 'grid-cols-2' :
                                  disciplinasExibidas.length === 3 ? 'grid-cols-3' :
                                  'grid-cols-2 md:grid-cols-4'
                                }`}>
                                  {disciplinasExibidas.map((disc: any, idx: number) => {
                                    const campoNota = disc.campo_nota
                                    const campoAcertos = disc.campo_acertos
                                    const nota = r[campoNota]
                                    const acertos = campoAcertos ? r[campoAcertos] : null
                                    
                                    // Mapear cores por tipo de disciplina
                                    const cores = {
                                      LP: 'blue',
                                      MAT: 'orange',
                                      CH: 'green',
                                      CN: 'purple',
                                      PROD: 'indigo',
                                      NIVEL: 'pink'
                                    } as const
                                    
                                    const cor = cores[disc.codigo as keyof typeof cores] || 'blue'
                                    
                                    // Para Nível de Aprendizagem, exibir badge colorido
                                    if (disc.tipo === 'nivel') {
                                      const nivel = nota || r.nivel_aprendizagem
                                      const getNivelColor = (nivel: string | null | undefined) => {
                                        if (!nivel) return 'bg-gray-100 text-gray-700 border-gray-300'
                                        const nivelLower = String(nivel).toLowerCase()
                                        if (nivelLower.includes('avançado') || nivelLower.includes('avancado')) return 'bg-green-100 text-green-800 border-green-300'
                                        if (nivelLower.includes('adequado')) return 'bg-blue-100 text-blue-800 border-blue-300'
                                        if (nivelLower.includes('básico') || nivelLower.includes('basico')) return 'bg-yellow-100 text-yellow-800 border-yellow-300'
                                        if (nivelLower.includes('insuficiente')) return 'bg-red-100 text-red-800 border-red-300'
                                        return 'bg-gray-100 text-gray-700 border-gray-300'
                                      }
                                      
                                      return (
                                        <div key={idx} className="bg-white rounded-lg p-2 sm:p-3 border-2 border-pink-200">
                                          <p className="text-xs font-medium text-gray-500 uppercase mb-2">{disc.nome}</p>
                                          {nivel ? (
                                            <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-bold border-2 ${getNivelColor(nivel)}`}>
                                              {nivel}
                                            </span>
                                          ) : (
                                            <span className="text-base sm:text-lg font-bold text-gray-400">-</span>
                                          )}
                                        </div>
                                      )
                                    }
                                    
                                    // Para Produção Textual (sem acertos, apenas nota)
                                    if (disc.tipo === 'textual') {
                                      return (
                                        <NotaCard 
                                          key={idx}
                                          titulo={disc.nome} 
                                          nota={nota} 
                                          acertos={null}
                                          totalQuestoes={null}
                                          cor={cor} 
                                        />
                                      )
                                    }
                                    
                                    // Para disciplinas objetivas (com acertos e total de questões)
                                    return (
                                      <NotaCard 
                                        key={idx}
                                        titulo={disc.nome} 
                                        nota={nota} 
                                        acertos={acertos}
                                        totalQuestoes={disc.total_questoes}
                                        cor={cor} 
                                      />
                                    )
                                  })}
                                </div>

                                {r.media_aluno && r.resultado_presenca !== '-' && (
                                  <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30 rounded-lg p-2 sm:p-3 border border-indigo-300 dark:border-indigo-700 mt-2 sm:mt-3">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400" />
                                        <p className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200">Média Geral</p>
                                      </div>
                                      <p className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400">{formatarMedia(r.media_aluno)}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })()}
                          {(() => {
                            // Verificar se não há dados para exibir mensagem
                            const disciplinasExibidas = obterDisciplinasPorSerieSync(r.serie)
                            const temDados = r.resultado_presenca != null || disciplinasExibidas.some((disc: any) => {
                              const campoNota = disc.campo_nota
                              const campoAcertos = disc.campo_acertos
                              return (r[campoNota] != null && r[campoNota] !== '') || 
                                     (campoAcertos && r[campoAcertos] != null && r[campoAcertos] !== '')
                            })
                            
                            if (temDados) return null
                            
                            return (
                              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-slate-600">
                                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                  <BarChart3 className="w-4 h-4" />
                                  <span>Nenhum resultado de prova registrado para este ano letivo</span>
                                </div>
                              </div>
                            )
                          })()}

                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-600 flex items-center justify-between">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              r.ativo ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                            }`}>
                              {r.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                            {r.criado_em && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                Criado em: {new Date(r.criado_em).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                      <strong>Total de registros:</strong> {grupo.registros.length}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 sm:py-12 text-center">
                <User className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 dark:text-gray-600 mx-auto mb-3 sm:mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base lg:text-lg">Nenhum histórico encontrado para este aluno.</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 sm:pt-6 mt-4 sm:mt-6 border-t border-gray-200 dark:border-slate-700">
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 text-sm sm:text-base transition-colors"
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
      <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{label}</p>
        <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white truncate">{value}</p>
        {subValue && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{subValue}</p>}
      </div>
    </div>
  )
}

function NotaCard({ titulo, nota, acertos, totalQuestoes, cor }: any) {
  const cores = {
    blue: 'border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400',
    green: 'border-green-200 dark:border-green-800 text-green-600 dark:text-green-400',
    orange: 'border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400',
    purple: 'border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400',
    indigo: 'border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400',
    pink: 'border-pink-200 dark:border-pink-800 text-pink-600 dark:text-pink-400',
  }

  return (
    <div className={`bg-white dark:bg-slate-700 rounded-lg p-2 sm:p-3 border ${cores[cor as keyof typeof cores] || cores.blue}`}>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">{titulo}</p>
      <div className="flex items-baseline gap-1 sm:gap-2">
        <p className={`text-base sm:text-lg font-bold ${cores[cor as keyof typeof cores] || cores.blue}`}>{formatarNota(nota)}</p>
        {acertos != null && acertos !== '' && totalQuestoes && (
          <p className="text-xs text-gray-500 dark:text-gray-400">({acertos}/{totalQuestoes})</p>
        )}
        {acertos != null && acertos !== '' && !totalQuestoes && (
          <p className="text-xs text-gray-500 dark:text-gray-400">({acertos} acertos)</p>
        )}
      </div>
    </div>
  )
}

