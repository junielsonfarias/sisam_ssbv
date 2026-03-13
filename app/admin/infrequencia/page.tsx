'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState } from 'react'
import { AlertTriangle, Search, Users, TrendingDown } from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface EscolaSimples { id: string; nome: string }
interface Periodo { id: string; nome: string; tipo: string; numero: number; ano_letivo: string }
interface AlunoInfrequente {
  aluno_id: string
  aluno_nome: string
  codigo: string | null
  serie: string
  turma_codigo: string
  escola_nome: string
  polo_nome: string | null
  faltas: number
  dias_letivos: number | null
  presencas: number | null
  percentual_frequencia: number | null
  tipo_frequencia: 'unificada' | 'por_disciplina'
  total_disciplinas?: number
}

export default function InfrequenciaPage() {
  const toast = useToast()
  const [tipoUsuario, setTipoUsuario] = useState('')
  const [escolaIdUsuario, setEscolaIdUsuario] = useState('')

  const [escolas, setEscolas] = useState<EscolaSimples[]>([])
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [escolaId, setEscolaId] = useState('')
  const [periodoId, setPeriodoId] = useState('')
  const [serie, setSerie] = useState('')
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear().toString())

  const [alunos, setAlunos] = useState<AlunoInfrequente[]>([])
  const [resumo, setResumo] = useState({ total: 0, infrequentes_75: 0 })
  const [carregando, setCarregando] = useState(false)

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
      } catch (e) {
        console.error('Erro:', e)
      }
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

  // Carregar períodos
  useEffect(() => {
    fetch(`/api/admin/periodos-letivos?ano_letivo=${anoLetivo}`)
      .then(r => r.json())
      .then(data => setPeriodos(Array.isArray(data) ? data : []))
      .catch(() => setPeriodos([]))
  }, [anoLetivo])

  // Buscar infrequência
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
        limite: '100',
      })
      if (escolaId) params.set('escola_id', escolaId)
      if (serie) params.set('serie', serie)

      const res = await fetch(`/api/admin/infrequencia?${params}`)
      if (res.ok) {
        const data = await res.json()
        setAlunos(data.alunos || [])
        setResumo(data.resumo || { total: 0, infrequentes_75: 0 })
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
    { value: 'Pré', label: 'Pré-escola' },
    { value: '1', label: '1º Ano' },
    { value: '2', label: '2º Ano' },
    { value: '3', label: '3º Ano' },
    { value: '4', label: '4º Ano' },
    { value: '5', label: '5º Ano' },
    { value: '6', label: '6º Ano' },
    { value: '7', label: '7º Ano' },
    { value: '8', label: '8º Ano' },
    { value: '9', label: '9º Ano' },
  ]

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola', 'polo']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-lg p-2">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Acompanhamento de Infrequência</h1>
              <p className="text-sm opacity-90">Alunos com maior número de faltas por período</p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Filtros</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Ano Letivo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ano Letivo</label>
              <select
                value={anoLetivo}
                onChange={e => setAnoLetivo(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            {/* Escola */}
            {tipoUsuario !== 'escola' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Escola</label>
                <select
                  value={escolaId}
                  onChange={e => setEscolaId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                >
                  <option value="">Todas as escolas</option>
                  {escolas.map(e => (
                    <option key={e.id} value={e.id}>{e.nome}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Período */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Período</label>
              <select
                value={periodoId}
                onChange={e => setPeriodoId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                <option value="">Selecione o período...</option>
                {periodos.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>

            {/* Série */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Série</label>
              <select
                value={serie}
                onChange={e => setSerie(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                {seriesOptions.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={buscar}
            disabled={!periodoId || carregando}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-colors ${
              periodoId && !carregando
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gray-200 dark:bg-slate-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Search className="w-4 h-4" />
            Buscar Infrequência
          </button>
        </div>

        {carregando ? (
          <LoadingSpinner text="Buscando dados de frequência..." centered />
        ) : alunos.length > 0 ? (
          <>
            {/* Cards Resumo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 dark:bg-blue-900/40 rounded-lg p-2">
                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{resumo.total}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Alunos com faltas</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5">
                <div className="flex items-center gap-3">
                  <div className="bg-red-100 dark:bg-red-900/40 rounded-lg p-2">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{resumo.infrequentes_75}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Abaixo de 75% ou +10 faltas</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-100 dark:bg-orange-900/40 rounded-lg p-2">
                    <TrendingDown className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {alunos.length > 0 ? alunos[0].faltas : 0}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Maior nº de faltas</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabela */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200 dark:divide-slate-700">
                  <thead className="bg-gray-50 dark:bg-slate-700">
                    <tr>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase w-8">#</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Aluno</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Escola</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Série</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Turma</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Faltas</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">% Freq.</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Tipo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {alunos.map((aluno, idx) => {
                      const pct = aluno.percentual_frequencia
                      const corFaltas = aluno.faltas >= 15 ? 'text-red-600 dark:text-red-400 font-bold' :
                        aluno.faltas >= 8 ? 'text-orange-600 dark:text-orange-400 font-semibold' :
                          'text-gray-700 dark:text-gray-300'
                      const corPct = pct !== null
                        ? (pct >= 90 ? 'text-emerald-600 dark:text-emerald-400' : pct >= 75 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400 font-bold')
                        : 'text-gray-400'

                      return (
                        <tr key={`${aluno.aluno_id}-${idx}`} className={`hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-slate-800/50'}`}>
                          <td className="py-2 px-3 text-sm text-gray-500">{idx + 1}</td>
                          <td className="py-2 px-3">
                            <span className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">{aluno.aluno_nome}</span>
                            {aluno.codigo && (
                              <span className="block text-[10px] text-gray-400">{aluno.codigo}</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-sm text-gray-700 dark:text-gray-300">{aluno.escola_nome}</td>
                          <td className="py-2 px-3 text-center text-sm text-gray-700 dark:text-gray-300">{aluno.serie}</td>
                          <td className="py-2 px-3 text-center text-sm text-gray-700 dark:text-gray-300">{aluno.turma_codigo}</td>
                          <td className="py-2 px-3 text-center">
                            <span className={`text-sm ${corFaltas}`}>{aluno.faltas}</span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`text-sm font-semibold ${corPct}`}>
                              {pct !== null ? `${pct.toFixed(0)}%` : '-'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              aluno.tipo_frequencia === 'unificada'
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                            }`}>
                              {aluno.tipo_frequencia === 'unificada' ? 'Unificada' : 'Disciplina'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Legenda */}
              <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700 text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-4">
                <span className="text-purple-600">Unificada = Pré-escola ao 5º ano (frequência geral)</span>
                <span className="text-blue-600">Disciplina = 6º ao 9º ano (soma de faltas por disciplina)</span>
                <span className="text-red-500">Vermelho = alerta de infrequência</span>
              </div>
            </div>
          </>
        ) : periodoId && !carregando ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-12 text-center">
            <AlertTriangle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">Nenhum dado de frequência encontrado para este período</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Verifique se a frequência foi lançada</p>
          </div>
        ) : null}
      </div>
    </ProtectedRoute>
  )
}
