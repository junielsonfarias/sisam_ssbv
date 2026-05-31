'use client'

import { Loader2, MapPin, Save, X } from 'lucide-react'
import { Escola, FormParada, FormRota, INPUT_CLS, Motorista, toggleArr, TURNOS, Veiculo } from './types'

interface Props {
  aberto: boolean
  escolas: Escola[]
  veiculos: Veiculo[]
  motoristas: Motorista[]
  form: FormRota
  novaParada: FormParada
  salvando: boolean
  onChange: (form: FormRota) => void
  onChangeNovaParada: (p: FormParada) => void
  onAdicionarParada: () => void
  onFechar: () => void
  onSalvar: () => void
}

export function ModalRota({
  aberto, escolas, veiculos, motoristas, form, novaParada, salvando,
  onChange, onChangeNovaParada, onAdicionarParada, onFechar, onSalvar,
}: Props) {
  if (!aberto) return null
  const set = (patch: Partial<FormRota>) => onChange({ ...form, ...patch })
  const setP = (patch: Partial<FormParada>) => onChangeNovaParada({ ...novaParada, ...patch })

  function removerParada(i: number) {
    set({
      paradas: form.paradas
        .filter((_, j) => j !== i)
        .map((x, k) => ({ ...x, ordem: k + 1 })),
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="modal-rota-titulo">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-3xl my-8 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
          <h2 id="modal-rota-titulo" className="text-lg font-bold text-gray-800 dark:text-gray-200">Nova rota de transporte</h2>
          <button onClick={onFechar} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700" aria-label="Fechar modal">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Código *</label>
              <input type="text" value={form.codigo} onChange={(e) => set({ codigo: e.target.value })} placeholder="Ex: R-001" className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Turno</label>
              <select value={form.turno} onChange={(e) => set({ turno: e.target.value })} className={`${INPUT_CLS} w-full`}>
                <option value="">—</option>
                {TURNOS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Descrição *</label>
              <input type="text" value={form.descricao} onChange={(e) => set({ descricao: e.target.value })} placeholder="Ex: Linha Norte - Comunidades rurais" className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Veículo</label>
              <select value={form.veiculo_id} onChange={(e) => set({ veiculo_id: e.target.value })} className={`${INPUT_CLS} w-full`}>
                <option value="">—</option>
                {veiculos.map((v) => <option key={v.id} value={v.id}>{v.placa} ({v.capacidade} lugares)</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Motorista</label>
              <select value={form.motorista_id} onChange={(e) => set({ motorista_id: e.target.value })} className={`${INPUT_CLS} w-full`}>
                <option value="">—</option>
                {motoristas.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Distância (km)</label>
              <input type="number" step={0.1} min={0} value={form.distancia_km} onChange={(e) => set({ distancia_km: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Hora início</label>
              <input type="time" value={form.hora_inicio} onChange={(e) => set({ hora_inicio: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Hora fim</label>
              <input type="time" value={form.hora_fim} onChange={(e) => set({ hora_fim: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-2 block">Escolas atendidas *</label>
            <div className="grid sm:grid-cols-2 gap-1 max-h-40 overflow-y-auto p-2 bg-gray-50 dark:bg-slate-700/30 rounded-lg">
              {escolas.map((e) => (
                <label key={e.id} className="flex items-center gap-2 text-xs cursor-pointer p-1 rounded hover:bg-white dark:hover:bg-slate-700">
                  <input
                    type="checkbox"
                    checked={form.escolas_ids.includes(e.id)}
                    onChange={() => set({ escolas_ids: toggleArr(form.escolas_ids, e.id) })}
                    className="rounded text-cyan-600 focus:ring-cyan-500"
                  />
                  <span className="text-gray-700 dark:text-gray-200 truncate">{e.nome}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-slate-700/30 rounded-lg p-4">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Paradas
            </h3>
            <div className="grid sm:grid-cols-3 gap-2 mb-2">
              <input type="text" placeholder="Endereço *" value={novaParada.endereco} onChange={(e) => setP({ endereco: e.target.value })} className={`${INPUT_CLS} sm:col-span-2`} />
              <input type="time" value={novaParada.hora_estimada} onChange={(e) => setP({ hora_estimada: e.target.value })} className={INPUT_CLS} />
              <input type="text" placeholder="Ponto de referência" value={novaParada.ponto_referencia} onChange={(e) => setP({ ponto_referencia: e.target.value })} className={`${INPUT_CLS} sm:col-span-2`} />
              <button type="button" onClick={onAdicionarParada} className="px-3 py-2 rounded-lg bg-cyan-600 text-white text-sm font-bold hover:bg-cyan-700">
                Adicionar parada
              </button>
            </div>
            {form.paradas.length > 0 && (
              <div className="space-y-1 mt-2">
                {form.paradas.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600 text-sm">
                    <span className="font-mono text-xs text-cyan-600">#{p.ordem}</span>
                    <span className="flex-1 text-gray-700 dark:text-gray-300">{p.endereco}</span>
                    {p.hora_estimada && <span className="text-xs text-gray-400">{p.hora_estimada}</span>}
                    <button onClick={() => removerParada(i)} className="text-red-500" aria-label="Remover parada">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-2">
          <button onClick={onFechar} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold">Cancelar</button>
          <button onClick={onSalvar} disabled={salvando} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-bold hover:bg-cyan-700 disabled:opacity-50">
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar rota
          </button>
        </div>
      </div>
    </div>
  )
}
