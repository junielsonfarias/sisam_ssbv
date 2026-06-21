'use client'

import { Trash2, X, Save } from 'lucide-react'
import SeletorBncc from '@/components/professor/seletor-bncc'
import type { Disciplina } from './types'

interface DiarioModalProps {
  formId: string
  formData: string
  formDisciplinaId: string
  formConteudo: string
  formMetodologia: string
  formObservacoes: string
  formHabilidadesBncc: string[]
  disciplinas: Disciplina[]
  turmaId: string
  salvando: boolean
  erro: string
  setFormData: (v: string) => void
  setFormDisciplinaId: (v: string) => void
  setFormConteudo: (v: string) => void
  setFormMetodologia: (v: string) => void
  setFormObservacoes: (v: string) => void
  setFormHabilidadesBncc: (v: string[]) => void
  onFechar: () => void
  onSalvar: () => void
  onExcluir: (id: string) => void
}

export function DiarioModal({
  formId, formData, formDisciplinaId, formConteudo, formMetodologia, formObservacoes,
  formHabilidadesBncc, disciplinas, turmaId, salvando, erro,
  setFormData, setFormDisciplinaId, setFormConteudo, setFormMetodologia,
  setFormObservacoes, setFormHabilidadesBncc, onFechar, onSalvar, onExcluir,
}: DiarioModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white dark:bg-slate-800 sm:rounded-xl rounded-t-2xl shadow-xl w-full sm:max-w-lg h-[95vh] sm:h-auto sm:max-h-[90vh] flex flex-col">
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {formId ? 'Editar Registro' : 'Novo Registro'}
          </h3>
          <button onClick={onFechar} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data da Aula</label>
            <input
              type="date"
              value={formData}
              onChange={e => setFormData(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
            />
          </div>
          {disciplinas.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Disciplina</label>
              <select
                value={formDisciplinaId}
                onChange={e => setFormDisciplinaId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
              >
                <option value="">Selecione</option>
                {disciplinas.map(d => (
                  <option key={d.id} value={d.id}>{d.nome}</option>
                ))}
              </select>
            </div>
          )}

          {/* Seletor de habilidades BNCC — colocado antes do conteudo
              para o professor escolher as habilidades primeiro e
              redigir o conteudo alinhado a elas. */}
          <SeletorBncc
            valor={formHabilidadesBncc}
            onChange={setFormHabilidadesBncc}
            disciplinaId={formDisciplinaId || null}
            turmaId={turmaId}
            label="Habilidades BNCC desta aula"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Conteúdo *</label>
            <textarea
              value={formConteudo}
              onChange={e => setFormConteudo(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
              placeholder="Descreva o conteúdo da aula..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Metodologia</label>
            <textarea
              value={formMetodologia}
              onChange={e => setFormMetodologia(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
              placeholder="Metodologia utilizada (opcional)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
            <textarea
              value={formObservacoes}
              onChange={e => setFormObservacoes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
              placeholder="Observações (opcional)"
            />
          </div>

          {erro && <p className="text-red-600 dark:text-red-400 text-sm">{erro}</p>}
        </div>
        <div className="flex-shrink-0 flex flex-wrap justify-end gap-2 p-3 sm:p-4 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-b-2xl sm:rounded-b-xl">
          {formId && (
            <button
              onClick={() => { onExcluir(formId); onFechar() }}
              className="flex items-center gap-1 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
            >
              <Trash2 className="h-4 w-4" /> Excluir
            </button>
          )}
          <button
            onClick={onFechar}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            Cancelar
          </button>
          <button
            onClick={onSalvar}
            disabled={salvando}
            className="flex items-center gap-1 px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
