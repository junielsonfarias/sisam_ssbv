'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState } from 'react'
import { AlertTriangle, Search, Users, BookOpen, RotateCcw } from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useSeries } from '@/lib/use-series'
import { useUserType } from '@/lib/hooks/useUserType'
import { useEscolas } from '@/lib/hooks/useEscolas'
import { useTurmas } from '@/lib/hooks/useTurmas'
import { usePeriodos } from '@/lib/hooks/usePeriodos'

interface DisciplinaRecuperacao {
  disciplina_nome: string
  disciplina_abreviacao: string | null
  nota: number | null
  nota_recuperacao: number | null
  nota_final: number | null
  faltas: number
  status_recuperacao: 'pendente' | 'em_recuperacao'
}

interface AlunoRecuperacao {
  aluno_id: string
  aluno_nome: string
  codigo: string | null
  serie: string
  turma_codigo: string
  escola_nome: string
  polo_nome: string | null
  disciplinas: DisciplinaRecuperacao[]
}

export default function RecuperacaoPage() {
  const toast = useToast()
  const { formatSerie } = useSeries()

  const [escolaId, setEscolaId] = useState('')
  const [turmaId, setTurmaId] = useState('')
  const [periodoId, setPeriodoId] = useState('')
  const [serie, setSerie] = useState('')
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear().toString())

  // Auth via hook
  const { tipoUsuario, usuario, isEscola } = useUserType({
    onUsuarioCarregado: (u) => {
      if (u.escola_id) setEscolaId(u.escola_id)
    }
  })

  // Dados via hooks
  const { escolas } = useEscolas({ desabilitado: isEscola })
  const { turmas } = useTurmas(escolaId, anoLetivo)
  const { periodos } = usePeriodos(anoLetivo)

  // Reset turmaId quando escola/ano mudam
  useEffect(() => { setTurmaId('') }, [escolaId, anoLetivo])

  const [alunos, setAlunos] = useState<AlunoRecuperacao[]>([])
  const [resumo, setResumo] = useState({
    total_alunos: 0, total_disciplinas: 0, pendentes: 0, em_recuperacao: 0, media_aprovacao: 6
  })
  const [carregando, setCarregando] = useState(false)

  const buscar = async () => {
    if (!periodoId) {
      toast.info('Selecione um período')
      return
    }

    setCarregando(true)
    try {
      const params = new URLSearchParams({
        periodo_id: periodoId,
        ano_letivo: anoLetivo,
      })
      if (escolaId) params.set('escola_id', escolaId)
      if (turmaId) params.set('turma_id', turmaId)
      if (serie) params.set('serie', serie)

      const res = await fetch(`/api/admin/recuperacao?${params}`)
      if (res.ok) {
        const data = await res.json()
        setAlunos(data.alunos || [])
        setResumo(data.resumo || { total_alunos: 0, total_disciplinas: 0, pendentes: 0, em_recuperacao: 0, media_aprovacao: 6 })
      } else {
        toast.error('Erro ao buscar dados')
      }
    } catch (e) {
      toast.error('Erro ao buscar dados')
    } finally {
      setCarregando(false)
    }
  }

  const seriesOptions = [
    { value: '', label: 'Todas as séries' },
    { value: '2', label: '2º Ano' }, { value: '3', label: '3º Ano' }, { value: '5', label: '5º Ano' },
    { value: '6', label: '6º Ano' }, { value: '7', label: '7º Ano' },
    { value: '8', label: '8º Ano' }, { value: '9', label: '9º Ano' },
  ]

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola', 'polo']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-amber-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-lg p-2">
              <RotateCcw className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Acompanhamento de Recuperação</h1>
              <p className="text-sm opacity-90">Alunos com nota abaixo da média por disciplina e período</p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Filtros</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
                  <option value="">Todas as escolas</option>
                  {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Turma</label>
              <select value={turmaId} onChange={e => setTurmaId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white">
                <option value="">Todas as turmas</option>
                {turmas.map(t => <option key={t.id} value={t.id}>{t.codigo} - {t.nome || t.serie}</option>)}
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

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Série</label>
              <select value={serie} onChange={e => setSerie(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white">
                {seriesOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <button
            onClick={buscar}
            disabled={!periodoId || carregando}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-colors ${
              periodoId && !carregando
                ? 'bg-orange-600 text-white hover:bg-orange-700'
                : 'bg-gray-200 dark:bg-slate-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Search className="w-4 h-4" />
            Buscar Alunos em Recuperação
          </button>
        </div>

        {carregando ? (
          <LoadingSpinner text="Buscando dados..." centered />
        ) : alunos.length > 0 ? (
          <>
            {/* Cards Resumo */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5">
                <div className="flex items-center gap-3">
                  <div className="bg-red-100 dark:bg-red-900/40 rounded-lg p-2">
                    <Users className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{resumo.total_alunos}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Alunos</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-100 dark:bg-orange-900/40 rounded-lg p-2">
                    <BookOpen className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{resumo.total_disciplinas}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Disciplinas abaixo</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5">
                <div className="flex items-center gap-3">
                  <div className="bg-yellow-100 dark:bg-yellow-900/40 rounded-lg p-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{resumo.pendentes}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Pendentes</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 dark:bg-blue-900/40 rounded-lg p-2">
                    <RotateCcw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{resumo.em_recuperacao}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Em recuperação</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabela de alunos */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200 dark:divide-slate-700">
                  <thead className="bg-gray-50 dark:bg-slate-700">
                    <tr>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase w-8">#</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Aluno</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Escola</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Turma</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Disciplinas Abaixo da Média</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase w-16">Qtd</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {alunos.map((aluno, idx) => (
                      <tr key={aluno.aluno_id} className={`hover:bg-gray-50 dark:hover:bg-slate-700/50 ${idx % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-slate-800/50'}`}>
                        <td className="py-3 px-3 text-sm text-gray-500">{idx + 1}</td>
                        <td className="py-3 px-3">
                          <span className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">{aluno.aluno_nome}</span>
                          <span className="block text-[10px] text-gray-400">{formatSerie(aluno.serie)}</span>
                        </td>
                        <td className="py-3 px-3 text-sm text-gray-700 dark:text-gray-300">{aluno.escola_nome}</td>
                        <td className="py-3 px-3 text-center text-sm text-gray-700 dark:text-gray-300">{aluno.turma_codigo}</td>
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1.5">
                            {aluno.disciplinas.map((d, di) => (
                              <span
                                key={di}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                  d.status_recuperacao === 'em_recuperacao'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                    : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                                }`}
                                title={`Nota: ${d.nota_final?.toFixed(1) || '-'} | Rec: ${d.nota_recuperacao?.toFixed(1) || '-'} | Faltas: ${d.faltas}`}
                              >
                                {d.disciplina_abreviacao || d.disciplina_nome}
                                <span className="font-bold">{d.nota_final?.toFixed(1)}</span>
                                {d.status_recuperacao === 'em_recuperacao' && (
                                  <RotateCcw className="w-3 h-3" />
                                )}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`text-sm font-bold ${
                            aluno.disciplinas.length >= 3 ? 'text-red-600 dark:text-red-400' :
                            aluno.disciplinas.length >= 2 ? 'text-orange-600 dark:text-orange-400' :
                            'text-yellow-600 dark:text-yellow-400'
                          }`}>
                            {aluno.disciplinas.length}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700 text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-4">
                <span>Média de aprovação: <strong>{resumo.media_aprovacao}</strong></span>
                <span className="text-red-500">Vermelho = pendente de recuperação</span>
                <span className="text-blue-500">Azul = já fez prova de recuperação</span>
              </div>
            </div>
          </>
        ) : periodoId && !carregando ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-12 text-center">
            <RotateCcw className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">Nenhum aluno abaixo da média neste período</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Verifique se as notas foram lançadas</p>
          </div>
        ) : null}
      </div>
    </ProtectedRoute>
  )
}
