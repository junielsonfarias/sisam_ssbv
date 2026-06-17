import { useState, useEffect, useMemo, useCallback } from 'react'
import { FILTROS_STORAGE_KEY, PAGINACAO_ANALISES_INICIAL } from '@/lib/dados/constants'
import type { AlunoSelecionado, Usuario } from '@/lib/dados/types'
import type { FiltrosCache } from '../types'

export interface FilterState {
  // Filtros principais
  filtroPoloId: string
  filtroEscolaId: string
  filtroSerie: string
  filtroTurmaId: string
  filtroAnoLetivo: string
  filtroPresenca: string
  filtroNivel: string
  filtroFaixaMedia: string
  filtroDisciplina: string
  filtroTipoEnsino: string

  // Visualização
  abaAtiva: 'visao_geral' | 'escolas' | 'turmas' | 'alunos' | 'analises'
  ordenacao: { coluna: string; direcao: 'asc' | 'desc' }
  paginaAtual: number
  itensPorPagina: number
  paginasAnalises: typeof PAGINACAO_ANALISES_INICIAL

  // Modal
  modalAberto: boolean
  alunoSelecionado: AlunoSelecionado | null

  // Usuário
  tipoUsuario: string
  usuario: Usuario | null
  escolaNome: string
  poloNome: string

  // Controles
  pesquisaRealizada: boolean
  filtrosCarregados: boolean
  filtrosCache: FiltrosCache | null
}

export interface FilterSetters {
  setFiltroPoloId: (v: string) => void
  setFiltroEscolaId: (v: string) => void
  setFiltroSerie: (v: string) => void
  setFiltroTurmaId: (v: string) => void
  setFiltroAnoLetivo: (v: string) => void
  setFiltroPresenca: (v: string) => void
  setFiltroNivel: (v: string) => void
  setFiltroFaixaMedia: (v: string) => void
  setFiltroDisciplina: (v: string) => void
  setFiltroTipoEnsino: (v: string) => void

  setAbaAtiva: (v: 'visao_geral' | 'escolas' | 'turmas' | 'alunos' | 'analises') => void
  setOrdenacao: (v: React.SetStateAction<{ coluna: string; direcao: 'asc' | 'desc' }>) => void
  setPaginaAtual: (v: number) => void
  setPaginasAnalises: (v: React.SetStateAction<typeof PAGINACAO_ANALISES_INICIAL>) => void

  setModalAberto: (v: boolean) => void
  setAlunoSelecionado: (v: AlunoSelecionado | null) => void

  setTipoUsuario: (v: string) => void
  setUsuario: (v: Usuario | null) => void
  setEscolaNome: (v: string) => void
  setPoloNome: (v: string) => void

  setPesquisaRealizada: (v: boolean) => void
  setFiltrosCache: (v: FiltrosCache | null) => void
}

export interface FilterHelpers {
  temFiltrosAtivos: boolean
  qtdFiltros: number
  limparFiltros: () => void
  filtrosPrincipaisIguais: () => boolean
  salvarFiltrosCache: () => void
  handleOrdenacao: (coluna: string) => void
}

