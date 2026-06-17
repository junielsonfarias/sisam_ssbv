'use client'

import { useEffect, useState, useCallback } from 'react'
import ProtectedRoute from '@/components/protected-route'
import { ModalBase, ModalFooter } from '@/components/ui/modal-base'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useToast } from '@/components/toast'
import { ClipboardList, Plus, Edit2, Calendar } from 'lucide-react'

interface Avaliacao {
  id: string
  nome: string
  descricao: string | null
  ano_letivo: string
  tipo: 'diagnostica' | 'final' | 'unica'
  ordem: number
  data_inicio: string | null
  data_fim: string | null
  ativo: boolean
}

const TIPO_LABELS: Record<string, string> = {
  diagnostica: 'Diagnóstica',
  final: 'Final',
  unica: 'Única',
}

const TIPO_CORES: Record<string, string> = {
  diagnostica: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  final: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  unica: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
}

export default function AvaliacoesPage() {
  const toast = useToast()
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [editando, setEditando] = useState<Avaliacao | null>(null)
  const [salvando, setSalvando] = useState(false)

  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    ano_letivo: new Date().getFullYear().toString(),
    tipo: 'diagnostica' as string,
    ordem: 1,
    data_inicio: '',
    data_fim: '',
  })

  const carregarAvaliacoes = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/avaliacoes')
      const data = await res.json()
      setAvaliacoes(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Erro ao carregar avaliações')
    } finally {
      setCarregando(false)
    }
  }, [toast])

  useEffect(() => { carregarAvaliacoes() }, [carregarAvaliacoes])

  const abrirCriar = () => {
    setEditando(null)
    setForm({
      nome: '',
      descricao: '',
      ano_letivo: new Date().getFullYear().toString(),
      tipo: 'diagnostica',
      ordem: 1,
      data_inicio: '',
      data_fim: '',
    })
    setMostrarModal(true)
  }

  const abrirEditar = (av: Avaliacao) => {
    setEditando(av)
    setForm({
      nome: av.nome,
      descricao: av.descricao || '',
      ano_letivo: av.ano_letivo,
      tipo: av.tipo,
      ordem: av.ordem,
      data_inicio: av.data_inicio?.split('T')[0] || '',
      data_fim: av.data_fim?.split('T')[0] || '',
    })
    setMostrarModal(true)
  }

  const handleSalvar = async () => {
    if (!form.nome || !form.ano_letivo) return
    setSalvando(true)
    try {
      const url = '/api/admin/avaliacoes'
      const method = editando ? 'PUT' : 'POST'
      const body = editando
        ? { id: editando.id, nome: form.nome, descricao: form.descricao || null, data_inicio: form.data_inicio || null, data_fim: form.data_fim || null }
        : { ...form, descricao: form.descricao || null, data_inicio: form.data_inicio || null, data_fim: form.data_fim || null }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (res.ok) {
        toast.success(editando ? 'Avaliação atualizada' : 'Avaliação criada')
        setMostrarModal(false)
        carregarAvaliacoes()
      } else {
        toast.error(data.mensagem || 'Erro ao salvar')
      }
    } catch {
      toast.error('Erro de conexão')
    } finally {
      setSalvando(false)
    }
  }

  // Agrupar por ano
  const porAno = avaliacoes.reduce<Record<string, Avaliacao[]>>((acc, av) => {
    if (!acc[av.ano_letivo]) acc[av.ano_letivo] = []
    acc[av.ano_letivo].push(av)
    return acc
  }, {})

  const anosOrdenados = Object.keys(porAno).sort((a, b) => b.localeCompare(a))

  if (carregando) return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
      <LoadingSpinner size="lg" text="Carregando avaliações..." centered />
    </ProtectedRoute>
  )

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ClipboardList className="w-7 h-7" /> Avaliações
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Gerencie as avaliações por ano letivo
            </p>
          </div>
          <button
            onClick={abrirCriar}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Nova Avaliação
          </button>
        </div>

        {anosOrdenados.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-8 text-center text-gray-500 dark:text-gray-400">
            Nenhuma avaliação cadastrada.
          </div>
        ) : (
          <div className="space-y-6">
            {anosOrdenados.map(ano => (
              <div key={ano} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                <div className="bg-gray-50 dark:bg-slate-700/50 px-4 py-3 border-b border-gray-200 dark:border-slate-600">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-500" /> Ano Letivo {ano}
                  </h2>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-slate-700">
                  {porAno[ano].sort((a, b) => a.ordem - b.ordem).map(av => (
                    <div key={av.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${TIPO_CORES[av.tipo] || TIPO_CORES.unica}`}>
                          {TIPO_LABELS[av.tipo] || av.tipo}
                        </span>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{av.nome}</div>
                          {av.descricao && <div className="text-xs text-gray-500 dark:text-gray-400">{av.descricao}</div>}
                          {(av.data_inicio || av.data_fim) && (
                            <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                              {av.data_inicio && `Início: ${new Date(av.data_inicio).toLocaleDateString('pt-BR')}`}
                              {av.data_inicio && av.data_fim && ' | '}
                              {av.data_fim && `Fim: ${new Date(av.data_fim).toLocaleDateString('pt-BR')}`}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => abrirEditar(av)}
                        className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <ModalBase aberto={mostrarModal} onFechar={() => setMostrarModal(false)} titulo={editando ? 'Editar Avaliação' : 'Nova Avaliação'}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome</label>
              <input
                type="text"
                value={form.nome}
                onChange={e => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Avaliação Diagnóstica 2026"
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição (opcional)</label>
              <input
                type="text"
                value={form.descricao}
                onChange={e => setForm({ ...form, descricao: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              />
            </div>
            {!editando && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ano Letivo</label>
                    <input
                      type="text"
                      value={form.ano_letivo}
                      onChange={e => setForm({ ...form, ano_letivo: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                      maxLength={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                    <select
                      value={form.tipo}
                      onChange={e => setForm({ ...form, tipo: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                    >
                      <option value="diagnostica">Diagnóstica</option>
                      <option value="final">Final</option>
                      <option value="unica">Única</option>
                    </select>
                  </div>
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data Início</label>
                <input
                  type="date"
                  value={form.data_inicio}
                  onChange={e => setForm({ ...form, data_inicio: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data Fim</label>
                <input
                  type="date"
                  value={form.data_fim}
                  onChange={e => setForm({ ...form, data_fim: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <ModalFooter
              onFechar={() => setMostrarModal(false)}
              onSalvar={handleSalvar}
              salvando={salvando}
              desabilitado={!form.nome || !form.ano_letivo}
              textoSalvar={editando ? 'Salvar' : 'Criar Avaliação'}
              textoSalvando="Salvando..."
            />
          </div>
        </ModalBase>
      </div>
    </ProtectedRoute>
  )
}
