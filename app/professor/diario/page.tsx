'use client'

import { useState, useEffect, useCallback } from 'react'
import { BookOpen, Calendar, List, AlertTriangle } from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import ContextoLancamento from '@/components/professor/contexto-lancamento'
import { DiarioCalendario, DiarioLista, DiarioModal } from './components'
import type { Turma, Disciplina, RegistroDiario } from './components'

function DiarioDeClasse() {
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [registros, setRegistros] = useState<RegistroDiario[]>([])
  const [turmaId, setTurmaId] = useState('')
  const [mesAtual, setMesAtual] = useState(() => {
    const hoje = new Date()
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
  })
  const [visao, setVisao] = useState<'calendario' | 'lista'>('calendario')
  const [carregando, setCarregando] = useState(true)
  const [carregandoRegistros, setCarregandoRegistros] = useState(false)
  const [modalAberto, setModalAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')

  // Form
  const [formId, setFormId] = useState('')
  const [formData, setFormData] = useState('')
  const [formDisciplinaId, setFormDisciplinaId] = useState('')
  const [formConteudo, setFormConteudo] = useState('')
  const [formMetodologia, setFormMetodologia] = useState('')
  const [formObservacoes, setFormObservacoes] = useState('')
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

  const carregarRegistros = useCallback(async () => {
    if (!turmaId) return
    setCarregandoRegistros(true)
    setErro('')
    try {
      const res = await fetch(`/api/professor/diario?turma_id=${turmaId}&mes=${mesAtual}`)
      if (!res.ok) throw new Error('Erro ao carregar registros')
      const data = await res.json()
      setRegistros(data.registros || [])
    } catch {
      setErro('Erro ao carregar registros')
    } finally {
      setCarregandoRegistros(false)
    }
  }, [turmaId, mesAtual])

  useEffect(() => { carregarRegistros() }, [carregarRegistros])

  const abrirModal = (data?: string, registro?: RegistroDiario) => {
    if (registro) {
      setFormId(registro.id)
      setFormData(registro.data_aula.substring(0, 10))
      setFormDisciplinaId(registro.disciplina_id || '')
      setFormConteudo(registro.conteudo)
      setFormMetodologia(registro.metodologia || '')
      setFormObservacoes(registro.observacoes || '')
      setFormHabilidadesBncc(registro.habilidades_bncc || [])
    } else {
      setFormId('')
      setFormData(data || new Date().toISOString().substring(0, 10))
      setFormDisciplinaId(disciplinas.length === 1 ? disciplinas[0].id : '')
      setFormConteudo('')
      setFormMetodologia('')
      setFormObservacoes('')
      setFormHabilidadesBncc([])
    }
    setModalAberto(true)
    setMensagem('')
    setErro('')
  }

  const salvar = async () => {
    if (!formConteudo.trim()) {
      setErro('Conteúdo é obrigatório')
      return
    }
    setSalvando(true)
    setErro('')
    try {
      const payload = {
        ...(formId ? { id: formId } : {}),
        turma_id: turmaId,
        disciplina_id: formDisciplinaId || null,
        data_aula: formData,
        conteudo: formConteudo,
        metodologia: formMetodologia || null,
        observacoes: formObservacoes || null,
        habilidades_bncc: formHabilidadesBncc,
      }
      const method = formId ? 'PUT' : 'POST'
      const res = await fetch('/api/professor/diario', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro ao salvar')
      }
      setMensagem('Registro salvo com sucesso!')
      setModalAberto(false)
      carregarRegistros()
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async (id: string) => {
    if (!confirm('Deseja realmente excluir este registro?')) return
    try {
      const res = await fetch(`/api/professor/diario?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao excluir')
      setMensagem('Registro excluído')
      carregarRegistros()
    } catch {
      setErro('Erro ao excluir registro')
    }
  }

  // Calendar helpers
  const [ano, mes] = mesAtual.split('-').map(Number)
  const diasNoMes = new Date(ano, mes, 0).getDate()
  const primeiroDia = new Date(ano, mes - 1, 1).getDay() // 0=Dom
  const diasArray = Array.from({ length: diasNoMes }, (_, i) => i + 1)

  const mudarMes = (delta: number) => {
    const d = new Date(ano, mes - 1 + delta, 1)
    setMesAtual(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const nomeMes = new Date(ano, mes - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

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
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3">
          <BookOpen className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">Diário de Classe</h1>
            <p className="text-emerald-100">Registro diário de conteúdos e atividades</p>
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
              onChange={e => setTurmaId(e.target.value)}
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
          <div className="flex gap-2">
            <button
              onClick={() => setVisao('calendario')}
              className={`px-3 py-2 rounded-lg text-sm flex items-center gap-1 ${visao === 'calendario' ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400'}`}
            >
              <Calendar className="h-4 w-4" /> Calendário
            </button>
            <button
              onClick={() => setVisao('lista')}
              className={`px-3 py-2 rounded-lg text-sm flex items-center gap-1 ${visao === 'lista' ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400'}`}
            >
              <List className="h-4 w-4" /> Lista
            </button>
          </div>
        </div>
      </div>

      {!turmaId ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center border border-gray-200 dark:border-slate-700">
          <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-500 dark:text-gray-400">Selecione uma turma para visualizar o diário</p>
        </div>
      ) : (
        <>
        {(() => {
          const t = turmas.find(x => x.turma_id === turmaId)
          return t ? (
            <ContextoLancamento
              titulo="Diário de Classe"
              escola={t.escola_nome}
              turma={t.turma_nome}
              serie={t.serie}
              turno={t.turno}
              disciplina={t.disciplina_nome}
              cor="indigo"
            />
          ) : null
        })()}
        </>
      )}

      {!turmaId ? null : visao === 'calendario' ? (
        <DiarioCalendario
          nomeMes={nomeMes}
          mesAtual={mesAtual}
          primeiroDia={primeiroDia}
          diasArray={diasArray}
          carregandoRegistros={carregandoRegistros}
          registros={registros}
          onMudarMes={mudarMes}
          onAbrirModal={abrirModal}
        />
      ) : (
        <DiarioLista
          nomeMes={nomeMes}
          carregandoRegistros={carregandoRegistros}
          registros={registros}
          onMudarMes={mudarMes}
          onAbrirModal={abrirModal}
          onExcluir={excluir}
        />
      )}

      {/* Modal */}
      {modalAberto && (
        <DiarioModal
          formId={formId}
          formData={formData}
          formDisciplinaId={formDisciplinaId}
          formConteudo={formConteudo}
          formMetodologia={formMetodologia}
          formObservacoes={formObservacoes}
          formHabilidadesBncc={formHabilidadesBncc}
          disciplinas={disciplinas}
          turmaId={turmaId}
          salvando={salvando}
          erro={erro}
          setFormData={setFormData}
          setFormDisciplinaId={setFormDisciplinaId}
          setFormConteudo={setFormConteudo}
          setFormMetodologia={setFormMetodologia}
          setFormObservacoes={setFormObservacoes}
          setFormHabilidadesBncc={setFormHabilidadesBncc}
          onFechar={() => setModalAberto(false)}
          onSalvar={salvar}
          onExcluir={excluir}
        />
      )}
    </div>
  )
}

export default function DiarioPage() {
  return (
    <ProtectedRoute tiposPermitidos={['professor', 'administrador', 'tecnico']}>
      <DiarioDeClasse />
    </ProtectedRoute>
  )
}
