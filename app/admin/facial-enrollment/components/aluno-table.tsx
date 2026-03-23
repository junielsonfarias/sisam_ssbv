'use client'

import { Camera, Trash2, FileText, RefreshCw, UserCheck, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { AlunoFacial, ConsentForm } from '../types'

interface AlunoTableProps {
  alunos: AlunoFacial[]
  carregando: boolean
  buscouAlunos: boolean
  carregandoModelos: boolean
  onConsentimento: (aluno: AlunoFacial) => void
  onCapturar: (alunoId: string) => void
  onDeletar: (alunoId: string) => void
}

function getStatusBadge(aluno: AlunoFacial) {
  if (aluno.tem_embedding) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3" />
        Cadastrado
      </span>
    )
  }
  if (aluno.consentido) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <AlertTriangle className="w-3 h-3" />
        Sem Embedding
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
      <XCircle className="w-3 h-3" />
      Sem Consentimento
    </span>
  )
}

export function AlunoTable({
  alunos,
  carregando,
  buscouAlunos,
  carregandoModelos,
  onConsentimento,
  onCapturar,
  onDeletar,
}: AlunoTableProps) {
  if (!buscouAlunos) return null

  return (
    <div className="bg-white rounded-xl shadow-sm border">
      <div className="px-6 py-4 border-b">
        <h2 className="text-lg font-semibold text-gray-800">
          Alunos ({alunos.length})
        </h2>
      </div>

      {carregando ? (
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner />
        </div>
      ) : alunos.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <UserCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Nenhum aluno encontrado para esta turma</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acoes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {alunos.map(aluno => (
                <tr key={aluno.aluno_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {aluno.nome}
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(aluno)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onConsentimento(aluno)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-teal-300 text-teal-700 hover:bg-teal-50 transition-colors"
                        title="Gerenciar consentimento"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Consentimento
                      </button>

                      {aluno.consentido && (
                        <button
                          onClick={() => onCapturar(aluno.aluno_id)}
                          disabled={carregandoModelos}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                            aluno.tem_embedding
                              ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                              : 'border-blue-300 text-blue-700 hover:bg-blue-50'
                          } disabled:opacity-50`}
                          title={aluno.tem_embedding ? 'Recapturar rosto' : 'Capturar rosto via camera'}
                        >
                          {carregandoModelos ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                          {aluno.tem_embedding ? 'Recapturar' : 'Capturar'}
                        </button>
                      )}

                      {(aluno.consentido || aluno.tem_embedding) && (
                        <button
                          onClick={() => onDeletar(aluno.aluno_id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-300 text-red-700 hover:bg-red-50 transition-colors"
                          title="Remover dados faciais"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remover
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
