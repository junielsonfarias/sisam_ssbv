'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState, useCallback } from 'react'
import {
  Users, Save, ArrowLeft, FileText, CheckCircle, XCircle,
  AlertCircle, RotateCcw, ChevronRight
} from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useSeries } from '@/lib/use-series'

interface EscolaSimples { id: string; nome: string }
interface TurmaSimples { id: string; codigo: string; nome: string | null; serie: string; ano_letivo: string }
interface Periodo { id: string; nome: string; tipo: string; numero: number; ano_letivo: string }
interface AlunoTurma {
  id: string; nome: string; codigo: string | null; situacao: string | null; pcd: boolean
}
interface ParecerAluno {
  parecer: 'aprovado' | 'reprovado' | 'recuperacao' | 'progressao_parcial' | 'sem_parecer'
  observacao: string
}

const PARECER_CONFIG: Record<string, { label: string; cor: string; icon: any; bgClass: string }> = {
  aprovado: { label: 'Aprovado', cor: 'text-emerald-700 dark:text-emerald-300', icon: CheckCircle, bgClass: 'bg-emerald-100 dark:bg-emerald-900/40' },
  reprovado: { label: 'Reprovado', cor: 'text-red-700 dark:text-red-300', icon: XCircle, bgClass: 'bg-red-100 dark:bg-red-900/40' },
  recuperacao: { label: 'Recuperação', cor: 'text-orange-700 dark:text-orange-300', icon: RotateCcw, bgClass: 'bg-orange-100 dark:bg-orange-900/40' },
  progressao_parcial: { label: 'Progressão Parcial', cor: 'text-blue-700 dark:text-blue-300', icon: ChevronRight, bgClass: 'bg-blue-100 dark:bg-blue-900/40' },
  sem_parecer: { label: 'Sem Parecer', cor: 'text-gray-500 dark:text-gray-400', icon: AlertCircle, bgClass: 'bg-gray-100 dark:bg-gray-800' },
}

type Modo = 'selecao' | 'conselho'

