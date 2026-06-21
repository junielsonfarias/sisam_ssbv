'use client'

import { Edit2, X, Save, CheckCircle } from 'lucide-react'
import SeletorBncc from '@/components/professor/seletor-bncc'
import type { Disciplina } from './types'

interface PlanoModalProps {
  formId: string
  formDisciplinaId: string
  formPeriodo: string
  formDataInicio: string
  formDataFim: string
  formObjetivo: string
  formConteudo: string
  formMetodologia: string
  formRecursos: string
  formAvaliacao: string
  formObservacoes: string
  formStatus: string
  formHabilidadesBncc: string[]
  disciplinas: Disciplina[]
  turmaId: string
  salvando: boolean
  erro: string
  setFormDisciplinaId: (v: string) => void
  setFormPeriodo: (v: string) => void
  setFormDataInicio: (v: string) => void
  setFormDataFim: (v: string) => void
  setFormObjetivo: (v: string) => void
  setFormConteudo: (v: string) => void
  setFormMetodologia: (v: string) => void
  setFormRecursos: (v: string) => void
  setFormAvaliacao: (v: string) => void
  setFormObservacoes: (v: string) => void
  setFormStatus: (v: string) => void
  setFormHabilidadesBncc: (v: string[]) => void
  onFechar: () => void
  onSalvar: () => void
}

export function PlanoModal({
  formId, formDisciplinaId, formPeriodo, formDataInicio, formDataFim,
  formObjetivo, formConteudo, formMetodologia, formRecursos, formAvaliacao,
  formObservacoes, formStatus, formHabilidadesBncc, disciplinas, turmaId, salvando, erro,
  setFormDisciplinaId, setFormPeriodo, setFormDataInicio, setFormDataFim,
  setFormObjetivo, setFormConteudo, setFormMetodologia, setFormRecursos,
  setFormAvaliacao, setFormObservacoes, setFormStatus, setFormHabilidadesBncc,
  onFechar, onSalvar,
}: PlanoModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white dark:bg-slate-800 sm:rounded-xl rounded-t-2xl shadow-xl w-full sm:max-w-2xl h-[95vh] sm:h-auto sm:max-h-[90vh] flex flex-col">
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {formId ? 'Editar Plano' : 'Novo Plano de Aula'}
          </h3>
          <button onClick={onFechar} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Período</label>
              <select
                value={formPeriodo}
                onChange={e => setFormPeriodo(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
              >
                <option value="semanal">Semanal</option>
                <option value="mensal">Mensal</option>
                <option value="bimestral">Bimestral</option>
              </select>
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
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data Início *</label>
              <input
                type="date"
                value={formDataInicio}
                onChange={e => setFormDataInicio(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data Fim</label>
              <input
                type="date"
                value={formDataFim}
                onChange={e => setFormDataFim(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
              />
            </div>
          </div>
          {/* Seletor de habilidades BNCC — colocado antes dos campos
              de texto (objetivo/conteudo) para o professor escolher
              as habilidades primeiro. */}
          <SeletorBncc
            valor={formHabilidadesBncc}
            onChange={setFormHabilidadesBncc}
            disciplinaId={formDisciplinaId || null}
            turmaId={turmaId}
            label="Habilidades BNCC vinculadas"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Objetivo *</label>
            <textarea
              value={formObjetivo}
              onChange={e => setFormObjetivo(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
              placeholder="Descreva os objetivos da aula..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Conteúdo *</label>
            <textarea
              value={formConteudo}
              onChange={e => setFormConteudo(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
              placeholder="Descreva o conteúdo..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Metodologia</label>
            <textarea
              value={formMetodologia}
              onChange={e => setFormMetodologia(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
              placeholder="Metodologia (opcional)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recursos</label>
            <textarea
              value={formRecursos}
              onChange={e => setFormRecursos(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
              placeholder="Recursos necessários (opcional)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Avaliação</label>
            <textarea
              value={formAvaliacao}
              onChange={e => setFormAvaliacao(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
              placeholder="Critérios de avaliação (opcional)"
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
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormStatus('rascunho')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm ${formStatus === 'rascunho' ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 ring-2 ring-amber-400' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400'}`}
              >
                <Edit2 className="h-3 w-3" /> Rascunho
              </button>
              <button
                type="button"
                onClick={() => setFormStatus('finalizado')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm ${formStatus === 'finalizado' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 ring-2 ring-green-400' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400'}`}
              >
                <CheckCircle className="h-3 w-3" /> Finalizado
              </button>
            </div>
          </div>
          {erro && <p className="text-red-600 dark:text-red-400 text-sm">{erro}</p>}
        </div>
        <div className="flex-shrink-0 flex flex-wrap justify-end gap-2 p-3 sm:p-4 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-b-2xl sm:rounded-b-xl">
          <button onClick={onFechar} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            Cancelar
          </button>
          <button
            onClick={onSalvar}
            disabled={salvando}
            className="flex items-center gap-1 px-4 py-2 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-lg disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
