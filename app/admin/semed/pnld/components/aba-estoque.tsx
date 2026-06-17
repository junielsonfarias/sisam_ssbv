'use client'

import { Package } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Escola, EstoqueLinha, INPUT_CLS } from './types'

interface Props {
  escolas: Escola[]
  escolaSel: string
  anoLetivo: string
  estoque: EstoqueLinha[]
  carregando: boolean
  onChangeEscola: (id: string) => void
  onChangeAno: (ano: string) => void
  onAdicionarPrimeiro: () => void
}

export function AbaEstoque({
  escolas, escolaSel, anoLetivo, estoque, carregando,
  onChangeEscola, onChangeAno, onAdicionarPrimeiro,
}: Props) {
  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Escola *</label>
            <select value={escolaSel} onChange={(e) => onChangeEscola(e.target.value)} className={`${INPUT_CLS} w-full`}>
              <option value="">Selecione</option>
              {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Ano letivo</label>
            <select value={anoLetivo} onChange={(e) => onChangeAno(e.target.value)} className={INPUT_CLS}>
              {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {!escolaSel ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Selecione uma escola para ver o estoque</p>
        </div>
      ) : carregando ? <LoadingSpinner centered /> : estoque.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Estoque vazio para esta escola/ano</p>
          <button onClick={onAdicionarPrimeiro} className="mt-4 text-teal-600 text-sm font-semibold hover:text-teal-700">
            Adicionar primeiro item
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700/30">
                <tr>
                  <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Título</th>
                  <th className="text-right py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Total</th>
                  <th className="text-right py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Disponível</th>
                  <th className="text-right py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Danificada</th>
                  <th className="text-right py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Extraviada</th>
                </tr>
              </thead>
              <tbody>
                {estoque.map((e) => (
                  <tr key={e.id} className="border-b border-gray-100 dark:border-slate-700/50">
                    <td className="py-2 px-4 font-semibold text-gray-800 dark:text-gray-200">{e.titulo}</td>
                    <td className="py-2 px-4 text-right font-mono">{e.qtd_total}</td>
                    <td className="py-2 px-4 text-right font-mono text-green-700">{e.qtd_disponivel}</td>
                    <td className="py-2 px-4 text-right font-mono text-amber-700">{e.qtd_danificada}</td>
                    <td className="py-2 px-4 text-right font-mono text-red-700">{e.qtd_extraviada}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
