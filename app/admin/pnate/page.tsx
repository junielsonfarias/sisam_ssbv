'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Bus,
  Plus,
  X,
  Loader2,
  Save,
  AlertCircle,
  Users,
  Route,
  CheckCircle,
  Calendar,
  MapPin,
  Car,
  CreditCard,
  Search,
  UserPlus,
} from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface Escola {
  id: string
  nome: string
}

interface Veiculo {
  id: string
  placa: string
  tipo: string
  marca: string | null
  modelo: string | null
  ano_fabricacao: number | null
  capacidade: number
  vinculo: string
  empresa_terceirizada: string | null
  vistoria_validade: string | null
  acessivel_pcd: boolean
}

interface Motorista {
  id: string
  nome: string
  cpf: string
  cnh_numero: string
  cnh_categoria: string
  cnh_validade: string
  curso_escolar_validade: string | null
  telefone: string | null
  vinculo: string
}

interface RotaResumo {
  id: string
  codigo: string
  descricao: string
  escolas_ids: string[]
  turno: string | null
  distancia_km: number | null
  hora_inicio: string | null
  hora_fim: string | null
  veiculo_placa: string | null
  motorista_nome: string | null
  qtd_alunos: string
}

interface Alerta {
  id: string
  placa?: string
  nome?: string
  cnh_numero?: string
  vistoria_validade?: string
  cnh_validade?: string
  curso_escolar_validade?: string | null
  status_vistoria?: string
  alerta?: string
}

const TIPOS_VEICULO = [
  { v: 'onibus', label: 'Ônibus' },
  { v: 'micro_onibus', label: 'Micro-ônibus' },
  { v: 'van', label: 'Van' },
  { v: 'kombi', label: 'Kombi' },
  { v: 'lancha', label: 'Lancha' },
  { v: 'barco', label: 'Barco' },
  { v: 'outro', label: 'Outro' },
]

const TURNOS = ['matutino', 'vespertino', 'noturno', 'integral']

const veiculoVazio = {
  placa: '',
  tipo: 'onibus',
  marca: '',
  modelo: '',
  ano_fabricacao: '',
  capacidade: '40',
  combustivel: '',
  vinculo: 'proprio',
  empresa_terceirizada: '',
  vistoria_data: '',
  vistoria_validade: '',
  acessivel_pcd: false,
  observacoes: '',
}

const motoristaVazio = {
  nome: '',
  cpf: '',
  cnh_numero: '',
  cnh_categoria: 'D',
  cnh_validade: '',
  curso_escolar_validade: '',
  telefone: '',
  vinculo: 'concursado',
}

const rotaVazia = {
  codigo: '',
  descricao: '',
  escolas_ids: [] as string[],
  veiculo_id: '',
  motorista_id: '',
  turno: '',
  distancia_km: '',
  hora_inicio: '',
  hora_fim: '',
  paradas: [] as { ordem: number; endereco: string; ponto_referencia: string; hora_estimada: string }[],
}

