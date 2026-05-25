'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Heart,
  X,
  Loader2,
  Save,
  Download,
  Play,
  AlertTriangle,
  CheckCircle,
  TrendingDown,
} from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface Escola { id: string; nome: string }

interface Mapa {
  id: string
  aluno_id: string
  aluno_nome: string
  escola_id: string
  escola_nome: string | null
  ano_letivo: string
  periodo: string
  frequencia_percentual: string | null
  total_dias_letivos: number | null
  total_presencas: number | null
  total_faltas: number | null
  faixa_etaria: string | null
  cumpre_condicionalidade: boolean | null
  motivo_baixa_frequencia: string | null
  status_envio: string
  enviado_em: string | null
}

interface Periodo {
  id: string
  label: string
}

const PERIODOS_FALLBACK: Periodo[] = [
  { id: 'fev_abr', label: 'Fev/Abr' },
  { id: 'mai_jun', label: 'Mai/Jun' },
  { id: 'ago_set', label: 'Ago/Set' },
  { id: 'out_nov', label: 'Out/Nov' },
  { id: 'dez', label: 'Dez' },
]

function BolsaFamiliaAdmin() {
  const toast = useToast()
  const [mapas, setMapas] = useState<Mapa[]>([])
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [periodos, setPeriodos] = useState<Periodo[]>(PERIODOS_FALLBACK)
  const [carregando, setCarregando] = useState(false)
  const [gerando, setGerando] = useState(false)

  const [ano, setAno] = useState(String(new Date().getFullYear()))
  const [periodo, setPeriodo] = useState('fev_abr')
  const [escola, setEscola] = useState('')
  const [apenasAlertas, setApenasAlertas] = useState(true)

  const [modalJustificar, setModalJustificar] = useState(false)
  const [mapaSelecionado, setMapaSelecionado] = useState<Mapa | null>(null)
  const [justificativa, setJustificativa] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      fetch('/api/admin/escolas', { signal: controller.signal })
        .then((r) => r.json())
        .then((d) => setEscolas(Array.isArray(d) ? d : [])),
      fetch('/api/admin/bolsa-familia?recurso=periodos', { signal: controller.signal })
        .then((r) => r.json())
        .then((d) => { if (Array.isArray(d.periodos) && d.periodos.length > 0) setPeriodos(d.periodos) }),
    ]).catch((e) => {
      if ((e as Error).name !== 'AbortError') console.error('[BolsaFamilia] init', e)
    })
    return () => controller.abort()
  }, [])

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const recurso = apenasAlertas ? 'alertas' : 'mapas'
      const p = new URLSearchParams({ recurso, ano, periodo })
      if (escola) p.set('escola', escola)
      const res = await fetch(`/api/admin/bolsa-familia?${p}`)
      const data = await res.json()
      setMapas(data.mapas || data.alertas || [])
    } catch {
      toast.error('Erro ao carregar mapas')
    } finally {
      setCarregando(false)
    }
  }, [ano, periodo, escola, apenasAlertas, toast])

  useEffect(() => { carregar() }, [carregar])

  async function gerarMapas() {
    if (!confirm(`Gerar mapas para ${ano} — ${periodo}? Isso vai criar/atualizar mapas para TODOS os alunos beneficiários.`)) return
    setGerando(true)
    try {
      const res = await fetch('/api/admin/bolsa-familia?acao=gerar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ano_letivo: ano, periodo }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      const data = await res.json()
      toast.success(data.mensagem)
      carregar()
    } catch (e) { toast.error((e as Error).message) } finally { setGerando(false) }
  }

  function abrirJustificativa(m: Mapa) {
    setMapaSelecionado(m)
    setJustificativa(m.motivo_baixa_frequencia || '')
    setModalJustificar(true)
  }

  async function salvarJustificativa() {
    if (!mapaSelecionado) return
    if (justificativa.trim().length < 10) {
      toast.error('Justificativa precisa ter ao menos 10 caracteres')
      return
    }
    setSalvando(true)
    try {
      const res = await fetch('/api/admin/bolsa-familia?acao=justificar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapa_id: mapaSelecionado.id, motivo: justificativa.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success('Justificativa registrada')
      setModalJustificar(false)
      setJustificativa('')
      setMapaSelecionado(null)
      carregar()
    } catch (e) { toast.error((e as Error).message) } finally { setSalvando(false) }
  }

  function baixarCsv() {
    const p = new URLSearchParams({ recurso: 'csv', ano, periodo })
    if (escola) p.set('escola', escola)
    window.location.href = `/api/admin/bolsa-familia?${p}`
  }

  const inputCls = 'px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-pink-500 outline-none'

  const abaixoMinimo = (m: Mapa) => m.cumpre_condicionalidade === false
  const totalAlertas = mapas.filter(abaixoMinimo).length
  const totalJustificados = mapas.filter((m) => abaixoMinimo(m) && m.motivo_baixa_frequencia).length

  return (
    <div>
      <div className="bg-gradient-to-r from-pink-600 to-rose-700 rounded-2xl p-6 mb-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Heart className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Bolsa Família — Sistema Presença</h1>
              <p className="text-pink-100 text-sm">Mapas bimestrais de frequência para o MEC</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={baixarCsv} disabled={mapas.length === 0} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-bold disabled:opacity-50">
              <Download className="w-4 h-4" /> Baixar CSV
            </button>
            <button onClick={gerarMapas} disabled={gerando} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white text-pink-700 text-sm font-bold hover:bg-pink-50 disabled:opacity-50">
              {gerando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Gerar mapas
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-pink-50 dark:bg-pink-900/30 rounded-xl p-4 text-center">
          <Heart className="w-5 h-5 text-pink-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-pink-700 dark:text-pink-300">{mapas.length}</p>
          <p className="text-xs text-pink-600">{apenasAlertas ? 'Com alerta' : 'Total mapas'}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/30 rounded-xl p-4 text-center">
          <AlertTriangle className="w-5 h-5 text-red-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-red-700 dark:text-red-300">{totalAlertas}</p>
          <p className="text-xs text-red-600">Abaixo do mínimo</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4 text-center">
          <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">{totalJustificados}</p>
          <p className="text-xs text-green-600">Justificados</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/30 rounded-xl p-4 text-center">
          <TrendingDown className="w-5 h-5 text-amber-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{totalAlertas - totalJustificados}</p>
          <p className="text-xs text-amber-600">Pendentes</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Ano *</label>
            <select value={ano} onChange={(e) => setAno(e.target.value)} className={inputCls}>
              {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Período *</label>
            <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className={inputCls}>
              {periodos.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Escola</label>
            <select value={escola} onChange={(e) => setEscola(e.target.value)} className={`${inputCls} w-full`}>
              <option value="">Todas escolas</option>
              {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={apenasAlertas} onChange={(e) => setApenasAlertas(e.target.checked)} className="rounded text-pink-600" />
            Apenas alertas
          </label>
        </div>
      </div>

      {carregando ? <LoadingSpinner centered /> : mapas.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
          <Heart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum mapa encontrado para este período</p>
          <button onClick={gerarMapas} disabled={gerando} className="mt-4 text-pink-600 text-sm font-semibold hover:text-pink-700 disabled:opacity-50">
            Gerar mapas para este período
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700/30">
                <tr>
                  <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Aluno</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Escola</th>
                  <th className="text-right py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Frequência</th>
                  <th className="text-right py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Dias</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Justificativa</th>
                  <th className="text-right py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Ação</th>
                </tr>
              </thead>
              <tbody>
                {mapas.map((m) => {
                  const pct = m.frequencia_percentual ? parseFloat(m.frequencia_percentual) : 0
                  const alerta = abaixoMinimo(m)
                  return (
                    <tr key={m.id} className={`border-b border-gray-100 dark:border-slate-700/50 ${alerta && !m.motivo_baixa_frequencia ? 'bg-red-50/40 dark:bg-red-900/10' : ''}`}>
                      <td className="py-2 px-4 font-semibold text-gray-800 dark:text-gray-200">{m.aluno_nome}</td>
                      <td className="py-2 px-4 text-xs text-gray-500">{m.escola_nome || '—'}</td>
                      <td className={`py-2 px-4 text-right font-mono font-bold ${alerta ? 'text-red-600' : m.cumpre_condicionalidade === true ? 'text-green-700' : 'text-gray-500'}`}>
                        {pct.toFixed(1)}%
                      </td>
                      <td className="py-2 px-4 text-right text-xs text-gray-500">{m.total_presencas ?? 0}/{m.total_dias_letivos ?? 0}</td>
                      <td className="py-2 px-4 text-xs text-gray-500 max-w-[300px] truncate">{m.motivo_baixa_frequencia || (alerta ? '—' : '')}</td>
                      <td className="py-2 px-4 text-right">
                        {alerta && (
                          <button onClick={() => abrirJustificativa(m)} className="px-3 py-1 rounded-lg bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 text-xs font-bold hover:bg-pink-200">
                            Justificar
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalJustificar && mapaSelecionado && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg">
            <div className="border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">Justificar baixa frequência</h2>
              <button onClick={() => setModalJustificar(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-3">
              <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-3 text-sm">
                <p className="font-bold text-gray-800 dark:text-gray-200">{mapaSelecionado.aluno_nome}</p>
                <p className="text-xs text-gray-500">{mapaSelecionado.escola_nome} • {mapaSelecionado.periodo}</p>
                <p className="text-xs text-red-600 mt-1">
                  Frequência: <strong>{mapaSelecionado.frequencia_percentual ? parseFloat(mapaSelecionado.frequencia_percentual).toFixed(1) : 0}%</strong>
                  ({mapaSelecionado.total_presencas ?? 0}/{mapaSelecionado.total_dias_letivos ?? 0} dias)
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Justificativa * (mín. 10 caracteres)</label>
                <textarea value={justificativa} onChange={(e) => setJustificativa(e.target.value)} rows={5} placeholder="Motivo da baixa frequência: doença, problemas familiares, transferência em andamento..." className={`${inputCls} w-full`} />
              </div>
              <p className="text-xs text-amber-600">Esta justificativa será enviada ao MEC junto com o mapa.</p>
            </div>
            <div className="border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-2">
              <button onClick={() => setModalJustificar(false)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold">Cancelar</button>
              <button onClick={salvarJustificativa} disabled={salvando} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-pink-600 text-white text-sm font-bold hover:bg-pink-700 disabled:opacity-50">
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function BolsaFamiliaAdminPage() {
  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola']}>
      <BolsaFamiliaAdmin />
    </ProtectedRoute>
  )
}
