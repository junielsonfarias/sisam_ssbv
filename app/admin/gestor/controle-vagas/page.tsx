'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState, useMemo } from 'react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useSeries } from '@/lib/use-series'

import {
  PoloSimples, EscolaSimples, TurmaVaga, Resumo, DadosSerie,
  ItemFila, ResumoFila, AlunoParaFila, FiltroOcupacao
} from './components/types'
import ResumoCards from './components/ResumoCards'
import GraficoOcupacao from './components/GraficoOcupacao'
import FiltrosBar from './components/FiltrosBar'
import TabelaTurmas from './components/TabelaTurmas'
import ModalAdicionarFila from './components/ModalAdicionarFila'
import HeaderVagas from './components/HeaderVagas'

export default function ControleVagasPage() {
  const toast = useToast()
  const { formatSerie } = useSeries()

  const [tipoUsuario, setTipoUsuario] = useState('')
  const [polos, setPolos] = useState<PoloSimples[]>([])
  const [poloId, setPoloId] = useState('')
  const [escolas, setEscolas] = useState<EscolaSimples[]>([])
  const [todasEscolas, setTodasEscolas] = useState<EscolaSimples[]>([])
  const [escolaId, setEscolaId] = useState('')
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear().toString())

  const [turmas, setTurmas] = useState<TurmaVaga[]>([])
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [porSerie, setPorSerie] = useState<DadosSerie[]>([])
  const [carregando, setCarregando] = useState(true)

  // Edição de capacidade
  const [editandoId, setEditandoId] = useState('')
  const [novaCapacidade, setNovaCapacidade] = useState(35)
  const [salvando, setSalvando] = useState(false)

  // Edição em lote
  const [modoLote, setModoLote] = useState(false)
  const [capacidadesLote, setCapacidadesLote] = useState<Record<string, number>>({})

  // Fila de espera
  const [filaAberta, setFilaAberta] = useState('')
  const [fila, setFila] = useState<ItemFila[]>([])
  const [resumoFila, setResumoFila] = useState<ResumoFila | null>(null)
  const [carregandoFila, setCarregandoFila] = useState(false)

  // Modal adicionar à fila
  const [modalFila, setModalFila] = useState<{ turmaId: string; turmaCode: string; escolaId: string } | null>(null)
  const [buscaAluno, setBuscaAluno] = useState('')
  const [resultadosBusca, setResultadosBusca] = useState<AlunoParaFila[]>([])
  const [buscandoAluno, setBuscandoAluno] = useState(false)
  const [observacaoFila, setObservacaoFila] = useState('')
  const [adicionandoFila, setAdicionandoFila] = useState(false)

  // Confirmação de remoção
  const [confirmandoRemocao, setConfirmandoRemocao] = useState<string | null>(null)

  // Filtros
  const [filtroSerie, setFiltroSerie] = useState('')
  const [filtroOcupacao, setFiltroOcupacao] = useState<FiltroOcupacao>('')

  // Gráfico expandido
  const [mostrarGrafico, setMostrarGrafico] = useState(true)

  useEffect(() => {
    const u = localStorage.getItem('usuario')
    if (u) {
      const parsed = JSON.parse(u)
      setTipoUsuario(parsed.tipo_usuario)
      if (parsed.tipo_usuario === 'escola' && parsed.escola_id) {
        setEscolaId(parsed.escola_id)
      }
      if (parsed.tipo_usuario === 'polo' && parsed.polo_id) {
        setPoloId(parsed.polo_id)
      }
    }
    // Carregar polos
    fetch('/api/admin/polos')
      .then(r => r.json())
      .then(data => setPolos(Array.isArray(data) ? data : []))
      .catch(() => {})
    // Carregar escolas
    fetch('/api/admin/escolas')
      .then(r => r.json())
      .then(data => {
        const lista = Array.isArray(data) ? data : data.dados || []
        setTodasEscolas(lista)
        setEscolas(lista)
      })
      .catch(() => {})
  }, [])

  // Filtrar escolas por polo selecionado
  useEffect(() => {
    if (poloId) {
      setEscolas(todasEscolas.filter(e => e.polo_id === poloId))
      // Se a escola selecionada não pertence ao polo, limpar
      const escolaPertence = todasEscolas.find(e => e.id === escolaId && e.polo_id === poloId)
      if (escolaId && !escolaPertence) setEscolaId('')
    } else {
      setEscolas(todasEscolas)
    }
  }, [poloId, todasEscolas])

  useEffect(() => { carregarDados() }, [escolaId, poloId, anoLetivo])

  const carregarDados = async () => {
    setCarregando(true)
    try {
      const params = new URLSearchParams({ ano_letivo: anoLetivo })
      if (escolaId) params.set('escola_id', escolaId)
      if (poloId && !escolaId) params.set('polo_id', poloId)
      const res = await fetch(`/api/admin/controle-vagas?${params}`)
      if (res.ok) {
        const data = await res.json()
        setTurmas(data.turmas)
        setResumo(data.resumo)
        setPorSerie(data.por_serie || [])
      }
    } catch {
      toast.error('Erro ao carregar dados')
    } finally {
      setCarregando(false)
    }
  }

  const salvarCapacidade = async (turmaId: string) => {
    setSalvando(true)
    try {
      const res = await fetch('/api/admin/controle-vagas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turma_id: turmaId, capacidade_maxima: novaCapacidade })
      })
      if (res.ok) {
        toast.success('Capacidade atualizada')
        setEditandoId('')
        carregarDados()
      } else {
        const err = await res.json()
        toast.error(err.mensagem || 'Erro ao salvar')
      }
    } catch {
      toast.error('Erro de conexão')
    } finally {
      setSalvando(false)
    }
  }

  const salvarLote = async () => {
    const lote = Object.entries(capacidadesLote).map(([turma_id, capacidade_maxima]) => ({
      turma_id, capacidade_maxima
    }))
    if (lote.length === 0) { toast.error('Nenhuma alteração'); return }
    setSalvando(true)
    try {
      const res = await fetch('/api/admin/controle-vagas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lote })
      })
      if (res.ok) {
        const data = await res.json()
        toast.success(data.mensagem)
        setModoLote(false)
        setCapacidadesLote({})
        carregarDados()
      }
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  const iniciarModoLote = () => {
    const caps: Record<string, number> = {}
    turmasFiltradas.forEach(t => { caps[t.id] = t.capacidade_maxima })
    setCapacidadesLote(caps)
    setModoLote(true)
  }

  const abrirFila = async (turmaId: string) => {
    if (filaAberta === turmaId) { setFilaAberta(''); return }
    setFilaAberta(turmaId)
    setCarregandoFila(true)
    try {
      const res = await fetch(`/api/admin/controle-vagas/fila?turma_id=${turmaId}`)
      if (res.ok) {
        const data = await res.json()
        setFila(data.itens || data)
        setResumoFila(data.resumo || null)
      }
    } catch {
      toast.error('Erro ao carregar fila')
    } finally {
      setCarregandoFila(false)
    }
  }

  const atualizarStatusFila = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/admin/controle-vagas/fila', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      })
      if (res.ok) {
        const data = await res.json()
        toast.success(data.mensagem || `Status: ${status}`)
        abrirFila(filaAberta)
        if (status === 'matriculado') carregarDados()
      }
    } catch {
      toast.error('Erro ao atualizar')
    }
  }

  const removerDaFila = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/controle-vagas/fila?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Aluno removido da fila')
        setConfirmandoRemocao(null)
        abrirFila(filaAberta)
        carregarDados()
      }
    } catch {
      toast.error('Erro ao remover')
    }
  }

  // Busca de aluno para adicionar à fila
  useEffect(() => {
    if (!buscaAluno || buscaAluno.length < 2) { setResultadosBusca([]); return }
    const timer = setTimeout(async () => {
      setBuscandoAluno(true)
      try {
        const res = await fetch(`/api/admin/matriculas/alunos/buscar?busca=${encodeURIComponent(buscaAluno)}`)
        const data = await res.json()
        setResultadosBusca(Array.isArray(data) ? data : [])
      } catch {
        setResultadosBusca([])
      } finally {
        setBuscandoAluno(false)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [buscaAluno])

  const adicionarAFila = async (alunoId: string) => {
    if (!modalFila) return
    setAdicionandoFila(true)
    try {
      const res = await fetch('/api/admin/controle-vagas/fila', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aluno_id: alunoId,
          turma_id: modalFila.turmaId,
          escola_id: modalFila.escolaId,
          observacao: observacaoFila || null
        })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.mensagem)
        setModalFila(null)
        setBuscaAluno('')
        setResultadosBusca([])
        setObservacaoFila('')
        carregarDados()
        if (filaAberta === modalFila.turmaId) abrirFila(filaAberta)
      } else {
        toast.error(data.mensagem || 'Erro ao adicionar')
      }
    } catch {
      toast.error('Erro de conexão')
    } finally {
      setAdicionandoFila(false)
    }
  }

  const seriesUnicas = [...new Set(turmas.map(t => t.serie))].sort()

  const turmasFiltradas = useMemo(() => {
    let resultado = turmas
    if (filtroSerie) resultado = resultado.filter(t => t.serie === filtroSerie)
    if (filtroOcupacao === 'lotada') resultado = resultado.filter(t => t.vagas_disponiveis <= 0)
    if (filtroOcupacao === 'com_vagas') resultado = resultado.filter(t => t.vagas_disponiveis > 0)
    if (filtroOcupacao === 'com_fila') resultado = resultado.filter(t => t.fila_espera > 0)
    return resultado
  }, [turmas, filtroSerie, filtroOcupacao])

  const isAdmin = tipoUsuario !== 'escola' && tipoUsuario !== 'polo' && tipoUsuario !== ''

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola']}>
      <div className="space-y-6">
        <HeaderVagas
          anoLetivo={anoLetivo}
          setAnoLetivo={setAnoLetivo}
          tipoUsuario={tipoUsuario}
          poloId={poloId}
          setPoloId={setPoloId}
          setEscolaId={setEscolaId}
          escolaId={escolaId}
          polos={polos}
          escolas={escolas}
          carregarDados={carregarDados}
        />

        {resumo && <ResumoCards resumo={resumo} />}

        <GraficoOcupacao
          porSerie={porSerie}
          mostrarGrafico={mostrarGrafico}
          setMostrarGrafico={setMostrarGrafico}
          formatSerie={formatSerie}
        />

        <FiltrosBar
          filtroSerie={filtroSerie}
          setFiltroSerie={setFiltroSerie}
          filtroOcupacao={filtroOcupacao}
          setFiltroOcupacao={setFiltroOcupacao}
          seriesUnicas={seriesUnicas}
          formatSerie={formatSerie}
          isAdmin={isAdmin}
          modoLote={modoLote}
          salvando={salvando}
          salvarLote={salvarLote}
          iniciarModoLote={iniciarModoLote}
          cancelarLote={() => { setModoLote(false); setCapacidadesLote({}) }}
        />

        {carregando ? (
          <LoadingSpinner text="Carregando vagas..." centered />
        ) : (
          <TabelaTurmas
            turmasFiltradas={turmasFiltradas}
            formatSerie={formatSerie}
            modoLote={modoLote}
            capacidadesLote={capacidadesLote}
            setCapacidadesLote={setCapacidadesLote}
            editandoId={editandoId}
            setEditandoId={setEditandoId}
            novaCapacidade={novaCapacidade}
            setNovaCapacidade={setNovaCapacidade}
            salvando={salvando}
            salvarCapacidade={salvarCapacidade}
            isAdmin={isAdmin}
            filaAberta={filaAberta}
            fila={fila}
            resumoFila={resumoFila}
            carregandoFila={carregandoFila}
            confirmandoRemocao={confirmandoRemocao}
            setConfirmandoRemocao={setConfirmandoRemocao}
            abrirFila={abrirFila}
            atualizarStatusFila={atualizarStatusFila}
            removerDaFila={removerDaFila}
            setModalFila={setModalFila}
          />
        )}

        {modalFila && (
          <ModalAdicionarFila
            modalFila={modalFila}
            buscaAluno={buscaAluno}
            setBuscaAluno={setBuscaAluno}
            resultadosBusca={resultadosBusca}
            buscandoAluno={buscandoAluno}
            adicionandoFila={adicionandoFila}
            observacaoFila={observacaoFila}
            setObservacaoFila={setObservacaoFila}
            adicionarAFila={adicionarAFila}
            fecharModal={() => { setModalFila(null); setBuscaAluno(''); setResultadosBusca([]) }}
            formatSerie={formatSerie}
          />
        )}
      </div>
    </ProtectedRoute>
  )
}
