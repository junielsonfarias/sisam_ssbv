'use client'

import { Accessibility, Edit, FileText, Search } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { AlunoAeeRow, Escola, INPUT_CLS, TIPO_LABEL } from './types'

interface Props {
  alunos: AlunoAeeRow[]
  escolas: Escola[]
  busca: string
  filtroEscola: string
  carregando: boolean
  onChangeBusca: (b: string) => void
  onChangeFiltroEscola: (id: string) => void
  onEditar: (a: AlunoAeeRow) => void
  onPlano: (a: AlunoAeeRow) => void
}

export function ListaAlunosAee({
  alunos, escolas, busca, filtroEscola, carregando,
  onChangeBusca, onChangeFiltroEscola, onEditar, onPlano,
}: Props) {
  const alunosFiltrados = alunos.filter((a) =>
    !busca.trim() ||
    a.aluno_nome.toLowerCase().includes(busca.toLowerCase()) ||
    (a.escola_nome || '').toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => onChangeBusca(e.target.value)}
              placeholder="Buscar por nome ou escola..."
              className={`${INPUT_CLS} w-full pl-9`}
            />
          </div>
          <select value={filtroEscola} onChange={(e) => onChangeFiltroEscola(e.target.value)} className={INPUT_CLS}>
            <option value="">Todas as escolas</option>
            {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </div>
      </div>

      {carregando ? (
        <LoadingSpinner centered />
      ) : alunosFiltrados.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
          <Accessibility className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum aluno AEE cadastrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {alunosFiltrados.map((a) => (
            <div key={a.aluno_id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
              <p className="font-bold text-gray-800 dark:text-gray-200 text-sm mb-1">{a.aluno_nome}</p>
              <p className="text-xs text-gray-500 mb-3">
                {a.escola_nome}
                {a.turma_codigo && <span> • {a.turma_codigo}</span>}
                {a.serie && <span> • {a.serie}</span>}
              </p>

              <div className="flex flex-wrap gap-1 mb-3 min-h-[24px]">
                {(a.tipos_deficiencia || []).slice(0, 3).map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                    {TIPO_LABEL(t)}
                  </span>
                ))}
                {(a.tipos_deficiencia?.length || 0) > 3 && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700">+{a.tipos_deficiencia.length - 3}</span>
                )}
              </div>

              <div className="flex gap-2 mb-3 text-xs flex-wrap">
                {a.laudo_medico && <span className="px-2 py-0.5 rounded bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">Laudo médico</span>}
                {a.necessita_cuidador && <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Cuidador</span>}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => onEditar(a)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-bold hover:bg-purple-200"
                  aria-label={`Editar cadastro AEE de ${a.aluno_nome}`}
                >
                  <Edit className="w-3 h-3" /> Editar
                </button>
                <button
                  onClick={() => onPlano(a)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-fuchsia-600 text-white text-xs font-bold hover:bg-fuchsia-700"
                  aria-label={`Plano AEE de ${a.aluno_nome}`}
                >
                  <FileText className="w-3 h-3" /> Plano AEE
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
