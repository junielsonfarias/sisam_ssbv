'use client'

import { X } from 'lucide-react'
import { TIPOS_DOCUMENTO, ORGAOS } from './constants'

export interface PublicacaoForm {
  formId: string | null
  formTipo: string
  formNumero: string
  formTitulo: string
  formDescricao: string
  formOrgao: string
  formData: string
  formAno: string
  formUrl: string
}

interface PublicacaoModalProps {
  form: PublicacaoForm
  salvando: boolean
  setFormTipo: (v: string) => void
  setFormNumero: (v: string) => void
  setFormTitulo: (v: string) => void
  setFormDescricao: (v: string) => void
  setFormOrgao: (v: string) => void
  setFormData: (v: string) => void
  setFormAno: (v: string) => void
  setFormUrl: (v: string) => void
  onFechar: () => void
  onSalvar: () => void
}

export function PublicacaoModal({
  form, salvando,
  setFormTipo, setFormNumero, setFormTitulo, setFormDescricao,
  setFormOrgao, setFormData, setFormAno, setFormUrl,
  onFechar, onSalvar,
}: PublicacaoModalProps) {
  const {
    formId, formTipo, formNumero, formTitulo, formDescricao, formOrgao, formData, formAno, formUrl,
  } = form
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-8">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-2xl w-full mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {formId ? 'Editar Publicação' : 'Nova Publicação'}
          </h3>
          <button onClick={onFechar} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo *</label>
            <select
              value={formTipo}
              onChange={(e) => setFormTipo(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
            >
              <option value="">Selecione o tipo</option>
              {TIPOS_DOCUMENTO.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Número</label>
            <input
              type="text"
              value={formNumero}
              onChange={(e) => setFormNumero(e.target.value)}
              placeholder="Ex: 001/2026"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Título *</label>
            <input
              type="text"
              value={formTitulo}
              onChange={(e) => setFormTitulo(e.target.value)}
              placeholder="Título da publicação"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descrição</label>
            <textarea
              value={formDescricao}
              onChange={(e) => setFormDescricao(e.target.value)}
              rows={3}
              placeholder="Descrição ou ementa da publicação"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Órgão *</label>
            <select
              value={formOrgao}
              onChange={(e) => setFormOrgao(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
            >
              <option value="">Selecione o órgão</option>
              {ORGAOS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data de Publicação *</label>
            <input
              type="date"
              value={formData}
              onChange={(e) => setFormData(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ano de Referência</label>
            <input
              type="text"
              value={formAno}
              onChange={(e) => setFormAno(e.target.value)}
              placeholder="Ex: 2026"
              maxLength={10}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">URL do Arquivo</label>
            <input
              type="url"
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onFechar}
            className="px-5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onSalvar}
            disabled={salvando}
            className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {salvando ? 'Salvando...' : (formId ? 'Atualizar' : 'Criar')}
          </button>
        </div>
      </div>
    </div>
  )
}
