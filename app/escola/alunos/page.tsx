'use client'

import ProtectedRoute from '@/components/protected-route'
import ModalHistoricoAluno from '@/components/modal-historico-aluno'
import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { useToast } from '@/components/toast'
import { normalizarSerie, ordenarSeries } from '@/lib/dados/utils'
import { useSeries } from '@/lib/use-series'
import { AlunosTabela, AlunoModal, AlunosFiltros, formInicial } from './components'
import type { Aluno, FormAluno } from './components'

export default function AlunosEscolaPage() {
  const toast = useToast()
  const router = useRouter()
  const { formatSerie } = useSeries()
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [turmas, setTurmas] = useState<any[]>([])
  const [todasTurmas, setTodasTurmas] = useState<any[]>([])
  const [seriesDisponiveis, setSeriesDisponiveis] = useState<string[]>([])
  const [escolaId, setEscolaId] = useState<string>('')
  const [escolaNome, setEscolaNome] = useState<string>('')
  const [poloNome, setPoloNome] = useState<string>('')
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [buscaDebounced, setBuscaDebounced] = useState('')
  const [filtroTurma, setFiltroTurma] = useState('')
  const [filtroSerie, setFiltroSerie] = useState('')
  const [filtroAno, setFiltroAno] = useState('')

  // Modal de histórico
  const [mostrarModalHistorico, setMostrarModalHistorico] = useState(false)
  const [historicoAluno, setHistoricoAluno] = useState<any>(null)
  const [carregandoHistorico, setCarregandoHistorico] = useState(false)

  // Modal criar/editar aluno
  const [mostrarModal, setMostrarModal] = useState(false)
  const [alunoEditando, setAlunoEditando] = useState<Aluno | null>(null)
  const [formData, setFormData] = useState<FormAluno>(formInicial)
  const [salvando, setSalvando] = useState(false)

  // Confirmação de exclusão
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<string | null>(null)

  // Resumo
  const [resumo, setResumo] = useState({ total: 0, ativos: 0, transferidos: 0, pcd: 0 })

  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    const carregarDadosIniciais = async () => {
      try {
        const response = await fetch('/api/auth/verificar', { signal: abortController.signal })
        const data = await response.json()
        if (data.usuario && data.usuario.escola_id) {
          setEscolaId(data.usuario.escola_id)

          const escolaRes = await fetch(`/api/admin/escolas?id=${data.usuario.escola_id}`, { signal: abortController.signal })
          const escolaData = await escolaRes.json()
          if (Array.isArray(escolaData) && escolaData.length > 0) {
            setEscolaNome(escolaData[0].nome)
            setPoloNome(escolaData[0].polo_nome || '')
          }
        }
      } catch (error: any) {
        if ((error as any).name !== 'AbortError') {
        }
      } finally {
        if (!abortController.signal.aborted) {
          setCarregando(false)
        }
      }
    }
    carregarDadosIniciais()

    return () => { abortController.abort() }
  }, [])

  // Carregar séries disponíveis
  useEffect(() => {
    const carregarSeries = async () => {
      if (!escolaId) return
      try {
        const response = await fetch(`/api/admin/alunos?escola_id=${escolaId}&limite=200`)
        const data = await response.json()
        if (data.alunos && Array.isArray(data.alunos)) {
          const series = data.alunos
            .map((a: Aluno) => a.serie)
            .filter((serie: string | null): serie is string => Boolean(serie))
            .map((serie: string) => normalizarSerie(serie))
            .filter((serie: string) => serie !== '')
          const seriesUnicas = [...new Set(series)] as string[]
          setSeriesDisponiveis(ordenarSeries(seriesUnicas))
        }
      } catch (error) {
      }
    }
    carregarSeries()
  }, [escolaId])

  // Carregar turmas filtradas
  useEffect(() => {
    if (escolaId && filtroSerie) {
      carregarTurmas()
    } else {
      setTurmas([])
      setFiltroTurma('')
    }
  }, [filtroSerie, escolaId, filtroAno])

  // Carregar todas as turmas (para o modal)
  useEffect(() => {
    if (escolaId) {
      fetch(`/api/admin/turmas?escolas_ids=${escolaId}&mode=listagem`)
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => setTodasTurmas(Array.isArray(data) ? data : []))
        .catch(() => setTodasTurmas([]))
    }
  }, [escolaId])

  const carregarTurmas = async () => {
    if (!escolaId || !filtroSerie) { setTurmas([]); return }
    try {
      const params = new URLSearchParams()
      params.append('escolas_ids', escolaId)
      params.append('serie', filtroSerie)
      if (filtroAno) params.append('ano_letivo', filtroAno)
      params.append('mode', 'listagem')
      const response = await fetch(`/api/admin/turmas?${params}`)
      const data = await response.json()
      setTurmas(Array.isArray(data) ? data : [])
    } catch {
      setTurmas([])
    }
  }

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => setBuscaDebounced(busca), 300)
    return () => clearTimeout(timer)
  }, [busca])

  useEffect(() => { carregarAlunos() }, [buscaDebounced, filtroTurma, filtroSerie, filtroAno, escolaId])

  const carregarAlunos = useCallback(async () => {
    if (!escolaId) return
    try {
      setCarregando(true)
      const params = new URLSearchParams()
      params.append('escola_id', escolaId)
      if (filtroTurma) params.append('turma_id', filtroTurma)
      if (filtroSerie) params.append('serie', filtroSerie)
      if (filtroAno) params.append('ano_letivo', filtroAno)
      if (buscaDebounced) params.append('busca', buscaDebounced)
      params.append('limite', '200')

      const data = await fetch(`/api/admin/alunos?${params}`).then(r => r.ok ? r.json() : Promise.reject())

      const lista = data.alunos && Array.isArray(data.alunos) ? data.alunos : Array.isArray(data) ? data : []
      setAlunos(lista)

      // Calcular resumo
      const ativos = lista.filter((a: Aluno) => a.ativo)
      setResumo({
        total: lista.length,
        ativos: ativos.length,
        transferidos: lista.filter((a: Aluno) => a.situacao === 'transferido').length,
        pcd: lista.filter((a: Aluno) => a.pcd).length
      })
    } catch {
      setAlunos([])
    } finally {
      setCarregando(false)
    }
  }, [buscaDebounced, filtroTurma, filtroSerie, filtroAno, escolaId])

  const handleVisualizarHistorico = useCallback(async (aluno: Aluno) => {
    setCarregandoHistorico(true)
    setMostrarModalHistorico(true)
    setHistoricoAluno(null)
    try {
      const response = await fetch(`/api/admin/alunos/historico?aluno_id=${encodeURIComponent(aluno.id)}`)
      const data = await response.json()
      if (response.ok) {
        setHistoricoAluno(data)
      } else {
        toast.error(data.mensagem || 'Erro ao carregar histórico')
        setMostrarModalHistorico(false)
      }
    } catch {
      toast.error('Erro ao carregar histórico')
      setMostrarModalHistorico(false)
    } finally {
      setCarregandoHistorico(false)
    }
  }, [toast])

  const abrirModalCriar = () => {
    setAlunoEditando(null)
    setFormData({ ...formInicial, ano_letivo: filtroAno || new Date().getFullYear().toString() })
    setMostrarModal(true)
  }

  const abrirModalEditar = (aluno: Aluno) => {
    setAlunoEditando(aluno)
    setFormData({
      nome: aluno.nome,
      cpf: aluno.cpf || '',
      data_nascimento: aluno.data_nascimento ? aluno.data_nascimento.split('T')[0] : '',
      sexo: aluno.sexo || '',
      pcd: aluno.pcd || false,
      turma_id: aluno.turma_id || '',
      serie: aluno.serie || '',
      ano_letivo: aluno.ano_letivo || new Date().getFullYear().toString()
    })
    setMostrarModal(true)
  }

  const salvarAluno = async () => {
    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório')
      return
    }
    setSalvando(true)
    try {
      const body: any = {
        nome: formData.nome.trim(),
        escola_id: escolaId,
        cpf: formData.cpf || null,
        data_nascimento: formData.data_nascimento || null,
        sexo: formData.sexo || null,
        pcd: formData.pcd,
        turma_id: formData.turma_id || null,
        serie: formData.serie || null,
        ano_letivo: formData.ano_letivo || null
      }

      if (alunoEditando) {
        body.id = alunoEditando.id
        const res = await fetch('/api/admin/alunos', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
        if (res.ok) {
          toast.success('Aluno atualizado')
          setMostrarModal(false)
          carregarAlunos()
        } else {
          const err = await res.json()
          toast.error(err.mensagem || 'Erro ao atualizar')
        }
      } else {
        const res = await fetch('/api/admin/alunos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
        if (res.ok) {
          toast.success('Aluno cadastrado')
          setMostrarModal(false)
          carregarAlunos()
        } else {
          const err = await res.json()
          toast.error(err.mensagem || 'Erro ao cadastrar')
        }
      }
    } catch {
      toast.error('Erro de conexão')
    } finally {
      setSalvando(false)
    }
  }

  const excluirAluno = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/alunos?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Aluno excluído')
        setConfirmandoExclusao(null)
        carregarAlunos()
      } else {
        const err = await res.json()
        toast.error(err.mensagem || 'Erro ao excluir')
      }
    } catch {
      toast.error('Erro de conexão')
    }
  }

  const alunosFiltrados = useMemo(() => {
    return alunos.filter(aluno => {
      if (buscaDebounced && !aluno.nome.toLowerCase().includes(buscaDebounced.toLowerCase())) return false
      return true
    })
  }, [alunos, buscaDebounced])

  // Turmas do modal filtradas pela série selecionada
  const turmasDoModal = useMemo(() => {
    if (!formData.serie) return todasTurmas
    return todasTurmas.filter(t => t.serie === formData.serie || !t.serie)
  }, [todasTurmas, formData.serie])

  return (
    <ProtectedRoute tiposPermitidos={['escola']}>
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Gestão de Alunos</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {escolaNome && `${escolaNome}`}
              {poloNome && <span className="text-gray-500 dark:text-gray-500"> - Polo: {poloNome}</span>}
            </p>
          </div>
          <button
            onClick={abrirModalCriar}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Novo Aluno
          </button>
        </div>

        {/* Cards resumo + Filtros */}
        <AlunosFiltros
          resumo={resumo}
          busca={busca}
          escolaNome={escolaNome}
          filtroSerie={filtroSerie}
          filtroTurma={filtroTurma}
          filtroAno={filtroAno}
          seriesDisponiveis={seriesDisponiveis}
          turmas={turmas}
          setBusca={setBusca}
          setFiltroSerie={setFiltroSerie}
          setFiltroTurma={setFiltroTurma}
          setFiltroAno={setFiltroAno}
        />

        {/* Tabela de Alunos */}
        <AlunosTabela
          carregando={carregando}
          alunosFiltrados={alunosFiltrados}
          busca={busca}
          filtroTurma={filtroTurma}
          filtroSerie={filtroSerie}
          filtroAno={filtroAno}
          carregandoHistorico={carregandoHistorico}
          confirmandoExclusao={confirmandoExclusao}
          formatSerie={formatSerie}
          onVerPerfil={(id) => router.push(`/admin/alunos/${id}`)}
          onVerHistorico={handleVisualizarHistorico}
          onEditar={abrirModalEditar}
          onExcluir={excluirAluno}
          onConfirmarExclusao={setConfirmandoExclusao}
        />

        {/* Modal criar/editar aluno */}
        {mostrarModal && (
          <AlunoModal
            alunoEditando={alunoEditando}
            formData={formData}
            salvando={salvando}
            seriesDisponiveis={seriesDisponiveis}
            turmasDoModal={turmasDoModal}
            formatSerie={formatSerie}
            setFormData={setFormData}
            onFechar={() => setMostrarModal(false)}
            onSalvar={salvarAluno}
          />
        )}

        <ModalHistoricoAluno
          mostrar={mostrarModalHistorico}
          historico={historicoAluno}
          carregando={carregandoHistorico}
          onClose={() => {
            setMostrarModalHistorico(false)
            setHistoricoAluno(null)
          }}
        />
      </div>
    </ProtectedRoute>
  )
}
