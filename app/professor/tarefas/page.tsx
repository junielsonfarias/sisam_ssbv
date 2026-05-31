'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/protected-route'
import {
  ClipboardList, Plus, Trash2, ArrowLeft, Calendar, Edit2,
  Filter, BookOpen,
} from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import {
  TarefaModal, FORM_TAREFA_VAZIO, TIPOS_TAREFA,
  type Turma, type FormTarefa,
} from './components/tarefa-modal'

interface Tarefa {
  id: string
  turma_id: string
  titulo: string
  descricao: string | null
  disciplina_id: string | null
  disciplina_nome: string | null
  data_entrega: string
  tipo: string
  turma_codigo: string
  turma_nome: string
  serie: string
}

// Cores dos badges de tipo (mantidas locais — semantica, nao paleta de portal)
const CORES_TIPO: Record<string, string> = {
  atividade: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  trabalho:  'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
  prova:     'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  pesquisa:  'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  leitura:   'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
}

type Aba = 'ativas' | 'vencidas'

// Compara so a parte de data (sem hora) para evitar zona horaria.
// Vencida = data de entrega ANTERIOR a hoje (hoje ainda e ativa).
function isVencida(dataEntrega: string): boolean {
  const hoje = new Date()
  const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
  return dataEntrega < hojeStr
}

function formatData(d: string): string {
  try {
    return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  } catch { return d }
}