export default function ConselhoClassePage() {
  const toast = useToast()
  const { formatSerie } = useSeries()
  const [modo, setModo] = useState<Modo>('selecao')
  const [tipoUsuario, setTipoUsuario] = useState('')
  const [escolaIdUsuario, setEscolaIdUsuario] = useState('')

  // Seleção
  const [escolas, setEscolas] = useState<EscolaSimples[]>([])
  const [turmas, setTurmas] = useState<TurmaSimples[]>([])
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [escolaId, setEscolaId] = useState('')
  const [turmaId, setTurmaId] = useState('')
  const [periodoId, setPeriodoId] = useState('')
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear().toString())

  // Conselho
  const [alunos, setAlunos] = useState<AlunoTurma[]>([])
  const [pareceres, setPareceres] = useState<Record<string, ParecerAluno>>({})
  const [dataReuniao, setDataReuniao] = useState('')
  const [ataGeral, setAtaGeral] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const turmaSelecionada = turmas.find(t => t.id === turmaId)
  const periodoSelecionado = periodos.find(p => p.id === periodoId)

  // Init
  useEffect(() => {
    const init = async () => {
      try {
        const authRes = await fetch('/api/auth/verificar')
        if (authRes.ok) {
          const data = await authRes.json()
          if (data.usuario) {
            const tipo = data.usuario.tipo_usuario === 'administrador' ? 'admin' : data.usuario.tipo_usuario
            setTipoUsuario(tipo)
            if (data.usuario.escola_id) {
              setEscolaIdUsuario(data.usuario.escola_id)
              setEscolaId(data.usuario.escola_id)
            }
          }
        }
      } catch (e) { console.error(e) }
    }
    init()
  }, [])

  // Carregar escolas
  useEffect(() => {
    if (tipoUsuario && tipoUsuario !== 'escola') {
      fetch('/api/admin/escolas')
        .then(r => r.json())
        .then(data => setEscolas(Array.isArray(data) ? data : []))
        .catch(() => setEscolas([]))
    }
  }, [tipoUsuario])

  // Carregar turmas
  useEffect(() => {
    if (escolaId) {
      fetch(`/api/admin/turmas?escolas_ids=${escolaId}&ano_letivo=${anoLetivo}`)
        .then(r => r.json())
        .then(data => setTurmas(Array.isArray(data) ? data : []))
        .catch(() => setTurmas([]))
    } else {
      setTurmas([])
    }
    setTurmaId('')
  }, [escolaId, anoLetivo])

  // Carregar períodos
  useEffect(() => {
    fetch(`/api/admin/periodos-letivos?ano_letivo=${anoLetivo}`)
      .then(r => r.json())
      .then(data => setPeriodos(Array.isArray(data) ? data : []))
      .catch(() => setPeriodos([]))
  }, [anoLetivo])

  // Carregar conselho
  const carregarConselho = useCallback(async () => {
    if (!turmaId || !periodoId) return

    setCarregando(true)
    try {
      const [alunosRes, conselhoRes] = await Promise.all([
        fetch(`/api/admin/turmas/${turmaId}/alunos`),
        fetch(`/api/admin/conselho-classe?turma_id=${turmaId}&periodo_id=${periodoId}`),
      ])

      if (alunosRes.ok) {
        const alunosData = await alunosRes.json()
        setAlunos(alunosData.alunos || [])
      }

      if (conselhoRes.ok) {
        const conselhoData = await conselhoRes.json()
        if (conselhoData.conselho) {
          setDataReuniao(conselhoData.conselho.data_reuniao?.split('T')[0] || '')
          setAtaGeral(conselhoData.conselho.ata_geral || '')
        } else {
          setDataReuniao('')
          setAtaGeral('')
        }
        setPareceres(conselhoData.pareceres || {})
      }

      setModo('conselho')
    } catch (e) {
      toast.error('Erro ao carregar dados')
    } finally {
      setCarregando(false)
    }
  }, [turmaId, periodoId])

  // Atualizar parecer
  const atualizarParecer = (alunoId: string, campo: keyof ParecerAluno, valor: any) => {
    setPareceres(prev => ({
      ...prev,
      [alunoId]: {
        ...prev[alunoId] || { parecer: 'sem_parecer', observacao: '' },
        [campo]: valor,
      },
    }))
  }

  // Salvar
  const salvarConselho = async () => {
    setSalvando(true)
    try {
      const pareceresArray = alunos
        .filter(a => a.situacao === 'cursando' || !a.situacao)
        .map(a => ({
          aluno_id: a.id,
          parecer: pareceres[a.id]?.parecer || 'sem_parecer',
          observacao: pareceres[a.id]?.observacao || null,
        }))

      const res = await fetch('/api/admin/conselho-classe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turma_id: turmaId,
          periodo_id: periodoId,
          data_reuniao: dataReuniao || null,
          ata_geral: ataGeral || null,
          pareceres: pareceresArray,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(data.mensagem || 'Conselho salvo!')
      } else {
        toast.error(data.mensagem || 'Erro ao salvar')
      }
    } catch (e) {
      toast.error('Erro ao salvar conselho')
    } finally {
      setSalvando(false)
    }
  }

  // Aplicar parecer em lote
  const aplicarParecerEmLote = (parecer: ParecerAluno['parecer']) => {
    const novosPareceres: Record<string, ParecerAluno> = { ...pareceres }
    alunos
      .filter(a => a.situacao === 'cursando' || !a.situacao)
      .forEach(a => {
        if (!novosPareceres[a.id] || novosPareceres[a.id].parecer === 'sem_parecer') {
          novosPareceres[a.id] = { parecer, observacao: novosPareceres[a.id]?.observacao || '' }
        }
      })
    setPareceres(novosPareceres)
  }

  const alunosAtivos = alunos.filter(a => a.situacao === 'cursando' || !a.situacao)

  // Contadores
  const contadores = {
    aprovado: alunosAtivos.filter(a => pareceres[a.id]?.parecer === 'aprovado').length,
    reprovado: alunosAtivos.filter(a => pareceres[a.id]?.parecer === 'reprovado').length,
    recuperacao: alunosAtivos.filter(a => pareceres[a.id]?.parecer === 'recuperacao').length,
    progressao_parcial: alunosAtivos.filter(a => pareceres[a.id]?.parecer === 'progressao_parcial').length,
    sem_parecer: alunosAtivos.filter(a => !pareceres[a.id] || pareceres[a.id]?.parecer === 'sem_parecer').length,
  }

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-lg p-2">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Conselho de Classe</h1>
              <p className="text-sm opacity-90">Registro de atas e pareceres por turma e período</p>
            </div>
          </div>
        </div>

        {carregando ? (
          <LoadingSpinner text="Carregando..." centered />
        ) : modo === 'selecao' ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Selecione a turma e período</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ano Letivo</label>
                <select value={anoLetivo} onChange={e => setAnoLetivo(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white">
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              {tipoUsuario !== 'escola' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Escola</label>
                  <select value={escolaId} onChange={e => setEscolaId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white">
                    <option value="">Selecione a escola...</option>
                    {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Turma</label>
                <select value={turmaId} onChange={e => setTurmaId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white">
                  <option value="">Selecione a turma...</option>
                  {turmas.map(t => <option key={t.id} value={t.id}>{t.codigo} - {t.nome || formatSerie(t.serie)}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Período</label>
                <select value={periodoId} onChange={e => setPeriodoId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white">
                  <option value="">Selecione o período...</option>
                  {periodos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
            </div>

            <button
              onClick={carregarConselho}
              disabled={!turmaId || !periodoId}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-colors ${
                turmaId && periodoId
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-200 dark:bg-slate-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              <FileText className="w-4 h-4" />
              Abrir Conselho de Classe
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Barra de contexto */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button onClick={() => setModo('selecao')} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                      Conselho de Classe — {turmaSelecionada?.codigo}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {turmaSelecionada?.nome || formatSerie(turmaSelecionada?.serie)} | {periodoSelecionado?.nome}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {Object.entries(contadores).map(([key, val]) => {
                    const cfg = PARECER_CONFIG[key]
                    return val > 0 ? (
                      <span key={key} className={`${cfg.bgClass} ${cfg.cor} px-2 py-1 rounded-full`}>
                        {val} {cfg.label}
                      </span>
                    ) : null
                  })}
                </div>
              </div>
            </div>

            {/* Ata geral + data */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data da Reunião</label>
                  <input
                    type="date"
                    value={dataReuniao}
                    onChange={e => setDataReuniao(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400 pb-2">
                    Aplicar em lote para alunos sem parecer:
                  </span>
                </div>
              </div>

              {/* Botões de aplicar em lote */}
              <div className="flex flex-wrap gap-2">
                {(['aprovado', 'recuperacao', 'reprovado', 'progressao_parcial'] as const).map(p => {
                  const cfg = PARECER_CONFIG[p]
                  return (
                    <button
                      key={p}
                      onClick={() => aplicarParecerEmLote(p)}
                      className={`${cfg.bgClass} ${cfg.cor} px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity`}
                    >
                      Todos → {cfg.label}
                    </button>
                  )
                })}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ata Geral do Conselho</label>
                <textarea
                  value={ataGeral}
                  onChange={e => setAtaGeral(e.target.value)}
                  rows={3}
                  placeholder="Observações gerais da reunião do conselho de classe..."
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white resize-y"
                />
              </div>
            </div>

            {/* Tabela de pareceres */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200 dark:divide-slate-700">
                  <thead className="bg-gray-50 dark:bg-slate-700">
                    <tr>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase w-8">#</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Aluno</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase w-44">Parecer</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Observação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {alunosAtivos.map((aluno, idx) => {
                      const parecer = pareceres[aluno.id]?.parecer || 'sem_parecer'
                      const cfg = PARECER_CONFIG[parecer]

                      return (
                        <tr key={aluno.id} className={`hover:bg-gray-50 dark:hover:bg-slate-700/50 ${idx % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-slate-800/50'}`}>
                          <td className="py-2 px-3 text-sm text-gray-500">{idx + 1}</td>
                          <td className="py-2 px-3">
                            <span className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">{aluno.nome}</span>
                            {aluno.pcd && (
                              <span className="ml-2 text-[10px] bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-full">PCD</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <select
                              value={parecer}
                              onChange={e => atualizarParecer(aluno.id, 'parecer', e.target.value)}
                              className={`rounded-lg border px-2 py-1.5 text-xs font-medium ${cfg.bgClass} ${cfg.cor} border-transparent`}
                            >
                              {Object.entries(PARECER_CONFIG).map(([key, val]) => (
                                <option key={key} value={key}>{val.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={pareceres[aluno.id]?.observacao || ''}
                              onChange={e => atualizarParecer(aluno.id, 'observacao', e.target.value)}
                              placeholder="Observação individual..."
                              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {alunosAtivos.length} aluno(s) ativo(s)
                </span>
                <button
                  onClick={salvarConselho}
                  disabled={salvando}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 text-sm font-medium transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {salvando ? 'Salvando...' : 'Salvar Conselho'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
