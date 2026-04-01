'use client'

import { Edit, Trash2, FileText } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface Questao {
  id: string
  codigo: string | null
  descricao: string | null
  disciplina: string | null
  area_conhecimento: string | null
  dificuldade: string | null
  gabarito: string | null
  serie_aplicavel: string | null
  tipo_questao: string | null
  numero_questao: number | null
  criado_em: Date
}

interface TabelaQuestoesProps {
  questoes: Questao[]
  carregando: boolean
  onEditar: (questao: Questao) => void
  onExcluir: (id: string) => void
}

function getDisciplinaColor(disciplina: string | null) {
  if (!disciplina) return 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300'
  const disc = disciplina.toLowerCase()
  if (disc.includes('português') || disc.includes('língua')) return 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200'
  if (disc.includes('matemática') || disc.includes('mat')) return 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200'
  if (disc.includes('humanas') || disc.includes('ch')) return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'
  if (disc.includes('natureza') || disc.includes('cn')) return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200'
  return 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300'
}

export default function TabelaQuestoes({
  questoes,
  carregando,
  onEditar,
  onExcluir,
}: TabelaQuestoesProps) {
  if (carregando) {
    return <LoadingSpinner text="Carregando questões..." centered />
  }

  if (questoes.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-12 text-center">
        <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <p className="text-lg font-medium text-gray-500 dark:text-gray-400">Nenhuma questão encontrada</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Tente ajustar os filtros ou adicione novas questões</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[400px]">
          <thead className="bg-gray-50 dark:bg-slate-700">
            <tr>
              <th className="text-left py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm">Código</th>
              <th className="text-left py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm hidden md:table-cell">Descrição</th>
              <th className="text-left py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm">Disciplina</th>
              <th className="text-center py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm hidden sm:table-cell">Série</th>
              <th className="text-center py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm hidden lg:table-cell">Tipo</th>
              <th className="text-center py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm">Gab.</th>
              <th className="text-right py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
            {questoes.map((questao) => (
              <tr key={questao.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                <td className="py-2 px-2 md:py-3 md:px-4">
                  <span className="font-mono font-semibold text-gray-900 dark:text-white text-xs md:text-sm">
                    {questao.codigo || '-'}
                  </span>
                </td>
                <td className="py-2 px-2 md:py-3 md:px-4 hidden md:table-cell">
                  <span className="text-gray-700 dark:text-gray-300 text-xs md:text-sm">
                    {questao.descricao
                      ? questao.descricao.length > 40
                        ? `${questao.descricao.substring(0, 40)}...`
                        : questao.descricao
                      : '-'}
                  </span>
                </td>
                <td className="py-2 px-2 md:py-3 md:px-4">
                  {questao.disciplina ? (
                    <span className={`inline-flex items-center px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-medium ${getDisciplinaColor(questao.disciplina)}`}>
                      {questao.disciplina}
                    </span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">-</span>
                  )}
                </td>
                <td className="py-2 px-2 md:py-3 md:px-4 text-center hidden sm:table-cell">
                  {questao.serie_aplicavel ? (
                    <span className="inline-flex items-center px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-medium bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200">
                      {questao.serie_aplicavel}
                    </span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">-</span>
                  )}
                </td>
                <td className="py-2 px-2 md:py-3 md:px-4 text-center hidden lg:table-cell">
                  <span className={`inline-flex items-center px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-medium ${
                    questao.tipo_questao === 'objetiva'
                      ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'
                      : 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200'
                  }`}>
                    {questao.tipo_questao === 'objetiva' ? 'Obj' : 'Disc'}
                  </span>
                </td>
                <td className="py-2 px-2 md:py-3 md:px-4 text-center">
                  {questao.gabarito ? (
                    <span className="inline-flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200 font-bold text-xs md:text-sm">
                      {questao.gabarito}
                    </span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">-</span>
                  )}
                </td>
                <td className="py-2 px-2 md:py-3 md:px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onEditar(questao)}
                      className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onExcluir(questao.id)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
