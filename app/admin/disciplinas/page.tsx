'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState } from 'react'
import { BookOpen, Plus, Pencil, Trash2, Save, X, GripVertical } from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface Disciplina {
  id: string
  nome: string
  codigo: string | null
  abreviacao: string | null
  ordem: number
  ativo: boolean
}

export default function DisciplinasPage() {
  const toast = useToast()
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [carregando, setCarregando] = useState(true)
  const [editando, setEditando] = useState<string | null>(null)
  const [criando, setCriando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [mostrarInativos, setMostrarInativos] = useState(false)

  const [form, setForm] = useState({ nome: '', codigo: '', abreviacao: '', ordem: 0, ativo: true })

  const carregar = async () => {
    try {
      const res = await fetch(`/api/admin/disciplinas-escolares?ativas=${!mostrarInativos ? 'true' : 'false'}`)
      if (res.ok) setDisciplinas(await res.json())
    } catch (e) {
      toast.error('Erro ao carregar disciplinas')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [mostrarInativos])

  const iniciarCriacao = () => {
    const maxOrdem = disciplinas.length > 0 ? Math.max(...disciplinas.map(d => d.ordem)) + 1 : 1
    setForm({ nome: '', codigo: '', abreviacao: '', ordem: maxOrdem, ativo: true })
    setCriando(true)
    setEditando(null)
  }

  const iniciarEdicao = (d: Disciplina) => {
    setForm({ nome: d.nome, codigo: d.codigo || '', abreviacao: d.abreviacao || '', ordem: d.ordem, ativo: d.ativo })
    setEditando(d.id)
    setCriando(false)
  }

  const cancelar = () => {
    setEditando(null)
    setCriando(false)
  }

  const salvar = async () => {
    if (!form.nome.trim()) { toast.error('Nome é obrigatório'); return }
    setSalvando(true)
    try {
      const payload = {
        ...(editando ? { id: editando } : {}),
        nome: form.nome.trim(),
        codigo: form.codigo.trim() || null,
        abreviacao: form.abreviacao.trim() || null,
        ordem: form.ordem,
        ativo: form.ativo,
      }
      const res = await fetch('/api/admin/disciplinas-escolares', {
        method: editando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        toast.success(editando ? 'Disciplina atualizada' : 'Disciplina criada')
        cancelar()
        await carregar()
      } else {
        const data = await res.json()
        toast.error(data.mensagem || 'Erro ao salvar')
      }
    } catch (e) {
      toast.error('Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async (id: string, nome: string) => {
    if (!confirm(`Excluir disciplina "${nome}"? Esta ação não pode ser desfeita.`)) return
    try {
      const res = await fetch(`/api/admin/disciplinas-escolares?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Disciplina excluída')
        await carregar()
      } else {
        const data = await res.json()
        toast.error(data.mensagem || 'Erro ao excluir')
      }
    } catch (e) {
      toast.error('Erro ao excluir')
    }
  }

  const toggleAtivo = async (d: Disciplina) => {
    try {
      const res = await fetch('/api/admin/disciplinas-escolares', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: d.id, nome: d.nome, codigo: d.codigo, abreviacao: d.abreviacao, ordem: d.ordem, ativo: !d.ativo }),
      })
      if (res.ok) {
        toast.success(d.ativo ? 'Disciplina desativada' : 'Disciplina ativada')
        await carregar()
      }
    } catch (e) {
      toast.error('Erro ao alterar status')
    }
  }

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-lg p-2">
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Disciplinas Escolares</h1>
              <p className="text-sm opacity-90">Cadastro de disciplinas com sigla e ordem para o boletim</p>
            </div>
          </div>
        </div>

        {/* Controles */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={iniciarCriacao}
              disabled={criando}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Nova Disciplina
            </button>
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                checked={mostrarInativos}
                onChange={e => setMostrarInativos(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600"
              />
              Mostrar inativas
            </label>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {disciplinas.length} disciplina(s)
          </span>
        </div>

        {carregando ? (
          <LoadingSpinner text="Carregando..." centered />
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200 dark:divide-slate-700">
                <thead className="bg-gray-50 dark:bg-slate-700">
                  <tr>
                    <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase w-16">Ordem</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Nome</th>
                    <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase w-24">Sigla</th>
                    <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase w-28">Abreviação</th>
                    <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase w-20">Status</th>
                    <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase w-28">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {/* Linha de criação */}
                  {criando && (
                    <tr className="bg-indigo-50 dark:bg-indigo-900/20">
                      <td className="py-2 px-3 text-center">
                        <input type="number" value={form.ordem} onChange={e => setForm(f => ({ ...f, ordem: parseInt(e.target.value) || 0 }))}
                          className="w-14 text-center rounded border border-indigo-300 px-1 py-1 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white" min={0} />
                      </td>
                      <td className="py-2 px-4">
                        <input type="text" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                          placeholder="Nome da disciplina" autoFocus
                          className="w-full rounded border border-indigo-300 px-2 py-1 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white" />
                      </td>
                      <td className="py-2 px-3">
                        <input type="text" value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value.toUpperCase() }))}
                          placeholder="LP" maxLength={10}
                          className="w-20 text-center rounded border border-indigo-300 px-1 py-1 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white uppercase" />
                      </td>
                      <td className="py-2 px-3">
                        <input type="text" value={form.abreviacao} onChange={e => setForm(f => ({ ...f, abreviacao: e.target.value }))}
                          placeholder="Port" maxLength={20}
                          className="w-24 text-center rounded border border-indigo-300 px-1 py-1 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white" />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="text-xs text-emerald-600 font-medium">Nova</span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={salvar} disabled={salvando}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg" title="Salvar">
                            <Save className="w-4 h-4" />
                          </button>
                          <button onClick={cancelar} className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg" title="Cancelar">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Disciplinas existentes */}
                  {disciplinas.map((d, idx) => {
                    const isEdit = editando === d.id
                    return (
                      <tr key={d.id} className={`transition-colors ${!d.ativo ? 'opacity-50' : ''} ${isEdit ? 'bg-amber-50 dark:bg-amber-900/20' : idx % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-slate-800/50'}`}>
                        <td className="py-2.5 px-3 text-center">
                          {isEdit ? (
                            <input type="number" value={form.ordem} onChange={e => setForm(f => ({ ...f, ordem: parseInt(e.target.value) || 0 }))}
                              className="w-14 text-center rounded border border-amber-300 px-1 py-1 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white" min={0} />
                          ) : (
                            <span className="text-sm text-gray-500 font-mono">{d.ordem}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          {isEdit ? (
                            <input type="text" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                              className="w-full rounded border border-amber-300 px-2 py-1 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white" />
                          ) : (
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{d.nome}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isEdit ? (
                            <input type="text" value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value.toUpperCase() }))}
                              maxLength={10}
                              className="w-20 text-center rounded border border-amber-300 px-1 py-1 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white uppercase" />
                          ) : (
                            <span className="text-sm font-mono text-indigo-600 dark:text-indigo-400">{d.codigo || '-'}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isEdit ? (
                            <input type="text" value={form.abreviacao} onChange={e => setForm(f => ({ ...f, abreviacao: e.target.value }))}
                              maxLength={20}
                              className="w-24 text-center rounded border border-amber-300 px-1 py-1 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white" />
                          ) : (
                            <span className="text-sm text-gray-600 dark:text-gray-400">{d.abreviacao || '-'}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button onClick={() => toggleAtivo(d)} title={d.ativo ? 'Desativar' : 'Ativar'}
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium cursor-pointer transition-colors ${
                              d.ativo
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-200'
                                : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200'
                            }`}>
                            {d.ativo ? 'Ativa' : 'Inativa'}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isEdit ? (
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={salvar} disabled={salvando}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg" title="Salvar">
                                <Save className="w-4 h-4" />
                              </button>
                              <button onClick={cancelar} className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg" title="Cancelar">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => iniciarEdicao(d)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg" title="Editar">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => excluir(d.id, d.nome)}
                                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg" title="Excluir">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}

                  {disciplinas.length === 0 && !criando && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400 dark:text-gray-500">
                        Nenhuma disciplina cadastrada
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Legenda */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700 text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <p><strong>Sigla:</strong> Código curto da disciplina (ex: LP, MAT, CIE) — usado em relatórios e APIs</p>
              <p><strong>Abreviação:</strong> Nome abreviado (ex: Port, Mat, Ciên) — exibido quando espaço é limitado</p>
              <p><strong>Ordem:</strong> Define a sequência de exibição no boletim e em listagens</p>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
