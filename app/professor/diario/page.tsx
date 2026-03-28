'use client'

import { useState, useEffect, useCallback } from 'react'
import { BookOpen, Plus, Edit2, Trash2, Calendar, List, ChevronLeft, ChevronRight, X, Save, AlertTriangle } from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'

interface Turma {
  turma_id: string
  turma_nome: string
  serie: string
  turno: string
  escola_nome: string
  tipo_vinculo: string
  disciplina_nome: string | null
}

interface Disciplina {
  id: string
  nome: string
}

interface RegistroDiario {
  id: string
  turma_id: string
  disciplina_id: string | null
  data_aula: string
  conteudo: string
  metodologia: string | null
  observacoes: string | null
  turma_nome: string
  disciplina_nome: string | null
  criado_em: string
}

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
    } else {
      setFormId('')
      setFormData(data || new Date().toISOString().substring(0, 10))
      setFormDisciplinaId(disciplinas.length === 1 ? disciplinas[0].id : '')
      setFormConteudo('')
      setFormMetodologia('')
      setFormObservacoes('')
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

  const getRegistroDia = (dia: number) => {
    const dataStr = `${mesAtual}-${String(dia).padStart(2, '0')}`
    return registros.filter(r => r.data_aula.substring(0, 10) === dataStr)
  }

  const nomeMes = new Date(ano, mes - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

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
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3">
          <BookOpen className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">Diário de Classe</h1>
            <p className="text-teal-100">Registro diário de conteúdos e atividades</p>
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
          <div className="flex gap-2">
            <button
              onClick={() => setVisao('calendario')}
              className={`px-3 py-2 rounded-lg text-sm flex items-center gap-1 ${visao === 'calendario' ? 'bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
            >
              <Calendar className="h-4 w-4" /> Calendário
            </button>
            <button
              onClick={() => setVisao('lista')}
              className={`px-3 py-2 rounded-lg text-sm flex items-center gap-1 ${visao === 'lista' ? 'bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
            >
              <List className="h-4 w-4" /> Lista
            </button>
          </div>
        </div>
      </div>

      {!turmaId ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-200 dark:border-gray-700">
          <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-500 dark:text-gray-400">Selecione uma turma para visualizar o diário</p>
        </div>
      ) : visao === 'calendario' ? (
        /* Visão Calendário */
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          {/* Navegação de mês */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => mudarMes(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">{nomeMes}</h2>
            <button onClick={() => mudarMes(1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {carregandoRegistros ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
            </div>
          ) : (
            <>
              {/* Cabeçalho dias da semana */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                  <div key={d} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1">{d}</div>
                ))}
              </div>
              {/* Dias */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: primeiroDia }).map((_, i) => (
                  <div key={`e-${i}`} className="h-20" />
                ))}
                {diasArray.map(dia => {
                  const regs = getRegistroDia(dia)
                  const dataStr = `${mesAtual}-${String(dia).padStart(2, '0')}`
                  const hoje = new Date().toISOString().substring(0, 10) === dataStr
                  return (
                    <button
                      key={dia}
                      onClick={() => regs.length > 0 ? abrirModal(dataStr, regs[0]) : abrirModal(dataStr)}
                      className={`h-20 p-1 rounded-lg border text-left transition-colors hover:border-teal-400 ${
                        hoje ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' : 'border-gray-200 dark:border-gray-700'
                      } ${regs.length > 0 ? 'bg-teal-50 dark:bg-teal-900/30' : ''}`}
                    >
                      <span className={`text-xs font-medium ${hoje ? 'text-teal-700 dark:text-teal-300' : 'text-gray-700 dark:text-gray-300'}`}>
                        {dia}
                      </span>
                      {regs.length > 0 && (
                        <p className="text-[10px] text-gray-600 dark:text-gray-400 line-clamp-2 mt-0.5">
                          {regs[0].conteudo.substring(0, 50)}
                        </p>
                      )}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          <div className="mt-4 flex justify-end">
            <button
              onClick={() => abrirModal()}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="h-4 w-4" /> Novo Registro
            </button>
          </div>
        </div>
      ) : (
        /* Visão Lista */
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <button onClick={() => mudarMes(-1)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium capitalize text-gray-900 dark:text-white">{nomeMes}</span>
              <button onClick={() => mudarMes(1)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={() => abrirModal()}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
            >
              <Plus className="h-4 w-4" /> Novo
            </button>
          </div>
          {carregandoRegistros ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto" />
            </div>
          ) : registros.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Nenhum registro neste mês</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Data</th>
                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Disciplina</th>
                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Conteúdo</th>
                    <th className="text-right px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map(r => (
                    <tr key={r.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3 text-gray-900 dark:text-white whitespace-nowrap">
                        {new Date(r.data_aula + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {r.disciplina_nome || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-xs truncate">
                        {r.conteudo}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => abrirModal(undefined, r)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => excluir(r.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {formId ? 'Editar Registro' : 'Novo Registro'}
              </h3>
              <button onClick={() => setModalAberto(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data da Aula</label>
                <input
                  type="date"
                  value={formData}
                  onChange={e => setFormData(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                />
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
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Conteúdo *</label>
                <textarea
                  value={formConteudo}
                  onChange={e => setFormConteudo(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  placeholder="Descreva o conteúdo da aula..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Metodologia</label>
                <textarea
                  value={formMetodologia}
                  onChange={e => setFormMetodologia(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  placeholder="Metodologia utilizada (opcional)"
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
              {erro && <p className="text-red-600 dark:text-red-400 text-sm">{erro}</p>}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
              {formId && (
                <button
                  onClick={() => { excluir(formId); setModalAberto(false) }}
                  className="flex items-center gap-1 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                >
                  <Trash2 className="h-4 w-4" /> Excluir
                </button>
              )}
              <button
                onClick={() => setModalAberto(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={salvando}
                className="flex items-center gap-1 px-4 py-2 text-sm bg-teal-600 hover:bg-teal-700 text-white rounded-lg disabled:opacity-50"
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

export default function DiarioPage() {
  return (
    <ProtectedRoute tiposPermitidos={['professor', 'administrador', 'tecnico']}>
      <DiarioDeClasse />
    </ProtectedRoute>
  )
}
