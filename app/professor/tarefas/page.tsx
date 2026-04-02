'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/protected-route'
import { ClipboardList, Plus, Trash2, ArrowLeft, Calendar, BookOpen, X } from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface Turma { turma_id: string; turma_nome: string; serie: string }
interface Tarefa {
  id: string; titulo: string; descricao: string | null; disciplina: string | null
  data_entrega: string; tipo: string; turma_codigo: string; turma_nome: string; serie: string
}

const TIPOS = [
  { value: 'atividade', label: 'Atividade', cor: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  { value: 'trabalho', label: 'Trabalho', cor: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' },
  { value: 'prova', label: 'Prova', cor: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
  { value: 'pesquisa', label: 'Pesquisa', cor: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  { value: 'leitura', label: 'Leitura', cor: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
]

export default function TarefasProfessor() {
  const router = useRouter()
  const toast = useToast()
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modal, setModal] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const [form, setForm] = useState({ turma_id: '', titulo: '', descricao: '', disciplina: '', data_entrega: '', tipo: 'atividade' })

  useEffect(() => {
    Promise.all([carregarTurmas(), carregarTarefas()])
      .finally(() => setCarregando(false))
  }, [])

  const carregarTurmas = async () => {
    const res = await fetch('/api/professor/turmas', { credentials: 'include' })
    if (res.ok) { const d = await res.json(); setTurmas(d.turmas || []) }
  }

  const carregarTarefas = async () => {
    const res = await fetch('/api/professor/tarefas', { credentials: 'include' })
    if (res.ok) { const d = await res.json(); setTarefas(d.tarefas || []) }
  }

  const salvar = async () => {
    if (!form.turma_id || !form.titulo || !form.data_entrega) {
      toast.error('Preencha turma, titulo e data de entrega'); return
    }
    setSalvando(true)
    try {
      const res = await fetch('/api/professor/tarefas', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        toast.success('Tarefa criada!')
        setModal(false)
        setForm({ turma_id: '', titulo: '', descricao: '', disciplina: '', data_entrega: '', tipo: 'atividade' })
        carregarTarefas()
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.mensagem || 'Erro ao criar')
      }
    } catch { toast.error('Erro de conexao') } finally { setSalvando(false) }
  }

  const excluir = async (id: string) => {
    const res = await fetch(`/api/professor/tarefas?id=${id}`, { method: 'DELETE', credentials: 'include' })
    if (res.ok) { toast.success('Tarefa removida'); carregarTarefas() }
  }

  const isVencida = (d: string) => new Date(d) < new Date(new Date().toDateString())
  const formatData = (d: string) => {
    try { return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) } catch { return d }
  }

  if (carregando) return <ProtectedRoute tiposPermitidos={['professor']}><div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center"><LoadingSpinner centered /></div></ProtectedRoute>

  return (
    <ProtectedRoute tiposPermitidos={['professor']}>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        <div className="bg-blue-600 text-white px-4 sm:px-6 py-5">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/professor/dashboard')} className="p-1"><ArrowLeft className="w-5 h-5" /></button>
              <ClipboardList className="w-6 h-6" />
              <div>
                <h1 className="text-lg font-bold">Tarefas</h1>
                <p className="text-blue-200 text-xs">{tarefas.length} tarefa(s)</p>
              </div>
            </div>
            <button onClick={() => setModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium">
              <Plus className="w-4 h-4" /> Nova
            </button>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 space-y-3">
          {tarefas.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center border border-gray-200 dark:border-slate-700">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">Nenhuma tarefa criada</p>
              <button onClick={() => setModal(true)} className="mt-3 text-sm font-medium text-blue-600">+ Criar tarefa</button>
            </div>
          ) : (
            tarefas.map(t => {
              const tipoConfig = TIPOS.find(tp => tp.value === t.tipo) || TIPOS[0]
              const vencida = isVencida(t.data_entrega)
              return (
                <div key={t.id} className={`bg-white dark:bg-slate-800 rounded-xl border p-4 ${vencida ? 'border-gray-200 dark:border-slate-700 opacity-60' : 'border-gray-200 dark:border-slate-700'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${tipoConfig.cor}`}>{tipoConfig.label}</span>
                        <span className="text-xs text-gray-400">{t.turma_codigo} — {t.serie}</span>
                      </div>
                      <h3 className={`text-sm font-bold mt-1.5 ${vencida ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>{t.titulo}</h3>
                      {t.descricao && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{t.descricao}</p>}
                      {t.disciplina && <p className="text-xs text-gray-400 mt-1">Disciplina: {t.disciplina}</p>}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className={`flex items-center gap-1 text-xs font-medium ${vencida ? 'text-gray-400' : 'text-blue-600 dark:text-blue-400'}`}>
                        <Calendar className="w-3.5 h-3.5" />
                        {formatData(t.data_entrega)}
                      </div>
                      <button onClick={() => excluir(t.id)} className="mt-2 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Modal criar tarefa */}
        {modal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4">
            <div className="bg-white dark:bg-slate-800 w-full sm:max-w-md sm:rounded-xl rounded-t-2xl" role="dialog">
              <div className="px-5 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Nova Tarefa</h3>
                <button onClick={() => setModal(false)} className="p-1"><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="px-5 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Turma *</label>
                  <select value={form.turma_id} onChange={e => setForm(f => ({ ...f, turma_id: e.target.value }))}
                    className="w-full mt-1 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white">
                    <option value="">Selecione</option>
                    {turmas.map(t => <option key={t.turma_id} value={t.turma_id}>{t.turma_nome} — {t.serie}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Titulo *</label>
                  <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Exercicios pagina 42"
                    className="w-full mt-1 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Descricao</label>
                  <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={2} placeholder="Detalhes da tarefa..."
                    className="w-full mt-1 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Disciplina</label>
                    <input value={form.disciplina} onChange={e => setForm(f => ({ ...f, disciplina: e.target.value }))} placeholder="Matematica"
                      className="w-full mt-1 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Tipo</label>
                    <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                      className="w-full mt-1 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white">
                      {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Data de Entrega *</label>
                  <input type="date" value={form.data_entrega} onChange={e => setForm(f => ({ ...f, data_entrega: e.target.value }))}
                    className="w-full mt-1 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white" />
                </div>
              </div>
              <div className="px-5 py-4 border-t border-gray-200 dark:border-slate-700 flex gap-2">
                <button onClick={() => setModal(false)} className="flex-1 min-h-[44px] text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-xl">Cancelar</button>
                <button onClick={salvar} disabled={salvando} className="flex-1 min-h-[44px] text-sm font-bold text-white bg-blue-600 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                  {salvando ? <LoadingSpinner /> : <Plus className="w-4 h-4" />} Criar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
