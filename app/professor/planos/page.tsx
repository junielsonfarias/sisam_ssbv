'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ClipboardList, Plus, AlertTriangle, FileText } from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import { PlanosLista, PlanoModal, imprimirPlano } from './components'
import type { Turma, Disciplina, Plano } from './components'

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
  const [formHabilidadesBncc, setFormHabilidadesBncc] = useState<string[]>([])

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
      setFormHabilidadesBncc(plano.habilidades_bncc || [])
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
      setFormHabilidadesBncc([])
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
        habilidades_bncc: formHabilidadesBncc,
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

  if (carregando) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-48 animate-pulse" />
        {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 dark:bg-slate-800 rounded-lg animate-pulse" />)}
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
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Turma</label>
            <select
              value={turmaId}
              onChange={e => { setTurmaId(e.target.value); setDisciplinaFiltro('') }}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
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
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
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
        <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center border border-gray-200 dark:border-slate-700">
          <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-500 dark:text-gray-400">Selecione uma turma para visualizar os planos</p>
        </div>
      ) : carregandoPlanos ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
        </div>
      ) : planos.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center border border-gray-200 dark:border-slate-700">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-500 dark:text-gray-400">Nenhum plano de aula encontrado</p>
        </div>
      ) : (
        <PlanosLista
          planos={planos}
          onImprimir={imprimirPlano}
          onEditar={abrirModal}
          onExcluir={excluir}
        />
      )}

      {/* Modal Plano */}
      {modalAberto && (
        <PlanoModal
          formId={formId}
          formDisciplinaId={formDisciplinaId}
          formPeriodo={formPeriodo}
          formDataInicio={formDataInicio}
          formDataFim={formDataFim}
          formObjetivo={formObjetivo}
          formConteudo={formConteudo}
          formMetodologia={formMetodologia}
          formRecursos={formRecursos}
          formAvaliacao={formAvaliacao}
          formObservacoes={formObservacoes}
          formStatus={formStatus}
          formHabilidadesBncc={formHabilidadesBncc}
          disciplinas={disciplinas}
          turmaId={turmaId}
          salvando={salvando}
          erro={erro}
          setFormDisciplinaId={setFormDisciplinaId}
          setFormPeriodo={setFormPeriodo}
          setFormDataInicio={setFormDataInicio}
          setFormDataFim={setFormDataFim}
          setFormObjetivo={setFormObjetivo}
          setFormConteudo={setFormConteudo}
          setFormMetodologia={setFormMetodologia}
          setFormRecursos={setFormRecursos}
          setFormAvaliacao={setFormAvaliacao}
          setFormObservacoes={setFormObservacoes}
          setFormStatus={setFormStatus}
          setFormHabilidadesBncc={setFormHabilidadesBncc}
          onFechar={() => setModalAberto(false)}
          onSalvar={salvar}
        />
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