function PnateAdmin() {
  const toast = useToast()
  const [aba, setAba] = useState<'rotas' | 'veiculos' | 'motoristas' | 'alertas'>('rotas')
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [motoristas, setMotoristas] = useState<Motorista[]>([])
  const [rotas, setRotas] = useState<RotaResumo[]>([])
  const [alertaVeiculos, setAlertaVeiculos] = useState<Alerta[]>([])
  const [alertaMotoristas, setAlertaMotoristas] = useState<Alerta[]>([])
  const [carregando, setCarregando] = useState(false)

  const [filtroEscola, setFiltroEscola] = useState('')

  const [modalVeiculo, setModalVeiculo] = useState(false)
  const [modalMotorista, setModalMotorista] = useState(false)
  const [modalRota, setModalRota] = useState(false)
  const [modalVincular, setModalVincular] = useState<RotaResumo | null>(null)
  const [salvando, setSalvando] = useState(false)

  // Vincular aluno à rota
  const [buscaAlunoVinc, setBuscaAlunoVinc] = useState('')
  const [alunosResultVinc, setAlunosResultVinc] = useState<{ id: string; nome: string; codigo?: string | null; serie?: string | null }[]>([])
  const [buscandoAlunoVinc, setBuscandoAlunoVinc] = useState(false)
  const [alunoVincSelecionado, setAlunoVincSelecionado] = useState<{ id: string; nome: string } | null>(null)
  const [tipoUso, setTipoUso] = useState<'ida' | 'volta' | 'ida_volta'>('ida_volta')
  const [vigenciaInicio, setVigenciaInicio] = useState(new Date().toISOString().slice(0, 10))

  const [novoVeiculo, setNovoVeiculo] = useState(veiculoVazio)
  const [novoMotorista, setNovoMotorista] = useState(motoristaVazio)
  const [novaRota, setNovaRota] = useState(rotaVazia)
  const [novaParada, setNovaParada] = useState({ endereco: '', ponto_referencia: '', hora_estimada: '' })

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      if (aba === 'rotas') {
        const p = new URLSearchParams({ recurso: 'rotas' })
        if (filtroEscola) p.set('escola', filtroEscola)
        const res = await fetch(`/api/admin/pnate?${p}`)
        const data = await res.json()
        setRotas(data.rotas || [])
      } else if (aba === 'veiculos') {
        const res = await fetch('/api/admin/pnate?recurso=veiculos')
        const data = await res.json()
        setVeiculos(data.veiculos || [])
      } else if (aba === 'motoristas') {
        const res = await fetch('/api/admin/pnate?recurso=motoristas')
        const data = await res.json()
        setMotoristas(data.motoristas || [])
      } else if (aba === 'alertas') {
        const res = await fetch('/api/admin/pnate?recurso=alertas')
        const data = await res.json()
        setAlertaVeiculos(data.veiculos || [])
        setAlertaMotoristas(data.motoristas || [])
      }
    } catch {
      toast.error('Erro ao carregar dados')
    } finally {
      setCarregando(false)
    }
  }, [aba, filtroEscola, toast])

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/admin/escolas', { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => setEscolas(Array.isArray(data) ? data : []))
      .catch((e) => { if ((e as Error).name !== 'AbortError') console.error('[PNATE] escolas', e) })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    carregar()
    // também pré-carrega veículos+motoristas pra montar selects da rota
    if (veiculos.length === 0) {
      fetch('/api/admin/pnate?recurso=veiculos', { signal: controller.signal })
        .then((r) => r.json())
        .then((d) => setVeiculos(d.veiculos || []))
        .catch((e) => { if ((e as Error).name !== 'AbortError') console.error('[PNATE] veiculos', e) })
    }
    if (motoristas.length === 0) {
      fetch('/api/admin/pnate?recurso=motoristas', { signal: controller.signal })
        .then((r) => r.json())
        .then((d) => setMotoristas(d.motoristas || []))
        .catch((e) => { if ((e as Error).name !== 'AbortError') console.error('[PNATE] motoristas', e) })
    }
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregar])

  // Debounce busca de aluno para vincular à rota
  useEffect(() => {
    if (alunoVincSelecionado) return
    if (buscaAlunoVinc.trim().length < 2) {
      setAlunosResultVinc([])
      return
    }
    const controller = new AbortController()
    const t = setTimeout(async () => {
      setBuscandoAlunoVinc(true)
      try {
        const res = await fetch(
          `/api/admin/alunos?busca=${encodeURIComponent(buscaAlunoVinc.trim())}&limite=15`,
          { signal: controller.signal }
        )
        const data = await res.json()
        const lista = Array.isArray(data) ? data : data.alunos || []
        setAlunosResultVinc(lista)
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setAlunosResultVinc([])
      } finally {
        setBuscandoAlunoVinc(false)
      }
    }, 350)
    return () => { clearTimeout(t); controller.abort() }
  }, [buscaAlunoVinc, alunoVincSelecionado])

  async function vincularAluno() {
    if (!modalVincular || !alunoVincSelecionado) {
      toast.error('Selecione um aluno')
      return
    }
    setSalvando(true)
    try {
      const res = await fetch('/api/admin/pnate?acao=vincular_aluno', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aluno_id: alunoVincSelecionado.id,
          rota_id: modalVincular.id,
          tipo_uso: tipoUso,
          vigencia_inicio: vigenciaInicio,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success(`${alunoVincSelecionado.nome} vinculado(a) à rota ${modalVincular.codigo}`)
      setModalVincular(null)
      setAlunoVincSelecionado(null)
      setBuscaAlunoVinc('')
      setTipoUso('ida_volta')
      carregar()
    } catch (e) { toast.error((e as Error).message) } finally { setSalvando(false) }
  }

  async function salvarVeiculo() {
    if (!novoVeiculo.placa.trim() || !novoVeiculo.capacidade) {
      toast.error('Placa e capacidade são obrigatórios')
      return
    }
    setSalvando(true)
    try {
      const body: Record<string, unknown> = {
        placa: novoVeiculo.placa.trim().toUpperCase(),
        tipo: novoVeiculo.tipo,
        capacidade: parseInt(novoVeiculo.capacidade, 10),
        vinculo: novoVeiculo.vinculo,
        acessivel_pcd: novoVeiculo.acessivel_pcd,
      }
      if (novoVeiculo.marca) body.marca = novoVeiculo.marca
      if (novoVeiculo.modelo) body.modelo = novoVeiculo.modelo
      if (novoVeiculo.ano_fabricacao) body.ano_fabricacao = parseInt(novoVeiculo.ano_fabricacao, 10)
      if (novoVeiculo.combustivel) body.combustivel = novoVeiculo.combustivel
      if (novoVeiculo.empresa_terceirizada) body.empresa_terceirizada = novoVeiculo.empresa_terceirizada
      if (novoVeiculo.vistoria_data) body.vistoria_data = novoVeiculo.vistoria_data
      if (novoVeiculo.vistoria_validade) body.vistoria_validade = novoVeiculo.vistoria_validade
      if (novoVeiculo.observacoes) body.observacoes = novoVeiculo.observacoes

      const res = await fetch('/api/admin/pnate?acao=veiculo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success('Veículo cadastrado')
      setModalVeiculo(false)
      setNovoVeiculo(veiculoVazio)
      carregar()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  async function salvarMotorista() {
    if (!novoMotorista.nome.trim() || !novoMotorista.cpf || !novoMotorista.cnh_numero || !novoMotorista.cnh_validade) {
      toast.error('Nome, CPF, CNH e validade são obrigatórios')
      return
    }
    setSalvando(true)
    try {
      const body: Record<string, unknown> = {
        nome: novoMotorista.nome.trim(),
        cpf: novoMotorista.cpf.replace(/\D/g, ''),
        cnh_numero: novoMotorista.cnh_numero,
        cnh_categoria: novoMotorista.cnh_categoria,
        cnh_validade: novoMotorista.cnh_validade,
        vinculo: novoMotorista.vinculo,
      }
      if (novoMotorista.curso_escolar_validade) body.curso_escolar_validade = novoMotorista.curso_escolar_validade
      if (novoMotorista.telefone) body.telefone = novoMotorista.telefone

      const res = await fetch('/api/admin/pnate?acao=motorista', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success('Motorista cadastrado')
      setModalMotorista(false)
      setNovoMotorista(motoristaVazio)
      carregar()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  function adicionarParada() {
    if (!novaParada.endereco.trim()) {
      toast.error('Informe o endereço da parada')
      return
    }
    setNovaRota({
      ...novaRota,
      paradas: [...novaRota.paradas, {
        ordem: novaRota.paradas.length + 1,
        endereco: novaParada.endereco.trim(),
        ponto_referencia: novaParada.ponto_referencia.trim(),
        hora_estimada: novaParada.hora_estimada,
      }],
    })
    setNovaParada({ endereco: '', ponto_referencia: '', hora_estimada: '' })
  }

  async function salvarRota() {
    if (!novaRota.codigo.trim() || !novaRota.descricao.trim() || novaRota.escolas_ids.length === 0) {
      toast.error('Código, descrição e ao menos uma escola são obrigatórios')
      return
    }
    setSalvando(true)
    try {
      const body: Record<string, unknown> = {
        codigo: novaRota.codigo.trim(),
        descricao: novaRota.descricao.trim(),
        escolas_ids: novaRota.escolas_ids,
        paradas: novaRota.paradas.map((p) => ({
          ordem: p.ordem,
          endereco: p.endereco,
          ponto_referencia: p.ponto_referencia || undefined,
          hora_estimada: p.hora_estimada || undefined,
        })),
      }
      if (novaRota.veiculo_id) body.veiculo_id = novaRota.veiculo_id
      if (novaRota.motorista_id) body.motorista_id = novaRota.motorista_id
      if (novaRota.turno) body.turno = novaRota.turno
      if (novaRota.distancia_km) body.distancia_km = parseFloat(novaRota.distancia_km)
      if (novaRota.hora_inicio) body.hora_inicio = novaRota.hora_inicio
      if (novaRota.hora_fim) body.hora_fim = novaRota.hora_fim

      const res = await fetch('/api/admin/pnate?acao=rota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success('Rota criada')
      setModalRota(false)
      setNovaRota(rotaVazia)
      carregar()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  function toggleArr<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]
  }

  const inputCls = 'px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-cyan-500 outline-none'

  const totalAlertas = alertaVeiculos.length + alertaMotoristas.length

  return (
    <div>
      <div className="bg-gradient-to-r from-cyan-600 to-sky-600 rounded-2xl p-6 mb-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Bus className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">PNATE — Transporte Escolar</h1>
              <p className="text-cyan-100 text-sm">Programa Nacional de Apoio ao Transporte do Escolar</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setModalVeiculo(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-bold">
              <Plus className="w-4 h-4" /> Veículo
            </button>
            <button onClick={() => setModalMotorista(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-bold">
              <Plus className="w-4 h-4" /> Motorista
            </button>
            <button onClick={() => setModalRota(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white text-cyan-700 text-sm font-bold hover:bg-cyan-50">
              <Plus className="w-4 h-4" /> Rota
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-slate-700 overflow-x-auto">
        {[
          { k: 'rotas', label: 'Rotas', icon: Route },
          { k: 'veiculos', label: 'Veículos', icon: Car },
          { k: 'motoristas', label: 'Motoristas', icon: CreditCard },
          { k: 'alertas', label: `Alertas ${totalAlertas > 0 ? `(${totalAlertas})` : ''}`, icon: AlertCircle },
        ].map((tab) => (
          <button
            key={tab.k}
            onClick={() => setAba(tab.k as any)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${
              aba === tab.k
                ? 'border-cyan-600 text-cyan-700 dark:text-cyan-300'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {aba === 'rotas' && (
        <>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 mb-6">
            <select value={filtroEscola} onChange={(e) => setFiltroEscola(e.target.value)} className={inputCls}>
              <option value="">Todas as escolas</option>
              {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>

          {carregando ? <LoadingSpinner centered /> : rotas.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
              <Route className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhuma rota cadastrada</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rotas.map((r) => (
                <div key={r.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-xs text-cyan-600 font-mono font-bold">{r.codigo}</p>
                      <p className="font-bold text-gray-800 dark:text-gray-200">{r.descricao}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-cyan-100 text-cyan-700">
                      <Users className="w-3 h-3 inline mr-1" />{r.qtd_alunos}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    {r.veiculo_placa && <p>🚐 Veículo: <strong>{r.veiculo_placa}</strong></p>}
                    {r.motorista_nome && <p>👤 Motorista: <strong>{r.motorista_nome}</strong></p>}
                    {r.turno && <p>🕐 Turno: <strong className="capitalize">{r.turno}</strong></p>}
                    {r.distancia_km && <p>📏 {r.distancia_km} km</p>}
                    {(r.hora_inicio || r.hora_fim) && <p>⏰ {r.hora_inicio || '?'} → {r.hora_fim || '?'}</p>}
                    <p>🏫 Atende {r.escolas_ids?.length || 0} escola(s)</p>
                  </div>
                  <button
                    onClick={() => {
                      setModalVincular(r)
                      setAlunoVincSelecionado(null)
                      setBuscaAlunoVinc('')
                      setAlunosResultVinc([])
                      setTipoUso('ida_volta')
                      setVigenciaInicio(new Date().toISOString().slice(0, 10))
                    }}
                    className="mt-3 flex items-center justify-center gap-1 w-full px-3 py-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 text-xs font-bold hover:bg-cyan-200"
                  >
                    <UserPlus className="w-3 h-3" /> Vincular aluno
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {aba === 'veiculos' && (
        carregando ? <LoadingSpinner centered /> : veiculos.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
            <Car className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum veículo cadastrado</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700/30">
                <tr>
                  <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Placa</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Tipo</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Marca/Modelo</th>
                  <th className="text-right py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Capacidade</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Vínculo</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Vistoria</th>
                </tr>
              </thead>
              <tbody>
                {veiculos.map((v) => {
                  const vistoriaVencida = v.vistoria_validade && new Date(v.vistoria_validade) < new Date()
                  return (
                    <tr key={v.id} className="border-b border-gray-100 dark:border-slate-700/50">
                      <td className="py-2 px-4 font-mono font-bold text-gray-800 dark:text-gray-200">{v.placa}</td>
                      <td className="py-2 px-4 text-gray-700 dark:text-gray-300 capitalize">{v.tipo.replace('_', '-')}</td>
                      <td className="py-2 px-4 text-gray-500">{[v.marca, v.modelo, v.ano_fabricacao].filter(Boolean).join(' ') || '—'}</td>
                      <td className="py-2 px-4 text-right text-gray-700 dark:text-gray-300">{v.capacidade}</td>
                      <td className="py-2 px-4 text-xs text-gray-500 capitalize">{v.vinculo}</td>
                      <td className="py-2 px-4 text-xs">
                        {v.vistoria_validade ? (
                          <span className={vistoriaVencida ? 'text-red-600 font-bold' : 'text-gray-500'}>
                            {new Date(v.vistoria_validade).toLocaleDateString('pt-BR')}
                            {vistoriaVencida && ' ⚠'}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {aba === 'motoristas' && (
        carregando ? <LoadingSpinner centered /> : motoristas.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
            <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum motorista cadastrado</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700/30">
                <tr>
                  <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Nome</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">CNH</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Cat.</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Validade CNH</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Curso esc.</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Telefone</th>
                </tr>
              </thead>
              <tbody>
                {motoristas.map((m) => {
                  const cnhVencida = new Date(m.cnh_validade) < new Date()
                  const cursoVencido = m.curso_escolar_validade && new Date(m.curso_escolar_validade) < new Date()
                  return (
                    <tr key={m.id} className="border-b border-gray-100 dark:border-slate-700/50">
                      <td className="py-2 px-4 font-semibold text-gray-800 dark:text-gray-200">{m.nome}</td>
                      <td className="py-2 px-4 font-mono text-xs text-gray-500">{m.cnh_numero}</td>
                      <td className="py-2 px-4 text-gray-700 dark:text-gray-300">{m.cnh_categoria}</td>
                      <td className={`py-2 px-4 text-xs ${cnhVencida ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                        {new Date(m.cnh_validade).toLocaleDateString('pt-BR')}{cnhVencida && ' ⚠'}
                      </td>
                      <td className={`py-2 px-4 text-xs ${cursoVencido ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                        {m.curso_escolar_validade ? new Date(m.curso_escolar_validade).toLocaleDateString('pt-BR') : '—'}
                        {cursoVencido && ' ⚠'}
                      </td>
                      <td className="py-2 px-4 text-xs text-gray-500">{m.telefone || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {aba === 'alertas' && (
        carregando ? <LoadingSpinner centered /> : totalAlertas === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="text-gray-700 dark:text-gray-300 text-sm font-semibold">Tudo regularizado</p>
            <p className="text-gray-500 dark:text-gray-400 text-xs">Nenhuma vistoria ou CNH vencendo nos próximos 60 dias</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                <Car className="w-4 h-4 text-red-600" /> Veículos ({alertaVeiculos.length})
              </h3>
              {alertaVeiculos.length === 0 ? <p className="text-xs text-gray-400">Tudo OK</p> : (
                <div className="space-y-2">
                  {alertaVeiculos.map((v) => (
                    <div key={v.id} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div>
                        <p className="text-sm font-mono font-bold text-gray-800 dark:text-gray-200">{v.placa}</p>
                        <p className="text-xs text-gray-500">Vistoria: {v.vistoria_validade && new Date(v.vistoria_validade).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">{v.status_vistoria?.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-red-600" /> Motoristas ({alertaMotoristas.length})
              </h3>
              {alertaMotoristas.length === 0 ? <p className="text-xs text-gray-400">Tudo OK</p> : (
                <div className="space-y-2">
                  {alertaMotoristas.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{m.nome}</p>
                        <p className="text-xs text-gray-500">CNH: {m.cnh_validade && new Date(m.cnh_validade).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">{m.alerta?.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      )}

      {modalVeiculo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">Novo veículo</h2>
              <button onClick={() => setModalVeiculo(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Placa *</label>
                  <input type="text" value={novoVeiculo.placa} onChange={(e) => setNovoVeiculo({ ...novoVeiculo, placa: e.target.value.toUpperCase() })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Tipo *</label>
                  <select value={novoVeiculo.tipo} onChange={(e) => setNovoVeiculo({ ...novoVeiculo, tipo: e.target.value })} className={`${inputCls} w-full`}>
                    {TIPOS_VEICULO.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Marca</label>
                  <input type="text" value={novoVeiculo.marca} onChange={(e) => setNovoVeiculo({ ...novoVeiculo, marca: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Modelo</label>
                  <input type="text" value={novoVeiculo.modelo} onChange={(e) => setNovoVeiculo({ ...novoVeiculo, modelo: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Ano fabricação</label>
                  <input type="number" min={1980} value={novoVeiculo.ano_fabricacao} onChange={(e) => setNovoVeiculo({ ...novoVeiculo, ano_fabricacao: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Capacidade *</label>
                  <input type="number" min={1} value={novoVeiculo.capacidade} onChange={(e) => setNovoVeiculo({ ...novoVeiculo, capacidade: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Vínculo</label>
                  <select value={novoVeiculo.vinculo} onChange={(e) => setNovoVeiculo({ ...novoVeiculo, vinculo: e.target.value })} className={`${inputCls} w-full`}>
                    <option value="proprio">Próprio</option>
                    <option value="terceirizado">Terceirizado</option>
                    <option value="conveniado">Conveniado</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Combustível</label>
                  <input type="text" value={novoVeiculo.combustivel} onChange={(e) => setNovoVeiculo({ ...novoVeiculo, combustivel: e.target.value })} placeholder="Diesel, Gasolina..." className={`${inputCls} w-full`} />
                </div>
                {novoVeiculo.vinculo === 'terceirizado' && (
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Empresa terceirizada</label>
                    <input type="text" value={novoVeiculo.empresa_terceirizada} onChange={(e) => setNovoVeiculo({ ...novoVeiculo, empresa_terceirizada: e.target.value })} className={`${inputCls} w-full`} />
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Vistoria — data</label>
                  <input type="date" value={novoVeiculo.vistoria_data} onChange={(e) => setNovoVeiculo({ ...novoVeiculo, vistoria_data: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Vistoria — validade</label>
                  <input type="date" value={novoVeiculo.vistoria_validade} onChange={(e) => setNovoVeiculo({ ...novoVeiculo, vistoria_validade: e.target.value })} className={`${inputCls} w-full`} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={novoVeiculo.acessivel_pcd} onChange={(e) => setNovoVeiculo({ ...novoVeiculo, acessivel_pcd: e.target.checked })} className="rounded text-cyan-600 focus:ring-cyan-500" />
                <span className="text-gray-700 dark:text-gray-200">Acessível para PCD</span>
              </label>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Observações</label>
                <textarea value={novoVeiculo.observacoes} onChange={(e) => setNovoVeiculo({ ...novoVeiculo, observacoes: e.target.value })} rows={2} className={`${inputCls} w-full`} />
              </div>
            </div>
            <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-2">
              <button onClick={() => setModalVeiculo(false)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold">Cancelar</button>
              <button onClick={salvarVeiculo} disabled={salvando} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-bold hover:bg-cyan-700 disabled:opacity-50">
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalMotorista && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">Novo motorista</h2>
              <button onClick={() => setModalMotorista(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Nome completo *</label>
                  <input type="text" value={novoMotorista.nome} onChange={(e) => setNovoMotorista({ ...novoMotorista, nome: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">CPF *</label>
                  <input type="text" value={novoMotorista.cpf} onChange={(e) => setNovoMotorista({ ...novoMotorista, cpf: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Telefone</label>
                  <input type="text" value={novoMotorista.telefone} onChange={(e) => setNovoMotorista({ ...novoMotorista, telefone: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">CNH número *</label>
                  <input type="text" value={novoMotorista.cnh_numero} onChange={(e) => setNovoMotorista({ ...novoMotorista, cnh_numero: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Categoria *</label>
                  <select value={novoMotorista.cnh_categoria} onChange={(e) => setNovoMotorista({ ...novoMotorista, cnh_categoria: e.target.value })} className={`${inputCls} w-full`}>
                    {['B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">CNH validade *</label>
                  <input type="date" value={novoMotorista.cnh_validade} onChange={(e) => setNovoMotorista({ ...novoMotorista, cnh_validade: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Curso transp. escolar (validade)</label>
                  <input type="date" value={novoMotorista.curso_escolar_validade} onChange={(e) => setNovoMotorista({ ...novoMotorista, curso_escolar_validade: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Vínculo</label>
                  <select value={novoMotorista.vinculo} onChange={(e) => setNovoMotorista({ ...novoMotorista, vinculo: e.target.value })} className={`${inputCls} w-full`}>
                    <option value="concursado">Concursado</option>
                    <option value="contrato">Contrato</option>
                    <option value="terceirizado">Terceirizado</option>
                    <option value="rpa">RPA</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-2">
              <button onClick={() => setModalMotorista(false)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold">Cancelar</button>
              <button onClick={salvarMotorista} disabled={salvando} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-bold hover:bg-cyan-700 disabled:opacity-50">
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalVincular && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">Vincular aluno à rota</h2>
                <p className="text-xs text-gray-500">{modalVincular.codigo} — {modalVincular.descricao}</p>
              </div>
              <button onClick={() => setModalVincular(null)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Aluno *</label>
                {alunoVincSelecionado ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800">
                    <p className="flex-1 min-w-0 text-sm font-bold text-cyan-700 dark:text-cyan-300 truncate">{alunoVincSelecionado.nome}</p>
                    <button type="button" onClick={() => { setAlunoVincSelecionado(null); setBuscaAlunoVinc('') }} className="p-1 rounded text-cyan-600 hover:bg-cyan-100">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={buscaAlunoVinc}
                      onChange={(e) => setBuscaAlunoVinc(e.target.value)}
                      placeholder="Nome ou matrícula do aluno..."
                      className={`${inputCls} w-full pl-9`}
                      autoComplete="off"
                    />
                    {(buscandoAlunoVinc || alunosResultVinc.length > 0) && (
                      <div className="mt-2 border border-gray-200 dark:border-slate-700 rounded-lg max-h-48 overflow-y-auto bg-white dark:bg-slate-800">
                        {buscandoAlunoVinc && alunosResultVinc.length === 0 && (
                          <p className="text-xs text-gray-400 p-3 flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Buscando...</p>
                        )}
                        {alunosResultVinc.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => { setAlunoVincSelecionado(a); setBuscaAlunoVinc(''); setAlunosResultVinc([]) }}
                            className="w-full text-left px-3 py-2 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 text-sm border-b border-gray-100 dark:border-slate-700 last:border-0"
                          >
                            <p className="font-semibold text-gray-800 dark:text-gray-200">{a.nome}</p>
                            <p className="text-xs text-gray-400">{a.codigo || ''} {a.serie && `• ${a.serie}`}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Tipo de uso *</label>
                  <select value={tipoUso} onChange={(e) => setTipoUso(e.target.value as 'ida' | 'volta' | 'ida_volta')} className={`${inputCls} w-full`}>
                    <option value="ida_volta">Ida e volta</option>
                    <option value="ida">Apenas ida</option>
                    <option value="volta">Apenas volta</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Vigência a partir de</label>
                  <input type="date" value={vigenciaInicio} onChange={(e) => setVigenciaInicio(e.target.value)} className={`${inputCls} w-full`} />
                </div>
              </div>

              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Se aluno já estava vinculado à mesma rota, dados são atualizados
              </p>
            </div>
            <div className="border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-2">
              <button onClick={() => setModalVincular(null)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold">Cancelar</button>
              <button onClick={vincularAluno} disabled={salvando} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-bold hover:bg-cyan-700 disabled:opacity-50">
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Vincular
              </button>
            </div>
          </div>
        </div>
      )}

      {modalRota && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-3xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">Nova rota de transporte</h2>
              <button onClick={() => setModalRota(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Código *</label>
                  <input type="text" value={novaRota.codigo} onChange={(e) => setNovaRota({ ...novaRota, codigo: e.target.value })} placeholder="Ex: R-001" className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Turno</label>
                  <select value={novaRota.turno} onChange={(e) => setNovaRota({ ...novaRota, turno: e.target.value })} className={`${inputCls} w-full`}>
                    <option value="">—</option>
                    {TURNOS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Descrição *</label>
                  <input type="text" value={novaRota.descricao} onChange={(e) => setNovaRota({ ...novaRota, descricao: e.target.value })} placeholder="Ex: Linha Norte - Comunidades rurais" className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Veículo</label>
                  <select value={novaRota.veiculo_id} onChange={(e) => setNovaRota({ ...novaRota, veiculo_id: e.target.value })} className={`${inputCls} w-full`}>
                    <option value="">—</option>
                    {veiculos.map((v) => <option key={v.id} value={v.id}>{v.placa} ({v.capacidade} lugares)</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Motorista</label>
                  <select value={novaRota.motorista_id} onChange={(e) => setNovaRota({ ...novaRota, motorista_id: e.target.value })} className={`${inputCls} w-full`}>
                    <option value="">—</option>
                    {motoristas.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Distância (km)</label>
                  <input type="number" step={0.1} min={0} value={novaRota.distancia_km} onChange={(e) => setNovaRota({ ...novaRota, distancia_km: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Hora início</label>
                  <input type="time" value={novaRota.hora_inicio} onChange={(e) => setNovaRota({ ...novaRota, hora_inicio: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Hora fim</label>
                  <input type="time" value={novaRota.hora_fim} onChange={(e) => setNovaRota({ ...novaRota, hora_fim: e.target.value })} className={`${inputCls} w-full`} />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block">Escolas atendidas *</label>
                <div className="grid sm:grid-cols-2 gap-1 max-h-40 overflow-y-auto p-2 bg-gray-50 dark:bg-slate-700/30 rounded-lg">
                  {escolas.map((e) => (
                    <label key={e.id} className="flex items-center gap-2 text-xs cursor-pointer p-1 rounded hover:bg-white dark:hover:bg-slate-700">
                      <input
                        type="checkbox"
                        checked={novaRota.escolas_ids.includes(e.id)}
                        onChange={() => setNovaRota({ ...novaRota, escolas_ids: toggleArr(novaRota.escolas_ids, e.id) })}
                        className="rounded text-cyan-600 focus:ring-cyan-500"
                      />
                      <span className="text-gray-700 dark:text-gray-200 truncate">{e.nome}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-slate-700/30 rounded-lg p-4">
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2"><MapPin className="w-4 h-4" /> Paradas</h3>
                <div className="grid sm:grid-cols-3 gap-2 mb-2">
                  <input type="text" placeholder="Endereço *" value={novaParada.endereco} onChange={(e) => setNovaParada({ ...novaParada, endereco: e.target.value })} className={`${inputCls} sm:col-span-2`} />
                  <input type="time" value={novaParada.hora_estimada} onChange={(e) => setNovaParada({ ...novaParada, hora_estimada: e.target.value })} className={inputCls} />
                  <input type="text" placeholder="Ponto de referência" value={novaParada.ponto_referencia} onChange={(e) => setNovaParada({ ...novaParada, ponto_referencia: e.target.value })} className={`${inputCls} sm:col-span-2`} />
                  <button type="button" onClick={adicionarParada} className="px-3 py-2 rounded-lg bg-cyan-600 text-white text-sm font-bold hover:bg-cyan-700">Adicionar parada</button>
                </div>
                {novaRota.paradas.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {novaRota.paradas.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600 text-sm">
                        <span className="font-mono text-xs text-cyan-600">#{p.ordem}</span>
                        <span className="flex-1 text-gray-700 dark:text-gray-300">{p.endereco}</span>
                        {p.hora_estimada && <span className="text-xs text-gray-400">{p.hora_estimada}</span>}
                        <button onClick={() => setNovaRota({ ...novaRota, paradas: novaRota.paradas.filter((_, j) => j !== i).map((x, k) => ({ ...x, ordem: k + 1 })) })} className="text-red-500"><X className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-2">
              <button onClick={() => setModalRota(false)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold">Cancelar</button>
              <button onClick={salvarRota} disabled={salvando} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-bold hover:bg-cyan-700 disabled:opacity-50">
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar rota
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PnateAdminPage() {
  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
      <PnateAdmin />
    </ProtectedRoute>
  )
}
