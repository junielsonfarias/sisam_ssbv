'use client'

import { useEffect, useState } from 'react'
import { UserPlus } from 'lucide-react'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { EscolaSimples } from './types'

import { CardAluno } from './pesquisar-aluno/card-aluno'
import { FormMatriculaComponent } from './pesquisar-aluno/form-matricula'
import { FormNovoAlunoComponent } from './pesquisar-aluno/form-novo-aluno'
import { HeaderBusca } from './pesquisar-aluno/header-busca'
import { ListaResultados } from './pesquisar-aluno/lista-resultados'
import {
  AlunoResultado, FiltrosBusca, FormMatricula, FormNovoAluno,
  NOVO_ALUNO_VAZIO, TurmaDisponivel,
} from './pesquisar-aluno/types'

interface ToastApi {
  success: (m: string) => void
  warning: (m: string) => void
  error: (m: string) => void
}

export function AbaPesquisarAluno({
  podeEditar, tipoUsuario, escolaIdUsuario, toast,
}: {
  podeEditar: boolean
  tipoUsuario: string
  escolaIdUsuario: string
  toast: ToastApi
}) {
  // Estados de busca
  const [busca, setBusca] = useState('')
  const buscaDebounced = useDebounce(busca, 400)
  const [resultados, setResultados] = useState<AlunoResultado[]>([])
  const [buscando, setBuscando] = useState(false)
  const [buscaRealizada, setBuscaRealizada] = useState(false)

  // Filtros
  const anoAtual = new Date().getFullYear().toString()
  const [filtros, setFiltros] = useState<FiltrosBusca>({
    escola_id: tipoUsuario === 'escola' ? escolaIdUsuario : '',
    serie: '',
    turma_id: '',
    ano_letivo: anoAtual,
  })
  const [escolasFiltro, setEscolasFiltro] = useState<EscolaSimples[]>([])
  const [turmasFiltro, setTurmasFiltro] = useState<TurmaDisponivel[]>([])
  const [mostrarFiltros, setMostrarFiltros] = useState(false)

  // Matrícula
  const [alunoSelecionado, setAlunoSelecionado] = useState<AlunoResultado | null>(null)
  const [mostrarMatricula, setMostrarMatricula] = useState(false)
  const [escolas, setEscolas] = useState<EscolaSimples[]>([])
  const [turmas, setTurmas] = useState<TurmaDisponivel[]>([])
  const [matriculaForm, setMatriculaForm] = useState<FormMatricula>({
    escola_id: '',
    turma_id: '',
    serie: '',
    ano_letivo: anoAtual,
  })
  const [matriculando, setMatriculando] = useState(false)
  const [carregandoTurmas, setCarregandoTurmas] = useState(false)

  // Novo aluno
  const [mostrarNovoAluno, setMostrarNovoAluno] = useState(false)
  const [novoAlunoForm, setNovoAlunoForm] = useState<FormNovoAluno>(NOVO_ALUNO_VAZIO)
  const [criandoAluno, setCriandoAluno] = useState(false)

  // Buscar alunos com debounce + filtros
  useEffect(() => {
    const temBusca = buscaDebounced && buscaDebounced.trim().length >= 2
    const temFiltro = !!(filtros.escola_id || filtros.turma_id || filtros.serie || filtros.ano_letivo)

    if (!temBusca && !temFiltro) {
      setResultados([])
      setBuscaRealizada(false)
      return
    }

    // ano_letivo sozinho não é suficiente (sempre preenchido) — exige outro critério
    if (!temBusca && !filtros.escola_id && !filtros.turma_id && !filtros.serie) {
      setResultados([])
      setBuscaRealizada(false)
      return
    }

    const buscar = async () => {
      setBuscando(true)
      try {
        const params = new URLSearchParams()
        if (temBusca) params.set('busca', buscaDebounced.trim())
        if (filtros.escola_id) params.set('escola_id', filtros.escola_id)
        if (filtros.turma_id) params.set('turma_id', filtros.turma_id)
        if (filtros.serie) params.set('serie', filtros.serie)
        if (filtros.ano_letivo) params.set('ano_letivo', filtros.ano_letivo)

        const res = await fetch(`/api/admin/matriculas/alunos/buscar?${params}`)
        setResultados(res.ok ? (await res.json()) || [] : [])
      } catch {
        setResultados([])
      } finally {
        setBuscando(false)
        setBuscaRealizada(true)
      }
    }
    buscar()
  }, [buscaDebounced, filtros.escola_id, filtros.turma_id, filtros.serie, filtros.ano_letivo])

  // Carregar escolas para filtro
  useEffect(() => {
    if (tipoUsuario === 'escola') return
    fetch('/api/admin/escolas')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setEscolasFiltro(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [tipoUsuario])

  // Turmas do filtro quando escola/ano muda
  useEffect(() => {
    if (!filtros.escola_id) {
      setTurmasFiltro([])
      return
    }
    fetch(`/api/admin/matriculas/turmas?escola_id=${filtros.escola_id}&ano_letivo=${filtros.ano_letivo}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setTurmasFiltro(Array.isArray(d) ? d : []))
      .catch(() => setTurmasFiltro([]))
  }, [filtros.escola_id, filtros.ano_letivo])

  // Escolas para form de matrícula
  useEffect(() => {
    if (tipoUsuario === 'escola' && escolaIdUsuario) {
      setMatriculaForm((prev) => ({ ...prev, escola_id: escolaIdUsuario }))
      carregarTurmas(escolaIdUsuario)
    } else if (mostrarMatricula && escolas.length === 0) {
      fetch('/api/admin/escolas')
        .then((r) => (r.ok ? r.json() : []))
        .then((d) => setEscolas(Array.isArray(d) ? d : []))
        .catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostrarMatricula, tipoUsuario, escolaIdUsuario])

  const carregarTurmas = async (escolaId: string) => {
    if (!escolaId) { setTurmas([]); return }
    setCarregandoTurmas(true)
    try {
      const anoLetivo = matriculaForm.ano_letivo || anoAtual
      const res = await fetch(`/api/admin/matriculas/turmas?escola_id=${escolaId}&ano_letivo=${anoLetivo}`)
      setTurmas(res.ok ? ((await res.json()) || []) : [])
    } catch {
      setTurmas([])
    } finally {
      setCarregandoTurmas(false)
    }
  }

  const limparFiltros = () => {
    setFiltros({
      escola_id: tipoUsuario === 'escola' ? escolaIdUsuario : '',
      serie: '',
      turma_id: '',
      ano_letivo: anoAtual,
    })
  }

  const qtdFiltrosAtivos = [
    filtros.escola_id && tipoUsuario !== 'escola',
    filtros.serie,
    filtros.turma_id,
    filtros.ano_letivo && filtros.ano_letivo !== anoAtual,
  ].filter(Boolean).length

  const selecionarAluno = (aluno: AlunoResultado) => {
    setAlunoSelecionado(aluno)
    setMostrarMatricula(false)
    setMostrarNovoAluno(false)
  }

  const iniciarMatricula = () => {
    if (!alunoSelecionado) return
    setMostrarMatricula(true)
    setMostrarNovoAluno(false)
    if (alunoSelecionado.escola_id) {
      setMatriculaForm((prev) => ({ ...prev, escola_id: alunoSelecionado.escola_id }))
      carregarTurmas(alunoSelecionado.escola_id)
    }
  }

  const confirmarMatricula = async () => {
    if (!alunoSelecionado || !matriculaForm.escola_id || !matriculaForm.turma_id) {
      toast.warning('Selecione escola e turma para matricular')
      return
    }
    const turmaEscolhida = turmas.find((t) => t.id === matriculaForm.turma_id)
    if (!turmaEscolhida) return

    setMatriculando(true)
    try {
      const res = await fetch('/api/admin/matriculas/alunos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          escola_id: matriculaForm.escola_id,
          turma_id: matriculaForm.turma_id,
          serie: turmaEscolhida.serie || matriculaForm.serie,
          ano_letivo: matriculaForm.ano_letivo,
          alunos: [{
            id: alunoSelecionado.id,
            nome: alunoSelecionado.nome,
            codigo: alunoSelecionado.codigo,
            cpf: alunoSelecionado.cpf,
            data_nascimento: alunoSelecionado.data_nascimento,
            pcd: alunoSelecionado.pcd,
          }],
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`${alunoSelecionado.nome} matriculado com sucesso na turma ${turmaEscolhida.codigo}!`)
        setMostrarMatricula(false)
        setAlunoSelecionado(null)
        // Forçar nova busca (mantém input visível)
        if (buscaDebounced.trim().length >= 2) {
          setBusca((prev) => prev + ' ')
          setTimeout(() => setBusca((prev) => prev.trim()), 100)
        }
      } else {
        toast.error(data.mensagem || 'Erro ao matricular aluno')
      }
    } catch {
      toast.error('Erro ao matricular aluno')
    } finally {
      setMatriculando(false)
    }
  }

  const abrirNovoAluno = (nomeInicial: string) => {
    setMostrarNovoAluno(true)
    setMostrarMatricula(false)
    setAlunoSelecionado(null)
    setNovoAlunoForm({ ...NOVO_ALUNO_VAZIO, nome: nomeInicial })
  }

  const criarNovoAluno = async () => {
    if (!novoAlunoForm.nome.trim()) {
      toast.warning('Nome é obrigatório')
      return
    }
    if (!matriculaForm.escola_id) {
      toast.warning('Selecione uma escola')
      return
    }

    setCriandoAluno(true)
    try {
      const res = await fetch('/api/admin/alunos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: novoAlunoForm.nome.trim(),
          codigo: novoAlunoForm.codigo || null,
          cpf: novoAlunoForm.cpf || null,
          data_nascimento: novoAlunoForm.data_nascimento || null,
          pcd: novoAlunoForm.pcd,
          escola_id: matriculaForm.escola_id,
          turma_id: matriculaForm.turma_id || null,
          serie: turmas.find((t) => t.id === matriculaForm.turma_id)?.serie || null,
          ano_letivo: matriculaForm.ano_letivo,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Aluno ${novoAlunoForm.nome} cadastrado${matriculaForm.turma_id ? ' e matriculado' : ''} com sucesso!`)
        setMostrarNovoAluno(false)
        setNovoAlunoForm(NOVO_ALUNO_VAZIO)
        setBusca(novoAlunoForm.nome)
      } else {
        toast.error(data.mensagem || 'Erro ao cadastrar aluno')
      }
    } catch {
      toast.error('Erro ao cadastrar aluno')
    } finally {
      setCriandoAluno(false)
    }
  }

  const temAlgumFiltro = !!filtros.escola_id || !!filtros.serie || !!filtros.turma_id

  return (
    <div className="space-y-6">
      {!alunoSelecionado && (
        <HeaderBusca
          busca={busca}
          buscando={buscando}
          filtros={filtros}
          escolasFiltro={escolasFiltro}
          turmasFiltro={turmasFiltro}
          tipoUsuario={tipoUsuario}
          mostrarFiltros={mostrarFiltros}
          anoAtual={anoAtual}
          qtdFiltrosAtivos={qtdFiltrosAtivos}
          onChangeBusca={setBusca}
          onChangeFiltros={setFiltros}
          onToggleFiltros={() => setMostrarFiltros((v) => !v)}
          onLimparFiltros={limparFiltros}
        />
      )}

      {!alunoSelecionado && (
        <ListaResultados
          resultados={resultados}
          buscaRealizada={buscaRealizada}
          buscando={buscando}
          busca={busca}
          qtdFiltrosAtivos={qtdFiltrosAtivos}
          temAlgumFiltro={temAlgumFiltro}
          podeEditar={podeEditar}
          onSelecionar={selecionarAluno}
          onAbrirNovoAluno={abrirNovoAluno}
        />
      )}

      {alunoSelecionado && (
        <CardAluno
          aluno={alunoSelecionado}
          podeEditar={podeEditar}
          mostrarMatricula={mostrarMatricula}
          onVoltar={() => { setAlunoSelecionado(null); setMostrarMatricula(false) }}
          onMatricular={iniciarMatricula}
        />
      )}

      {mostrarMatricula && alunoSelecionado && (
        <FormMatriculaComponent
          aluno={alunoSelecionado}
          form={matriculaForm}
          escolas={escolas}
          turmas={turmas}
          tipoUsuario={tipoUsuario}
          carregandoTurmas={carregandoTurmas}
          matriculando={matriculando}
          onChangeForm={setMatriculaForm}
          onCarregarTurmas={carregarTurmas}
          onCancelar={() => setMostrarMatricula(false)}
          onConfirmar={confirmarMatricula}
        />
      )}

      {mostrarNovoAluno && (
        <FormNovoAlunoComponent
          formAluno={novoAlunoForm}
          formMatricula={matriculaForm}
          escolas={escolas}
          turmas={turmas}
          tipoUsuario={tipoUsuario}
          carregandoTurmas={carregandoTurmas}
          criandoAluno={criandoAluno}
          onChangeAluno={setNovoAlunoForm}
          onChangeMatricula={setMatriculaForm}
          onCarregarTurmas={carregarTurmas}
          onFechar={() => setMostrarNovoAluno(false)}
          onCadastrar={criarNovoAluno}
        />
      )}

      {podeEditar && !mostrarNovoAluno && !alunoSelecionado && buscaRealizada && resultados.length > 0 && (
        <div className="text-center">
          <button
            onClick={() => abrirNovoAluno('')}
            className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium text-sm"
          >
            <UserPlus className="w-4 h-4" /> Cadastrar novo aluno
          </button>
        </div>
      )}
    </div>
  )
}
