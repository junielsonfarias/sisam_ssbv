'use client'

import { AlertCircle, CheckCircle, GraduationCap } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EscolaSimples } from '../types'
import { AlunoResultado, FormMatricula, TurmaDisponivel } from './types'

interface Props {
  aluno: AlunoResultado
  form: FormMatricula
  escolas: EscolaSimples[]
  turmas: TurmaDisponivel[]
  tipoUsuario: string
  carregandoTurmas: boolean
  matriculando: boolean
  onChangeForm: (f: FormMatricula) => void
  onCarregarTurmas: (escolaId: string) => void
  onCancelar: () => void
  onConfirmar: () => void
}

export function FormMatriculaComponent({
  aluno, form, escolas, turmas, tipoUsuario, carregandoTurmas, matriculando,
  onChangeForm, onCarregarTurmas, onCancelar, onConfirmar,
}: Props) {
  const turmaSelecionada = turmas.find((t) => t.id === form.turma_id)
  const vagas = turmaSelecionada
    ? (turmaSelecionada.capacidade_maxima || 35) - (turmaSelecionada.total_alunos || 0)
    : 0

  return (
    <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-5 space-y-4">
      <h3 className="font-semibold text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
        <GraduationCap className="w-5 h-5" /> Matricular {aluno.nome}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {tipoUsuario !== 'escola' && (
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Escola *</label>
            <select
              value={form.escola_id}
              onChange={(e) => {
                onChangeForm({ ...form, escola_id: e.target.value, turma_id: '' })
                onCarregarTurmas(e.target.value)
              }}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            >
              <option value="">Selecione a escola...</option>
              {escolas.map((e) => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Turma *</label>
          {carregandoTurmas ? (
            <div className="py-2"><LoadingSpinner size="sm" /></div>
          ) : (
            <select
              value={form.turma_id}
              onChange={(e) => onChangeForm({ ...form, turma_id: e.target.value })}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              disabled={!form.escola_id}
            >
              <option value="">Selecione a turma...</option>
              {turmas.map((t) => {
                const v = (t.capacidade_maxima || 35) - (t.total_alunos || 0)
                return (
                  <option key={t.id} value={t.id} disabled={v <= 0}>
                    {t.codigo} {t.nome ? `- ${t.nome}` : ''} | {t.serie} | {v > 0 ? `${v} vagas` : 'LOTADA'}
                  </option>
                )
              })}
            </select>
          )}
        </div>

        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Ano Letivo</label>
          <input
            type="text"
            value={form.ano_letivo}
            onChange={(e) => onChangeForm({ ...form, ano_letivo: e.target.value })}
            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {turmaSelecionada && (
        <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
          vagas > 5 ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
          vagas > 0 ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' :
          'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
        }`}>
          {vagas > 0 ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {turmaSelecionada.total_alunos}/{turmaSelecionada.capacidade_maxima} alunos — {
            vagas > 0
              ? `${vagas} vaga${vagas > 1 ? 's' : ''} disponível${vagas > 1 ? 'eis' : ''}`
              : 'Sem vagas'
          }
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onConfirmar}
          disabled={matriculando || !form.turma_id}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
        >
          {matriculando ? 'Matriculando...' : 'Confirmar Matrícula'}
        </button>
        <button
          onClick={onCancelar}
          className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 text-sm"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
