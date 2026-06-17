'use client'

import { Loader2, Save, X } from 'lucide-react'
import { FORMACAO_OPCOES, FormServidor, INPUT_CLS, TIPOS_VINCULO } from './types'

interface Props {
  aberto: boolean
  form: FormServidor
  salvando: boolean
  onChange: (form: FormServidor) => void
  onFechar: () => void
  onSalvar: () => void
}

export function ModalServidor({ aberto, form, salvando, onChange, onFechar, onSalvar }: Props) {
  if (!aberto) return null

  const set = (patch: Partial<FormServidor>) => onChange({ ...form, ...patch })

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="modal-servidor-titulo">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-3xl my-8 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center z-10">
          <h2 id="modal-servidor-titulo" className="text-lg font-bold text-gray-800 dark:text-gray-200">Novo servidor</h2>
          <button onClick={onFechar} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700" aria-label="Fechar modal">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Matrícula funcional</label>
              <input type="text" value={form.matricula_funcional} onChange={(e) => set({ matricula_funcional: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">CPF *</label>
              <input type="text" value={form.cpf} onChange={(e) => set({ cpf: e.target.value })} placeholder="Apenas números" className={`${INPUT_CLS} w-full`} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Nome completo *</label>
              <input type="text" value={form.nome} onChange={(e) => set({ nome: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Data de nascimento</label>
              <input type="date" value={form.data_nascimento} onChange={(e) => set({ data_nascimento: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Sexo</label>
              <select value={form.sexo} onChange={(e) => set({ sexo: e.target.value as FormServidor['sexo'] })} className={`${INPUT_CLS} w-full`}>
                <option value="">—</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">RG</label>
              <input type="text" value={form.rg} onChange={(e) => set({ rg: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">PIS</label>
              <input type="text" value={form.pis} onChange={(e) => set({ pis: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">E-mail</label>
              <input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Telefone</label>
              <input type="text" value={form.telefone} onChange={(e) => set({ telefone: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Endereço</label>
              <input type="text" value={form.endereco} onChange={(e) => set({ endereco: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-slate-700/30 rounded-lg p-4 grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Tipo de vínculo *</label>
              <select value={form.tipo_vinculo} onChange={(e) => set({ tipo_vinculo: e.target.value })} className={`${INPUT_CLS} w-full`}>
                {TIPOS_VINCULO.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Data de admissão *</label>
              <input type="date" value={form.data_admissao} onChange={(e) => set({ data_admissao: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Cargo</label>
              <input type="text" value={form.cargo} onChange={(e) => set({ cargo: e.target.value })} placeholder="Ex: Professor Anos Iniciais" className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Formação máxima</label>
              <select value={form.formacao_maxima} onChange={(e) => set({ formacao_maxima: e.target.value })} className={`${INPUT_CLS} w-full`}>
                <option value="">—</option>
                {FORMACAO_OPCOES.map((f) => <option key={f.v} value={f.v}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Área de formação</label>
              <input type="text" value={form.area_formacao} onChange={(e) => set({ area_formacao: e.target.value })} placeholder="Ex: Pedagogia" className={`${INPUT_CLS} w-full`} />
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-2">
          <button onClick={onFechar} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold">Cancelar</button>
          <button onClick={onSalvar} disabled={salvando} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50">
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar servidor
          </button>
        </div>
      </div>
    </div>
  )
}