export default function TarefasProfessor() {
  const router = useRouter()
  const toast = useToast()

  const [turmas, setTurmas] = useState<Turma[]>([])
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modal, setModal] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState<string | null>(null)

  const [filtroTurma, setFiltroTurma] = useState<string>('')
  const [aba, setAba] = useState<Aba>('ativas')
  const [form, setForm] = useState<FormTarefa>(FORM_TAREFA_VAZIO)
  const [confirmarExcluir, setConfirmarExcluir] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([carregarTurmas(), carregarTarefas()])
      .finally(() => setCarregando(false))
  }, [])

  const carregarTurmas = async () => {
    const res = await fetch('/api/professor/turmas', { credentials: 'include' })
    if (res.ok) {
      const d = await res.json()
      setTurmas(Array.isArray(d?.turmas) ? d.turmas : [])
    }
  }

  const carregarTarefas = async () => {
    const res = await fetch('/api/professor/tarefas', { credentials: 'include' })
    if (res.ok) {
      const d = await res.json()
      setTarefas(Array.isArray(d?.tarefas) ? d.tarefas : [])
    }
  }

  const abrirNova = () => {
    setForm(FORM_TAREFA_VAZIO)
    setModal(true)
  }

  const abrirEdicao = (t: Tarefa) => {
    setForm({
      id: t.id,
      turma_id: t.turma_id,
      titulo: t.titulo,
      descricao: t.descricao ?? '',
      disciplina_id: t.disciplina_id ?? '',
      data_entrega: t.data_entrega.slice(0, 10),
      tipo: t.tipo,
    })
    setModal(true)
  }

  const salvar = useCallback(async () => {
    if (!form.turma_id || !form.titulo || !form.data_entrega) {
      toast.error('Preencha turma, titulo e data de entrega')
      return
    }
    setSalvando(true)
    try {
      const payload: Record<string, string | null> = {
        titulo: form.titulo,
        descricao: form.descricao || null,
        disciplina_id: form.disciplina_id || null,
        data_entrega: form.data_entrega,
        tipo: form.tipo,
      }
      const method = form.id ? 'PUT' : 'POST'
      if (form.id) payload.id = form.id
      else payload.turma_id = form.turma_id

      const res = await fetch('/api/professor/tarefas', {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.mensagem || 'Erro ao salvar')
        return
      }
      toast.success(form.id ? 'Tarefa atualizada!' : 'Tarefa criada!')
      setModal(false)
      setForm(FORM_TAREFA_VAZIO)
      carregarTarefas()
    } catch {
      toast.error('Erro de conexao')
    } finally {
      setSalvando(false)
    }
  }, [form, toast])

  const excluir = (id: string) => {
    setConfirmarExcluir(id)
  }

  const confirmarExcluirTarefa = async () => {
    if (!confirmarExcluir) return
    const id = confirmarExcluir
    setExcluindo(id)
    try {
      const res = await fetch(`/api/professor/tarefas?id=${id}`, { method: 'DELETE', credentials: 'include' })
      if (res.ok) {
        toast.success('Tarefa removida')
        carregarTarefas()
      } else {
        toast.error('Erro ao remover')
      }
    } finally {
      setExcluindo(null)
      setConfirmarExcluir(null)
    }
  }

  const { ativas, vencidas, visiveis } = useMemo(() => {
    const filtradas = filtroTurma
      ? tarefas.filter(t => t.turma_id === filtroTurma)
      : tarefas
    const ativas = filtradas.filter(t => !isVencida(t.data_entrega))
    const vencidas = filtradas.filter(t => isVencida(t.data_entrega))
    const visiveis = aba === 'ativas' ? ativas : vencidas
    return { ativas, vencidas, visiveis }
  }, [tarefas, filtroTurma, aba])

  if (carregando) return (
    <ProtectedRoute tiposPermitidos={['professor']}>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <LoadingSpinner centered />
      </div>
    </ProtectedRoute>
  )

  return (
    <ProtectedRoute tiposPermitidos={['professor']}>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        <div className="bg-emerald-600 text-white px-4 sm:px-6 py-5">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/professor/dashboard')} className="p-1" aria-label="Voltar">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <ClipboardList className="w-6 h-6" />
              <div>
                <h1 className="text-lg font-bold">Tarefas</h1>
                <p className="text-emerald-100 text-xs">
                  {ativas.length} ativa(s) · {vencidas.length} vencida(s)
                </p>
              </div>
            </div>
            <button
              onClick={abrirNova}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition"
            >
              <Plus className="w-4 h-4" /> Nova
            </button>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 space-y-3">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-3 space-y-3">
            {turmas.length > 1 && (
              <div>
                <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                  <Filter className="w-3 h-3" /> Filtrar por turma
                </label>
                <select
                  value={filtroTurma}
                  onChange={e => setFiltroTurma(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Todas as turmas</option>
                  {turmas.map(t => (
                    <option key={t.turma_id} value={t.turma_id}>{t.turma_nome} — {t.serie}</option>
                  ))}
                </select>
              </div>
            )}

            <div role="tablist" className="inline-flex bg-gray-100 dark:bg-slate-900/50 p-1 rounded-lg w-full">
              <button
                role="tab"
                aria-selected={aba === 'ativas'}
                onClick={() => setAba('ativas')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition ${
                  aba === 'ativas'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                Ativas
                {ativas.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                    {ativas.length}
                  </span>
                )}
              </button>
              <button
                role="tab"
                aria-selected={aba === 'vencidas'}
                onClick={() => setAba('vencidas')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition ${
                  aba === 'vencidas'
                    ? 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                Vencidas
                {vencidas.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300">
                    {vencidas.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {visiveis.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center border border-gray-200 dark:border-slate-700">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">
                {aba === 'ativas' ? 'Nenhuma tarefa ativa' : 'Nenhuma tarefa vencida'}
              </p>
              {aba === 'ativas' && (
                <button onClick={abrirNova} className="mt-3 text-sm font-medium text-emerald-600">
                  + Criar tarefa
                </button>
              )}
            </div>
          ) : (
            visiveis.map(t => {
              const tipoLabel = TIPOS_TAREFA.find(tp => tp.value === t.tipo)?.label ?? t.tipo
              const corTipo = CORES_TIPO[t.tipo] ?? CORES_TIPO.atividade
              const vencida = isVencida(t.data_entrega)
              return (
                <div
                  key={t.id}
                  className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 ${vencida ? 'opacity-70' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${corTipo}`}>
                          {tipoLabel}
                        </span>
                        <span className="text-xs text-gray-400">{t.turma_codigo} — {t.serie}</span>
                      </div>
                      <h3 className={`text-sm font-bold mt-1.5 ${vencida ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>
                        {t.titulo}
                      </h3>
                      {t.descricao && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{t.descricao}</p>}
                      {t.disciplina_nome && (
                        <p className="text-xs text-gray-400 mt-1 inline-flex items-center gap-1">
                          <BookOpen className="w-3 h-3" /> {t.disciplina_nome}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className={`flex items-center gap-1 text-xs font-medium ${vencida ? 'text-gray-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        <Calendar className="w-3.5 h-3.5" />
                        {formatData(t.data_entrega)}
                      </div>
                      <div className="mt-2 flex justify-end gap-0.5">
                        <button
                          onClick={() => abrirEdicao(t)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition"
                          aria-label="Editar tarefa"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => excluir(t.id)}
                          disabled={excluindo === t.id}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 transition"
                          aria-label="Excluir tarefa"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <TarefaModal
          aberto={modal}
          onFechar={() => setModal(false)}
          onSalvar={salvar}
          salvando={salvando}
          form={form}
          setForm={setForm}
          turmas={turmas}
        />

        <ConfirmModal
          aberto={confirmarExcluir !== null}
          titulo="Excluir tarefa"
          mensagem="Tem certeza? Esta ação não pode ser desfeita."
          variant="danger"
          textoConfirmar="Excluir"
          processando={excluindo !== null}
          onConfirmar={confirmarExcluirTarefa}
          onFechar={() => setConfirmarExcluir(null)}
        />
      </div>
    </ProtectedRoute>
  )
}
