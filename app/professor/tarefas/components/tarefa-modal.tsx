'use client'

import { useEffect, useState } from 'react'
import { ModalBase, ModalFooter } from '@/components/ui/modal-base'

export interface Turma { turma_id: string; turma_nome: string; serie: string }
export interface Disciplina { id: string; nome: string }

export interface FormTarefa {
  id: string
  turma_id: string
  titulo: string
  descricao: string
  disciplina_id: string
  data_entrega: string
  tipo: string
}

export const FORM_TAREFA_VAZIO: FormTarefa = {
  id: '', turma_id: '', titulo: '', descricao: '', disciplina_id: '',
  data_entrega: '', tipo: 'atividade',
}

export const TIPOS_TAREFA = [
  { value: 'atividade', label: 'Atividade' },
  { value: 'trabalho',  label: 'Trabalho' },
  { value: 'prova',     label: 'Prova' },
  { value: 'pesquisa',  label: 'Pesquisa' },
  { value: 'leitura',   label: 'Leitura' },
]

interface Props {
  aberto: boolean
  onFechar: () => void
  onSalvar: () => void
  salvando: boolean
  form: FormTarefa
  setForm: React.Dispatch<React.SetStateAction<FormTarefa>>
  turmas: Turma[]
}

export function TarefaModal({ aberto, onFechar, onSalvar, salvando, form, setForm, turmas }: Props) {
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])

  // Recarrega disciplinas quando turma muda (uma req por turma selecionada)
  useEffect(() => {
    if (!form.turma_id) { setDisciplinas([]); return }
    let cancelado = false
    fetch(`/api/professor/disciplinas?turma_id=${form.turma_id}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : { disciplinas: [] })
      .then(d => { if (!cancelado) setDisciplinas(Array.isArray(d?.disciplinas) ? d.disciplinas : []) })
      .catch(() => { if (!cancelado) setDisciplinas([]) })
    return () => { cancelado = true }
  }, [form.turma_id])

  return (
    <ModalBase
      aberto={aberto}
      onFechar={onFechar}
      titulo={form.id ? 'Editar Tarefa' : 'Nova Tarefa'}
      largura="md"
    >
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Turma *</label>
          <select
            value={form.turma_id}
            onChange={e => setForm(f => ({ ...f, turma_id: e.target.value, disciplina_id: '' }))}
            disabled={!!form.id}
            className="w-full mt-1 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <option value="">Selecione</option>
            {turmas.map(t => (
              <option key={t.turma_id} value={t.turma_id}>{t.turma_nome} — {t.serie}</option>
            ))}
          </select>
          {form.id && <p className="mt-1 text-[11px] text-gray-400">Turma não editável após criação</p>}
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Título *</label>
          <input
            value={form.titulo}
            onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
            placeholder="Ex: Exercícios página 42"
            className="w-full mt-1 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Descrição</label>
          <textarea
            value={form.descricao}
            onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
            rows={2}
            placeholder="Detalhes da tarefa..."
            className="w-full mt-1 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Disciplina</label>
            <select
              value={form.disciplina_id}
              onChange={e => setForm(f => ({ ...f, disciplina_id: e.target.value }))}
              disabled={!form.turma_id || disciplinas.length === 0}
              className="w-full mt-1 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white disabled:opacity-60"
            >
              <option value="">Sem disciplina específica</option>
              {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
            </select>
            {form.turma_id && disciplinas.length === 0 && (
              <p className="mt-1 text-[11px] text-gray-400">Nenhuma disciplina cadastrada para esta turma</p>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Tipo</label>
            <select
              value={form.tipo}
              onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
              className="w-full mt-1 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white"
            >
              {TIPOS_TAREFA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Data de Entrega *</label>
          <input
            type="date"
            value={form.data_entrega}
            onChange={e => setForm(f => ({ ...f, data_entrega: e.target.value }))}
            className="w-full mt-1 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white"
          />
        </div>
      </div>

      <ModalFooter
        onFechar={onFechar}
        onSalvar={onSalvar}
        salvando={salvando}
        textoSalvar={form.id ? 'Salvar Alterações' : 'Criar Tarefa'}
      />
    </ModalBase>
  )
}
