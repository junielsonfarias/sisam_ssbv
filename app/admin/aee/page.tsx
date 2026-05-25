'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Accessibility,
  Plus,
  Search,
  Edit,
  FileText,
  X,
  Loader2,
  CheckCircle,
  Users,
  AlertCircle,
  GraduationCap,
  Save,
  Calendar,
  Clock,
} from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface AlunoAeeRow {
  aluno_id: string
  aluno_nome: string
  serie: string | null
  tipos_deficiencia: string[]
  laudo_medico: boolean
  necessita_cuidador: boolean
  turma_codigo: string | null
  escola_nome: string | null
}

interface AlunoBusca {
  id: string
  nome: string
  codigo: string | null
  serie: string | null
  escola_nome?: string | null
  turma_codigo?: string | null
}

interface Escola {
  id: string
  nome: string
}

interface CadastroAee {
  aluno_id: string
  tipos_deficiencia: string[]
  cid_codigos: string[]
  laudo_medico: boolean
  laudo_data: string
  laudo_arquivo_url: string
  laudo_emitido_por: string
  observacoes: string
  necessita_cuidador: boolean
  necessita_interprete: boolean
  recursos_especiais: string[]
  frequencia_aee: string
}

interface Atendimento {
  id: string
  data_atendimento: string
  duracao_minutos: number
  presente: boolean
  atividades_realizadas: string | null
  observacoes: string | null
}

interface PlanoAee {
  aluno_id: string
  ano_letivo: string
  objetivos: string
  estrategias: string
  recursos_necessarios: string
  areas_foco: string[]
  periodicidade_horas_semanais: string
  avaliacao_progresso: string
  status: 'rascunho' | 'ativo' | 'concluido' | 'cancelado'
  data_inicio: string
  data_revisao: string
  data_fim: string
}

const TIPOS_DEFICIENCIA = [
  { v: 'fisica', label: 'Deficiência Física' },
  { v: 'auditiva', label: 'Deficiência Auditiva / Surdez' },
  { v: 'visual', label: 'Deficiência Visual / Cegueira' },
  { v: 'intelectual', label: 'Deficiência Intelectual' },
  { v: 'multipla', label: 'Deficiência Múltipla' },
  { v: 'tea', label: 'TEA (Espectro Autista)' },
  { v: 'altas_habilidades', label: 'Altas Habilidades / Superdotação' },
  { v: 'surdocegueira', label: 'Surdocegueira' },
  { v: 'transtorno_global_desenvolvimento', label: 'Transtorno Global Desenvolvimento' },
]

const RECURSOS_DISPONIVEIS = [
  'libras', 'braile', 'cadeira_rodas', 'audiodescricao',
  'computador_adaptado', 'material_ampliado', 'caderno_pautado',
  'softwares_acessibilidade', 'comunicacao_alternativa',
]

const RECURSO_LABEL: Record<string, string> = {
  libras: 'LIBRAS',
  braile: 'Braile',
  cadeira_rodas: 'Cadeira de rodas',
  audiodescricao: 'Audiodescrição',
  computador_adaptado: 'Computador adaptado',
  material_ampliado: 'Material ampliado',
  caderno_pautado: 'Caderno pautado',
  softwares_acessibilidade: 'Softwares de acessibilidade',
  comunicacao_alternativa: 'Comunicação alternativa',
}

