'use client'

import { useState } from 'react'
import { Loader2, Save, X } from 'lucide-react'
import {
  AlunoAeeRow, Atendimento, FormAtendimento, INPUT_CLS, PlanoAee, PlanoStatus,
  STATUS_PLANO_BADGE, STATUS_PLANO_LABEL,
} from './types'
import { SecaoAtendimentos } from './secao-atendimentos'

interface Props {
  aberto: boolean
  aluno: AlunoAeeRow | null
  plano: PlanoAee | null
  carregando: boolean
  salvando: boolean
  planoIdAtual: string | null
  atendimentos: Atendimento[]
  carregandoAtendimentos: boolean
  formAtendimento: FormAtendimento
  salvandoAtendimento: boolean
  onChangePlano: (p: PlanoAee) => void
  onChangeAnoLetivo: (ano: string) => void
  onChangeFormAtendimento: (f: FormAtendimento) => void
  onRegistrarAtendimento: () => void
  onFechar: () => void
  onSalvar: () => void
}

export function ModalPlanoAee({
  aberto, aluno, plano, carregando, salvando, planoIdAtual,
  atendimentos, carregandoAtendimentos, formAtendimento, salvandoAtendimento,
  onChangePlano, onChangeAnoLetivo, onChangeFormAtendimento, onRegistrarAtendimento,
  onFechar, onSalvar,
}: Props) {
  const [areaFocoInput, setAreaFocoInput] = useState('')

  if (!aberto || !plano) return null

  const set = (patch: Partial<PlanoAee>) => onChangePlano({ ...plano, ...patch })

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="modal-plano-titulo">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-3xl my-8 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center z-10">
          <div>
            <h2 id="modal-plano-titulo" className="text-lg font-bold text-gray-800 dark:text-gray-200">
              Plano AEE — {aluno?.aluno_nome}
            </h2>
            <p className="text-xs text-gray-500">Ano letivo {plano.ano_letivo}</p>
          </div>
          <button onClick={onFechar} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700" aria-label="Fechar modal">
            <X className="w-5 h-5" />
          </button>
        </div>

        {carregando ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto" />
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Ano letivo</label>
                <select
                  value={plano.ano_letivo}
                  onChange={(e) => onChangeAnoLetivo(e.target.value)}
                  className={`${INPUT_CLS} w-full`}
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Status</label>
                <select value={plano.status} onChange={(e) => set({ status: e.target.value as PlanoStatus })} className={`${INPUT_CLS} w-full`}>
                  {Object.entries(STATUS_PLANO_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>

            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${STATUS_PLANO_BADGE[plano.status]}`}>
              {STATUS_PLANO_LABEL[plano.status]}
            </span>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Objetivos pedagógicos *</label>
              <textarea
                value={plano.objetivos}
                onChange={(e) => set({ objetivos: e.target.value })}
                rows={4}
                placeholder="Descreva os objetivos pedagógicos do aluno (mín. 10 caracteres)"
                className={`${INPUT_CLS} w-full`}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Estratégias e metodologias *</label>
              <textarea
                value={plano.estrategias}
                onChange={(e) => set({ estrategias: e.target.value })}
                rows={4}
                placeholder="Descreva as estratégias e metodologias utilizadas"
                className={`${INPUT_CLS} w-full`}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Recursos necessários</label>
              <textarea
                value={plano.recursos_necessarios}
                onChange={(e) => set({ recursos_necessarios: e.target.value })}
                rows={3}
                className={`${INPUT_CLS} w-full`}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Áreas de foco</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={areaFocoInput}
                  onChange={(e) => setAreaFocoInput(e.target.value)}
                  placeholder="Ex: comunicação, autonomia, leitura"
                  className={`${INPUT_CLS} flex-1`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && areaFocoInput.trim()) {
                      e.preventDefault()
                      set({ areas_foco: [...plano.areas_foco, areaFocoInput.trim()] })
                      setAreaFocoInput('')
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (areaFocoInput.trim()) {
                      set({ areas_foco: [...plano.areas_foco, areaFocoInput.trim()] })
                      setAreaFocoInput('')
                    }
                  }}
                  className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm"
                >
                  Adicionar
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {plano.areas_foco.map((a, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-fuchsia-100 text-fuchsia-700 flex items-center gap-1">
                    {a}
                    <button
                      onClick={() => set({ areas_foco: plano.areas_foco.filter((_, j) => j !== i) })}
                      aria-label={`Remover área ${a}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Horas semanais AEE</label>
                <input
                  type="number"
                  min={1}
                  max={40}
                  value={plano.periodicidade_horas_semanais}
                  onChange={(e) => set({ periodicidade_horas_semanais: e.target.value })}
                  className={`${INPUT_CLS} w-full`}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Data início *</label>
                <input type="date" value={plano.data_inicio} onChange={(e) => set({ data_inicio: e.target.value })} className={`${INPUT_CLS} w-full`} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Data revisão</label>
                <input type="date" value={plano.data_revisao} onChange={(e) => set({ data_revisao: e.target.value })} className={`${INPUT_CLS} w-full`} />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Avaliação de progresso</label>
              <textarea
                value={plano.avaliacao_progresso}
                onChange={(e) => set({ avaliacao_progresso: e.target.value })}
                rows={3}
                placeholder="Como o aluno tem evoluído..."
                className={`${INPUT_CLS} w-full`}
              />
            </div>

            <SecaoAtendimentos
              planoIdAtual={planoIdAtual}
              atendimentos={atendimentos}
              carregando={carregandoAtendimentos}
              form={formAtendimento}
              salvando={salvandoAtendimento}
              onChange={onChangeFormAtendimento}
              onRegistrar={onRegistrarAtendimento}
            />
          </div>
        )}

        <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-2">
          <button onClick={onFechar} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold">Cancelar</button>
          <button
            onClick={onSalvar}
            disabled={salvando}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-fuchsia-600 text-white text-sm font-bold hover:bg-fuchsia-700 disabled:opacity-50"
          >
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar plano
          </button>
        </div>
      </div>
    </div>
  )
}
