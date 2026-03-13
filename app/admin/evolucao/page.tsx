'use client'

import { useEffect, useState, useCallback } from 'react'
import ProtectedRoute from '@/components/protected-route'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useToast } from '@/components/toast'
import { TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown, Search } from 'lucide-react'

interface Polo { id: string; nome: string }
interface Escola { id: string; nome: string; polo_id: string }

interface AlunoEvolucao {
  aluno_id: string
  aluno_nome: string
  escola_nome: string
  polo_nome: string
  serie: string
  diag_nota_lp: number | null
  diag_nota_mat: number | null
  diag_media: number | null
  final_nota_lp: number | null
  final_nota_mat: number | null
  final_media: number | null
  delta_lp: number
  delta_mat: number
  delta_media: number
}

interface Resumo {
  total_alunos: number
  melhoraram: number
  pioraram: number
  mantiveram: number
  pct_melhoraram: number
  media_evolucao: number
}

export default function EvolucaoPage() {
  const toast = useToast()
  const [carregando, setCarregando] = useState(false)
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear().toString())
  const [poloId, setPoloId] = useState('')
  const [escolaId, setEscolaId] = useState('')
  const [serie, setSerie] = useState('')
  const [polos, setPolos] = useState<Polo[]>([])
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [alunos, setAlunos] = useState<AlunoEvolucao[]>([])
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [avaliacoes, setAvaliacoes] = useState<any>(null)
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    fetch('/api/admin/polos').then(r => r.json()).then(d => setPolos(Array.isArray(d) ? d : []))
  }, [])

  useEffect(() => {
    if (!poloId) { setEscolas([]); return }
    fetch(`/api/admin/escolas?polo_id=${poloId}`).then(r => r.json()).then(d => setEscolas(Array.isArray(d) ? d : []))
  }, [poloId])

  const buscar = useCallback(async () => {
    if (!anoLetivo || anoLetivo.length !== 4) return
    setCarregando(true)
    setMensagem('')
    try {
      const params = new URLSearchParams({ ano_letivo: anoLetivo })
      if (poloId) params.set('polo_id', poloId)
      if (escolaId) params.set('escola_id', escolaId)
      if (serie) params.set('serie', serie)

      const res = await fetch(`/api/admin/evolucao?${params}`)
      const data = await res.json()

      if (data.mensagem && data.alunos?.length === 0) {
        setMensagem(data.mensagem)
        setAlunos([])
        setResumo(null)
        setAvaliacoes(null)
      } else {
        setAlunos(data.alunos || [])
        setResumo(data.resumo || null)
        setAvaliacoes(data.avaliacoes || null)
      }
    } catch {
      toast.error('Erro ao buscar dados de evolução')
    } finally {
      setCarregando(false)
    }
  }, [anoLetivo, poloId, escolaId, serie, toast])

  const formatNota = (n: number | null) => n != null ? Number(n).toFixed(1) : '-'

  const deltaClass = (d: number) => {
    if (d > 0) return 'text-green-600 dark:text-green-400'
    if (d < 0) return 'text-red-600 dark:text-red-400'
    return 'text-gray-400'
  }

  const DeltaIcon = ({ delta }: { delta: number }) => {
    if (delta > 0) return <ArrowUp className="w-3 h-3 inline" />
    if (delta < 0) return <ArrowDown className="w-3 h-3 inline" />
    return <Minus className="w-3 h-3 inline" />
  }

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-indigo-500" /> Evolução
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Compare resultados entre Avaliação Diagnóstica e Final
          </p>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 mb-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Ano Letivo</label>
              <input
                type="text"
                value={anoLetivo}
                onChange={e => setAnoLetivo(e.target.value.replace(/\D/g, '').slice(0, 4))}
                maxLength={4}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Polo</label>
              <select
                value={poloId}
                onChange={e => { setPoloId(e.target.value); setEscolaId('') }}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              >
                <option value="">Todos</option>
                {polos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Escola</label>
              <select
                value={escolaId}
                onChange={e => setEscolaId(e.target.value)}
                disabled={!poloId}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white disabled:opacity-50"
              >
                <option value="">Todas</option>
                {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Série</label>
              <input
                type="text"
                value={serie}
                onChange={e => setSerie(e.target.value)}
                placeholder="Ex: 5"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={buscar}
                disabled={carregando || anoLetivo.length !== 4}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium transition-colors text-sm"
              >
                <Search className="w-4 h-4" /> Buscar
              </button>
            </div>
          </div>
        </div>

        {carregando && <LoadingSpinner size="lg" text="Buscando dados..." centered />}

        {mensagem && !carregando && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-yellow-700 dark:text-yellow-300 text-sm">
            {mensagem}
          </div>
        )}

        {/* Resumo Cards */}
        {resumo && !carregando && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">Total de Alunos</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{resumo.total_alunos}</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-green-200 dark:border-green-800 p-4">
              <div className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" /> Melhoraram
              </div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{resumo.melhoraram} <span className="text-sm font-normal">({resumo.pct_melhoraram}%)</span></div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-red-200 dark:border-red-800 p-4">
              <div className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <TrendingDown className="w-4 h-4" /> Pioraram
              </div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{resumo.pioraram}</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-indigo-200 dark:border-indigo-800 p-4">
              <div className="text-sm text-indigo-600 dark:text-indigo-400">Evolução Média</div>
              <div className={`text-2xl font-bold ${deltaClass(resumo.media_evolucao)}`}>
                {resumo.media_evolucao > 0 ? '+' : ''}{resumo.media_evolucao}
              </div>
            </div>
          </div>
        )}

        {/* Tabela */}
        {alunos.length > 0 && !carregando && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-700/50 text-gray-600 dark:text-gray-300">
                    <th className="text-left px-3 py-2 font-medium">Aluno</th>
                    <th className="text-left px-3 py-2 font-medium">Escola</th>
                    <th className="text-center px-3 py-2 font-medium">Série</th>
                    <th className="text-center px-2 py-2 font-medium" colSpan={2}>LP</th>
                    <th className="text-center px-2 py-2 font-medium" colSpan={2}>MAT</th>
                    <th className="text-center px-2 py-2 font-medium" colSpan={2}>Média</th>
                  </tr>
                  <tr className="bg-gray-50 dark:bg-slate-700/50 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-slate-600">
                    <th></th>
                    <th></th>
                    <th></th>
                    <th className="px-2 py-1">Diag</th>
                    <th className="px-2 py-1">Final</th>
                    <th className="px-2 py-1">Diag</th>
                    <th className="px-2 py-1">Final</th>
                    <th className="px-2 py-1">Diag</th>
                    <th className="px-2 py-1">Final</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {alunos.map(al => (
                    <tr key={al.aluno_id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                      <td className="px-3 py-2 font-medium text-gray-900 dark:text-white whitespace-nowrap">{al.aluno_nome}</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{al.escola_nome}</td>
                      <td className="px-3 py-2 text-center text-gray-500 dark:text-gray-400">{al.serie}</td>
                      <td className="px-2 py-2 text-center">{formatNota(al.diag_nota_lp)}</td>
                      <td className="px-2 py-2 text-center">
                        <span className={deltaClass(al.delta_lp)}>
                          {formatNota(al.final_nota_lp)} <DeltaIcon delta={al.delta_lp} />
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center">{formatNota(al.diag_nota_mat)}</td>
                      <td className="px-2 py-2 text-center">
                        <span className={deltaClass(al.delta_mat)}>
                          {formatNota(al.final_nota_mat)} <DeltaIcon delta={al.delta_mat} />
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center font-medium">{formatNota(al.diag_media)}</td>
                      <td className="px-2 py-2 text-center font-bold">
                        <span className={deltaClass(al.delta_media)}>
                          {formatNota(al.final_media)} <DeltaIcon delta={al.delta_media} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
