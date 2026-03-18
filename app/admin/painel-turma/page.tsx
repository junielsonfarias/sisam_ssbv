'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Save, Users, CheckCircle, XCircle, Clock, BookOpen,
  RefreshCw, AlertCircle, CheckSquare, Square
} from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface Escola { id: string; nome: string }
interface Turma { id: string; codigo: string; nome: string | null; serie: string }
interface AlunosPainel {
  id: string; nome: string; codigo: string | null
  na_escola: boolean; hora_entrada: string | null; hora_saida: string | null
  aulas?: Record<number, { presente: boolean; disciplina_id: string; metodo: string } | null>
}
interface HorarioDia { numero_aula: number; disciplina_id: string; disciplina_nome: string; disciplina_codigo?: string }
interface PainelData {
  turma: { id: string; codigo: string; nome: string | null; serie: string }
  data: string
  dia_semana: number
  modelo_frequencia: 'por_aula' | 'unificada'
  alunos: AlunosPainel[]
  horario_dia: HorarioDia[]
  aulas_registradas: number[]
  resumo: { total_alunos: number; presentes_na_escola: number; ausentes: number; aulas_registradas: number; total_aulas: number }
}

const DIAS_NOMES = ['', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo']

export default function PainelTurmaPage() {
  const toast = useToast()
  const [tipoUsuario, setTipoUsuario] = useState('')
  const [escolaIdUsuario, setEscolaIdUsuario] = useState('')

  const [escolas, setEscolas] = useState<Escola[]>([])
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [escolaId, setEscolaId] = useState('')
  const [turmaId, setTurmaId] = useState('')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])

  const [painel, setPainel] = useState<PainelData | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)

  // Para modo 6º-9º
  const [aulaSelecionada, setAulaSelecionada] = useState<number | null>(null)
  const [presencaAula, setPresencaAula] = useState<Record<string, boolean>>({})

  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  // Init
  useEffect(() => {
    const init = async () => {
      try {
        const authRes = await fetch('/api/auth/verificar')
        if (authRes.ok) {
          const d = await authRes.json()
          if (d.usuario) {
            const tipo = d.usuario.tipo_usuario === 'administrador' ? 'admin' : d.usuario.tipo_usuario
            setTipoUsuario(tipo)
            if (d.usuario.escola_id) {
              setEscolaIdUsuario(d.usuario.escola_id)
              setEscolaId(d.usuario.escola_id)
            }
          }
        }
      } catch {}
    }
    init()
  }, [])

  // Carregar escolas e turmas
  useEffect(() => {
    if (tipoUsuario && tipoUsuario !== 'escola') {
      fetch('/api/admin/escolas')
        .then(r => r.json())
        .then(d => setEscolas(Array.isArray(d) ? d : []))
        .catch(() => setEscolas([]))
    }
  }, [tipoUsuario])

  useEffect(() => {
    if (escolaId) {
      const ano = new Date().getFullYear()
      fetch(`/api/admin/turmas?escolas_ids=${escolaId}&ano_letivo=${ano}`)
        .then(r => r.json())
        .then(d => setTurmas(Array.isArray(d) ? d : []))
        .catch(() => setTurmas([]))
    } else {
      setTurmas([])
    }
    setTurmaId('')
    setPainel(null)
  }, [escolaId])

  // Carregar painel
  const carregarPainel = useCallback(async (silencioso = false) => {
    if (!turmaId) return
    if (!silencioso) setCarregando(true)
    try {
      const res = await fetch(`/api/admin/painel-turma?turma_id=${turmaId}&data=${data}`)
      if (!res.ok) {
        if (!silencioso) toast.error('Erro ao carregar painel')
        return
      }
      const d = await res.json()
      setPainel(d)

      // Restaurar presença da aula selecionada
      if (aulaSelecionada && d.modelo_frequencia === 'por_aula') {
        const novaPresenca: Record<string, boolean> = {}
        for (const aluno of d.alunos) {
          const aulaData = aluno.aulas?.[aulaSelecionada]
          novaPresenca[aluno.id] = aulaData ? aulaData.presente : aluno.na_escola
        }
        setPresencaAula(novaPresenca)
      }
    } catch {
      if (!silencioso) toast.error('Erro ao conectar com o servidor')
    } finally {
      if (!silencioso) setCarregando(false)
    }
  }, [turmaId, data, toast, aulaSelecionada])

  // Polling a cada 30s
  useEffect(() => {
    if (painel) {
      pollingRef.current = setInterval(() => carregarPainel(true), 30000)
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [painel, carregarPainel])

  // Selecionar aula
  const selecionarAula = (num: number) => {
    setAulaSelecionada(num)
    if (!painel) return

    const novaPresenca: Record<string, boolean> = {}
    for (const aluno of painel.alunos) {
      const aulaData = aluno.aulas?.[num]
      // Se já tem registro, usar; senão, pré-preencher com na_escola
      novaPresenca[aluno.id] = aulaData ? aulaData.presente : aluno.na_escola
    }
    setPresencaAula(novaPresenca)
  }

  // Salvar frequência da aula
  const salvarFrequenciaAula = async () => {
    if (!painel || !aulaSelecionada) return

    const horario = painel.horario_dia.find(h => h.numero_aula === aulaSelecionada)
    if (!horario) {
      toast.error('Horário não definido para esta aula')
      return
    }

    setSalvando(true)
    try {
      const registros = Object.entries(presencaAula).map(([aluno_id, presente]) => ({
        aluno_id,
        presente,
      }))

      const res = await fetch('/api/admin/frequencia-hora-aula', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turma_id: painel.turma.id,
          data: painel.data,
          numero_aula: aulaSelecionada,
          disciplina_id: horario.disciplina_id,
          registros,
        }),
      })

      const d = await res.json()
      if (!res.ok) {
        toast.error(d.mensagem || 'Erro ao salvar')
        return
      }

      toast.success(d.mensagem || 'Frequência salva!')
      await carregarPainel(true)
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setSalvando(false)
    }
  }

  // Toggle presença
  const togglePresenca = (alunoId: string) => {
    setPresencaAula(prev => ({ ...prev, [alunoId]: !prev[alunoId] }))
  }

  // Marcar todos presentes/ausentes
  const marcarTodos = (presente: boolean) => {
    if (!painel) return
    const novo: Record<string, boolean> = {}
    for (const aluno of painel.alunos) {
      novo[aluno.id] = presente
    }
    setPresencaAula(novo)
  }

  const presentes = Object.values(presencaAula).filter(v => v).length
  const ausentes = Object.values(presencaAula).filter(v => !v).length

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola']}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Painel da Turma</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Acompanhamento de presença e frequência por aula
          </p>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {tipoUsuario !== 'escola' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Escola</label>
                <select value={escolaId} onChange={e => setEscolaId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white">
                  <option value="">Selecione</option>
                  {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Turma</label>
              <select value={turmaId} onChange={e => { setTurmaId(e.target.value); setPainel(null); setAulaSelecionada(null) }}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white" disabled={!escolaId}>
                <option value="">Selecione</option>
                {turmas.map(t => <option key={t.id} value={t.id}>{t.codigo}{t.nome ? ` - ${t.nome}` : ''} ({t.serie})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Data</label>
              <input type="date" value={data} onChange={e => { setData(e.target.value); setPainel(null) }}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white" />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={() => carregarPainel()} disabled={!turmaId || carregando}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors">
              {carregando ? <LoadingSpinner /> : <Users className="w-4 h-4" />}
              Carregar Painel
            </button>
          </div>
        </div>

        {/* Painel */}
        {painel && (
          <>
            {/* Info da turma */}
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800 p-4">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                  {painel.turma.codigo}{painel.turma.nome ? ` - ${painel.turma.nome}` : ''} ({painel.turma.serie})
                </span>
                <span className="w-px h-4 bg-indigo-300 dark:bg-indigo-600" />
                <span className="text-indigo-600 dark:text-indigo-400">{DIAS_NOMES[painel.dia_semana] || 'Fim de semana'}</span>
                <span className="w-px h-4 bg-indigo-300 dark:bg-indigo-600" />
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  painel.modelo_frequencia === 'por_aula'
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                }`}>
                  {painel.modelo_frequencia === 'por_aula' ? 'Frequência por Aula' : 'Frequência Unificada'}
                </span>
                <span className="w-px h-4 bg-indigo-300 dark:bg-indigo-600" />
                <button onClick={() => carregarPainel(true)} className="text-indigo-500 hover:text-indigo-700" title="Atualizar">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Cards de resumo */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 text-center">
                <Users className="w-5 h-5 mx-auto mb-1 text-gray-400" />
                <p className="text-2xl font-bold text-gray-800 dark:text-white">{painel.resumo.total_alunos}</p>
                <p className="text-xs text-gray-500">Total</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-green-200 dark:border-green-800 p-4 text-center">
                <CheckCircle className="w-5 h-5 mx-auto mb-1 text-green-500" />
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{painel.resumo.presentes_na_escola}</p>
                <p className="text-xs text-gray-500">Na Escola</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-red-200 dark:border-red-800 p-4 text-center">
                <XCircle className="w-5 h-5 mx-auto mb-1 text-red-500" />
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{painel.resumo.ausentes}</p>
                <p className="text-xs text-gray-500">Ausentes</p>
              </div>
              {painel.modelo_frequencia === 'por_aula' && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-purple-200 dark:border-purple-800 p-4 text-center">
                  <BookOpen className="w-5 h-5 mx-auto mb-1 text-purple-500" />
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {painel.resumo.aulas_registradas}/{painel.resumo.total_aulas}
                  </p>
                  <p className="text-xs text-gray-500">Aulas Registradas</p>
                </div>
              )}
            </div>

            {/* Barra de aulas (6º-9º) */}
            {painel.modelo_frequencia === 'por_aula' && painel.horario_dia.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Selecione a aula</p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {painel.horario_dia.map(h => {
                    const registrada = painel.aulas_registradas.includes(h.numero_aula)
                    const selecionada = aulaSelecionada === h.numero_aula
                    return (
                      <button key={h.numero_aula} onClick={() => selecionarAula(h.numero_aula)}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${
                          selecionada
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                            : registrada
                              ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                              : 'border-gray-200 dark:border-slate-600 hover:border-gray-400'
                        }`}>
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{h.numero_aula}ª Aula</span>
                        <p className="text-sm font-semibold text-gray-800 dark:text-white mt-1 truncate">{h.disciplina_nome}</p>
                        {registrada && <CheckCircle className="w-4 h-4 text-green-500 mx-auto mt-1" />}
                      </button>
                    )
                  })}
                </div>

                {painel.horario_dia.length === 0 && (
                  <div className="text-center py-6 text-gray-500 text-sm">
                    <AlertCircle className="w-6 h-6 mx-auto mb-2 text-amber-500" />
                    Grade horária não configurada para este dia. Configure em "Horários de Aula".
                  </div>
                )}
              </div>
            )}

            {/* Tabela de alunos */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
              {/* Ações em lote (somente modo por_aula com aula selecionada) */}
              {painel.modelo_frequencia === 'por_aula' && aulaSelecionada && (
                <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      {aulaSelecionada}ª Aula — {painel.horario_dia.find(h => h.numero_aula === aulaSelecionada)?.disciplina_nome}
                    </span>
                    <span className="w-px h-4 bg-gray-300 dark:bg-slate-600" />
                    <span className="text-green-600">{presentes} presentes</span>
                    <span className="text-red-600">{ausentes} ausentes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => marcarTodos(true)} className="px-3 py-1 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-lg hover:bg-green-200">
                      <CheckSquare className="w-3 h-3 inline mr-1" />Todos presentes
                    </button>
                    <button onClick={() => marcarTodos(false)} className="px-3 py-1 text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-lg hover:bg-red-200">
                      <Square className="w-3 h-3 inline mr-1" />Todos ausentes
                    </button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase w-10">#</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Aluno</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase w-24">Na Escola</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase w-24">Entrada</th>
                      {painel.modelo_frequencia === 'por_aula' && aulaSelecionada && (
                        <th className="text-center px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase w-28">Presente na Aula</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {painel.alunos.map((aluno, idx) => (
                      <tr key={aluno.id} className={`border-b border-gray-100 dark:border-slate-700/40 ${idx % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-slate-800/60'}`}>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            {idx + 1}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{aluno.nome}</span>
                          {aluno.codigo && <span className="text-xs text-gray-400 ml-2">({aluno.codigo})</span>}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {aluno.na_escola ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-semibold">
                              <CheckCircle className="w-3 h-3" /> Sim
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-semibold">
                              <XCircle className="w-3 h-3" /> Não
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center text-xs text-gray-500 dark:text-gray-400">
                          {aluno.hora_entrada || '—'}
                        </td>
                        {painel.modelo_frequencia === 'por_aula' && aulaSelecionada && (
                          <td className="px-3 py-2.5 text-center">
                            <button onClick={() => togglePresenca(aluno.id)}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                presencaAula[aluno.id]
                                  ? 'bg-green-500 text-white hover:bg-green-600'
                                  : 'bg-red-500 text-white hover:bg-red-600'
                              }`}>
                              {presencaAula[aluno.id] ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              {painel.modelo_frequencia === 'por_aula' && aulaSelecionada && (
                <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50/80 dark:bg-slate-800/80 flex justify-end">
                  <button onClick={salvarFrequenciaAula} disabled={salvando}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                    {salvando ? <LoadingSpinner /> : <Save className="w-4 h-4" />}
                    {salvando ? 'Salvando...' : `Salvar ${aulaSelecionada}ª Aula`}
                  </button>
                </div>
              )}

              {painel.modelo_frequencia === 'por_aula' && !aulaSelecionada && (
                <div className="px-4 py-6 text-center text-gray-500 text-sm">
                  Selecione uma aula acima para registrar a frequência
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  )
}