export function useFilterState(): { filters: FilterState; setters: FilterSetters; helpers: FilterHelpers } {
  // Filtros
  const [filtroPoloId, setFiltroPoloId] = useState('')
  const [filtroEscolaId, setFiltroEscolaId] = useState('')
  const [filtroSerie, setFiltroSerie] = useState('')
  const [filtroTurmaId, setFiltroTurmaId] = useState('')
  const [filtroAnoLetivo, setFiltroAnoLetivo] = useState('')
  const [filtroPresenca, setFiltroPresenca] = useState('')
  const [filtroNivel, setFiltroNivel] = useState('')
  const [filtroFaixaMedia, setFiltroFaixaMedia] = useState('')
  const [filtroDisciplina, setFiltroDisciplina] = useState('')
  const [filtroTipoEnsino, setFiltroTipoEnsino] = useState('')

  // Visualização
  const [abaAtiva, setAbaAtiva] = useState<'visao_geral' | 'escolas' | 'turmas' | 'alunos' | 'analises'>('visao_geral')
  const [filtrosCarregados, setFiltrosCarregados] = useState(false)

  // Limpar filtros do localStorage ao iniciar (sempre começar com filtros limpos)
  useEffect(() => {
    if (typeof window !== 'undefined' && !filtrosCarregados) {
      try {
        // Limpar filtros persistidos para garantir estado inicial limpo
        localStorage.removeItem(FILTROS_STORAGE_KEY)
      } catch (e) {
      }
      setFiltrosCarregados(true)
    }
  }, [filtrosCarregados])

  const [ordenacao, setOrdenacao] = useState<{ coluna: string; direcao: 'asc' | 'desc' }>({ coluna: 'media_geral', direcao: 'desc' })
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [itensPorPagina] = useState(50)

  // Paginação consolidada para aba Análises
  const [paginasAnalises, setPaginasAnalises] = useState(PAGINACAO_ANALISES_INICIAL)

  // Modal de questões
  const [modalAberto, setModalAberto] = useState(false)
  const [alunoSelecionado, setAlunoSelecionado] = useState<AlunoSelecionado | null>(null)

  // Usuário e tipo de usuário
  const [tipoUsuario, setTipoUsuario] = useState<string>('admin')
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [escolaNome, setEscolaNome] = useState<string>('')
  const [poloNome, setPoloNome] = useState<string>('')

  const [pesquisaRealizada, setPesquisaRealizada] = useState(false)
  const [filtrosCache, setFiltrosCache] = useState<FiltrosCache | null>(null)

  // Helpers
  const temFiltrosAtivos = !!(filtroPoloId || filtroEscolaId || filtroTurmaId || filtroAnoLetivo || filtroPresenca || filtroNivel || filtroFaixaMedia || filtroDisciplina || filtroTipoEnsino || filtroSerie)
  const qtdFiltros = [filtroPoloId, filtroEscolaId, filtroTurmaId, filtroAnoLetivo, filtroPresenca, filtroNivel, filtroFaixaMedia, filtroDisciplina, filtroTipoEnsino, filtroSerie].filter(Boolean).length

  const limparFiltros = useCallback(() => {
    // Para usuários polo ou escola, manter o polo_id fixo
    if (usuario?.tipo_usuario !== 'polo' && usuario?.tipo_usuario !== 'escola') {
      setFiltroPoloId('')
    }
    // Para usuários escola, manter também o escola_id fixo
    if (usuario?.tipo_usuario !== 'escola') {
      setFiltroEscolaId('')
    }
    setFiltroSerie('')
    setFiltroTurmaId('')
    setFiltroAnoLetivo('')
    setFiltroPresenca('')
    setFiltroNivel('')
    setFiltroFaixaMedia('')
    setFiltroDisciplina('')
    setFiltroTipoEnsino('')
    setPaginaAtual(1)
    // Limpar cache pois os filtros foram resetados
    setFiltrosCache(null)
    // Limpar filtros persistidos no localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(FILTROS_STORAGE_KEY)
      } catch (e) {
      }
    }
  }, [usuario?.tipo_usuario])

  const filtrosPrincipaisIguais = useCallback(() => {
    if (!filtrosCache) return false
    return (
      filtrosCache.polo_id === filtroPoloId &&
      filtrosCache.escola_id === filtroEscolaId &&
      filtrosCache.turma_id === filtroTurmaId &&
      filtrosCache.ano_letivo === filtroAnoLetivo &&
      filtrosCache.presenca === filtroPresenca &&
      filtrosCache.nivel === filtroNivel &&
      filtrosCache.faixa_media === filtroFaixaMedia &&
      filtrosCache.disciplina === filtroDisciplina &&
      filtrosCache.tipo_ensino === filtroTipoEnsino
    )
  }, [filtrosCache, filtroPoloId, filtroEscolaId, filtroTurmaId, filtroAnoLetivo, filtroPresenca, filtroNivel, filtroFaixaMedia, filtroDisciplina, filtroTipoEnsino])

  const salvarFiltrosCache = useCallback(() => {
    setFiltrosCache({
      polo_id: filtroPoloId,
      escola_id: filtroEscolaId,
      turma_id: filtroTurmaId,
      ano_letivo: filtroAnoLetivo,
      presenca: filtroPresenca,
      nivel: filtroNivel,
      faixa_media: filtroFaixaMedia,
      disciplina: filtroDisciplina,
      tipo_ensino: filtroTipoEnsino
    })
  }, [filtroPoloId, filtroEscolaId, filtroTurmaId, filtroAnoLetivo, filtroPresenca, filtroNivel, filtroFaixaMedia, filtroDisciplina, filtroTipoEnsino])

  const handleOrdenacao = useCallback((coluna: string) => {
    setOrdenacao(prev => ({
      coluna,
      direcao: prev.coluna === coluna && prev.direcao === 'desc' ? 'asc' : 'desc'
    }))
    setPaginaAtual(1)
  }, [])

  const filters: FilterState = {
    filtroPoloId, filtroEscolaId, filtroSerie, filtroTurmaId,
    filtroAnoLetivo, filtroPresenca, filtroNivel, filtroFaixaMedia,
    filtroDisciplina, filtroTipoEnsino,
    abaAtiva, ordenacao, paginaAtual, itensPorPagina, paginasAnalises,
    modalAberto, alunoSelecionado,
    tipoUsuario, usuario, escolaNome, poloNome,
    pesquisaRealizada, filtrosCarregados, filtrosCache,
  }

  const setters: FilterSetters = {
    setFiltroPoloId, setFiltroEscolaId, setFiltroSerie, setFiltroTurmaId,
    setFiltroAnoLetivo, setFiltroPresenca, setFiltroNivel, setFiltroFaixaMedia,
    setFiltroDisciplina, setFiltroTipoEnsino,
    setAbaAtiva, setOrdenacao, setPaginaAtual, setPaginasAnalises,
    setModalAberto, setAlunoSelecionado,
    setTipoUsuario, setUsuario, setEscolaNome, setPoloNome,
    setPesquisaRealizada, setFiltrosCache,
  }

  const helpers: FilterHelpers = {
    temFiltrosAtivos, qtdFiltros, limparFiltros,
    filtrosPrincipaisIguais, salvarFiltrosCache, handleOrdenacao,
  }

  return { filters, setters, helpers }
}
