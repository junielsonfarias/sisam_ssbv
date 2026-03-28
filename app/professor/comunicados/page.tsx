'use client'

import { useState, useEffect, useCallback } from 'react'
import { MessageSquare, Plus, Trash2, X, Send, AlertTriangle } from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'

interface Turma {
  turma_id: string
  turma_nome: string
  serie: string
  turno: string
  escola_nome: string
}

interface Comunicado {
  id: string
  turma_id: string
  titulo: string
  mensagem: string
  tipo: 'aviso' | 'lembrete' | 'urgente' | 'reuniao'
  data_publicacao: string
  ativo: boolean
  turma_nome: string
  professor_nome: string
}

const tipoBadge: Record<string, { label: string; cls: string }> = {
  aviso: { label: 'Aviso', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' },
  lembrete: { label: 'Lembrete', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' },
  urgente: { label: 'Urgente', cls: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' },
  reuniao: { label: 'Reunião', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' },
}

function ComunicadosTurma() {
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [comunicados, setComunicados] = useState<Comunicado[]>([])
  const [turmaId, setTurmaId] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [carregandoCom, setCarregandoCom] = useState(false)
  const [modalAberto, setModalAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')

  // Form
  const [formTitulo, setFormTitulo] = useState('')
  const [formMensagem, setFormMensagem] = useState('')
  const [formTipo, setFormTipo] = useState<string>('aviso')

  useEffect(() => {
    fetch('/api/professor/turmas')
      .then(r => r.json())
      .then(data => setTurmas(data.turmas || []))
      .catch(() => setErro('Erro ao carregar turmas'))
      .finally(() => setCarregando(false))
  }, [])

  const carregarComunicados = useCallback(async () => {
    if (!turmaId) return
    setCarregandoCom(true)
    setErro('')
    try {
      const res = await fetch(`/api/professor/comunicados?turma_id=${turmaId}`)
      if (!res.ok) throw new Error('Erro ao carregar comunicados')
      const data = await res.json()
      setComunicados(data.comunicados || [])
    } catch {
      setErro('Erro ao carregar comunicados')
    } finally {
      setCarregandoCom(false)
    }
  }, [turmaId])

  useEffect(() => { carregarComunicados() }, [carregarComunicados])

  const publicar = async () => {
    if (!formTitulo.trim() || !formMensagem.trim()) {
      setErro('Título e mensagem são obrigatórios')
      return
    }
    setSalvando(true)
    setErro('')
    try {
      const res = await fetch('/api/professor/comunicados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turma_id: turmaId,
          titulo: formTitulo,
          mensagem: formMensagem,
          tipo: formTipo,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro ao publicar')
      }
      setMensagem('Comunicado publicado com sucesso!')
      setModalAberto(false)
      setFormTitulo('')
      setFormMensagem('')
      setFormTipo('aviso')
      carregarComunicados()
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async (id: string) => {
    if (!confirm('Deseja realmente remover este comunicado?')) return
    try {
      const res = await fetch(`/api/professor/comunicados?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao remover')
      setMensagem('Comunicado removido')
      carregarComunicados()
    } catch {
      setErro('Erro ao remover comunicado')
    }
  }

  if (carregando) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse" />
        {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">Comunicados da Turma</h1>
            <p className="text-blue-100">Publique avisos e lembretes para os responsáveis</p>
          </div>
        </div>
      </div>

      {/* Mensagens */}
      {mensagem && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-3 text-green-700 dark:text-green-300 text-sm">
          {mensagem}
        </div>
      )}
      {erro && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-700 dark:text-red-300 text-sm">
          {erro}
        </div>
      )}

      {/* Turma selector */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Turma</label>
            <select
              value={turmaId}
              onChange={e => setTurmaId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
            >
              <option value="">Selecione uma turma</option>
              {turmas.map(t => (
                <option key={t.turma_id} value={t.turma_id}>
                  {t.turma_nome} - {t.serie} ({t.turno})
                </option>
              ))}
            </select>
          </div>
          {turmaId && (
            <button
              onClick={() => { setModalAberto(true); setErro(''); setMensagem('') }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="h-4 w-4" /> Novo Comunicado
            </button>
          )}
        </div>
      </div>

      {!turmaId ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-200 dark:border-gray-700">
          <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-500 dark:text-gray-400">Selecione uma turma para visualizar os comunicados</p>
        </div>
      ) : carregandoCom ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : comunicados.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-200 dark:border-gray-700">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-500 dark:text-gray-400">Nenhum comunicado publicado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comunicados.map(c => (
            <div
              key={c.id}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 ${!c.ativo ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tipoBadge[c.tipo]?.cls || 'bg-gray-100 text-gray-600'}`}>
                      {tipoBadge[c.tipo]?.label || c.tipo}
                    </span>
                    {!c.ativo && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                        Removido
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{c.titulo}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-wrap">{c.mensagem}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    {new Date(c.data_publicacao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {c.ativo && (
                  <button onClick={() => excluir(c.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-red-500 shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Novo Comunicado */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Novo Comunicado</h3>
              <button onClick={() => setModalAberto(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título *</label>
                <input
                  type="text"
                  value={formTitulo}
                  onChange={e => setFormTitulo(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  placeholder="Título do comunicado"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                <select
                  value={formTipo}
                  onChange={e => setFormTipo(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                >
                  <option value="aviso">Aviso</option>
                  <option value="lembrete">Lembrete</option>
                  <option value="urgente">Urgente</option>
                  <option value="reuniao">Reunião</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mensagem *</label>
                <textarea
                  value={formMensagem}
                  onChange={e => setFormMensagem(e.target.value)}
                  rows={5}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  placeholder="Escreva a mensagem do comunicado..."
                />
              </div>
              {erro && <p className="text-red-600 dark:text-red-400 text-sm">{erro}</p>}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setModalAberto(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                Cancelar
              </button>
              <button
                onClick={publicar}
                disabled={salvando}
                className="flex items-center gap-1 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
              >
                <Send className="h-4 w-4" /> {salvando ? 'Publicando...' : 'Publicar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ComunicadosPage() {
  return (
    <ProtectedRoute tiposPermitidos={['professor']}>
      <ComunicadosTurma />
    </ProtectedRoute>
  )
}
