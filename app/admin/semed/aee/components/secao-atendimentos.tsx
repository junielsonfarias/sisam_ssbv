'use client'

import { AlertCircle, Calendar, Clock, Loader2 } from 'lucide-react'
import { Atendimento, FormAtendimento, INPUT_CLS } from './types'

interface Props {
  planoIdAtual: string | null
  atendimentos: Atendimento[]
  carregando: boolean
  form: FormAtendimento
  salvando: boolean
  onChange: (f: FormAtendimento) => void
  onRegistrar: () => void
}

/**
 * Seção embarcada no modal-plano-aee que exibe sessões de atendimento +
 * form rápido para registrar nova. Só aparece quando há um plano salvo
 * (planoIdAtual !== null).
 */
export function SecaoAtendimentos({
  planoIdAtual, atendimentos, carregando, form, salvando, onChange, onRegistrar,
}: Props) {
  if (!planoIdAtual) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
        <AlertCircle className="w-4 h-4" /> Salve o plano para começar a registrar sessões de atendimento
      </div>
    )
  }

  const set = (patch: Partial<FormAtendimento>) => onChange({ ...form, ...patch })

  return (
    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
      <h3 className="text-sm font-bold text-purple-700 dark:text-purple-300 mb-3 flex items-center gap-2">
        <Calendar className="w-4 h-4" /> Sessões de atendimento ({atendimentos.length})
      </h3>

      <div className="bg-white dark:bg-slate-800 rounded-lg p-3 mb-3 space-y-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Data</label>
            <input type="date" value={form.data_atendimento} onChange={(e) => set({ data_atendimento: e.target.value })} className={`${INPUT_CLS} w-full`} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Duração (min)</label>
            <input type="number" min={5} max={480} value={form.duracao_minutos} onChange={(e) => set({ duracao_minutos: e.target.value })} className={`${INPUT_CLS} w-full`} />
          </div>
          <label className="flex items-end gap-2 text-sm pb-2">
            <input type="checkbox" checked={form.presente} onChange={(e) => set({ presente: e.target.checked })} className="rounded text-purple-600" />
            <span className="text-gray-700 dark:text-gray-200">Aluno presente</span>
          </label>
          <button
            onClick={onRegistrar}
            disabled={salvando || form.atividades_realizadas.trim().length < 3}
            className="px-3 py-2 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 disabled:opacity-50 self-end"
          >
            {salvando ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Registrar'}
          </button>
        </div>
        <textarea
          value={form.atividades_realizadas}
          onChange={(e) => set({ atividades_realizadas: e.target.value })}
          rows={2}
          placeholder="Atividades realizadas na sessão (mín. 3 caracteres)..."
          className={`${INPUT_CLS} w-full`}
        />
        <textarea
          value={form.observacoes}
          onChange={(e) => set({ observacoes: e.target.value })}
          rows={2}
          placeholder="Observações (opcional)"
          className={`${INPUT_CLS} w-full`}
        />
      </div>

      {carregando ? (
        <div className="py-4 text-center"><Loader2 className="w-5 h-5 animate-spin text-purple-600 mx-auto" /></div>
      ) : atendimentos.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-3">Nenhuma sessão registrada ainda</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {atendimentos.map((a) => (
            <div key={a.id} className="bg-white dark:bg-slate-800 rounded-lg p-3 text-sm border border-gray-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-gray-700 dark:text-gray-200">
                  {new Date(a.data_atendimento).toLocaleDateString('pt-BR')}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {a.duracao_minutos}min
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    a.presente ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {a.presente ? 'Presente' : 'Faltou'}
                  </span>
                </div>
              </div>
              {a.atividades_realizadas && (
                <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{a.atividades_realizadas}</p>
              )}
              {a.observacoes && <p className="text-xs text-gray-400 italic mt-1">Obs: {a.observacoes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
