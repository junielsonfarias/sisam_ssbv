'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  UtensilsCrossed,
  Plus,
  X,
  Loader2,
  Save,
  Calendar,
  ClipboardList,
  Users,
  TrendingUp,
  FileText,
  Eye,
  CheckCircle,
  Stethoscope,
  Power,
} from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface Escola {
  id: string
  nome: string
}

interface Refeicao {
  dia_semana: number
  tipo: string
  descricao: string
  kcal?: number | null
  contem_alergenicos?: string[]
}

interface Cardapio {
  id: string
  escola_id: string | null
  semana_inicio: string
  semana_fim: string
  faixa_etaria: string
  status: string
  observacoes: string | null
  nutricionista_nome: string | null
  nutricionista_crn: string | null
  refeicoes: Refeicao[]
}

interface ResumoLinha {
  faixa_etaria: string
  tipo_refeicao: string
  total_alunos: string
  total_extra: string
  dias_servidos: string
}

interface Nutricionista {
  id: string
  nome: string
  crn: string
  telefone: string | null
  email: string | null
  responsavel_tecnico: boolean
  ativa: boolean
}

const FAIXAS = ['creche', 'pre_escola', 'fundamental', 'eja', 'integral'] as const
const TIPOS_REFEICAO = ['cafe_manha', 'lanche_manha', 'almoco', 'lanche_tarde', 'jantar'] as const

const FAIXA_LABEL: Record<string, string> = {
  creche: 'Creche (0-3 anos)',
  pre_escola: 'Pré-escola (4-5 anos)',
  fundamental: 'Ensino Fundamental',
  eja: 'EJA',
  integral: 'Tempo Integral',
}

const TIPO_REFEICAO_LABEL: Record<string, string> = {
  cafe_manha: 'Café da manhã',
  lanche_manha: 'Lanche da manhã',
  almoco: 'Almoço',
  lanche_tarde: 'Lanche da tarde',
  jantar: 'Jantar',
}

