'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ClipboardList, Plus, Edit2, Trash2, Printer, X, Save, AlertTriangle, CheckCircle, FileText } from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'

interface Turma {
  turma_id: string
  turma_nome: string
  serie: string
  turno: string
  escola_nome: string
}

interface Disciplina {
  id: string
  nome: string
}

interface Plano {
  id: string
  turma_id: string
  disciplina_id: string | null
  periodo: string
  data_inicio: string
  data_fim: string | null
  objetivo: string
  conteudo: string
  metodologia: string | null
  recursos: string | null
  avaliacao: string | null
  observacoes: string | null
  status: 'rascunho' | 'finalizado'
  turma_nome: string
  disciplina_nome: string | null
  criado_em: string
}

const periodoBadge: Record<string, { label: string; cls: string }> = {
  semanal: { label: 'Semanal', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' },
  mensal: { label: 'Mensal', cls: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' },
  bimestral: { label: 'Bimestral', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' },
}

const statusBadge: Record<string, { label: string; cls: string }> = {
  rascunho: { label: 'Rascunho', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' },
  finalizado: { label: 'Finalizado', cls: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' },
}

function PlanejamentoAulas() {
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [planos, setPlanos] = useState<Plano[]>([])
  const [turmaId, setTurmaId] = useState('')
  const [disciplinaFiltro, setDisciplinaFiltro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [carregandoPlanos, setCarregandoPlanos] = useState(false)
  const [modalAberto, setModalAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const printRef = useRef<HTMLDivElement>(null)

  // Form
  const [formId, setFormId] = useState('')
  const [formDisciplinaId, setFormDisciplinaId] = useState('')
  const [formPeriodo, setFormPeriodo] = useState('semanal')
  const [formDataInicio, setFormDataInicio] = useState('')
  const [formDataFim, setFormDataFim] = useState('')
  const [formObjetivo, setFormObjetivo] = useState('')
  const [formConteudo, setFormConteudo] = useState('')
  const [formMetodologia, setFormMetodologia] = useState('')
  const [formRecursos, setFormRecursos] = useState('')
  const [formAvaliacao, setFormAvaliacao] = useState('')
  const [formObservacoes, setFormObservacoes] = useState('')
  const [formStatus, setFormStatus] = useState('rascunho')

  useEffect(() => {
    fetch('/api/professor/turmas')
      .then(r => r.json())
      .then(data => setTurmas(data.turmas || []))
      .catch(() => setErro('Erro ao carregar turmas'))
      .finally(() => setCarregando(false))
  }, [])

  useEffect(() => {
    if (!turmaId) { setDisciplinas([]); return }
    fetch(`/api/professor/disciplinas?turma_id=${turmaId}`)
      .then(r => r.json())
      .then(data => setDisciplinas(data.disciplinas || []))
      .catch(() => {})
  }, [turmaId])

  const carregarPlanos = useCallback(async () => {
    if (!turmaId) return
    setCarregandoPlanos(true)
    setErro('')
    try {
      let url = `/api/professor/planos?turma_id=${turmaId}`
      if (disciplinaFiltro) url += `&disciplina_id=${disciplinaFiltro}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Erro ao carregar planos')
      const data = await res.json()
      setPlanos(data.planos || [])
    } catch {
      setErro('Erro ao carregar planos')
    } finally {
      setCarregandoPlanos(false)
    }
  }, [turmaId, disciplinaFiltro])

  useEffect(() => { carregarPlanos() }, [carregarPlanos])

  const abrirModal = (plano?: Plano) => {
    if (plano) {
      setFormId(plano.id)
      setFormDisciplinaId(plano.disciplina_id || '')
      setFormPeriodo(plano.periodo)
      setFormDataInicio(plano.data_inicio.substring(0, 10))
      setFormDataFim(plano.data_fim ? plano.data_fim.substring(0, 10) : '')
      setFormObjetivo(plano.objetivo)
      setFormConteudo(plano.conteudo)
      setFormMetodologia(plano.metodologia || '')
      setFormRecursos(plano.recursos || '')
      setFormAvaliacao(plano.avaliacao || '')
      setFormObservacoes(plano.observacoes || '')
      setFormStatus(plano.status)
    } else {
      setFormId('')
      setFormDisciplinaId(disciplinas.length === 1 ? disciplinas[0].id : '')
      setFormPeriodo('semanal')
      setFormDataInicio(new Date().toISOString().substring(0, 10))
      setFormDataFim('')
      setFormObjetivo('')
      setFormConteudo('')
      setFormMetodologia('')
      setFormRecursos('')
      setFormAvaliacao('')
      setFormObservacoes('')
      setFormStatus('rascunho')
    }
    setModalAberto(true)
    setMensagem('')
    setErro('')
  }

  const salvar = async () => {
    if (!formObjetivo.trim() || !formConteudo.trim()) {
      setErro('Objetivo e conteúdo são obrigatórios')
      return
    }
    setSalvando(true)
    setErro('')
    try {
      const payload = {
        ...(formId ? { id: formId } : {}),
        turma_id: turmaId,
        disciplina_id: formDisciplinaId || null,
        periodo: formPeriodo,
        data_inicio: formDataInicio,
        data_fim: formDataFim || null,
        objetivo: formObjetivo,
        conteudo: formConteudo,
        metodologia: formMetodologia || null,
        recursos: formRecursos || null,
        avaliacao: formAvaliacao || null,
        observacoes: formObservacoes || null,
        status: formStatus,
      }
      const method = formId ? 'PUT' : 'POST'
      const res = await fetch('/api/professor/planos', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro ao salvar')
      }
      setMensagem('Plano salvo com sucesso!')
      setModalAberto(false)
      carregarPlanos()
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async (id: string) => {
    if (!confirm('Deseja realmente excluir este plano?')) return
    try {
      const res = await fetch(`/api/professor/planos?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao excluir')
      setMensagem('Plano excluído')
      carregarPlanos()
    } catch {
      setErro('Erro ao excluir plano')
    }
  }

  const imprimir = (plano: Plano) => {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`
      <html><head><title>Plano de Aula</title>
      <style>body{font-family:sans-serif;padding:2rem;max-width:800px;margin:0 auto}
      h1{font-size:1.5rem;margin-bottom:.5rem}h2{font-size:1.1rem;color:#555;margin:1.5rem 0 .5rem}
      .info{color:#666;margin-bottom:1rem}.section{margin-bottom:1rem;white-space:pre-wrap}
      .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:.8rem;background:#e5e7eb}
      @media print{body{padding:1rem}}</style></head><body>
      <h1>Plano de Aula</h1>
      <div class="info">
        <strong>Turma:</strong> ${plano.turma_nome} |
        <strong>Disciplina:</strong> ${plano.disciplina_nome || 'N/A'} |
        <span class="badge">${periodoBadge[plano.periodo]?.label || plano.periodo}</span>
      </div>
      <div class="info">
        <strong>Período:</strong> ${new Date(plano.data_inicio + 'T12:00:00').toLocaleDateString('pt-BR')}
        ${plano.data_fim ? ' a ' + new Date(plano.data_fim + 'T12:00:00').toLocaleDateString('pt-BR') : ''}
      </div>
      <h2>Objetivo</h2><div class="section">${plano.objetivo}</div>
      <h2>Conteúdo</h2><div class="section">${plano.conteudo}</div>
      ${plano.metodologia ? '<h2>Metodologia</h2><div class="section">' + plano.metodologia + '</div>' : ''}
      ${plano.recursos ? '<h2>Recursos</h2><div class="section">' + plano.recursos + '</div>' : ''}
      ${plano.avaliacao ? '<h2>Avaliação</h2><div class="section">' + plano.avaliacao + '</div>' : ''}
      ${plano.observacoes ? '<h2>Observações</h2><div class="section">' + plano.observacoes + '</div>' : ''}
      </body></html>
    `)
    w.document.close()
    w.print()
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
      <div className="bg-gradient-to-r from-violet-600 to-violet-700 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">Planejamento de Aulas</h1>
            <p className="text-violet-100">Crie e organize seus planos de aula</p>
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

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Turma</label>
            <select
              value={turmaId}
              onChange={e => { setTurmaId(e.target.value); setDisciplinaFiltro('') }}
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
          {disciplinas.length > 0 && (
            <div className="min-w-[180px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Disciplina</label>
              <select
                value={disciplinaFiltro}
                onChange={e => setDisciplinaFiltro(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
              >
                <option value="">Todas</option>
                {disciplinas.map(d => (
                  <option key={d.id} value={d.id}>{d.nome}</option>
                ))}
              </select>
            </div>
          )}
          {turmaId && (
            <button
              onClick={() => abrirModal()}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="h-4 w-4" /> Novo Plano
            </button>
          )}
        </div>
      </div>

      {!turmaId ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-200 dark:border-gray-700">
          <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-500 dark:text-gray-400">Selecione uma turma para visualizar os planos</p>
        </div>
      ) : carregandoPlanos ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
        </div>
      ) : planos.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-200 dark:border-gray-700">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-500 dark:text-gray-400">Nenhum plano de aula encontrado</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {planos.map(p => (
            <div key={p.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex flex-wrap gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${periodoBadge[p.periodo]?.cls || 'bg-gray-100 text-gray-600'}`}>
                    {periodoBadge[p.periodo]?.label || p.periodo}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[p.status]?.cls || 'bg-gray-100 text-gray-600'}`}>
                    {statusBadge[p.status]?.label || p.status}
                  </span>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => imprimir(p)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500" title="Imprimir">
                    <Printer className="h-4 w-4" />
                  </button>
                  <button onClick={() => abrirModal(p)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500" title="Editar">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => excluir(p.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-red-500" title="Excluir">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {p.disciplina_nome && (
                <p className="text-xs text-violet-600 dark:text-violet-400 font-medium mb-1">{p.disciplina_nome}</p>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                {new Date(p.data_inicio + 'T12:00:00').toLocaleDateString('pt-BR')}
                {p.data_fim ? ` — ${new Date(p.data_fim + 'T12:00:00').toLocaleDateString('pt-BR')}` : ''}
              </p>
              <h3 className="font-medium text-gray-900 dark:text-white text-sm mb-1">Objetivo</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">{p.objetivo}</p>
            </div>
          ))}
        </div>
      )}

      {/* Modal Plano */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {formId ? 'Editar Plano' : 'Novo Plano de Aula'}
              </h3>
              <button onClick={() => setModalAberto(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Período</label>
                  <select
                    value={formPeriodo}
                    onChange={e => setFormPeriodo(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  >
                    <option value="semanal">Semanal</option>
                    <option value="mensal">Mensal</option>
                    <option value="bimestral">Bimestral</option>
                  </select>
                </div>
                {disciplinas.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Disciplina</label>
                    <select
                      value={formDisciplinaId}
                      onChange={e => setFormDisciplinaId(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                    >
                      <option value="">Selecione</option>
                      {disciplinas.map(d => (
                        <option key={d.id} value={d.id}>{d.nome}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data Início *</label>
                  <input
                    type="date"
                    value={formDataInicio}
                    onChange={e => setFormDataInicio(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data Fim</label>
                  <input
                    type="date"
                    value={formDataFim}
                    onChange={e => setFormDataFim(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Objetivo *</label>
                <textarea
                  value={formObjetivo}
                  onChange={e => setFormObjetivo(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  placeholder="Descreva os objetivos da aula..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Conteúdo *</label>
                <textarea
                  value={formConteudo}
                  onChange={e => setFormConteudo(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  placeholder="Descreva o conteúdo..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Metodologia</label>
                <textarea
                  value={formMetodologia}
                  onChange={e => setFormMetodologia(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  placeholder="Metodologia (opcional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recursos</label>
                <textarea
                  value={formRecursos}
                  onChange={e => setFormRecursos(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  placeholder="Recursos necessários (opcional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Avaliação</label>
                <textarea
                  value={formAvaliacao}
                  onChange={e => setFormAvaliacao(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  placeholder="Critérios de avaliação (opcional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
                <textarea
                  value={formObservacoes}
                  onChange={e => setFormObservacoes(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  placeholder="Observações (opcional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setFormStatus('rascunho')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm ${formStatus === 'rascunho' ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 ring-2 ring-amber-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
                  >
                    <Edit2 className="h-3 w-3" /> Rascunho
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormStatus('finalizado')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm ${formStatus === 'finalizado' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 ring-2 ring-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
                  >
                    <CheckCircle className="h-3 w-3" /> Finalizado
                  </button>
                </div>
              </div>
              {erro && <p className="text-red-600 dark:text-red-400 text-sm">{erro}</p>}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setModalAberto(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={salvando}
                className="flex items-center gap-1 px-4 py-2 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-lg disabled:opacity-50"
              >
                <Save className="h-4 w-4" /> {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PlanosPage() {
  return (
    <ProtectedRoute tiposPermitidos={['professor']}>
      <PlanejamentoAulas />
    </ProtectedRoute>
  )
}
