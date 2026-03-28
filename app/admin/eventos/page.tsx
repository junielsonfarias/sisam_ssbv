'use client'

import { useState, useEffect, useCallback } from 'react'
import { Calendar, Plus, Pencil, Trash2, X, Save, Loader2, Eye, EyeOff } from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'

interface Evento {
  id: string
  titulo: string
  descricao: string | null
  tipo: string
  data_inicio: string
  data_fim: string | null
  local: string | null
  publico: boolean
  criado_por_nome: string | null
  criado_em: string
}

const TIPOS = [
  { value: 'geral', label: 'Geral' },
  { value: 'reuniao', label: 'Reunião' },
  { value: 'formatura', label: 'Formatura' },
  { value: 'jogos', label: 'Jogos' },
  { value: 'capacitacao', label: 'Capacitação' },
]

const TIPO_BADGE: Record<string, string> = {
  reuniao: 'bg-blue-100 text-blue-700',
  formatura: 'bg-purple-100 text-purple-700',
  jogos: 'bg-amber-100 text-amber-700',
  capacitacao: 'bg-emerald-100 text-emerald-700',
  geral: 'bg-slate-100 text-slate-700',
}

function EventosAdmin() {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [ano, setAno] = useState(String(new Date().getFullYear()))
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Evento | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')

  // Form
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [tipo, setTipo] = useState('geral')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [local, setLocal] = useState('')
  const [publico, setPublico] = useState(true)

  const anos = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i + 1))

  const fetchEventos = useCallback(async () => {
    try {
      setCarregando(true)
      const res = await fetch(`/api/admin/eventos?ano=${ano}`)
      if (!res.ok) throw new Error('Erro')
      const data = await res.json()
      setEventos(data.eventos || [])
    } catch {
      setEventos([])
    } finally {
      setCarregando(false)
    }
  }, [ano])

  useEffect(() => {
    fetchEventos()
  }, [fetchEventos])

  function abrirModal(evento?: Evento) {
    if (evento) {
      setEditando(evento)
      setTitulo(evento.titulo)
      setDescricao(evento.descricao || '')
      setTipo(evento.tipo)
      setDataInicio(evento.data_inicio ? evento.data_inicio.substring(0, 16) : '')
      setDataFim(evento.data_fim ? evento.data_fim.substring(0, 16) : '')
      setLocal(evento.local || '')
      setPublico(evento.publico)
    } else {
      setEditando(null)
      setTitulo('')
      setDescricao('')
      setTipo('geral')
      setDataInicio('')
      setDataFim('')
      setLocal('')
      setPublico(true)
    }
    setErro('')
    setModalAberto(true)
  }

  async function handleSalvar() {
    if (!titulo.trim() || !dataInicio) {
      setErro('Título e data de início são obrigatórios')
      return
    }
    setSalvando(true)
    setErro('')
    try {
      const body: any = { titulo, descricao: descricao || null, tipo, data_inicio: dataInicio, data_fim: dataFim || null, local: local || null, publico }
      if (editando) body.id = editando.id

      const res = await fetch('/api/admin/eventos', {
        method: editando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      setModalAberto(false)
      setMensagem(editando ? 'Evento atualizado' : 'Evento criado')
      fetchEventos()
      setTimeout(() => setMensagem(''), 3000)
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setSalvando(false)
    }
  }

  async function handleExcluir(id: string) {
    if (!confirm('Excluir este evento?')) return
    try {
      await fetch(`/api/admin/eventos?id=${id}`, { method: 'DELETE' })
      setMensagem('Evento excluído')
      fetchEventos()
      setTimeout(() => setMensagem(''), 3000)
    } catch {
      setMensagem('Erro ao excluir')
    }
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none'

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl p-6 mb-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Eventos</h1>
              <p className="text-indigo-100 text-sm">Gerenciamento de eventos e agenda</p>
            </div>
          </div>
          <button
            onClick={() => abrirModal()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-bold transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Evento
          </button>
        </div>
      </div>

      {mensagem && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl p-3 mb-4">{mensagem}</div>
      )}

      {/* Filtro ano */}
      <div className="mb-4">
        <select value={ano} onChange={(e) => setAno(e.target.value)} className={inputCls + ' w-auto'}>
          {anos.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* Tabela */}
      {carregando ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : eventos.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Nenhum evento cadastrado</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300">
                <th className="text-left px-4 py-3 font-semibold">Título</th>
                <th className="text-left px-4 py-3 font-semibold">Tipo</th>
                <th className="text-left px-4 py-3 font-semibold">Data</th>
                <th className="text-left px-4 py-3 font-semibold">Local</th>
                <th className="text-center px-4 py-3 font-semibold">Público</th>
                <th className="text-center px-4 py-3 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {eventos.map((ev) => (
                <tr key={ev.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{ev.titulo}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${TIPO_BADGE[ev.tipo] || TIPO_BADGE.geral}`}>
                      {TIPOS.find(t => t.value === ev.tipo)?.label || ev.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {new Date(ev.data_inicio).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{ev.local || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    {ev.publico ? <Eye className="w-4 h-4 text-green-600 mx-auto" /> : <EyeOff className="w-4 h-4 text-slate-400 mx-auto" />}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => abrirModal(ev)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="Editar">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleExcluir(ev.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">{editando ? 'Editar Evento' : 'Novo Evento'}</h2>
              <button onClick={() => setModalAberto(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{erro}</div>}

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Título *</label>
                <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
                <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={inputCls}>
                  {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Data Início *</label>
                  <input type="datetime-local" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Data Fim</label>
                  <input type="datetime-local" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Local</label>
                <input type="text" value={local} onChange={(e) => setLocal(e.target.value)} className={inputCls} />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Público</label>
                <button
                  type="button"
                  onClick={() => setPublico(!publico)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${publico ? 'bg-emerald-600' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${publico ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setModalAberto(false)} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700">
                  Cancelar
                </button>
                <button onClick={handleSalvar} disabled={salvando} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50">
                  {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function EventosAdminPage() {
  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'editor', 'publicador']}>
      <EventosAdmin />
    </ProtectedRoute>
  )
}
