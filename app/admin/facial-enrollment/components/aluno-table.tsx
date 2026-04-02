'use client'

import { Camera, Trash2, FileText, RefreshCw, UserCheck, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { AlunoFacial } from '../types'

interface AlunoTableProps {
  alunos: AlunoFacial[]
  carregando: boolean
  buscouAlunos: boolean
  carregandoModelos: boolean
  onConsentimento: (aluno: AlunoFacial) => void
  onCapturar: (alunoId: string) => void
  onDeletar: (alunoId: string) => void
}

function StatusBadge({ aluno }: { aluno: AlunoFacial }) {
  if (aluno.tem_embedding) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
        <CheckCircle className="w-3 h-3" /> Cadastrado
      </span>
    )
  }
  if (aluno.consentido) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300">
        <AlertTriangle className="w-3 h-3" /> Sem Embedding
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
      <XCircle className="w-3 h-3" /> Sem Consentimento
    </span>
  )
}

function AcoesAluno({ aluno, carregandoModelos, onConsentimento, onCapturar, onDeletar }: {
  aluno: AlunoFacial; carregandoModelos: boolean
  onConsentimento: (a: AlunoFacial) => void; onCapturar: (id: string) => void; onDeletar: (id: string) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={() => onConsentimento(aluno)}
        className="inline-flex items-center gap-1.5 min-h-[36px] sm:min-h-0 px-3 py-1.5 text-xs font-medium rounded-lg border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 active:bg-indigo-100 transition-colors">
        <FileText className="w-3.5 h-3.5" /> Consentimento
      </button>
      {aluno.consentido && (
        <button onClick={() => onCapturar(aluno.aluno_id)} disabled={carregandoModelos}
          className={`inline-flex items-center gap-1.5 min-h-[36px] sm:min-h-0 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors disabled:opacity-50 ${
            aluno.tem_embedding
              ? 'border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20'
              : 'border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20'
          }`}>
          {carregandoModelos ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
          {aluno.tem_embedding ? 'Recapturar' : 'Capturar'}
        </button>
      )}
      {(aluno.consentido || aluno.tem_embedding) && (
        <button onClick={() => onDeletar(aluno.aluno_id)}
          className="inline-flex items-center gap-1.5 min-h-[36px] sm:min-h-0 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 active:bg-red-100 transition-colors">
          <Trash2 className="w-3.5 h-3.5" /> Remover
        </button>
      )}
    </div>
  )
}

export function AlunoTable({
  alunos, carregando, buscouAlunos, carregandoModelos,
  onConsentimento, onCapturar, onDeletar,
}: AlunoTableProps) {
  if (!buscouAlunos) return null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-slate-700">
        <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white">
          Alunos ({alunos.length})
        </h2>
      </div>

      {carregando ? (
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner />
        </div>
      ) : alunos.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400 px-4">
          <UserCheck className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-slate-600" />
          <p>Nenhum aluno encontrado para esta turma</p>
        </div>
      ) : (
        <>
          {/* === MOBILE: Cards (< sm) === */}
          <div className="sm:hidden divide-y divide-gray-100 dark:divide-slate-700">
            {alunos.map(aluno => (
              <div key={aluno.aluno_id} className="px-4 py-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{aluno.nome}</p>
                    {aluno.aluno_codigo && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Cod: {aluno.aluno_codigo}</p>
                    )}
                  </div>
                  <StatusBadge aluno={aluno} />
                </div>
                <AcoesAluno
                  aluno={aluno}
                  carregandoModelos={carregandoModelos}
                  onConsentimento={onConsentimento}
                  onCapturar={onCapturar}
                  onDeletar={onDeletar}
                />
              </div>
            ))}
          </div>

          {/* === DESKTOP: Tabela (>= sm) === */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nome</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {alunos.map(aluno => (
                  <tr key={aluno.aluno_id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{aluno.nome}</td>
                    <td className="px-6 py-4"><StatusBadge aluno={aluno} /></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end">
                        <AcoesAluno
                          aluno={aluno}
                          carregandoModelos={carregandoModelos}
                          onConsentimento={onConsentimento}
                          onCapturar={onCapturar}
                          onDeletar={onDeletar}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
