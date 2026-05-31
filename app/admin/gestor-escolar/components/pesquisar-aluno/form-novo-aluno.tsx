'use client'

import { UserPlus, X } from 'lucide-react'
import { EscolaSimples } from '../types'
import { FormMatricula, FormNovoAluno, TurmaDisponivel } from './types'

interface Props {
  formAluno: FormNovoAluno
  formMatricula: FormMatricula
  escolas: EscolaSimples[]
  turmas: TurmaDisponivel[]
  tipoUsuario: string
  carregandoTurmas: boolean
  criandoAluno: boolean
  onChangeAluno: (f: FormNovoAluno) => void
  onChangeMatricula: (f: FormMatricula) => void
  onCarregarTurmas: (escolaId: string) => void
  onFechar: () => void
  onCadastrar: () => void
}

export function FormNovoAlunoComponent({
  formAluno, formMatricula, escolas, turmas, tipoUsuario, carregandoTurmas, criandoAluno,
  onChangeAluno, onChangeMatricula, onCarregarTurmas, onFechar, onCadastrar,
}: Props) {
  return (
    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
          <UserPlus className="w-5 h-5" /> Cadastrar Novo Aluno
        </h3>
        <button onClick={onFechar} className="text-gray-400 hover:text-gray-600" aria-label="Fechar">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Nome *</label>
          <input
            type="text"
            value={formAluno.nome}
            onChange={(e) => onChangeAluno({ ...formAluno, nome: e.target.value })}
            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            placeholder="Nome completo do aluno"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">CPF</label>
          <input
            type="text"
            value={formAluno.cpf}
            onChange={(e) => onChangeAluno({ ...formAluno, cpf: e.target.value })}
            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            placeholder="000.000.000-00"
            inputMode="numeric"
            autoComplete="off"
            maxLength={14}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Data de Nascimento</label>
          <input
            type="date"
            value={formAluno.data_nascimento}
            onChange={(e) => onChangeAluno({ ...formAluno, data_nascimento: e.target.value })}
            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
          />
        </div>

        {tipoUsuario !== 'escola' && (
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Escola *</label>
            <select
              value={formMatricula.escola_id}
              onChange={(e) => {
                onChangeMatricula({ ...formMatricula, escola_id: e.target.value, turma_id: '' })
                onCarregarTurmas(e.target.value)
              }}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            >
              <option value="">Selecione...</option>
              {escolas.map((e) => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Turma (opcional)</label>
          <select
            value={formMatricula.turma_id}
            onChange={(e) => onChangeMatricula({ ...formMatricula, turma_id: e.target.value })}
            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            disabled={!formMatricula.escola_id || carregandoTurmas}
          >
            <option value="">Sem turma (cadastrar apenas)</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.codigo} {t.nome ? `- ${t.nome}` : ''} | {t.serie}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 min-h-[44px] sm:col-span-2">
          <input
            type="checkbox"
            id="novo-pcd"
            checked={formAluno.pcd}
            onChange={(e) => onChangeAluno({ ...formAluno, pcd: e.target.checked })}
            className="w-5 h-5 text-indigo-600 border-gray-300 rounded"
          />
          <label htmlFor="novo-pcd" className="text-sm text-gray-700 dark:text-gray-300">PCD (Pessoa com Deficiência)</label>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onCadastrar}
          disabled={criandoAluno || !formAluno.nome.trim() || !formMatricula.escola_id}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
        >
          {criandoAluno ? 'Cadastrando...' : formMatricula.turma_id ? 'Cadastrar e Matricular' : 'Cadastrar Aluno'}
        </button>
        <button
          onClick={onFechar}
          className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 text-sm"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