const DIAS = ['', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']

const STATUS_BADGE: Record<string, string> = {
  rascunho: 'bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-300',
  publicado: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  arquivado: 'bg-gray-100 text-gray-700 dark:bg-gray-700/30 dark:text-gray-300',
}

function PnaeAdmin() {
  const toast = useToast()
  const [aba, setAba] = useState<'cardapio' | 'atendimentos' | 'nutricionistas'>('cardapio')
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [escolaSelecionada, setEscolaSelecionada] = useState('')
  const [faixaSelecionada, setFaixaSelecionada] = useState<string>('fundamental')
  const [dataReferencia, setDataReferencia] = useState(new Date().toISOString().slice(0, 10))
  const [cardapio, setCardapio] = useState<Cardapio | null>(null)
  const [carregandoCardapio, setCarregandoCardapio] = useState(false)

  const [modalNovoCardapio, setModalNovoCardapio] = useState(false)
  const [modalAtendimento, setModalAtendimento] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const [novoCardapio, setNovoCardapio] = useState({
    escola_id: '' as string | null,
    semana_inicio: '',
    semana_fim: '',
    faixa_etaria: 'fundamental' as string,
    observacoes: '',
    publicar: false,
    refeicoes: [] as Refeicao[],
  })

  const [novaRefeicao, setNovaRefeicao] = useState({
    dia_semana: 1,
    tipo: 'almoco' as string,
    descricao: '',
    kcal: '',
  })

  const [atendimento, setAtendimento] = useState({
    escola_id: '',
    data_atendimento: new Date().toISOString().slice(0, 10),
    faixa_etaria: 'fundamental' as string,
    tipo_refeicao: 'almoco' as string,
    qtd_alunos: '',
    qtd_extra: '',
    observacoes: '',
  })

  const [resumoAno, setResumoAno] = useState(new Date().getFullYear())
  const [resumoMes, setResumoMes] = useState(new Date().getMonth() + 1)
  const [resumoEscola, setResumoEscola] = useState('')
  const [resumo, setResumo] = useState<ResumoLinha[]>([])
  const [carregandoResumo, setCarregandoResumo] = useState(false)

  // Aba nutricionistas
  const [nutricionistas, setNutricionistas] = useState<Nutricionista[]>([])
  const [incluirInativos, setIncluirInativos] = useState(false)
  const [carregandoNut, setCarregandoNut] = useState(false)
  const [modalNutricionista, setModalNutricionista] = useState(false)
  const [novaNut, setNovaNut] = useState({
    nome: '', crn: '', telefone: '', email: '', responsavel_tecnico: false,
  })

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/admin/escolas', { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => setEscolas(Array.isArray(data) ? data : []))
      .catch(() => {})
    return () => controller.abort()
  }, [])

  const carregarCardapio = useCallback(async () => {
    if (!escolaSelecionada || !faixaSelecionada) {
      setCardapio(null)
      return
    }
    setCarregandoCardapio(true)
    try {
      const params = new URLSearchParams({
        escola: escolaSelecionada,
        faixa: faixaSelecionada,
        data: dataReferencia,
      })
      const res = await fetch(`/api/admin/pnae/cardapios?${params}`)
      const data = await res.json()
      setCardapio(data.cardapio)
    } catch {
      toast.error('Erro ao carregar cardápio')
    } finally {
      setCarregandoCardapio(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escolaSelecionada, faixaSelecionada, dataReferencia])

  useEffect(() => {
    if (aba === 'cardapio') carregarCardapio()
  }, [aba, carregarCardapio])

  const carregarResumo = useCallback(async () => {
    setCarregandoResumo(true)
    try {
      const params = new URLSearchParams({ ano: String(resumoAno), mes: String(resumoMes) })
      if (resumoEscola) params.set('escola', resumoEscola)
      const res = await fetch(`/api/admin/pnae/atendimentos?${params}`)
      const data = await res.json()
      setResumo(data.resumo || [])
    } catch {
      toast.error('Erro ao carregar resumo')
    } finally {
      setCarregandoResumo(false)
    }
  }, [resumoAno, resumoMes, resumoEscola, toast])

  useEffect(() => {
    if (aba === 'atendimentos') carregarResumo()
  }, [aba, carregarResumo])

  const carregarNutricionistas = useCallback(async (signal?: AbortSignal) => {
    setCarregandoNut(true)
    try {
      const p = new URLSearchParams()
      if (incluirInativos) p.set('inativos', 'true')
      const res = await fetch(`/api/admin/pnae/nutricionistas?${p}`, { signal })
      const data = await res.json()
      setNutricionistas(data.nutricionistas || [])
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast.error('Erro ao carregar nutricionistas')
    } finally {
      setCarregandoNut(false)
    }
  }, [incluirInativos, toast])

  useEffect(() => {
    if (aba === 'nutricionistas') {
      const controller = new AbortController()
      carregarNutricionistas(controller.signal)
      return () => controller.abort()
    }
  }, [aba, carregarNutricionistas])

  async function salvarNutricionista() {
    if (!novaNut.nome.trim() || !novaNut.crn.trim()) {
      toast.error('Nome e CRN são obrigatórios')
      return
    }
    setSalvando(true)
    try {
      const body: Record<string, unknown> = {
        nome: novaNut.nome.trim(),
        crn: novaNut.crn.trim(),
        responsavel_tecnico: novaNut.responsavel_tecnico,
      }
      if (novaNut.telefone) body.telefone = novaNut.telefone
      if (novaNut.email) body.email = novaNut.email

      const res = await fetch('/api/admin/pnae/nutricionistas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success('Nutricionista cadastrada')
      setModalNutricionista(false)
      setNovaNut({ nome: '', crn: '', telefone: '', email: '', responsavel_tecnico: false })
      carregarNutricionistas()
    } catch (e) { toast.error((e as Error).message) } finally { setSalvando(false) }
  }

  async function alterarStatusNut(n: Nutricionista) {
    const acao = n.ativa ? 'inativar' : 'reativar'
    if (!confirm(`Confirma ${acao} ${n.nome}?`)) return
    try {
      const res = await fetch(`/api/admin/pnae/nutricionistas?id=${n.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativa: !n.ativa }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success(`${n.nome} ${n.ativa ? 'inativada' : 'reativada'}`)
      carregarNutricionistas()
    } catch (e) { toast.error((e as Error).message) }
  }

  function adicionarRefeicao() {
    if (!novaRefeicao.descricao.trim()) {
      toast.error('Informe a descrição da refeição')
      return
    }
    setNovoCardapio({
      ...novoCardapio,
      refeicoes: [...novoCardapio.refeicoes, {
        dia_semana: novaRefeicao.dia_semana,
        tipo: novaRefeicao.tipo,
        descricao: novaRefeicao.descricao.trim(),
        kcal: novaRefeicao.kcal ? parseFloat(novaRefeicao.kcal) : undefined,
      }],
    })
    setNovaRefeicao({ ...novaRefeicao, descricao: '', kcal: '' })
  }

  function removerRefeicao(i: number) {
    setNovoCardapio({
      ...novoCardapio,
      refeicoes: novoCardapio.refeicoes.filter((_, j) => j !== i),
    })
  }

  async function salvarCardapio() {
    if (!novoCardapio.semana_inicio || !novoCardapio.semana_fim) {
      toast.error('Informe início e fim da semana')
      return
    }
    if (novoCardapio.refeicoes.length === 0) {
      toast.error('Adicione ao menos uma refeição')
      return
    }
    setSalvando(true)
    try {
      const body = {
        escola_id: novoCardapio.escola_id || null,
        semana_inicio: novoCardapio.semana_inicio,
        semana_fim: novoCardapio.semana_fim,
        faixa_etaria: novoCardapio.faixa_etaria,
        observacoes: novoCardapio.observacoes || undefined,
        publicar: novoCardapio.publicar,
        refeicoes: novoCardapio.refeicoes,
      }
      const res = await fetch('/api/admin/pnae/cardapios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success('Cardápio criado' + (novoCardapio.publicar ? ' e publicado' : ''))
      setModalNovoCardapio(false)
      setNovoCardapio({
        escola_id: '', semana_inicio: '', semana_fim: '',
        faixa_etaria: 'fundamental', observacoes: '', publicar: false, refeicoes: [],
      })
      carregarCardapio()
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  async function salvarAtendimento() {
    if (!atendimento.escola_id) {
      toast.error('Selecione a escola')
      return
    }
    if (!atendimento.qtd_alunos || parseInt(atendimento.qtd_alunos, 10) < 0) {
      toast.error('Informe a quantidade de alunos')
      return
    }
    setSalvando(true)
    try {
      const body = {
        escola_id: atendimento.escola_id,
        data_atendimento: atendimento.data_atendimento,
        faixa_etaria: atendimento.faixa_etaria,
        tipo_refeicao: atendimento.tipo_refeicao,
        qtd_alunos: parseInt(atendimento.qtd_alunos, 10),
        qtd_extra: atendimento.qtd_extra ? parseInt(atendimento.qtd_extra, 10) : 0,
        observacoes: atendimento.observacoes || undefined,
      }
      const res = await fetch('/api/admin/pnae/atendimentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success('Atendimento registrado')
      setModalAtendimento(false)
      setAtendimento({ ...atendimento, qtd_alunos: '', qtd_extra: '', observacoes: '' })
      carregarResumo()
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  const inputCls = 'px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-green-500 outline-none'

  const totalServidoMes = resumo.reduce((s, r) => s + parseInt(r.total_alunos || '0', 10), 0)
  const diasUnicos = resumo.length > 0 ? Math.max(...resumo.map((r) => parseInt(r.dias_servidos || '0', 10))) : 0

  return (
    <div>
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 mb-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <UtensilsCrossed className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">PNAE — Alimentação Escolar</h1>
              <p className="text-green-100 text-sm">Programa Nacional de Alimentação Escolar (Lei 11.947/2009)</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setModalNovoCardapio(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-bold transition-colors"
            >
              <Plus className="w-4 h-4" /> Novo cardápio
            </button>
            <button
              onClick={() => setModalAtendimento(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-green-700 hover:bg-green-50 text-sm font-bold transition-colors"
            >
              <Plus className="w-4 h-4" /> Registrar atendimento
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-slate-700 overflow-x-auto">
        {[
          { key: 'cardapio', label: 'Cardápio Semanal', icon: ClipboardList },
          { key: 'atendimentos', label: 'Atendimentos (FNDE)', icon: TrendingUp },
          { key: 'nutricionistas', label: 'Nutricionistas', icon: Stethoscope },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setAba(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${
              aba === tab.key
                ? 'border-green-600 text-green-700 dark:text-green-300'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {aba === 'cardapio' && (
        <>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 mb-6">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Escola</label>
                <select value={escolaSelecionada} onChange={(e) => setEscolaSelecionada(e.target.value)} className={`${inputCls} w-full`}>
                  <option value="">Selecione uma escola</option>
                  {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Faixa etária</label>
                <select value={faixaSelecionada} onChange={(e) => setFaixaSelecionada(e.target.value)} className={inputCls}>
                  {FAIXAS.map((f) => <option key={f} value={f}>{FAIXA_LABEL[f]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Data de referência</label>
                <input type="date" value={dataReferencia} onChange={(e) => setDataReferencia(e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>

          {carregandoCardapio ? (
            <LoadingSpinner centered />
          ) : !escolaSelecionada ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
              <Eye className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">Selecione uma escola para visualizar o cardápio vigente</p>
            </div>
          ) : !cardapio ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
              <UtensilsCrossed className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum cardápio publicado para esta data e faixa etária</p>
              <button
                onClick={() => {
                  setNovoCardapio({ ...novoCardapio, escola_id: escolaSelecionada, faixa_etaria: faixaSelecionada })
                  setModalNovoCardapio(true)
                }}
                className="mt-4 text-green-600 text-sm font-semibold hover:text-green-700"
              >
                Criar cardápio
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                    Semana de {new Date(cardapio.semana_inicio).toLocaleDateString('pt-BR')} a {new Date(cardapio.semana_fim).toLocaleDateString('pt-BR')}
                  </h3>
                  <p className="text-xs text-gray-500">{FAIXA_LABEL[cardapio.faixa_etaria]}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_BADGE[cardapio.status]}`}>
                  {cardapio.status.toUpperCase()}
                </span>
              </div>
              {cardapio.nutricionista_nome && (
                <p className="text-xs text-gray-500 mb-4">
                  Nutricionista responsável: <strong>{cardapio.nutricionista_nome}</strong> (CRN {cardapio.nutricionista_crn})
                </p>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-700">
                      <th className="text-left py-2 px-3 font-bold text-gray-600 dark:text-gray-300">Dia</th>
                      <th className="text-left py-2 px-3 font-bold text-gray-600 dark:text-gray-300">Refeição</th>
                      <th className="text-left py-2 px-3 font-bold text-gray-600 dark:text-gray-300">Descrição</th>
                      <th className="text-right py-2 px-3 font-bold text-gray-600 dark:text-gray-300">Kcal</th>
                      <th className="text-left py-2 px-3 font-bold text-gray-600 dark:text-gray-300">Alérgenos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...cardapio.refeicoes].sort((a, b) => a.dia_semana - b.dia_semana || a.tipo.localeCompare(b.tipo)).map((ref, i) => (
                      <tr key={i} className="border-b border-gray-100 dark:border-slate-700/50">
                        <td className="py-2 px-3 text-gray-700 dark:text-gray-300">{DIAS[ref.dia_semana]}</td>
                        <td className="py-2 px-3 text-gray-700 dark:text-gray-300">{TIPO_REFEICAO_LABEL[ref.tipo]}</td>
                        <td className="py-2 px-3 text-gray-700 dark:text-gray-300">{ref.descricao}</td>
                        <td className="py-2 px-3 text-right text-gray-500">{ref.kcal || '—'}</td>
                        <td className="py-2 px-3">
                          <div className="flex flex-wrap gap-1">
                            {(ref.contem_alergenicos || []).map((a) => (
                              <span key={a} className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">{a}</span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {cardapio.observacoes && (
                <div className="mt-4 p-3 bg-gray-50 dark:bg-slate-700/30 rounded-lg text-xs text-gray-600 dark:text-gray-300">
                  <strong>Observações:</strong> {cardapio.observacoes}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {aba === 'atendimentos' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4 text-center">
              <Users className="w-5 h-5 text-green-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">{totalServidoMes.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-green-600">Alunos servidos no mês</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 text-center">
              <Calendar className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{diasUnicos}</p>
              <p className="text-xs text-blue-600">Dias com atendimento</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-4 text-center">
              <FileText className="w-5 h-5 text-purple-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{resumo.length}</p>
              <p className="text-xs text-purple-600">Combinações (faixa+refeição)</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 mb-6">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Ano</label>
                <select value={resumoAno} onChange={(e) => setResumoAno(parseInt(e.target.value, 10))} className={inputCls}>
                  {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Mês</label>
                <select value={resumoMes} onChange={(e) => setResumoMes(parseInt(e.target.value, 10))} className={inputCls}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>{new Date(2026, m - 1, 1).toLocaleString('pt-BR', { month: 'long' })}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Escola (opcional)</label>
                <select value={resumoEscola} onChange={(e) => setResumoEscola(e.target.value)} className={`${inputCls} w-full`}>
                  <option value="">Todas as escolas</option>
                  {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
            </div>
          </div>

          {carregandoResumo ? (
            <LoadingSpinner centered />
          ) : resumo.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
              <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum atendimento registrado neste mês</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-700/30">
                  <tr>
                    <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Faixa etária</th>
                    <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Refeição</th>
                    <th className="text-right py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Alunos PNAE</th>
                    <th className="text-right py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Extras</th>
                    <th className="text-right py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Dias</th>
                  </tr>
                </thead>
                <tbody>
                  {resumo.map((r, i) => (
                    <tr key={i} className="border-b border-gray-100 dark:border-slate-700/50">
                      <td className="py-2 px-4 text-gray-700 dark:text-gray-300">{FAIXA_LABEL[r.faixa_etaria]}</td>
                      <td className="py-2 px-4 text-gray-700 dark:text-gray-300">{TIPO_REFEICAO_LABEL[r.tipo_refeicao]}</td>
                      <td className="py-2 px-4 text-right font-mono text-gray-700 dark:text-gray-300">{parseInt(r.total_alunos, 10).toLocaleString('pt-BR')}</td>
                      <td className="py-2 px-4 text-right font-mono text-gray-500">{parseInt(r.total_extra || '0', 10).toLocaleString('pt-BR')}</td>
                      <td className="py-2 px-4 text-right font-mono text-gray-500">{r.dias_servidos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {aba === 'nutricionistas' && (
        <>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={incluirInativos} onChange={(e) => setIncluirInativos(e.target.checked)} className="rounded text-green-600" />
              Incluir inativas
            </label>
            <button onClick={() => { setNovaNut({ nome: '', crn: '', telefone: '', email: '', responsavel_tecnico: false }); setModalNutricionista(true) }} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-700">
              <Plus className="w-4 h-4" /> Nova nutricionista
            </button>
          </div>

          {carregandoNut ? <LoadingSpinner centered /> : nutricionistas.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
              <Stethoscope className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhuma nutricionista cadastrada</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-700/30">
                  <tr>
                    <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Nome</th>
                    <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">CRN</th>
                    <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Contato</th>
                    <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">RT</th>
                    <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Status</th>
                    <th className="text-right py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {nutricionistas.map((n) => (
                    <tr key={n.id} className="border-b border-gray-100 dark:border-slate-700/50">
                      <td className="py-2 px-4 font-semibold text-gray-800 dark:text-gray-200">{n.nome}</td>
                      <td className="py-2 px-4 font-mono text-xs text-gray-500">{n.crn}</td>
                      <td className="py-2 px-4 text-xs text-gray-500">
                        {n.email && <div>{n.email}</div>}
                        {n.telefone && <div>{n.telefone}</div>}
                        {!n.email && !n.telefone && '—'}
                      </td>
                      <td className="py-2 px-4">
                        {n.responsavel_tecnico && <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">RT FNDE</span>}
                      </td>
                      <td className="py-2 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${n.ativa ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                          {n.ativa ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-right">
                        <button
                          onClick={() => alterarStatusNut(n)}
                          className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold ml-auto ${n.ativa ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200'}`}
                        >
                          <Power className="w-3 h-3" /> {n.ativa ? 'Inativar' : 'Reativar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {modalNutricionista && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">Nova nutricionista</h2>
              <button onClick={() => setModalNutricionista(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Nome completo *</label>
                <input type="text" value={novaNut.nome} onChange={(e) => setNovaNut({ ...novaNut, nome: e.target.value })} className={`${inputCls} w-full`} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">CRN * (Conselho Regional de Nutricionistas)</label>
                <input type="text" value={novaNut.crn} onChange={(e) => setNovaNut({ ...novaNut, crn: e.target.value })} placeholder="Ex: CRN-1 12345" className={`${inputCls} w-full`} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Telefone</label>
                  <input type="text" value={novaNut.telefone} onChange={(e) => setNovaNut({ ...novaNut, telefone: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">E-mail</label>
                  <input type="email" value={novaNut.email} onChange={(e) => setNovaNut({ ...novaNut, email: e.target.value })} className={`${inputCls} w-full`} />
                </div>
              </div>
              <label className="flex items-start gap-2 text-sm cursor-pointer p-3 bg-gray-50 dark:bg-slate-700/30 rounded-lg">
                <input
                  type="checkbox"
                  checked={novaNut.responsavel_tecnico}
                  onChange={(e) => setNovaNut({ ...novaNut, responsavel_tecnico: e.target.checked })}
                  className="rounded text-green-600 mt-0.5"
                />
                <span>
                  <span className="font-semibold text-gray-700 dark:text-gray-200">Responsável Técnico (RT) FNDE</span>
                  <span className="block text-xs text-gray-500">Profissional responsável pelo PAE municipal (Resolução FNDE 06/2020)</span>
                </span>
              </label>
            </div>
            <div className="border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-2">
              <button onClick={() => setModalNutricionista(false)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold">Cancelar</button>
              <button onClick={salvarNutricionista} disabled={salvando} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-700 disabled:opacity-50">
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalNovoCardapio && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-3xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center z-10">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">Novo cardápio semanal</h2>
              <button onClick={() => setModalNovoCardapio(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Escola (deixe em branco para cardápio municipal)</label>
                  <select value={novoCardapio.escola_id || ''} onChange={(e) => setNovoCardapio({ ...novoCardapio, escola_id: e.target.value || null })} className={`${inputCls} w-full`}>
                    <option value="">Cardápio padrão municipal</option>
                    {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Faixa etária *</label>
                  <select value={novoCardapio.faixa_etaria} onChange={(e) => setNovoCardapio({ ...novoCardapio, faixa_etaria: e.target.value })} className={`${inputCls} w-full`}>
                    {FAIXAS.map((f) => <option key={f} value={f}>{FAIXA_LABEL[f]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Início da semana *</label>
                  <input type="date" value={novoCardapio.semana_inicio} onChange={(e) => setNovoCardapio({ ...novoCardapio, semana_inicio: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Fim da semana *</label>
                  <input type="date" value={novoCardapio.semana_fim} onChange={(e) => setNovoCardapio({ ...novoCardapio, semana_fim: e.target.value })} className={`${inputCls} w-full`} />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Observações</label>
                <textarea value={novoCardapio.observacoes} onChange={(e) => setNovoCardapio({ ...novoCardapio, observacoes: e.target.value })} rows={2} className={`${inputCls} w-full`} />
              </div>

              <div className="bg-gray-50 dark:bg-slate-700/30 rounded-lg p-4">
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">Adicionar refeição</h3>
                <div className="grid sm:grid-cols-4 gap-2 mb-2">
                  <select value={novaRefeicao.dia_semana} onChange={(e) => setNovaRefeicao({ ...novaRefeicao, dia_semana: parseInt(e.target.value, 10) })} className={inputCls}>
                    {[1, 2, 3, 4, 5, 6, 7].map((d) => <option key={d} value={d}>{DIAS[d]}</option>)}
                  </select>
                  <select value={novaRefeicao.tipo} onChange={(e) => setNovaRefeicao({ ...novaRefeicao, tipo: e.target.value })} className={inputCls}>
                    {TIPOS_REFEICAO.map((t) => <option key={t} value={t}>{TIPO_REFEICAO_LABEL[t]}</option>)}
                  </select>
                  <input type="number" placeholder="Kcal" value={novaRefeicao.kcal} onChange={(e) => setNovaRefeicao({ ...novaRefeicao, kcal: e.target.value })} className={inputCls} />
                  <button type="button" onClick={adicionarRefeicao} className="px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-700">
                    Adicionar
                  </button>
                </div>
                <input type="text" placeholder="Descrição da refeição (ex: Arroz, feijão, frango, salada)" value={novaRefeicao.descricao} onChange={(e) => setNovaRefeicao({ ...novaRefeicao, descricao: e.target.value })} className={`${inputCls} w-full`} />
              </div>

              {novoCardapio.refeicoes.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">Refeições do cardápio ({novoCardapio.refeicoes.length})</h3>
                  <div className="space-y-1">
                    {novoCardapio.refeicoes.map((ref, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600 text-sm">
                        <span className="font-mono text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">{DIAS[ref.dia_semana].slice(0, 3)}</span>
                        <span className="text-xs text-gray-500">{TIPO_REFEICAO_LABEL[ref.tipo]}</span>
                        <span className="flex-1 text-gray-700 dark:text-gray-300">{ref.descricao}</span>
                        {ref.kcal && <span className="text-xs text-gray-400">{ref.kcal} kcal</span>}
                        <button onClick={() => removerRefeicao(i)} className="text-red-500 hover:text-red-700">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={novoCardapio.publicar}
                  onChange={(e) => setNovoCardapio({ ...novoCardapio, publicar: e.target.checked })}
                  className="rounded text-green-600 focus:ring-green-500"
                />
                <span className="text-gray-700 dark:text-gray-200">Publicar imediatamente (ficará disponível para escolas e responsáveis)</span>
              </label>
            </div>

            <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-2">
              <button onClick={() => setModalNovoCardapio(false)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold">Cancelar</button>
              <button
                onClick={salvarCardapio}
                disabled={salvando}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-700 disabled:opacity-50"
              >
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar cardápio
              </button>
            </div>
          </div>
        </div>
      )}

      {modalAtendimento && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg">
            <div className="border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">Registrar atendimento diário</h2>
              <button onClick={() => setModalAtendimento(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Escola *</label>
                <select value={atendimento.escola_id} onChange={(e) => setAtendimento({ ...atendimento, escola_id: e.target.value })} className={`${inputCls} w-full`}>
                  <option value="">Selecione</option>
                  {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Data *</label>
                  <input type="date" value={atendimento.data_atendimento} onChange={(e) => setAtendimento({ ...atendimento, data_atendimento: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Faixa etária *</label>
                  <select value={atendimento.faixa_etaria} onChange={(e) => setAtendimento({ ...atendimento, faixa_etaria: e.target.value })} className={`${inputCls} w-full`}>
                    {FAIXAS.map((f) => <option key={f} value={f}>{FAIXA_LABEL[f]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Refeição *</label>
                  <select value={atendimento.tipo_refeicao} onChange={(e) => setAtendimento({ ...atendimento, tipo_refeicao: e.target.value })} className={`${inputCls} w-full`}>
                    {TIPOS_REFEICAO.map((t) => <option key={t} value={t}>{TIPO_REFEICAO_LABEL[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Qtd alunos PNAE *</label>
                  <input type="number" min={0} value={atendimento.qtd_alunos} onChange={(e) => setAtendimento({ ...atendimento, qtd_alunos: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Qtd extra (visitantes)</label>
                  <input type="number" min={0} value={atendimento.qtd_extra} onChange={(e) => setAtendimento({ ...atendimento, qtd_extra: e.target.value })} className={`${inputCls} w-full`} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Observações</label>
                <textarea value={atendimento.observacoes} onChange={(e) => setAtendimento({ ...atendimento, observacoes: e.target.value })} rows={2} className={`${inputCls} w-full`} />
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-2">
              <button onClick={() => setModalAtendimento(false)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold">Cancelar</button>
              <button
                onClick={salvarAtendimento}
                disabled={salvando}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-700 disabled:opacity-50"
              >
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Registrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PnaeAdminPage() {
  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola']}>
      <PnaeAdmin />
    </ProtectedRoute>
  )
}
