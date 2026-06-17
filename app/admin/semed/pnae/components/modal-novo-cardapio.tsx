'use client'

import { Loader2, Save, X } from 'lucide-react'
import {
  DIAS, Escola, FAIXAS, FAIXA_LABEL, FormCardapio, FormRefeicao, INPUT_CLS,
  TIPOS_REFEICAO, TIPO_REFEICAO_LABEL,
} from './types'

interface Props {
  aberto: boolean
  escolas: Escola[]
  form: FormCardapio
  novaRefeicao: FormRefeicao
  salvando: boolean
  onChange: (form: FormCardapio) => void
  onChangeNovaRefeicao: (r: FormRefeicao) => void
  onAdicionarRefeicao: () => void
  onRemoverRefeicao: (i: number) => void
  onFechar: () => void
  onSalvar: () => void
}

export function ModalNovoCardapio({
  aberto, escolas, form, novaRefeicao, salvando,
  onChange, onChangeNovaRefeicao, onAdicionarRefeicao, onRemoverRefeicao, onFechar, onSalvar,
}: Props) {
  if (!aberto) return null
  const set = (patch: Partial<FormCardapio>) => onChange({ ...form, ...patch })
  const setR = (patch: Partial<FormRefeicao>) => onChangeNovaRefeicao({ ...novaRefeicao, ...patch })

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="modal-cardapio-titulo">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-3xl my-8 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center z-10">
          <h2 id="modal-cardapio-titulo" className="text-lg font-bold text-gray-800 dark:text-gray-200">Novo cardápio semanal</h2>
          <button onClick={onFechar} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700" aria-label="Fechar modal">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Escola (deixe em branco para cardápio municipal)</label>
              <select value={form.escola_id || ''} onChange={(e) => set({ escola_id: e.target.value || null })} className={`${INPUT_CLS} w-full`}>
                <option value="">Cardápio padrão municipal</option>
                {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Faixa etária *</label>
              <select value={form.faixa_etaria} onChange={(e) => set({ faixa_etaria: e.target.value })} className={`${INPUT_CLS} w-full`}>
                {FAIXAS.map((f) => <option key={f} value={f}>{FAIXA_LABEL[f]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Início da semana *</label>
              <input type="date" value={form.semana_inicio} onChange={(e) => set({ semana_inicio: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Fim da semana *</label>
              <input type="date" value={form.semana_fim} onChange={(e) => set({ semana_fim: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Observações</label>
            <textarea value={form.observacoes} onChange={(e) => set({ observacoes: e.target.value })} rows={2} className={`${INPUT_CLS} w-full`} />
          </div>

          <div className="bg-gray-50 dark:bg-slate-700/30 rounded-lg p-4">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">Adicionar refeição</h3>
            <div className="grid sm:grid-cols-4 gap-2 mb-2">
              <select value={novaRefeicao.dia_semana} onChange={(e) => setR({ dia_semana: parseInt(e.target.value, 10) })} className={INPUT_CLS}>
                {[1, 2, 3, 4, 5, 6, 7].map((d) => <option key={d} value={d}>{DIAS[d]}</option>)}
              </select>
              <select value={novaRefeicao.tipo} onChange={(e) => setR({ tipo: e.target.value })} className={INPUT_CLS}>
                {TIPOS_REFEICAO.map((t) => <option key={t} value={t}>{TIPO_REFEICAO_LABEL[t]}</option>)}
              </select>
              <input
                type="number"
                placeholder="Kcal"
                value={novaRefeicao.kcal}
                onChange={(e) => setR({ kcal: e.target.value })}
                className={INPUT_CLS}
              />
              <button type="button" onClick={onAdicionarRefeicao} className="px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-700">
                Adicionar
              </button>
            </div>
            <input
              type="text"
              placeholder="Descrição da refeição (ex: Arroz, feijão, frango, salada)"
              value={novaRefeicao.descricao}
              onChange={(e) => setR({ descricao: e.target.value })}
              className={`${INPUT_CLS} w-full`}
            />
          </div>

          {form.refeicoes.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">Refeições do cardápio ({form.refeicoes.length})</h3>
              <div className="space-y-1">
                {form.refeicoes.map((ref, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600 text-sm">
                    <span className="font-mono text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">{DIAS[ref.dia_semana].slice(0, 3)}</span>
                    <span className="text-xs text-gray-500">{TIPO_REFEICAO_LABEL[ref.tipo]}</span>
                    <span className="flex-1 text-gray-700 dark:text-gray-300">{ref.descricao}</span>
                    {ref.kcal && <span className="text-xs text-gray-400">{ref.kcal} kcal</span>}
                    <button onClick={() => onRemoverRefeicao(i)} className="text-red-500 hover:text-red-700" aria-label="Remover refeição">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.publicar}
              onChange={(e) => set({ publicar: e.target.checked })}
              className="rounded text-green-600 focus:ring-green-500"
            />
            <span className="text-gray-700 dark:text-gray-200">
              Publicar imediatamente (ficará disponível para escolas e responsáveis)
            </span>
          </label>
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-2">
          <button onClick={onFechar} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold">Cancelar</button>
          <button
            onClick={onSalvar}
            disabled={salvando}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-700 disabled:opacity-50"
          >
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar cardápio
          </button>
        </div>
      </div>
    </div>
  )
}
