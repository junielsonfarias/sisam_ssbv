'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Briefcase,
  Plus,
  Search,
  X,
  Loader2,
  Save,
  Users,
  GraduationCap,
  Building2,
  Eye,
  BookOpen,
  Award,
} from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface Escola {
  id: string
  nome: string
}

interface ServidorRow {
  id: string
  matricula_funcional: string | null
  nome: string
  cpf: string
  tipo_vinculo: string
  cargo: string | null
  formacao_maxima: string | null
  email: string | null
  ativo: boolean
}

interface Lotacao {
  id: string
  escola_id: string | null
  escola_nome: string | null
  funcao: string
  carga_horaria_semanal: number
  turno: string | null
  vigencia_inicio: string
  vigencia_fim: string | null
  e_principal: boolean
}

interface Formacao {
  id: string
  nome_curso: string
  carga_horaria: number
  status: string
  data_conclusao: string | null
  categoria: string | null
}

interface ServidorDetalhe extends ServidorRow {
  data_nascimento: string | null
  sexo: string | null
  rg: string | null
  pis: string | null
  telefone: string | null
  endereco: string | null
  data_admissao: string
  data_demissao: string | null
  area_formacao: string | null
  lotacoes: Lotacao[]
  formacoes: Formacao[]
}

const TIPOS_VINCULO = [
  { v: 'concursado_efetivo', label: 'Concursado efetivo' },
  { v: 'concursado_estavel', label: 'Concursado estável' },
  { v: 'contrato_temporario', label: 'Contrato temporário' },
  { v: 'comissionado', label: 'Comissionado' },
  { v: 'cedido', label: 'Cedido' },
  { v: 'terceirizado', label: 'Terceirizado' },
  { v: 'estagiario', label: 'Estagiário' },
  { v: 'rpa', label: 'RPA' },
]

const FORMACAO_OPCOES = [
  { v: 'fundamental_incompleto', label: 'Fundamental incompleto' },
  { v: 'fundamental_completo', label: 'Fundamental completo' },
  { v: 'medio_incompleto', label: 'Médio incompleto' },
  { v: 'medio_completo', label: 'Médio completo' },
  { v: 'medio_normal_magisterio', label: 'Médio Normal / Magistério' },
  { v: 'superior_incompleto', label: 'Superior incompleto' },
  { v: 'superior_completo_licenciatura', label: 'Superior — Licenciatura' },
  { v: 'superior_completo_bacharelado', label: 'Superior — Bacharelado' },
  { v: 'especializacao', label: 'Especialização' },
  { v: 'mestrado', label: 'Mestrado' },
  { v: 'doutorado', label: 'Doutorado' },
]

const VINCULO_LABEL = (v: string) => TIPOS_VINCULO.find((t) => t.v === v)?.label || v
const FORMACAO_LABEL = (v: string | null) => v ? (FORMACAO_OPCOES.find((t) => t.v === v)?.label || v) : '—'

const VINCULO_BADGE: Record<string, string> = {
  concursado_efetivo: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  concursado_estavel: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  contrato_temporario: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  comissionado: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  cedido: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  terceirizado: 'bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-300',
  estagiario: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  rpa: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
}

const servidorVazio = {
  matricula_funcional: '',
  cpf: '',
  nome: '',
  data_nascimento: '',
  sexo: '' as '' | 'M' | 'F',
  rg: '',
  pis: '',
  email: '',
  telefone: '',
  endereco: '',
  tipo_vinculo: 'concursado_efetivo',
  data_admissao: '',
  cargo: '',
  formacao_maxima: '',
  area_formacao: '',
}

