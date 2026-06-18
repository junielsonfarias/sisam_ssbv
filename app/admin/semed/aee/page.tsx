'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Accessibility, AlertCircle, CheckCircle, Clock, GraduationCap, Plus, Users } from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import { useToast } from '@/components/toast'

import { ListaAlunosAee } from './components/lista-alunos-aee'
import { ModalCadastroAee } from './components/modal-cadastro-aee'
import { ModalPlanoAee } from './components/modal-plano-aee'
import {
  AlunoAeeRow, AlunoBusca, ATENDIMENTO_VAZIO, Atendimento, CadastroAee,
  CADASTRO_VAZIO, Escola, FormAtendimento, PlanoAee, planoVazio,
} from './components/types'

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
  const [cadastro, setCadastro] = useState<CadastroAee>(CADASTRO_VAZIO)
  const [plano, setPlano] = useState<PlanoAee | null>(null)
  const [anoPlano, setAnoPlano] = useState(String(new Date().getFullYear()))
  const [salvando, setSalvando] = useState(false)
  const [carregandoCadastro, setCarregandoCadastro] = useState(false)
  const [carregandoPlano, setCarregandoPlano] = useState(false)

  // Atendimentos do plano AEE
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([])
  const [carregandoAtend, setCarregandoAtend] = useState(false)
  const [planoIdAtual, setPlanoIdAtual] = useState<string | null>(null)
  const [novoAtend, setNovoAtend] = useState<FormAtendimento>(ATENDIMENTO_VAZIO)
  const [salvandoAtend, setSalvandoAtend] = useState(false)

  // AbortControllers para handlers de modal
  const abrirCadastroAbortRef = useRef<AbortController | null>(null)
  const abrirPlanoAbortRef = useRef<AbortController | null>(null)

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

  async function abrirCadastroExistente(aluno: AlunoAeeRow) {
    setAlunoSelecionado(aluno)
    setCadastro({ ...CADASTRO_VAZIO, aluno_id: aluno.aluno_id })
    setModalCadastro(true)

    abrirCadastroAbortRef.current?.abort()
    const controller = new AbortController()
    abrirCadastroAbortRef.current = controller
    setCarregandoCadastro(true)
    try {
      const res = await fetch(`/api/admin/aee/alunos?aluno=${aluno.aluno_id}`, { signal: controller.signal })
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
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast.error('Erro ao carregar cadastro AEE')
    } finally {
      if (abrirCadastroAbortRef.current === controller) setCarregandoCadastro(false)
    }
  }

  function abrirCadastroNovo() {
    setAlunoSelecionado(null)
    setCadastro(CADASTRO_VAZIO)
    setModalCadastro(true)
  }

  function selecionarAlunoNovo(a: AlunoBusca) {
    setAlunoSelecionado(a)
    setCadastro({ ...CADASTRO_VAZIO, aluno_id: a.id })
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
    abrirPlanoAbortRef.current?.abort()
    const controller = new AbortController()
    abrirPlanoAbortRef.current = controller

    setAlunoSelecionado(aluno)
    setModalPlano(true)
    setPlano(planoVazio(aluno.aluno_id, anoPlano))
    setPlanoIdAtual(null)
    setAtendimentos([])
    setCarregandoPlano(true)
    try {
      const res = await fetch(`/api/admin/aee/planos?aluno=${aluno.aluno_id}&ano=${anoPlano}`, { signal: controller.signal })
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
        carregarAtendimentos(aluno.aluno_id, anoPlano)
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast.error('Erro ao carregar plano')
    } finally {
      if (abrirPlanoAbortRef.current === controller) setCarregandoPlano(false)
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

  function handleChangeAnoLetivo(novoAno: string) {
    if (!plano) return
    setAnoPlano(novoAno)
    setPlano({ ...plano, ano_letivo: novoAno })
    carregarAtendimentos(plano.aluno_id, novoAno)
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
      setNovoAtend(ATENDIMENTO_VAZIO)
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
      // Não fecha — permite registrar atendimentos depois de salvar
      carregarAtendimentos(plano.aluno_id, plano.ano_letivo)
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  const alunoModalPlano = alunoSelecionado && 'aluno_id' in alunoSelecionado
    ? (alunoSelecionado as AlunoAeeRow)
    : null

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
          <div className="flex items-center gap-2">
            <Link
              href="/admin/semed/aee/relatorios"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-bold transition-colors"
            >
              <Clock className="w-4 h-4" /> Relatório de horas
            </Link>
            <button
              onClick={abrirCadastroNovo}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-bold transition-colors"
            >
              <Plus className="w-4 h-4" /> Cadastrar aluno AEE
            </button>
          </div>
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

      <ListaAlunosAee
        alunos={alunos}
        escolas={escolas}
        busca={busca}
        filtroEscola={filtroEscola}
        carregando={carregando}
        onChangeBusca={setBusca}
        onChangeFiltroEscola={setFiltroEscola}
        onEditar={abrirCadastroExistente}
        onPlano={abrirPlano}
      />

      <ModalCadastroAee
        aberto={modalCadastro}
        alunoSelecionado={alunoSelecionado}
        cadastro={cadastro}
        carregando={carregandoCadastro}
        salvando={salvando}
        onChangeCadastro={setCadastro}
        onSelecionarAluno={selecionarAlunoNovo}
        onFechar={() => setModalCadastro(false)}
        onSalvar={salvarCadastro}
      />

      <ModalPlanoAee
        aberto={modalPlano}
        aluno={alunoModalPlano}
        plano={plano}
        carregando={carregandoPlano}
        salvando={salvando}
        planoIdAtual={planoIdAtual}
        atendimentos={atendimentos}
        carregandoAtendimentos={carregandoAtend}
        formAtendimento={novoAtend}
        salvandoAtendimento={salvandoAtend}
        onChangePlano={setPlano}
        onChangeAnoLetivo={handleChangeAnoLetivo}
        onChangeFormAtendimento={setNovoAtend}
        onRegistrarAtendimento={registrarAtendimento}
        onFechar={() => setModalPlano(false)}
        onSalvar={salvarPlano}
      />
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
