'use client'

import { Eye, UtensilsCrossed } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import {
  Cardapio, DIAS, Escola, FAIXAS, FAIXA_LABEL, INPUT_CLS,
  STATUS_BADGE, TIPO_REFEICAO_LABEL,
} from './types'

interface Props {
  escolas: Escola[]
  escolaSelecionada: string
  faixaSelecionada: string
  dataReferencia: string
  cardapio: Cardapio | null
  carregando: boolean
  onChangeEscola: (id: string) => void
  onChangeFaixa: (f: string) => void
  onChangeData: (d: string) => void
  onCriarCardapio: () => void
}

export function AbaCardapio({
  escolas, escolaSelecionada, faixaSelecionada, dataReferencia, cardapio, carregando,
  onChangeEscola, onChangeFaixa, onChangeData, onCriarCardapio,
}: Props) {
  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Escola</label>
            <select value={escolaSelecionada} onChange={(e) => onChangeEscola(e.target.value)} className={`${INPUT_CLS} w-full`}>
              <option value="">Selecione uma escola</option>
              {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Faixa etária</label>
            <select value={faixaSelecionada} onChange={(e) => onChangeFaixa(e.target.value)} className={INPUT_CLS}>
              {FAIXAS.map((f) => <option key={f} value={f}>{FAIXA_LABEL[f]}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Data de referência</label>
            <input type="date" value={dataReferencia} onChange={(e) => onChangeData(e.target.value)} className={INPUT_CLS} />
          </div>
        </div>
      </div>

      {carregando ? (
        <LoadingSpinner centered />
      ) : !escolaSelecionada ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
          <Eye className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Selecione uma escola para visualizar o cardápio vigente</p>
        </div>
      ) : !cardapio ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
          <UtensilsCrossed className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum cardápio publicado para esta data e faixa etária</p>
          <button onClick={onCriarCardapio} className="mt-4 text-green-600 text-sm font-semibold hover:text-green-700">
            Criar cardápio
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                Semana de {new Date(cardapio.semana_inicio).toLocaleDateString('pt-BR')} a {new Date(cardapio.semana_fim).toLocaleDateString('pt-BR')}
              </h3>
              <p className="text-xs text-gray-500">{FAIXA_LABEL[cardapio.faixa_etaria]}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_BADGE[cardapio.status]}`}>
              {cardapio.status.toUpperCase()}
            </span>
          </div>
          {cardapio.nutricionista_nome && (
            <p className="text-xs text-gray-500 mb-4">
              Nutricionista responsável: <strong>{cardapio.nutricionista_nome}</strong> (CRN {cardapio.nutricionista_crn})
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left py-2 px-3 font-bold text-gray-600 dark:text-gray-300">Dia</th>
                  <th className="text-left py-2 px-3 font-bold text-gray-600 dark:text-gray-300">Refeição</th>
                  <th className="text-left py-2 px-3 font-bold text-gray-600 dark:text-gray-300">Descrição</th>
                  <th className="text-right py-2 px-3 font-bold text-gray-600 dark:text-gray-300">Kcal</th>
                  <th className="text-left py-2 px-3 font-bold text-gray-600 dark:text-gray-300">Alérgenos</th>
                </tr>
              </thead>
              <tbody>
                {[...cardapio.refeicoes]
                  .sort((a, b) => a.dia_semana - b.dia_semana || a.tipo.localeCompare(b.tipo))
                  .map((ref, i) => (
                    <tr key={i} className="border-b border-gray-100 dark:border-slate-700/50">
                      <td className="py-2 px-3 text-gray-700 dark:text-gray-300">{DIAS[ref.dia_semana]}</td>
                      <td className="py-2 px-3 text-gray-700 dark:text-gray-300">{TIPO_REFEICAO_LABEL[ref.tipo]}</td>
                      <td className="py-2 px-3 text-gray-700 dark:text-gray-300">{ref.descricao}</td>
                      <td className="py-2 px-3 text-right text-gray-500">{ref.kcal || '—'}</td>
                      <td className="py-2 px-3">
                        <div className="flex flex-wrap gap-1">
                          {(ref.contem_alergenicos || []).map((a) => (
                            <span key={a} className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">{a}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {cardapio.observacoes && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-slate-700/30 rounded-lg text-xs text-gray-600 dark:text-gray-300">
              <strong>Observações:</strong> {cardapio.observacoes}
            </div>
          )}
        </div>
      )}
    </>
  )
}