function RhAdmin() {
  const toast = useToast()
  const [servidores, setServidores] = useState<ServidorRow[]>([])
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroVinculo, setFiltroVinculo] = useState('')
  const [filtroEscola, setFiltroEscola] = useState('')

  const [modalServidor, setModalServidor] = useState(false)
  const [modalDetalhe, setModalDetalhe] = useState(false)
  const [modalLotacao, setModalLotacao] = useState(false)
  const [modalFormacao, setModalFormacao] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [detalhe, setDetalhe] = useState<ServidorDetalhe | null>(null)
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false)

  const [novoServidor, setNovoServidor] = useState(servidorVazio)
  const [novaLotacao, setNovaLotacao] = useState({
    escola_id: '' as string,
    funcao: '',
    carga_horaria_semanal: '20',
    turno: '' as string,
    vigencia_inicio: new Date().toISOString().slice(0, 10),
    vigencia_fim: '',
    e_principal: true,
    observacoes: '',
  })
  const [novaFormacao, setNovaFormacao] = useState({
    nome_curso: '',
    instituicao: '',
    modalidade: '' as string,
    carga_horaria: '',
    data_inicio: '',
    data_conclusao: '',
    status: 'concluido' as string,
    certificado_url: '',
    categoria: '',
    observacoes: '',
  })

  const carregar = useCallback(async (signal?: AbortSignal) => {
    try {
      setCarregando(true)
      const params = new URLSearchParams({ recurso: 'servidores', limite: '200' })
      if (busca.trim().length > 2) params.set('busca', busca.trim())
      if (filtroVinculo) params.set('vinculo', filtroVinculo)
      if (filtroEscola) params.set('escola', filtroEscola)
      const res = await fetch(`/api/admin/rh?${params}`, { signal })
      const data = await res.json()
      setServidores(data.servidores || [])
    } catch (error) {
      if ((error as Error).name === 'AbortError') return
      toast.error('Erro ao carregar servidores')
    } finally {
      setCarregando(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, filtroVinculo, filtroEscola])

  useEffect(() => {
    fetch('/api/admin/escolas')
      .then((r) => r.json())
      .then((data) => setEscolas(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const t = setTimeout(() => carregar(controller.signal), 300)
    return () => {
      clearTimeout(t)
      controller.abort()
    }
  }, [carregar])

  const abrirDetalheAbortRef = useRef<AbortController | null>(null)

  async function abrirDetalhe(id: string) {
    abrirDetalheAbortRef.current?.abort()
    const controller = new AbortController()
    abrirDetalheAbortRef.current = controller

    setModalDetalhe(true)
    setCarregandoDetalhe(true)
    setDetalhe(null)
    try {
      const res = await fetch(`/api/admin/rh?recurso=servidor&id=${id}`, { signal: controller.signal })
      const data = await res.json()
      setDetalhe(data.servidor)
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast.error('Erro ao carregar detalhe')
    } finally {
      if (abrirDetalheAbortRef.current === controller) setCarregandoDetalhe(false)
    }
  }

  async function salvarServidor() {
    if (!novoServidor.cpf.trim() || !novoServidor.nome.trim() || !novoServidor.data_admissao) {
      toast.error('CPF, nome e data de admissão são obrigatórios')
      return
    }
    setSalvando(true)
    try {
      const body: Record<string, unknown> = {
        cpf: novoServidor.cpf.replace(/\D/g, ''),
        nome: novoServidor.nome.trim(),
        tipo_vinculo: novoServidor.tipo_vinculo,
        data_admissao: novoServidor.data_admissao,
      }
      if (novoServidor.matricula_funcional) body.matricula_funcional = novoServidor.matricula_funcional
      if (novoServidor.data_nascimento) body.data_nascimento = novoServidor.data_nascimento
      if (novoServidor.sexo) body.sexo = novoServidor.sexo
      if (novoServidor.rg) body.rg = novoServidor.rg
      if (novoServidor.pis) body.pis = novoServidor.pis.replace(/\D/g, '')
      if (novoServidor.email) body.email = novoServidor.email
      if (novoServidor.telefone) body.telefone = novoServidor.telefone
      if (novoServidor.endereco) body.endereco = novoServidor.endereco
      if (novoServidor.cargo) body.cargo = novoServidor.cargo
      if (novoServidor.formacao_maxima) body.formacao_maxima = novoServidor.formacao_maxima
      if (novoServidor.area_formacao) body.area_formacao = novoServidor.area_formacao

      const res = await fetch('/api/admin/rh?acao=servidor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success('Servidor cadastrado')
      setModalServidor(false)
      setNovoServidor(servidorVazio)
      carregar()
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  async function salvarLotacao() {
    if (!detalhe) return
    if (!novaLotacao.funcao.trim()) {
      toast.error('Informe a função')
      return
    }
    setSalvando(true)
    try {
      const body: Record<string, unknown> = {
        servidor_id: detalhe.id,
        escola_id: novaLotacao.escola_id || null,
        funcao: novaLotacao.funcao.trim(),
        carga_horaria_semanal: parseInt(novaLotacao.carga_horaria_semanal, 10),
        vigencia_inicio: novaLotacao.vigencia_inicio,
        e_principal: novaLotacao.e_principal,
      }
      if (novaLotacao.turno) body.turno = novaLotacao.turno
      if (novaLotacao.vigencia_fim) body.vigencia_fim = novaLotacao.vigencia_fim
      if (novaLotacao.observacoes) body.observacoes = novaLotacao.observacoes

      const res = await fetch('/api/admin/rh?acao=lotacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success('Lotação registrada')
      setModalLotacao(false)
      setNovaLotacao({
        escola_id: '', funcao: '', carga_horaria_semanal: '20', turno: '',
        vigencia_inicio: new Date().toISOString().slice(0, 10),
        vigencia_fim: '', e_principal: true, observacoes: '',
      })
      abrirDetalhe(detalhe.id)
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  async function salvarFormacao() {
    if (!detalhe) return
    if (!novaFormacao.nome_curso.trim() || !novaFormacao.carga_horaria) {
      toast.error('Nome do curso e carga horária são obrigatórios')
      return
    }
    setSalvando(true)
    try {
      const body: Record<string, unknown> = {
        servidor_id: detalhe.id,
        nome_curso: novaFormacao.nome_curso.trim(),
        carga_horaria: parseInt(novaFormacao.carga_horaria, 10),
        status: novaFormacao.status,
      }
      if (novaFormacao.instituicao) body.instituicao = novaFormacao.instituicao
      if (novaFormacao.modalidade) body.modalidade = novaFormacao.modalidade
      if (novaFormacao.data_inicio) body.data_inicio = novaFormacao.data_inicio
      if (novaFormacao.data_conclusao) body.data_conclusao = novaFormacao.data_conclusao
      if (novaFormacao.certificado_url) body.certificado_url = novaFormacao.certificado_url
      if (novaFormacao.categoria) body.categoria = novaFormacao.categoria
      if (novaFormacao.observacoes) body.observacoes = novaFormacao.observacoes

      const res = await fetch('/api/admin/rh?acao=formacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success('Formação registrada')
      setModalFormacao(false)
      setNovaFormacao({
        nome_curso: '', instituicao: '', modalidade: '', carga_horaria: '',
        data_inicio: '', data_conclusao: '', status: 'concluido',
        certificado_url: '', categoria: '', observacoes: '',
      })
      abrirDetalhe(detalhe.id)
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  const inputCls = 'px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none'

  const total = servidores.length
  const efetivos = servidores.filter((s) => s.tipo_vinculo === 'concursado_efetivo' || s.tipo_vinculo === 'concursado_estavel').length
  const temporarios = servidores.filter((s) => s.tipo_vinculo === 'contrato_temporario').length
  const superior = servidores.filter((s) => s.formacao_maxima && ['superior_completo_licenciatura', 'superior_completo_bacharelado', 'especializacao', 'mestrado', 'doutorado'].includes(s.formacao_maxima)).length

  return (
    <div>
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 mb-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Briefcase className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">RH Escolar</h1>
              <p className="text-blue-100 text-sm">Servidores, lotações e formação continuada</p>
            </div>
          </div>
          <button
            onClick={() => { setNovoServidor(servidorVazio); setModalServidor(true) }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-bold transition-colors"
          >
            <Plus className="w-4 h-4" /> Novo servidor
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 text-center">
          <Users className="w-5 h-5 text-blue-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{total}</p>
          <p className="text-xs text-blue-600">Servidores ativos</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4 text-center">
          <Award className="w-5 h-5 text-green-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">{efetivos}</p>
          <p className="text-xs text-green-600">Efetivos</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/30 rounded-xl p-4 text-center">
          <Briefcase className="w-5 h-5 text-amber-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{temporarios}</p>
          <p className="text-xs text-amber-600">Temporários</p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-4 text-center">
          <GraduationCap className="w-5 h-5 text-purple-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{superior}</p>
          <p className="text-xs text-purple-600">Com Ensino Superior</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, CPF ou matrícula (mín. 3 caracteres)..."
              className={`${inputCls} w-full pl-9`}
            />
          </div>
          <select value={filtroVinculo} onChange={(e) => setFiltroVinculo(e.target.value)} className={inputCls}>
            <option value="">Todos os vínculos</option>
            {TIPOS_VINCULO.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
          </select>
          <select value={filtroEscola} onChange={(e) => setFiltroEscola(e.target.value)} className={inputCls}>
            <option value="">Todas as escolas</option>
            {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </div>
      </div>

      {carregando ? (
        <LoadingSpinner centered />
      ) : servidores.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
          <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum servidor encontrado com os filtros atuais</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700/30">
                <tr>
                  <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Matrícula</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Nome</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Vínculo</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Cargo</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Formação</th>
                  <th className="text-right py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Ações</th>
                </tr>
              </thead>
              <tbody>
                {servidores.map((s) => (
                  <tr key={s.id} className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    <td className="py-3 px-4 font-mono text-xs text-gray-500">{s.matricula_funcional || '—'}</td>
                    <td className="py-3 px-4 font-semibold text-gray-800 dark:text-gray-200">{s.nome}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${VINCULO_BADGE[s.tipo_vinculo] || 'bg-slate-100 text-slate-700'}`}>
                        {VINCULO_LABEL(s.tipo_vinculo)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{s.cargo || '—'}</td>
                    <td className="py-3 px-4 text-xs text-gray-500">{FORMACAO_LABEL(s.formacao_maxima)}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => abrirDetalhe(s.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold hover:bg-blue-200 ml-auto"
                      >
                        <Eye className="w-3 h-3" /> Detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-gray-100 dark:divide-slate-700">
            {servidores.map((s) => (
              <div key={s.id} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 dark:text-gray-200 truncate">{s.nome}</p>
                    {s.matricula_funcional && <p className="text-xs text-gray-500 font-mono">#{s.matricula_funcional}</p>}
                  </div>
                  <button onClick={() => abrirDetalhe(s.id)} className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700">
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1 text-xs">
                  <span className={`px-2 py-0.5 rounded-full font-bold ${VINCULO_BADGE[s.tipo_vinculo] || 'bg-slate-100'}`}>{VINCULO_LABEL(s.tipo_vinculo)}</span>
                  {s.cargo && <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300">{s.cargo}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {modalServidor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-3xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center z-10">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">Novo servidor</h2>
              <button onClick={() => setModalServidor(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Matrícula funcional</label>
                  <input type="text" value={novoServidor.matricula_funcional} onChange={(e) => setNovoServidor({ ...novoServidor, matricula_funcional: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">CPF *</label>
                  <input type="text" value={novoServidor.cpf} onChange={(e) => setNovoServidor({ ...novoServidor, cpf: e.target.value })} placeholder="Apenas números" className={`${inputCls} w-full`} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Nome completo *</label>
                  <input type="text" value={novoServidor.nome} onChange={(e) => setNovoServidor({ ...novoServidor, nome: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Data de nascimento</label>
                  <input type="date" value={novoServidor.data_nascimento} onChange={(e) => setNovoServidor({ ...novoServidor, data_nascimento: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Sexo</label>
                  <select value={novoServidor.sexo} onChange={(e) => setNovoServidor({ ...novoServidor, sexo: e.target.value as any })} className={`${inputCls} w-full`}>
                    <option value="">—</option>
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">RG</label>
                  <input type="text" value={novoServidor.rg} onChange={(e) => setNovoServidor({ ...novoServidor, rg: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">PIS</label>
                  <input type="text" value={novoServidor.pis} onChange={(e) => setNovoServidor({ ...novoServidor, pis: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">E-mail</label>
                  <input type="email" value={novoServidor.email} onChange={(e) => setNovoServidor({ ...novoServidor, email: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Telefone</label>
                  <input type="text" value={novoServidor.telefone} onChange={(e) => setNovoServidor({ ...novoServidor, telefone: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Endereço</label>
                  <input type="text" value={novoServidor.endereco} onChange={(e) => setNovoServidor({ ...novoServidor, endereco: e.target.value })} className={`${inputCls} w-full`} />
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-slate-700/30 rounded-lg p-4 grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Tipo de vínculo *</label>
                  <select value={novoServidor.tipo_vinculo} onChange={(e) => setNovoServidor({ ...novoServidor, tipo_vinculo: e.target.value })} className={`${inputCls} w-full`}>
                    {TIPOS_VINCULO.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Data de admissão *</label>
                  <input type="date" value={novoServidor.data_admissao} onChange={(e) => setNovoServidor({ ...novoServidor, data_admissao: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Cargo</label>
                  <input type="text" value={novoServidor.cargo} onChange={(e) => setNovoServidor({ ...novoServidor, cargo: e.target.value })} placeholder="Ex: Professor Anos Iniciais" className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Formação máxima</label>
                  <select value={novoServidor.formacao_maxima} onChange={(e) => setNovoServidor({ ...novoServidor, formacao_maxima: e.target.value })} className={`${inputCls} w-full`}>
                    <option value="">—</option>
                    {FORMACAO_OPCOES.map((f) => <option key={f.v} value={f.v}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Área de formação</label>
                  <input type="text" value={novoServidor.area_formacao} onChange={(e) => setNovoServidor({ ...novoServidor, area_formacao: e.target.value })} placeholder="Ex: Pedagogia" className={`${inputCls} w-full`} />
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-2">
              <button onClick={() => setModalServidor(false)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold">Cancelar</button>
              <button onClick={salvarServidor} disabled={salvando} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50">
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar servidor
              </button>
            </div>
          </div>
        </div>
      )}

      {modalDetalhe && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-4xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center z-10">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">{detalhe?.nome || 'Carregando...'}</h2>
              <button onClick={() => setModalDetalhe(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {carregandoDetalhe ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
              </div>
            ) : detalhe ? (
              <div className="p-6 space-y-6">
                <div className="grid sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Matrícula</p>
                    <p className="font-semibold text-gray-700 dark:text-gray-200 font-mono">{detalhe.matricula_funcional || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">CPF</p>
                    <p className="font-mono text-gray-700 dark:text-gray-200">{detalhe.cpf}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Vínculo</p>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${VINCULO_BADGE[detalhe.tipo_vinculo]}`}>{VINCULO_LABEL(detalhe.tipo_vinculo)}</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Admissão</p>
                    <p className="text-gray-700 dark:text-gray-200">{new Date(detalhe.data_admissao).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Cargo</p>
                    <p className="text-gray-700 dark:text-gray-200">{detalhe.cargo || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Formação máxima</p>
                    <p className="text-gray-700 dark:text-gray-200">{FORMACAO_LABEL(detalhe.formacao_maxima)}</p>
                  </div>
                  {detalhe.email && (
                    <div className="sm:col-span-2">
                      <p className="text-xs text-gray-500">E-mail</p>
                      <p className="text-gray-700 dark:text-gray-200 break-all">{detalhe.email}</p>
                    </div>
                  )}
                  {detalhe.telefone && (
                    <div>
                      <p className="text-xs text-gray-500">Telefone</p>
                      <p className="text-gray-700 dark:text-gray-200">{detalhe.telefone}</p>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      <Building2 className="w-4 h-4" /> Lotações ({detalhe.lotacoes?.length || 0})
                    </h3>
                    <button
                      onClick={() => setModalLotacao(true)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
                    >
                      <Plus className="w-3 h-3" /> Nova lotação
                    </button>
                  </div>
                  {detalhe.lotacoes?.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">Nenhuma lotação registrada</p>
                  ) : (
                    <div className="space-y-2">
                      {detalhe.lotacoes.map((l) => (
                        <div key={l.id} className="bg-gray-50 dark:bg-slate-700/30 rounded-lg p-3 text-sm">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-800 dark:text-gray-200">{l.funcao}</span>
                            {l.e_principal && <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">Principal</span>}
                            {!l.vigencia_fim && <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">Vigente</span>}
                          </div>
                          <p className="text-xs text-gray-500">
                            {l.escola_nome || 'SEMED (sede)'} • {l.carga_horaria_semanal}h semanais
                            {l.turno && ` • ${l.turno}`}
                          </p>
                          <p className="text-xs text-gray-400">
                            Início: {new Date(l.vigencia_inicio).toLocaleDateString('pt-BR')}
                            {l.vigencia_fim && ` • Fim: ${new Date(l.vigencia_fim).toLocaleDateString('pt-BR')}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" /> Formação continuada ({detalhe.formacoes?.length || 0})
                    </h3>
                    <button
                      onClick={() => setModalFormacao(true)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
                    >
                      <Plus className="w-3 h-3" /> Nova formação
                    </button>
                  </div>
                  {detalhe.formacoes?.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">Nenhuma formação registrada</p>
                  ) : (
                    <div className="space-y-2">
                      {detalhe.formacoes.map((f) => (
                        <div key={f.id} className="bg-gray-50 dark:bg-slate-700/30 rounded-lg p-3 text-sm">
                          <p className="font-semibold text-gray-800 dark:text-gray-200">{f.nome_curso}</p>
                          <div className="flex gap-3 text-xs text-gray-500 mt-1 flex-wrap">
                            <span>{f.carga_horaria}h</span>
                            <span className="capitalize">{f.status.replace('_', ' ')}</span>
                            {f.categoria && <span>• {f.categoria}</span>}
                            {f.data_conclusao && <span>• Concluído em {new Date(f.data_conclusao).toLocaleDateString('pt-BR')}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {modalLotacao && detalhe && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">Nova lotação — {detalhe.nome}</h2>
              <button onClick={() => setModalLotacao(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Escola (deixe em branco para SEMED)</label>
                <select value={novaLotacao.escola_id} onChange={(e) => setNovaLotacao({ ...novaLotacao, escola_id: e.target.value })} className={`${inputCls} w-full`}>
                  <option value="">SEMED (sede)</option>
                  {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Função *</label>
                <input type="text" value={novaLotacao.funcao} onChange={(e) => setNovaLotacao({ ...novaLotacao, funcao: e.target.value })} placeholder="Ex: Diretor, Professor, Merendeira" className={`${inputCls} w-full`} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Carga horária semanal *</label>
                  <input type="number" min={1} max={60} value={novaLotacao.carga_horaria_semanal} onChange={(e) => setNovaLotacao({ ...novaLotacao, carga_horaria_semanal: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Turno</label>
                  <select value={novaLotacao.turno} onChange={(e) => setNovaLotacao({ ...novaLotacao, turno: e.target.value })} className={`${inputCls} w-full`}>
                    <option value="">—</option>
                    <option value="matutino">Matutino</option>
                    <option value="vespertino">Vespertino</option>
                    <option value="noturno">Noturno</option>
                    <option value="integral">Integral</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Vigência início *</label>
                  <input type="date" value={novaLotacao.vigencia_inicio} onChange={(e) => setNovaLotacao({ ...novaLotacao, vigencia_inicio: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Vigência fim</label>
                  <input type="date" value={novaLotacao.vigencia_fim} onChange={(e) => setNovaLotacao({ ...novaLotacao, vigencia_fim: e.target.value })} className={`${inputCls} w-full`} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={novaLotacao.e_principal} onChange={(e) => setNovaLotacao({ ...novaLotacao, e_principal: e.target.checked })} className="rounded text-blue-600 focus:ring-blue-500" />
                <span className="text-gray-700 dark:text-gray-200">É lotação principal (desativa outras principais vigentes)</span>
              </label>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Observações</label>
                <textarea value={novaLotacao.observacoes} onChange={(e) => setNovaLotacao({ ...novaLotacao, observacoes: e.target.value })} rows={2} className={`${inputCls} w-full`} />
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-2">
              <button onClick={() => setModalLotacao(false)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold">Cancelar</button>
              <button onClick={salvarLotacao} disabled={salvando} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50">
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalFormacao && detalhe && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">Nova formação — {detalhe.nome}</h2>
              <button onClick={() => setModalFormacao(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Nome do curso *</label>
                <input type="text" value={novaFormacao.nome_curso} onChange={(e) => setNovaFormacao({ ...novaFormacao, nome_curso: e.target.value })} className={`${inputCls} w-full`} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Instituição</label>
                  <input type="text" value={novaFormacao.instituicao} onChange={(e) => setNovaFormacao({ ...novaFormacao, instituicao: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Modalidade</label>
                  <select value={novaFormacao.modalidade} onChange={(e) => setNovaFormacao({ ...novaFormacao, modalidade: e.target.value })} className={`${inputCls} w-full`}>
                    <option value="">—</option>
                    <option value="presencial">Presencial</option>
                    <option value="ead">EAD</option>
                    <option value="hibrida">Híbrida</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Carga horária (h) *</label>
                  <input type="number" min={1} value={novaFormacao.carga_horaria} onChange={(e) => setNovaFormacao({ ...novaFormacao, carga_horaria: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Status</label>
                  <select value={novaFormacao.status} onChange={(e) => setNovaFormacao({ ...novaFormacao, status: e.target.value })} className={`${inputCls} w-full`}>
                    <option value="inscrito">Inscrito</option>
                    <option value="em_andamento">Em andamento</option>
                    <option value="concluido">Concluído</option>
                    <option value="desistente">Desistente</option>
                    <option value="reprovado">Reprovado</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Data início</label>
                  <input type="date" value={novaFormacao.data_inicio} onChange={(e) => setNovaFormacao({ ...novaFormacao, data_inicio: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Data conclusão</label>
                  <input type="date" value={novaFormacao.data_conclusao} onChange={(e) => setNovaFormacao({ ...novaFormacao, data_conclusao: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Categoria</label>
                  <input type="text" value={novaFormacao.categoria} onChange={(e) => setNovaFormacao({ ...novaFormacao, categoria: e.target.value })} placeholder="bncc, alfabetizacao, inclusao..." className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">URL do certificado</label>
                  <input type="url" value={novaFormacao.certificado_url} onChange={(e) => setNovaFormacao({ ...novaFormacao, certificado_url: e.target.value })} className={`${inputCls} w-full`} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Observações</label>
                <textarea value={novaFormacao.observacoes} onChange={(e) => setNovaFormacao({ ...novaFormacao, observacoes: e.target.value })} rows={2} className={`${inputCls} w-full`} />
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-2">
              <button onClick={() => setModalFormacao(false)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold">Cancelar</button>
              <button onClick={salvarFormacao} disabled={salvando} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50">
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function RhAdminPage() {
  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
      <RhAdmin />
    </ProtectedRoute>
  )
}
