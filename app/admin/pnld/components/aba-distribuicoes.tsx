'use client'

import { ArrowUpFromLine, Package, Users } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { AlunoBusca, Distribuicao, STATUS_DIST_BADGE } from './types'
import { BuscadorAluno } from './buscador-aluno'

interface Props {
  alunoSelecionado: AlunoBusca | null
  distribuicoes: Distribuicao[]
  carregando: boolean
  onSelecionarAluno: (a: AlunoBusca | null) => void
  onDevolver: (d: Distribuicao) => void
}

export function AbaDistribuicoes({
  alunoSelecionado, distribuicoes, carregando, onSelecionarAluno, onDevolver,
}: Props) {
  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 mb-6">
        <label className="text-xs font-medium text-gray-500 mb-1 block">Buscar aluno *</label>
        <BuscadorAluno
          selecionado={alunoSelecionado}
          onSelecionar={onSelecionarAluno}
          placeholder="Digite nome ou matrícula do aluno..."
        />
      </div>

      {!alunoSelecionado ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Selecione um aluno para ver os livros entregues</p>
        </div>
      ) : carregando ? <LoadingSpinner centered /> : distribuicoes.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Este aluno não possui livros entregues</p>
        </div>
      ) : (
        <div className="space-y-3">
          {distribuicoes.map((d) => {
            const ativa = d.status === 'emprestado'
            return (
              <div key={d.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_DIST_BADGE[d.status] || 'bg-slate-100'}`}>
                        {d.status}
                      </span>
                      {d.numero_tombamento && (
                        <span className="font-mono text-xs text-teal-600">#{d.numero_tombamento}</span>
                      )}
                      <span className="text-xs text-gray-500">{d.ano_letivo}</span>
                    </div>
                    <p className="font-bold text-gray-800 dark:text-gray-200">{d.titulo}</p>
                    {d.autor && <p className="text-xs text-gray-500">{d.autor}</p>}
                    <div className="flex gap-3 text-xs text-gray-400 mt-1 flex-wrap">
                      <span>Entregue em {new Date(d.data_entrega).toLocaleDateString('pt-BR')}</span>
                      {d.data_devolucao_prevista && (
                        <span>Devolver até {new Date(d.data_devolucao_prevista).toLocaleDateString('pt-BR')}</span>
                      )}
                      {d.data_devolucao_real && (
                        <span>Devolvido em {new Date(d.data_devolucao_real).toLocaleDateString('pt-BR')}</span>
                      )}
                    </div>
                    {d.observacoes_devolucao && (
                      <p className="text-xs text-gray-500 italic mt-1">&ldquo;{d.observacoes_devolucao}&rdquo;</p>
                    )}
                  </div>
                  {ativa && (
                    <button
                      onClick={() => onDevolver(d)}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700"
                      aria-label={`Devolver ${d.titulo}`}
                    >
                      <ArrowUpFromLine className="w-3 h-3" /> Devolver
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
