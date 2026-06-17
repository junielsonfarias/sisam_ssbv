'use client'

import { X } from 'lucide-react'
import { EscolaSimples } from './types'

interface ModalCrudTurmaProps {
  mostrarModal: boolean
  turmaEditando: { id: string } | null
  formData: {
    codigo: string
    nome: string
    escola_id: string
    serie: string
    ano_letivo: string
    capacidade_maxima: number
    multiserie: boolean
    multietapa: boolean
  }
  setFormData: React.Dispatch<React.SetStateAction<{
    codigo: string
    nome: string
    escola_id: string
    serie: string
    ano_letivo: string
    capacidade_maxima: number
    multiserie: boolean
    multietapa: boolean
  }>>
  escolas: EscolaSimples[]
  salvando: boolean
  onFechar: () => void
  onSalvar: () => void
}

export function ModalCrudTurma({
  mostrarModal,
  turmaEditando,
  formData,
  setFormData,
  escolas,
  salvando,
  onFechar,
  onSalvar,
}: ModalCrudTurmaProps) {
  if (!mostrarModal) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onFechar}>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            {turmaEditando ? 'Editar Turma' : 'Nova Turma'}
          </h2>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Código *
            </label>
            <input
              type="text"
              value={formData.codigo}
              onChange={e => setFormData(prev => ({ ...prev, codigo: e.target.value }))}
              placeholder="Ex: 5A, 6B"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Nome
            </label>
            <input
              type="text"
              value={formData.nome}
              onChange={e => setFormData(prev => ({ ...prev, nome: e.target.value }))}
              placeholder="Ex: Turma A - Manhã"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Escola *
            </label>
            <select
              value={formData.escola_id}
              onChange={e => setFormData(prev => ({ ...prev, escola_id: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            >
              <option value="">Selecione a escola</option>
              {escolas.map(e => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Série *
              </label>
              <input
                type="text"
                value={formData.serie}
                onChange={e => setFormData(prev => ({ ...prev, serie: e.target.value }))}
                placeholder="Ex: 5º Ano"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Ano Letivo *
              </label>
              <input
                type="text"
                value={formData.ano_letivo}
                onChange={e => setFormData(prev => ({ ...prev, ano_letivo: e.target.value }))}
                placeholder="Ex: 2026"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Capacidade Máxima de Alunos
            </label>
            <input
              type="number"
              value={formData.capacidade_maxima}
              onChange={e => setFormData(prev => ({ ...prev, capacidade_maxima: parseInt(e.target.value) || 35 }))}
              min={1}
              max={100}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            />
            <p className="text-[10px] text-gray-400 mt-0.5">Este valor alimenta o Controle de Vagas</p>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 min-h-[44px] text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.multiserie}
                onChange={e => setFormData(prev => ({ ...prev, multiserie: e.target.checked }))}
                className="w-5 h-5 rounded border-gray-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
              />
              Multisseriada
            </label>
            <label className="flex items-center gap-2 min-h-[44px] text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.multietapa}
                onChange={e => setFormData(prev => ({ ...prev, multietapa: e.target.checked }))}
                className="w-5 h-5 rounded border-gray-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
              />
              Multietapa
            </label>
          </div>

          {(formData.multiserie || formData.multietapa) && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                <strong>Turma {formData.multiserie && formData.multietapa ? 'Multisseriada e Multietapa' : formData.multiserie ? 'Multisseriada' : 'Multietapa'}:</strong> A série informada acima é a série principal da turma. Na matrícula, será possível informar a série individual de cada aluno.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-slate-700">
          <button
            onClick={onFechar}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onSalvar}
            disabled={salvando}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {salvando ? 'Salvando...' : turmaEditando ? 'Atualizar' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  )
}
