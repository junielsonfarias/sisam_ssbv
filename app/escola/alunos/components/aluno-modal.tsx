'use client'

import { X, Save } from 'lucide-react'
import { ButtonSpinner } from '@/components/ui/loading-spinner'
import type { Aluno, FormAluno } from './types'

interface AlunoModalProps {
  alunoEditando: Aluno | null
  formData: FormAluno
  salvando: boolean
  seriesDisponiveis: string[]
  turmasDoModal: any[]
  formatSerie: (serie: string | null | undefined) => string
  setFormData: (form: FormAluno) => void
  onFechar: () => void
  onSalvar: () => void
}

export function AlunoModal({
  alunoEditando, formData, salvando, seriesDisponiveis, turmasDoModal,
  formatSerie, setFormData, onFechar, onSalvar,
}: AlunoModalProps) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onFechar}></div>
        <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {alunoEditando ? 'Editar Aluno' : 'Novo Aluno'}
            </h2>
            <button onClick={onFechar} className="text-gray-400 hover:text-gray-600 p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
              <input
                type="text"
                value={formData.nome}
                onChange={e => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome completo"
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CPF</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={formData.cpf}
                onChange={e => setFormData({ ...formData, cpf: e.target.value })}
                placeholder="000.000.000-00"
                maxLength={14}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data de Nascimento</label>
              <input
                type="date"
                value={formData.data_nascimento}
                onChange={e => setFormData({ ...formData, data_nascimento: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sexo</label>
              <select
                value={formData.sexo}
                onChange={e => setFormData({ ...formData, sexo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
              >
                <option value="">Selecione...</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Série</label>
              <select
                value={formData.serie}
                onChange={e => setFormData({ ...formData, serie: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
              >
                <option value="">Selecione...</option>
                {seriesDisponiveis.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Turma</label>
              <select
                value={formData.turma_id}
                onChange={e => setFormData({ ...formData, turma_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
              >
                <option value="">Selecione...</option>
                {turmasDoModal.map(t => <option key={t.id} value={t.id}>{t.codigo} {t.serie ? `- ${formatSerie(t.serie)}` : ''}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ano Letivo</label>
              <input
                type="text"
                value={formData.ano_letivo}
                onChange={e => setFormData({ ...formData, ano_letivo: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                maxLength={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 min-h-[44px] text-sm text-gray-700 dark:text-gray-300 pb-2">
                <input
                  type="checkbox"
                  checked={formData.pcd}
                  onChange={e => setFormData({ ...formData, pcd: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
                PCD
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onFechar}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={onSalvar}
              disabled={salvando || !formData.nome.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
            >
              {salvando ? <><ButtonSpinner /> Salvando...</> : <><Save className="w-4 h-4" /> Salvar</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
