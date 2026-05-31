'use client'

import { School, User, UserPlus } from 'lucide-react'
import { AlunoResultado, formatarCPF } from './types'

interface Props {
  resultados: AlunoResultado[]
  buscaRealizada: boolean
  buscando: boolean
  busca: string
  qtdFiltrosAtivos: number
  temAlgumFiltro: boolean
  podeEditar: boolean
  onSelecionar: (a: AlunoResultado) => void
  onAbrirNovoAluno: (nomeInicial: string) => void
}

export function ListaResultados({
  resultados, buscaRealizada, buscando, busca, qtdFiltrosAtivos, temAlgumFiltro,
  podeEditar, onSelecionar, onAbrirNovoAluno,
}: Props) {
  if (!buscaRealizada) return null

  if (resultados.length > 0) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {resultados.length} aluno{resultados.length > 1 ? 's' : ''} encontrado{resultados.length > 1 ? 's' : ''}
        </p>
        <div className="grid gap-2">
          {resultados.map((aluno) => (
            <div
              key={aluno.id}
              onClick={() => onSelecionar(aluno)}
              className="p-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-300 cursor-pointer transition-all hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                    aluno.situacao === 'transferido' ? 'bg-orange-500' :
                    aluno.situacao === 'abandono' ? 'bg-red-500' :
                    'bg-indigo-500'
                  }`}>
                    {aluno.nome.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{aluno.nome}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      {aluno.codigo && <span>Cód: {aluno.codigo}</span>}
                      {aluno.cpf && <span>CPF: {formatarCPF(aluno.cpf)}</span>}
                      {aluno.pcd && <span className="text-blue-600 font-medium">PCD</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                  <p className="flex items-center gap-1"><School className="w-3 h-3" />{aluno.escola_nome}</p>
                  {aluno.turma_codigo && <p>Turma: {aluno.turma_codigo}</p>}
                  <p>{aluno.serie || '—'} | {aluno.ano_letivo || '—'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Nenhum resultado
  if (!buscando && (busca.length >= 2 || qtdFiltrosAtivos > 0 || temAlgumFiltro)) {
    return (
      <div className="text-center py-8">
        <User className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
        <p className="text-gray-500 dark:text-gray-400">Nenhum aluno encontrado para &quot;{busca}&quot;</p>
        {podeEditar && (
          <button
            onClick={() => onAbrirNovoAluno(busca.trim())}
            className="mt-3 inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium text-sm"
          >
            <UserPlus className="w-4 h-4" /> Cadastrar novo aluno
          </button>
        )}
      </div>
    )
  }

  return null
}