const STATUS_PLANO_LABEL: Record<string, string> = {
  rascunho: 'Rascunho',
  ativo: 'Ativo',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

const STATUS_PLANO_BADGE: Record<string, string> = {
  rascunho: 'bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-300',
  ativo: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  concluido: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  cancelado: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

const TIPO_LABEL = (t: string) => TIPOS_DEFICIENCIA.find((d) => d.v === t)?.label || t

const cadastroVazio: CadastroAee = {
  aluno_id: '',
  tipos_deficiencia: [],
  cid_codigos: [],
  laudo_medico: false,
  laudo_data: '',
  laudo_arquivo_url: '',
  laudo_emitido_por: '',
  observacoes: '',
  necessita_cuidador: false,
  necessita_interprete: false,
  recursos_especiais: [],
  frequencia_aee: '',
}

const planoVazio = (alunoId: string, ano: string): PlanoAee => ({
  aluno_id: alunoId,
  ano_letivo: ano,
  objetivos: '',
  estrategias: '',
  recursos_necessarios: '',
  areas_foco: [],
  periodicidade_horas_semanais: '',
  avaliacao_progresso: '',
  status: 'ativo',
  data_inicio: new Date().toISOString().slice(0, 10),
  data_revisao: '',
  data_fim: '',
})

function AeeAdmin() {
  const toast = useToast()
  const [alunos, setAlunos] = useState<AlunoAeeRow[]>([])
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [carregando, setCarregando] = useState(true)
  const [filtroEscola, setFiltroEscola] = useState('')
  const [busca, setBusca] = useState('')

  const [modalCadastro, setModalCadastro] = useState(false)
  const [modalPlano, setModalPlano] = useState(false)
  const [alunoSelecionado, setAlunoSelecionado] = useState<AlunoAeeRow | AlunoBusca | null>(null)
  const [cadastro, setCadastro] = useState<CadastroAee>(cadastroVazio)
  const [plano, setPlano] = useState<PlanoAee | null>(null)
  const [anoPlano, setAnoPlano] = useState(String(new Date().getFullYear()))
  const [salvando, setSalvando] = useState(false)
  const [carregandoCadastro, setCarregandoCadastro] = useState(false)
  const [carregandoPlano, setCarregandoPlano] = useState(false)

  const [buscaAluno, setBuscaAluno] = useState('')
  const [resultadosBusca, setResultadosBusca] = useState<AlunoBusca[]>([])
  const [buscandoAluno, setBuscandoAluno] = useState(false)
  const [cidInput, setCidInput] = useState('')
  const [areaFocoInput, setAreaFocoInput] = useState('')

  // Atendimentos do plano AEE
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([])
  const [carregandoAtend, setCarregandoAtend] = useState(false)
  const [planoIdAtual, setPlanoIdAtual] = useState<string | null>(null)
  const [novoAtend, setNovoAtend] = useState({
    data_atendimento: new Date().toISOString().slice(0, 10),
    duracao_minutos: '50',
    presente: true,
    atividades_realizadas: '',
    observacoes: '',
  })
  const [salvandoAtend, setSalvandoAtend] = useState(false)

  const carregar = useCallback(async (signal?: AbortSignal) => {
    try {
      setCarregando(true)
      const params = new URLSearchParams()
      if (filtroEscola) params.set('escola', filtroEscola)
      const [aeeRes, escolasRes] = await Promise.all([
        fetch(`/api/admin/aee/alunos?${params}`, { signal }),
        fetch('/api/admin/escolas', { signal }),
      ])
      const aeeData = await aeeRes.json()
      const escolasData = await escolasRes.json()
      setAlunos(aeeData.alunos || [])
      setEscolas(Array.isArray(escolasData) ? escolasData : [])
    } catch (error) {
      if ((error as Error).name === 'AbortError') return
      toast.error('Erro ao carregar dados AEE')
    } finally {
      setCarregando(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroEscola])

  useEffect(() => {
    const controller = new AbortController()
    carregar(controller.signal)
    return () => controller.abort()
  }, [carregar])

  useEffect(() => {
    if (buscaAluno.trim().length < 2) {
      setResultadosBusca([])
      return
    }
    const t = setTimeout(async () => {
      setBuscandoAluno(true)
      try {
        const res = await fetch(`/api/admin/alunos?busca=${encodeURIComponent(buscaAluno)}&limite=20`)
        const data = await res.json()
        setResultadosBusca(Array.isArray(data.alunos) ? data.alunos : data.alunos || [])
      } catch {
        setResultadosBusca([])
      } finally {
        setBuscandoAluno(false)
      }
    }, 350)
    return () => clearTimeout(t)
  }, [buscaAluno])

  async function abrirCadastro(aluno: AlunoAeeRow | AlunoBusca, isNew: boolean) {
    const alunoId = 'aluno_id' in aluno ? aluno.aluno_id : aluno.id
    setAlunoSelecionado(aluno)
    setCadastro({ ...cadastroVazio, aluno_id: alunoId })
    setModalCadastro(true)
    if (!isNew) {
      setCarregandoCadastro(true)
      try {
        const res = await fetch(`/api/admin/aee/alunos?aluno=${alunoId}`)
        const data = await res.json()
        if (data.aluno_aee) {
          setCadastro({
            aluno_id: data.aluno_aee.aluno_id,
            tipos_deficiencia: data.aluno_aee.tipos_deficiencia || [],
            cid_codigos: data.aluno_aee.cid_codigos || [],
            laudo_medico: !!data.aluno_aee.laudo_medico,
            laudo_data: data.aluno_aee.laudo_data ? String(data.aluno_aee.laudo_data).slice(0, 10) : '',
            laudo_arquivo_url: data.aluno_aee.laudo_arquivo_url || '',
            laudo_emitido_por: data.aluno_aee.laudo_emitido_por || '',
            observacoes: data.aluno_aee.observacoes || '',
            necessita_cuidador: !!data.aluno_aee.necessita_cuidador,
            necessita_interprete: !!data.aluno_aee.necessita_interprete,
            recursos_especiais: data.aluno_aee.recursos_especiais || [],
            frequencia_aee: data.aluno_aee.frequencia_aee || '',
          })
        }
      } catch {
        toast.error('Erro ao carregar cadastro AEE')
      } finally {
        setCarregandoCadastro(false)
      }
    }
  }

  async function salvarCadastro() {
    if (cadastro.tipos_deficiencia.length === 0) {
      toast.error('Selecione ao menos um tipo de deficiência')
      return
    }
    setSalvando(true)
    try {
      const body = {
        ...cadastro,
        laudo_data: cadastro.laudo_data || null,
        laudo_arquivo_url: cadastro.laudo_arquivo_url || null,
        laudo_emitido_por: cadastro.laudo_emitido_por || null,
        observacoes: cadastro.observacoes || null,
        frequencia_aee: cadastro.frequencia_aee || null,
      }
      const res = await fetch('/api/admin/aee/alunos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success('Cadastro AEE salvo')
      setModalCadastro(false)
      carregar()
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  async function abrirPlano(aluno: AlunoAeeRow) {
    setAlunoSelecionado(aluno)
    setModalPlano(true)
    setPlano(planoVazio(aluno.aluno_id, anoPlano))
    setPlanoIdAtual(null)
    setAtendimentos([])
    setCarregandoPlano(true)
    try {
      const res = await fetch(`/api/admin/aee/planos?aluno=${aluno.aluno_id}&ano=${anoPlano}`)
      const data = await res.json()
      if (data.plano) {
        setPlanoIdAtual(data.plano.id)
        setPlano({
          aluno_id: data.plano.aluno_id,
          ano_letivo: data.plano.ano_letivo,
          objetivos: data.plano.objetivos || '',
          estrategias: data.plano.estrategias || '',
          recursos_necessarios: data.plano.recursos_necessarios || '',
          areas_foco: data.plano.areas_foco || [],
          periodicidade_horas_semanais: data.plano.periodicidade_horas_semanais?.toString() || '',
          avaliacao_progresso: data.plano.avaliacao_progresso || '',
          status: data.plano.status || 'ativo',
          data_inicio: data.plano.data_inicio ? String(data.plano.data_inicio).slice(0, 10) : new Date().toISOString().slice(0, 10),
          data_revisao: data.plano.data_revisao ? String(data.plano.data_revisao).slice(0, 10) : '',
          data_fim: data.plano.data_fim ? String(data.plano.data_fim).slice(0, 10) : '',
        })
        // Carrega atendimentos do aluno no ano
        carregarAtendimentos(aluno.aluno_id, anoPlano)
      }
    } catch {
      toast.error('Erro ao carregar plano')
    } finally {
      setCarregandoPlano(false)
    }
  }

  async function carregarAtendimentos(alunoId: string, ano: string) {
    setCarregandoAtend(true)
    try {
      const res = await fetch(`/api/admin/aee/atendimentos?aluno=${alunoId}&ano=${ano}`)
      const data = await res.json()
      setAtendimentos(data.atendimentos || [])
    } catch {
      // silencioso
    } finally {
      setCarregandoAtend(false)
    }
  }

  async function registrarAtendimento() {
    if (!planoIdAtual || !plano) {
      toast.error('Salve o plano antes de registrar atendimento')
      return
    }
    if (novoAtend.atividades_realizadas.trim().length < 3) {
      toast.error('Descreva as atividades realizadas')
      return
    }
    setSalvandoAtend(true)
    try {
      const body: Record<string, unknown> = {
        plano_id: planoIdAtual,
        aluno_id: plano.aluno_id,
        data_atendimento: novoAtend.data_atendimento,
        duracao_minutos: parseInt(novoAtend.duracao_minutos, 10),
        presente: novoAtend.presente,
        atividades_realizadas: novoAtend.atividades_realizadas.trim(),
      }
      if (novoAtend.observacoes) body.observacoes = novoAtend.observacoes
      const res = await fetch('/api/admin/aee/atendimentos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success('Atendimento registrado')
      setNovoAtend({
        data_atendimento: new Date().toISOString().slice(0, 10),
        duracao_minutos: '50',
        presente: true,
        atividades_realizadas: '',
        observacoes: '',
      })
      carregarAtendimentos(plano.aluno_id, plano.ano_letivo)
    } catch (e) { toast.error((e as Error).message) } finally { setSalvandoAtend(false) }
  }

  async function salvarPlano() {
    if (!plano) return
    if (plano.objetivos.trim().length < 10 || plano.estrategias.trim().length < 10) {
      toast.error('Objetivos e estratégias precisam ter ao menos 10 caracteres')
      return
    }
    setSalvando(true)
    try {
      const body = {
        aluno_id: plano.aluno_id,
        ano_letivo: plano.ano_letivo,
        objetivos: plano.objetivos.trim(),
        estrategias: plano.estrategias.trim(),
        recursos_necessarios: plano.recursos_necessarios.trim() || null,
        areas_foco: plano.areas_foco,
        periodicidade_horas_semanais: plano.periodicidade_horas_semanais ? parseInt(plano.periodicidade_horas_semanais, 10) : null,
        avaliacao_progresso: plano.avaliacao_progresso.trim() || null,
        status: plano.status,
        data_inicio: plano.data_inicio,
        data_revisao: plano.data_revisao || null,
        data_fim: plano.data_fim || null,
      }
      const res = await fetch('/api/admin/aee/planos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      const data = await res.json()
      if (data.id) setPlanoIdAtual(data.id)
      toast.success('Plano AEE salvo')
      // Não fecha mais — permite registrar atendimentos depois de salvar
      if (plano) carregarAtendimentos(plano.aluno_id, plano.ano_letivo)
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  function toggleArray<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]
  }

  const alunosFiltrados = alunos.filter((a) =>
    !busca.trim() ||
    a.aluno_nome.toLowerCase().includes(busca.toLowerCase()) ||
    (a.escola_nome || '').toLowerCase().includes(busca.toLowerCase())
  )

  const inputCls = 'px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-purple-500 outline-none'

  return (
    <div>
      <div className="bg-gradient-to-r from-purple-600 to-fuchsia-600 rounded-2xl p-6 mb-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Accessibility className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">AEE — Atendimento Educacional Especializado</h1>
              <p className="text-purple-100 text-sm">Inclusão escolar (Lei 13.146/2015 — LBI)</p>
            </div>
          </div>
          <button
            onClick={() => {
              setAlunoSelecionado(null)
              setCadastro(cadastroVazio)
              setBuscaAluno('')
              setResultadosBusca([])
              setModalCadastro(true)
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-bold transition-colors"
          >
            <Plus className="w-4 h-4" /> Cadastrar aluno AEE
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-4 text-center">
          <Users className="w-5 h-5 text-purple-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{alunos.length}</p>
          <p className="text-xs text-purple-600">Alunos PNE</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 text-center">
          <CheckCircle className="w-5 h-5 text-blue-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{alunos.filter((a) => a.laudo_medico).length}</p>
          <p className="text-xs text-blue-600">Com laudo</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/30 rounded-xl p-4 text-center">
          <AlertCircle className="w-5 h-5 text-amber-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{alunos.filter((a) => a.necessita_cuidador).length}</p>
          <p className="text-xs text-amber-600">Com cuidador</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4 text-center">
          <GraduationCap className="w-5 h-5 text-slate-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">{new Set(alunos.map((a) => a.escola_nome)).size}</p>
          <p className="text-xs text-slate-600">Escolas atendendo</p>
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
              placeholder="Buscar por nome ou escola..."
              className={`${inputCls} w-full pl-9`}
            />
          </div>
          <select value={filtroEscola} onChange={(e) => setFiltroEscola(e.target.value)} className={inputCls}>
            <option value="">Todas as escolas</option>
            {escolas.map((e) => (
              <option key={e.id} value={e.id}>{e.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {carregando ? (
        <LoadingSpinner centered />
      ) : alunosFiltrados.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
          <Accessibility className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum aluno AEE cadastrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {alunosFiltrados.map((a) => (
            <div key={a.aluno_id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
              <p className="font-bold text-gray-800 dark:text-gray-200 text-sm mb-1">{a.aluno_nome}</p>
              <p className="text-xs text-gray-500 mb-3">
                {a.escola_nome}
                {a.turma_codigo && <span> • {a.turma_codigo}</span>}
                {a.serie && <span> • {a.serie}</span>}
              </p>

              <div className="flex flex-wrap gap-1 mb-3 min-h-[24px]">
                {(a.tipos_deficiencia || []).slice(0, 3).map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                    {TIPO_LABEL(t)}
                  </span>
                ))}
                {(a.tipos_deficiencia?.length || 0) > 3 && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700">+{a.tipos_deficiencia.length - 3}</span>
                )}
              </div>

              <div className="flex gap-2 mb-3 text-xs flex-wrap">
                {a.laudo_medico && <span className="px-2 py-0.5 rounded bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">Laudo médico</span>}
                {a.necessita_cuidador && <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Cuidador</span>}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => abrirCadastro(a, false)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-bold hover:bg-purple-200"
                >
                  <Edit className="w-3 h-3" /> Editar
                </button>
                <button
                  onClick={() => abrirPlano(a)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-fuchsia-600 text-white text-xs font-bold hover:bg-fuchsia-700"
                >
                  <FileText className="w-3 h-3" /> Plano AEE
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalCadastro && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center z-10">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                {alunoSelecionado && 'aluno_id' in alunoSelecionado
                  ? `AEE — ${(alunoSelecionado as AlunoAeeRow).aluno_nome}`
                  : 'Cadastrar aluno AEE'}
              </h2>
              <button onClick={() => setModalCadastro(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {carregandoCadastro ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto" />
              </div>
            ) : (
              <div className="p-6 space-y-4">
                {!alunoSelecionado && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Buscar aluno</label>
                    <input
                      type="text"
                      value={buscaAluno}
                      onChange={(e) => setBuscaAluno(e.target.value)}
                      placeholder="Digite nome ou código (mín. 2 caracteres)"
                      className={`${inputCls} w-full`}
                    />
                    {buscandoAluno && <p className="text-xs text-gray-400 mt-2">Buscando...</p>}
                    {resultadosBusca.length > 0 && (
                      <div className="mt-2 border border-gray-200 dark:border-slate-700 rounded-lg max-h-48 overflow-y-auto">
                        {resultadosBusca.map((r) => (
                          <button
                            key={r.id}
                            onClick={() => {
                              setAlunoSelecionado(r)
                              setCadastro({ ...cadastroVazio, aluno_id: r.id })
                              setBuscaAluno('')
                              setResultadosBusca([])
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-700 text-sm"
                          >
                            <p className="font-semibold text-gray-800 dark:text-gray-200">{r.nome}</p>
                            <p className="text-xs text-gray-400">{r.codigo} {r.serie && `• ${r.serie}`}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {alunoSelecionado && (
                  <>
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-sm">
                      <strong className="text-purple-700 dark:text-purple-300">
                        {'aluno_nome' in alunoSelecionado
                          ? (alunoSelecionado as AlunoAeeRow).aluno_nome
                          : (alunoSelecionado as AlunoBusca).nome}
                      </strong>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-2 block">Tipos de deficiência *</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {TIPOS_DEFICIENCIA.map((t) => (
                          <label key={t.v} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-slate-700/50">
                            <input
                              type="checkbox"
                              checked={cadastro.tipos_deficiencia.includes(t.v)}
                              onChange={() => setCadastro({ ...cadastro, tipos_deficiencia: toggleArray(cadastro.tipos_deficiencia, t.v) })}
                              className="rounded text-purple-600 focus:ring-purple-500"
                            />
                            {t.label}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Códigos CID-10 / CID-11</label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={cidInput}
                          onChange={(e) => setCidInput(e.target.value)}
                          placeholder="Ex: F84.0"
                          className={`${inputCls} flex-1`}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && cidInput.trim()) {
                              e.preventDefault()
                              setCadastro({ ...cadastro, cid_codigos: [...cadastro.cid_codigos, cidInput.trim()] })
                              setCidInput('')
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (cidInput.trim()) {
                              setCadastro({ ...cadastro, cid_codigos: [...cadastro.cid_codigos, cidInput.trim()] })
                              setCidInput('')
                            }
                          }}
                          className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm"
                        >
                          Adicionar
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {cadastro.cid_codigos.map((c, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 flex items-center gap-1">
                            {c}
                            <button onClick={() => setCadastro({ ...cadastro, cid_codigos: cadastro.cid_codigos.filter((_, j) => j !== i) })}>
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-slate-700/30 rounded-lg p-4 space-y-3">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={cadastro.laudo_medico}
                          onChange={(e) => setCadastro({ ...cadastro, laudo_medico: e.target.checked })}
                          className="rounded text-purple-600 focus:ring-purple-500"
                        />
                        <span className="font-semibold text-gray-700 dark:text-gray-200">Possui laudo médico</span>
                      </label>
                      {cadastro.laudo_medico && (
                        <div className="grid sm:grid-cols-2 gap-3 pl-6">
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Data do laudo</label>
                            <input type="date" value={cadastro.laudo_data} onChange={(e) => setCadastro({ ...cadastro, laudo_data: e.target.value })} className={`${inputCls} w-full`} />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Emitido por</label>
                            <input type="text" value={cadastro.laudo_emitido_por} onChange={(e) => setCadastro({ ...cadastro, laudo_emitido_por: e.target.value })} placeholder="Médico/Instituição" className={`${inputCls} w-full`} />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="text-xs text-gray-500 block mb-1">URL do arquivo do laudo</label>
                            <input type="url" value={cadastro.laudo_arquivo_url} onChange={(e) => setCadastro({ ...cadastro, laudo_arquivo_url: e.target.value })} placeholder="https://..." className={`${inputCls} w-full`} />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <label className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-slate-700/50">
                        <input
                          type="checkbox"
                          checked={cadastro.necessita_cuidador}
                          onChange={(e) => setCadastro({ ...cadastro, necessita_cuidador: e.target.checked })}
                          className="rounded text-purple-600 focus:ring-purple-500"
                        />
                        Necessita cuidador
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-slate-700/50">
                        <input
                          type="checkbox"
                          checked={cadastro.necessita_interprete}
                          onChange={(e) => setCadastro({ ...cadastro, necessita_interprete: e.target.checked })}
                          className="rounded text-purple-600 focus:ring-purple-500"
                        />
                        Necessita intérprete
                      </label>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-2 block">Recursos especiais</label>
                      <div className="flex flex-wrap gap-2">
                        {RECURSOS_DISPONIVEIS.map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setCadastro({ ...cadastro, recursos_especiais: toggleArray(cadastro.recursos_especiais, r) })}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                              cadastro.recursos_especiais.includes(r)
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                            }`}
                          >
                            {RECURSO_LABEL[r]}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Frequência do AEE</label>
                      <input
                        type="text"
                        value={cadastro.frequencia_aee}
                        onChange={(e) => setCadastro({ ...cadastro, frequencia_aee: e.target.value })}
                        placeholder="Ex: 2x por semana"
                        className={`${inputCls} w-full`}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Observações</label>
                      <textarea
                        value={cadastro.observacoes}
                        onChange={(e) => setCadastro({ ...cadastro, observacoes: e.target.value })}
                        rows={3}
                        className={`${inputCls} w-full`}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {alunoSelecionado && (
              <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-2">
                <button onClick={() => setModalCadastro(false)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold">Cancelar</button>
                <button
                  onClick={salvarCadastro}
                  disabled={salvando}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 disabled:opacity-50"
                >
                  {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {modalPlano && plano && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-3xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">Plano AEE — {(alunoSelecionado as AlunoAeeRow)?.aluno_nome}</h2>
                <p className="text-xs text-gray-500">Ano letivo {plano.ano_letivo}</p>
              </div>
              <button onClick={() => setModalPlano(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {carregandoPlano ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto" />
              </div>
            ) : (
              <div className="p-6 space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Ano letivo</label>
                    <select
                      value={plano.ano_letivo}
                      onChange={(e) => {
                        const novoAno = e.target.value
                        setAnoPlano(novoAno)
                        setPlano({ ...plano, ano_letivo: novoAno })
                        // Recarrega atendimentos do novo ano (lista pode ficar vazia se ano novo)
                        carregarAtendimentos(plano.aluno_id, novoAno)
                      }}
                      className={`${inputCls} w-full`}
                    >
                      {[2024, 2025, 2026, 2027].map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Status</label>
                    <select value={plano.status} onChange={(e) => setPlano({ ...plano, status: e.target.value as any })} className={`${inputCls} w-full`}>
                      {Object.entries(STATUS_PLANO_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${STATUS_PLANO_BADGE[plano.status]}`}>
                  {STATUS_PLANO_LABEL[plano.status]}
                </span>

                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Objetivos pedagógicos *</label>
                  <textarea
                    value={plano.objetivos}
                    onChange={(e) => setPlano({ ...plano, objetivos: e.target.value })}
                    rows={4}
                    placeholder="Descreva os objetivos pedagógicos do aluno (mín. 10 caracteres)"
                    className={`${inputCls} w-full`}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Estratégias e metodologias *</label>
                  <textarea
                    value={plano.estrategias}
                    onChange={(e) => setPlano({ ...plano, estrategias: e.target.value })}
                    rows={4}
                    placeholder="Descreva as estratégias e metodologias utilizadas"
                    className={`${inputCls} w-full`}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Recursos necessários</label>
                  <textarea
                    value={plano.recursos_necessarios}
                    onChange={(e) => setPlano({ ...plano, recursos_necessarios: e.target.value })}
                    rows={3}
                    className={`${inputCls} w-full`}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Áreas de foco</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={areaFocoInput}
                      onChange={(e) => setAreaFocoInput(e.target.value)}
                      placeholder="Ex: comunicação, autonomia, leitura"
                      className={`${inputCls} flex-1`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && areaFocoInput.trim()) {
                          e.preventDefault()
                          setPlano({ ...plano, areas_foco: [...plano.areas_foco, areaFocoInput.trim()] })
                          setAreaFocoInput('')
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (areaFocoInput.trim()) {
                          setPlano({ ...plano, areas_foco: [...plano.areas_foco, areaFocoInput.trim()] })
                          setAreaFocoInput('')
                        }
                      }}
                      className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm"
                    >
                      Adicionar
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {plano.areas_foco.map((a, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-fuchsia-100 text-fuchsia-700 flex items-center gap-1">
                        {a}
                        <button onClick={() => setPlano({ ...plano, areas_foco: plano.areas_foco.filter((_, j) => j !== i) })}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Horas semanais AEE</label>
                    <input
                      type="number"
                      min={1}
                      max={40}
                      value={plano.periodicidade_horas_semanais}
                      onChange={(e) => setPlano({ ...plano, periodicidade_horas_semanais: e.target.value })}
                      className={`${inputCls} w-full`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Data início *</label>
                    <input type="date" value={plano.data_inicio} onChange={(e) => setPlano({ ...plano, data_inicio: e.target.value })} className={`${inputCls} w-full`} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Data revisão</label>
                    <input type="date" value={plano.data_revisao} onChange={(e) => setPlano({ ...plano, data_revisao: e.target.value })} className={`${inputCls} w-full`} />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Avaliação de progresso</label>
                  <textarea
                    value={plano.avaliacao_progresso}
                    onChange={(e) => setPlano({ ...plano, avaliacao_progresso: e.target.value })}
                    rows={3}
                    placeholder="Como o aluno tem evoluído..."
                    className={`${inputCls} w-full`}
                  />
                </div>

                {/* SEÇÃO ATENDIMENTOS — só aparece após o plano ser salvo */}
                {planoIdAtual ? (
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                    <h3 className="text-sm font-bold text-purple-700 dark:text-purple-300 mb-3 flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> Sessões de atendimento ({atendimentos.length})
                    </h3>

                    {/* Form rápido para registrar nova sessão */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-3 mb-3 space-y-2">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Data</label>
                          <input type="date" value={novoAtend.data_atendimento} onChange={(e) => setNovoAtend({ ...novoAtend, data_atendimento: e.target.value })} className={`${inputCls} w-full`} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Duração (min)</label>
                          <input type="number" min={5} max={480} value={novoAtend.duracao_minutos} onChange={(e) => setNovoAtend({ ...novoAtend, duracao_minutos: e.target.value })} className={`${inputCls} w-full`} />
                        </div>
                        <label className="flex items-end gap-2 text-sm pb-2">
                          <input type="checkbox" checked={novoAtend.presente} onChange={(e) => setNovoAtend({ ...novoAtend, presente: e.target.checked })} className="rounded text-purple-600" />
                          <span className="text-gray-700 dark:text-gray-200">Aluno presente</span>
                        </label>
                        <button onClick={registrarAtendimento} disabled={salvandoAtend || novoAtend.atividades_realizadas.trim().length < 3} className="px-3 py-2 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 disabled:opacity-50 self-end">
                          {salvandoAtend ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Registrar'}
                        </button>
                      </div>
                      <textarea
                        value={novoAtend.atividades_realizadas}
                        onChange={(e) => setNovoAtend({ ...novoAtend, atividades_realizadas: e.target.value })}
                        rows={2}
                        placeholder="Atividades realizadas na sessão (mín. 3 caracteres)..."
                        className={`${inputCls} w-full`}
                      />
                      <textarea
                        value={novoAtend.observacoes}
                        onChange={(e) => setNovoAtend({ ...novoAtend, observacoes: e.target.value })}
                        rows={2}
                        placeholder="Observações (opcional)"
                        className={`${inputCls} w-full`}
                      />
                    </div>

                    {carregandoAtend ? (
                      <div className="py-4 text-center"><Loader2 className="w-5 h-5 animate-spin text-purple-600 mx-auto" /></div>
                    ) : atendimentos.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-3">Nenhuma sessão registrada ainda</p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {atendimentos.map((a) => (
                          <div key={a.id} className="bg-white dark:bg-slate-800 rounded-lg p-3 text-sm border border-gray-200 dark:border-slate-700">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-gray-700 dark:text-gray-200">
                                {new Date(a.data_atendimento).toLocaleDateString('pt-BR')}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {a.duracao_minutos}min</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${a.presente ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {a.presente ? 'Presente' : 'Faltou'}
                                </span>
                              </div>
                            </div>
                            {a.atividades_realizadas && <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{a.atividades_realizadas}</p>}
                            {a.observacoes && <p className="text-xs text-gray-400 italic mt-1">Obs: {a.observacoes}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> Salve o plano para começar a registrar sessões de atendimento
                  </div>
                )}
              </div>
            )}

            <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-2">
              <button onClick={() => setModalPlano(false)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold">Cancelar</button>
              <button
                onClick={salvarPlano}
                disabled={salvando}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-fuchsia-600 text-white text-sm font-bold hover:bg-fuchsia-700 disabled:opacity-50"
              >
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar plano
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AeeAdminPage() {
  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola', 'polo']}>
      <AeeAdmin />
    </ProtectedRoute>
  )
}
