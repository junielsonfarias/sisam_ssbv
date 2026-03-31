'use client'

import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, Save, X } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Disciplina } from './types'

function FormDisciplina({
  form,
  setForm,
  onSalvar,
  onCancelar,
  salvando,
  titulo,
  inline = false,
}: {
  form: { nome: string; codigo: string; abreviacao: string; ordem: number; ativo: boolean }
  setForm: (f: any) => void
  onSalvar: () => void
  onCancelar: () => void
  salvando: boolean
  titulo: string
  inline?: boolean
}) {
  return (
    <div className={`${inline ? '' : 'bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4'} space-y-3`}>
      {!inline && <h3 className="font-medium text-gray-800 dark:text-white">{titulo}</h3>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <input
          type="text"
          placeholder="Nome *"
          value={form.nome}
          onChange={e => setForm({ ...form, nome: e.target.value })}
          className="rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
        />
        <input
          type="text"
          placeholder="Codigo (ex: LP)"
          value={form.codigo}
          onChange={e => setForm({ ...form, codigo: e.target.value })}
          className="rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
        />
        <input
          type="text"
          placeholder="Abreviacao"
          value={form.abreviacao}
          onChange={e => setForm({ ...form, abreviacao: e.target.value })}
          className="rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
        />
        <input
          type="number"
          placeholder="Ordem"
          value={form.ordem}
          onChange={e => setForm({ ...form, ordem: parseInt(e.target.value) || 0 })}
          className="rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
        />
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 min-h-[44px] text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={e => setForm({ ...form, ativo: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-indigo-600"
            />
            Ativa
          </label>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onSalvar}
          disabled={salvando}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 text-sm transition-colors"
        >
          <Save className="w-4 h-4" />
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
        <button
          onClick={onCancelar}
          className="flex items-center gap-2 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-500 text-sm transition-colors"
        >
          <X className="w-4 h-4" />
          Cancelar
        </button>
      </div>
    </div>
  )
}

export function AbaDisciplinas({ podeEditar, toast }: { podeEditar: boolean; toast: any }) {
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [carregando, setCarregando] = useState(true)
  const [editando, setEditando] = useState<string | null>(null)
  const [criando, setCriando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({ nome: '', codigo: '', abreviacao: '', ordem: 0, ativo: true })

  const carregarDisciplinas = async () => {
    try {
      const res = await fetch('/api/admin/disciplinas-escolares?ativas=false')
      if (res.ok) setDisciplinas(await res.json())
    } catch (e) {
      toast.error('Erro ao carregar disciplinas')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregarDisciplinas() }, [])

  const iniciarEdicao = (d: Disciplina) => {
    setEditando(d.id)
    setCriando(false)
    setForm({ nome: d.nome, codigo: d.codigo || '', abreviacao: d.abreviacao || '', ordem: d.ordem, ativo: d.ativo })
  }

  const iniciarCriacao = () => {
    setCriando(true)
    setEditando(null)
    setForm({ nome: '', codigo: '', abreviacao: '', ordem: disciplinas.length + 1, ativo: true })
  }

  const cancelar = () => {
    setEditando(null)
    setCriando(false)
  }

  const salvar = async () => {
    if (!form.nome.trim()) {
      toast.error('Nome é obrigatório')
      return
    }
    setSalvando(true)
    try {
      const method = criando ? 'POST' : 'PUT'
      const body = criando ? form : { ...form, id: editando }
      const res = await fetch('/api/admin/disciplinas-escolares', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(criando ? 'Disciplina criada!' : 'Disciplina atualizada!')
        cancelar()
        await carregarDisciplinas()
      } else {
        toast.error(data.mensagem || 'Erro ao salvar')
      }
    } catch (e) {
      toast.error('Erro ao salvar disciplina')
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta disciplina?')) return
    try {
      const res = await fetch(`/api/admin/disciplinas-escolares?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        toast.success('Disciplina excluida!')
        await carregarDisciplinas()
      } else {
        toast.error(data.mensagem || 'Erro ao excluir')
      }
    } catch (e) {
      toast.error('Erro ao excluir disciplina')
    }
  }

  if (carregando) return <LoadingSpinner text="Carregando disciplinas..." centered />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Disciplinas Escolares</h2>
        {podeEditar && !criando && (
          <button
            onClick={iniciarCriacao}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Nova Disciplina
          </button>
        )}
      </div>

      {/* Formulario de criacao */}
      {criando && (
        <FormDisciplina
          form={form}
          setForm={setForm}
          onSalvar={salvar}
          onCancelar={cancelar}
          salvando={salvando}
          titulo="Nova Disciplina"
        />
      )}

      <div className="overflow-x-auto">
        <table className="w-full divide-y divide-gray-200 dark:divide-slate-700">
          <thead className="bg-gray-50 dark:bg-slate-700">
            <tr>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Ordem</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Nome</th>
              <th className="hidden sm:table-cell text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Codigo</th>
              <th className="hidden sm:table-cell text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Abreviacao</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Status</th>
              {podeEditar && (
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Acoes</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
            {disciplinas.map(d => (
              <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                {editando === d.id ? (
                  <td colSpan={podeEditar ? 6 : 5} className="p-2">
                    <FormDisciplina
                      form={form}
                      setForm={setForm}
                      onSalvar={salvar}
                      onCancelar={cancelar}
                      salvando={salvando}
                      titulo="Editar Disciplina"
                      inline
                    />
                  </td>
                ) : (
                  <>
                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{d.ordem}</td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">{d.nome}</td>
                    <td className="hidden sm:table-cell py-3 px-4 text-sm text-gray-500 dark:text-gray-400 font-mono">{d.codigo || '-'}</td>
                    <td className="hidden sm:table-cell py-3 px-4 text-sm text-gray-500 dark:text-gray-400">{d.abreviacao || '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        d.ativo
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {d.ativo ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    {podeEditar && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => iniciarEdicao(d)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg" title="Editar">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => excluir(d.id)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg" title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </>
                )}
              </tr>
            ))}
            {disciplinas.length === 0 && (
              <tr>
                <td colSpan={podeEditar ? 6 : 5} className="py-8 text-center text-gray-500 dark:text-gray-400">
                  Nenhuma disciplina cadastrada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
