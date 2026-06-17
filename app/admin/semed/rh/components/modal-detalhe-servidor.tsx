'use client'

import { BookOpen, Building2, Loader2, Plus, X } from 'lucide-react'
import { FORMACAO_LABEL, ServidorDetalhe, VINCULO_BADGE, VINCULO_LABEL } from './types'

interface Props {
  aberto: boolean
  carregando: boolean
  detalhe: ServidorDetalhe | null
  onFechar: () => void
  onNovaLotacao: () => void
  onNovaFormacao: () => void
}

export function ModalDetalheServidor({
  aberto, carregando, detalhe, onFechar, onNovaLotacao, onNovaFormacao,
}: Props) {
  if (!aberto) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="modal-detalhe-titulo">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-4xl my-8 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center z-10">
          <h2 id="modal-detalhe-titulo" className="text-lg font-bold text-gray-800 dark:text-gray-200">
            {detalhe?.nome || 'Carregando...'}
          </h2>
          <button onClick={onFechar} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700" aria-label="Fechar modal">
            <X className="w-5 h-5" />
          </button>
        </div>

        {carregando ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          </div>
        ) : detalhe ? (
          <div className="p-6 space-y-6">
            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-500">Matrícula</p>
                <p className="font-semibold text-gray-700 dark:text-gray-200 font-mono">{detalhe.matricula_funcional || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">CPF</p>
                <p className="font-mono text-gray-700 dark:text-gray-200">{detalhe.cpf}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Vínculo</p>
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${VINCULO_BADGE[detalhe.tipo_vinculo]}`}>
                  {VINCULO_LABEL(detalhe.tipo_vinculo)}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Admissão</p>
                <p className="text-gray-700 dark:text-gray-200">{new Date(detalhe.data_admissao).toLocaleDateString('pt-BR')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Cargo</p>
                <p className="text-gray-700 dark:text-gray-200">{detalhe.cargo || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Formação máxima</p>
                <p className="text-gray-700 dark:text-gray-200">{FORMACAO_LABEL(detalhe.formacao_maxima)}</p>
              </div>
              {detalhe.email && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-gray-500">E-mail</p>
                  <p className="text-gray-700 dark:text-gray-200 break-all">{detalhe.email}</p>
                </div>
              )}
              {detalhe.telefone && (
                <div>
                  <p className="text-xs text-gray-500">Telefone</p>
                  <p className="text-gray-700 dark:text-gray-200">{detalhe.telefone}</p>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> Lotações ({detalhe.lotacoes?.length || 0})
                </h3>
                <button
                  onClick={onNovaLotacao}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
                >
                  <Plus className="w-3 h-3" /> Nova lotação
                </button>
              </div>
              {detalhe.lotacoes?.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">Nenhuma lotação registrada</p>
              ) : (
                <div className="space-y-2">
                  {detalhe.lotacoes.map((l) => (
                    <div key={l.id} className="bg-gray-50 dark:bg-slate-700/30 rounded-lg p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{l.funcao}</span>
                        {l.e_principal && <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">Principal</span>}
                        {!l.vigencia_fim && <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">Vigente</span>}
                      </div>
                      <p className="text-xs text-gray-500">
                        {l.escola_nome || 'SEMED (sede)'} • {l.carga_horaria_semanal}h semanais
                        {l.turno && ` • ${l.turno}`}
                      </p>
                      <p className="text-xs text-gray-400">
                        Início: {new Date(l.vigencia_inicio).toLocaleDateString('pt-BR')}
                        {l.vigencia_fim && ` • Fim: ${new Date(l.vigencia_fim).toLocaleDateString('pt-BR')}`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Formação continuada ({detalhe.formacoes?.length || 0})
                </h3>
                <button
                  onClick={onNovaFormacao}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
                >
                  <Plus className="w-3 h-3" /> Nova formação
                </button>
              </div>
              {detalhe.formacoes?.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">Nenhuma formação registrada</p>
              ) : (
                <div className="space-y-2">
                  {detalhe.formacoes.map((f) => (
                    <div key={f.id} className="bg-gray-50 dark:bg-slate-700/30 rounded-lg p-3 text-sm">
                      <p className="font-semibold text-gray-800 dark:text-gray-200">{f.nome_curso}</p>
                      <div className="flex gap-3 text-xs text-gray-500 mt-1 flex-wrap">
                        <span>{f.carga_horaria}h</span>
                        <span className="capitalize">{f.status.replace('_', ' ')}</span>
                        {f.categoria && <span>• {f.categoria}</span>}
                        {f.data_conclusao && <span>• Concluído em {new Date(f.data_conclusao).toLocaleDateString('pt-BR')}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
