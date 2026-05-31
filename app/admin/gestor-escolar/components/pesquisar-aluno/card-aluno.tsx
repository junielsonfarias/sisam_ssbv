'use client'

import { Eye, GraduationCap, Search, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { AlunoResultado, formatarCPF, formatarData } from './types'

interface Props {
  aluno: AlunoResultado
  podeEditar: boolean
  mostrarMatricula: boolean
  onVoltar: () => void
  onMatricular: () => void
}

export function CardAluno({ aluno, podeEditar, mostrarMatricula, onVoltar, onMatricular }: Props) {
  const router = useRouter()

  return (
    <div className="space-y-4">
      <button
        onClick={onVoltar}
        className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium"
      >
        <Search className="w-4 h-4" /> ← Voltar à pesquisa
      </button>

      <div className="bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-600" /> {aluno.nome}
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <Campo label="Código" valor={aluno.codigo || '—'} />
          <Campo label="CPF" valor={formatarCPF(aluno.cpf)} />
          <Campo label="Nascimento" valor={formatarData(aluno.data_nascimento)} />
          <Campo label="Escola Atual" valor={aluno.escola_nome} truncate />
          <Campo label="Série" valor={aluno.serie || '—'} />
          <Campo label="Turma" valor={aluno.turma_codigo || 'Sem turma'} />
          <Campo label="Ano Letivo" valor={aluno.ano_letivo || '—'} />
          <Campo label="PCD" valor={aluno.pcd ? 'Sim' : 'Não'} />
        </div>

        {!mostrarMatricula && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => router.push(`/admin/alunos/${aluno.id}`)}
              className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm transition-colors"
            >
              <Eye className="w-4 h-4" /> Visualizar Aluno
            </button>
            {podeEditar && (
              <button
                onClick={onMatricular}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm transition-colors"
              >
                <GraduationCap className="w-4 h-4" /> Matricular em Turma
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Campo({ label, valor, truncate }: { label: string; valor: string; truncate?: boolean }) {
  return (
    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`font-medium text-gray-900 dark:text-white ${truncate ? 'truncate' : ''}`}>{valor}</p>
    </div>
  )
}
