'use client'

import ProtectedRoute from '@/components/protected-route'
import LayoutDashboard from '@/components/layout-dashboard'
import ModalQuestoesAluno from '@/components/modal-questoes-aluno'
import { useEffect, useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts'
import {
  Users, School, GraduationCap, MapPin, TrendingUp, TrendingDown,
  Filter, X, ChevronDown, ChevronUp, RefreshCw, Download,
  BookOpen, Calculator, Award, UserCheck, UserX, BarChart3,
  Table, PieChartIcon, Activity, Layers, Eye, EyeOff, AlertTriangle, Target
} from 'lucide-react'

interface DashboardData {
  metricas: {
    total_alunos: number
    total_escolas: number
    total_turmas: number
    total_polos: number
    total_presentes: number
    total_faltantes: number
    media_geral: number
    media_lp: number
    media_mat: number
    media_ch: number
    media_cn: number
    media_producao: number
    menor_media: number
    maior_media: number
    taxa_presenca: number
    total_respostas?: number
    total_acertos?: number
    total_erros?: number
    taxa_acerto_geral?: number
    taxa_erro_geral?: number
  }
  niveis: { nivel: string; quantidade: number }[]
  mediasPorSerie: { serie: string; total_alunos: number; presentes: number; media_geral: number; media_lp: number; media_mat: number; media_ch: number; media_cn: number }[]
  mediasPorPolo: { polo_id: string; polo: string; total_alunos: number; media_geral: number; media_lp: number; media_mat: number; presentes: number; faltantes: number }[]
  mediasPorEscola: { escola_id: string; escola: string; polo: string; total_alunos: number; media_geral: number; media_lp: number; media_mat: number; media_ch: number; media_cn: number; presentes: number; faltantes: number }[]
  mediasPorTurma: { turma_id: string; turma: string; escola: string; serie: string; total_alunos: number; media_geral: number; media_lp: number; media_mat: number; presentes: number; faltantes: number }[]
  faixasNota: { faixa: string; quantidade: number }[]
  presenca: { status: string; quantidade: number }[]
  topAlunos: any[]
  alunosDetalhados: any[]
  filtros: {
    polos: { id: string; nome: string }[]
    escolas: { id: string; nome: string; polo_id: string }[]
    series: string[]
    turmas: { id: string; codigo: string; escola_id: string }[]
    anosLetivos: string[]
    niveis: string[]
    faixasMedia: string[]
  }
  analiseAcertosErros?: {
    taxaAcertoGeral: {
      total_respostas: number
      total_acertos: number
      total_erros: number
      taxa_acerto_geral: number
      taxa_erro_geral: number
    } | null
    taxaAcertoPorDisciplina: {
      disciplina: string
      total_respostas: number
      total_acertos: number
      total_erros: number
      taxa_acerto: number
      taxa_erro: number
    }[]
    questoesComMaisErros: {
      questao_codigo: string
      questao_descricao: string
      disciplina: string
      total_respostas: number
      total_acertos: number
      total_erros: number
      taxa_acerto: number
      taxa_erro: number
    }[]
    escolasComMaisErros: {
      escola_id: string
      escola: string
      polo: string
      total_respostas: number
      total_acertos: number
      total_erros: number
      taxa_acerto: number
      taxa_erro: number
      total_alunos: number
    }[]
    turmasComMaisErros: {
      turma_id: string
      turma: string
      escola: string
      serie: string
      total_respostas: number
      total_acertos: number
      total_erros: number
      taxa_acerto: number
      taxa_erro: number
      total_alunos: number
    }[]
    questoesComMaisAcertos: {
      questao_codigo: string
      questao_descricao: string
      disciplina: string
      total_respostas: number
      total_acertos: number
      total_erros: number
      taxa_acerto: number
      taxa_erro: number
    }[]
    escolasComMaisAcertos: {
      escola_id: string
      escola: string
      polo: string
      total_respostas: number
      total_acertos: number
      total_erros: number
      taxa_acerto: number
      taxa_erro: number
      total_alunos: number
    }[]
    turmasComMaisAcertos: {
      turma_id: string
      turma: string
      escola: string
      serie: string
      total_respostas: number
      total_acertos: number
      total_erros: number
      taxa_acerto: number
      taxa_erro: number
      total_alunos: number
    }[]
  }
}

const COLORS = {
  primary: '#4F46E5',
  niveis: {
    'Insuficiente': '#EF4444',
    'Básico': '#F59E0B',
    'Adequado': '#3B82F6',
    'Avançado': '#10B981',
    'Não classificado': '#9CA3AF'
  },
  disciplinas: {
    lp: '#3B82F6',
    mat: '#8B5CF6',
    ch: '#10B981',
    cn: '#F59E0B'
  },
  faixas: ['#EF4444', '#F97316', '#FBBF24', '#84CC16', '#22C55E']
}

// Funções helper para formatação
const getPresencaColor = (presenca: string) => {
  if (presenca === 'P' || presenca === 'p') {
    return 'bg-green-100 text-green-800'
  }
  return 'bg-red-100 text-red-800'
}

const formatarNota = (nota: number | string | null | undefined, presenca?: string, mediaAluno?: number | string | null): string => {
  // Se aluno faltou, sempre retornar "-"
  if (presenca === 'F' || presenca === 'f') {
    return '-'
  }
  
  // Se média do aluno for 0 ou null, considerar faltante
  const mediaNum = typeof mediaAluno === 'string' ? parseFloat(mediaAluno) : mediaAluno
  if (mediaNum === 0 || mediaNum === null || mediaNum === undefined) {
    return '-'
  }
  
  if (nota === null || nota === undefined || nota === '') return '-'
  const num = typeof nota === 'string' ? parseFloat(nota) : nota
  if (isNaN(num)) return '-'
  if (num === 0) return '-' // Se nota for 0, também retornar "-"
  return num.toFixed(1)
}

const getNotaNumero = (nota: number | string | null | undefined): number | null => {
  if (nota === null || nota === undefined || nota === '') return null
  const num = typeof nota === 'string' ? parseFloat(nota) : nota
  return isNaN(num) ? null : num
}

const getNotaColor = (nota: number | string | null | undefined) => {
  const num = getNotaNumero(nota)
  if (num === null) return 'text-gray-500'
  if (num >= 7) return 'text-green-600 font-semibold'
  if (num >= 5) return 'text-yellow-600 font-semibold'
  return 'text-red-600 font-semibold'
}

const getNotaBgColor = (nota: number | string | null | undefined) => {
  const num = getNotaNumero(nota)
  if (num === null) return 'bg-gray-50'
  if (num >= 7) return 'bg-green-50 border-green-200'
  if (num >= 5) return 'bg-yellow-50 border-yellow-200'
  return 'bg-red-50 border-red-200'
}

export default function DadosPage() {
  // Componente auxiliar para tooltip customizado
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 text-sm">
          <p className="font-semibold text-gray-900 mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="flex justify-between gap-4">
              <span>{entry.name}:</span>
              <span className="font-medium">{typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}</span>
            </p>
          ))}
        </div>
      )
    }
    return null
  }
  
  const [dados, setDados] = useState<DashboardData | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

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
  // Novos filtros de acertos/erros
  const [filtroTaxaAcertoMin, setFiltroTaxaAcertoMin] = useState('')
  const [filtroTaxaAcertoMax, setFiltroTaxaAcertoMax] = useState('')
  const [filtroQuestaoCodigo, setFiltroQuestaoCodigo] = useState('')

  // Visualização
  const [abaAtiva, setAbaAtiva] = useState<'visao_geral' | 'escolas' | 'turmas' | 'alunos' | 'analises'>('visao_geral')
  const [ordenacao, setOrdenacao] = useState<{ coluna: string; direcao: 'asc' | 'desc' }>({ coluna: 'media_geral', direcao: 'desc' })
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [itensPorPagina] = useState(15)
  
  // Modal de questões
  const [modalAberto, setModalAberto] = useState(false)
  const [alunoSelecionado, setAlunoSelecionado] = useState<{ id: string; anoLetivo?: string } | null>(null)
  
  // Usuário e tipo de usuário
  const [tipoUsuario, setTipoUsuario] = useState<string>('admin')
  const [usuario, setUsuario] = useState<any>(null)

  const carregarDados = async () => {
    setCarregando(true)
    setErro(null)
    try {
      const params = new URLSearchParams()
      if (filtroPoloId) params.append('polo_id', filtroPoloId)
      if (filtroEscolaId) params.append('escola_id', filtroEscolaId)
      if (filtroSerie) params.append('serie', filtroSerie)
      if (filtroTurmaId) params.append('turma_id', filtroTurmaId)
      if (filtroAnoLetivo) params.append('ano_letivo', filtroAnoLetivo)
      if (filtroPresenca) params.append('presenca', filtroPresenca)
      if (filtroNivel) params.append('nivel', filtroNivel)
      if (filtroFaixaMedia) params.append('faixa_media', filtroFaixaMedia)
      if (filtroDisciplina) params.append('disciplina', filtroDisciplina)
      if (filtroTaxaAcertoMin) params.append('taxa_acerto_min', filtroTaxaAcertoMin)
      if (filtroTaxaAcertoMax) params.append('taxa_acerto_max', filtroTaxaAcertoMax)
      if (filtroQuestaoCodigo) params.append('questao_codigo', filtroQuestaoCodigo)

      const response = await fetch(`/api/admin/dashboard-dados?${params}`)
      const data = await response.json()

      if (response.ok) {
        setDados(data)
      } else {
        setErro(data.mensagem || 'Erro ao carregar dados')
      }
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error)
      setErro('Erro de conexão')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroPoloId, filtroEscolaId, filtroSerie, filtroTurmaId, filtroAnoLetivo, filtroPresenca, filtroNivel, filtroFaixaMedia, filtroDisciplina, filtroTaxaAcertoMin, filtroTaxaAcertoMax, filtroQuestaoCodigo])

  const limparFiltros = () => {
    setFiltroPoloId('')
    setFiltroEscolaId('')
    setFiltroSerie('')
    setFiltroTurmaId('')
    setFiltroAnoLetivo('')
    setFiltroPresenca('')
    setFiltroNivel('')
    setFiltroFaixaMedia('')
    setFiltroDisciplina('')
    setFiltroTaxaAcertoMin('')
    setFiltroTaxaAcertoMax('')
    setFiltroQuestaoCodigo('')
    setPaginaAtual(1)
  }

  const temFiltrosAtivos = filtroPoloId || filtroEscolaId || filtroSerie || filtroTurmaId || filtroAnoLetivo || filtroPresenca || filtroNivel || filtroFaixaMedia || filtroDisciplina || filtroTaxaAcertoMin || filtroTaxaAcertoMax || filtroQuestaoCodigo
  const qtdFiltros = [filtroPoloId, filtroEscolaId, filtroSerie, filtroTurmaId, filtroAnoLetivo, filtroPresenca, filtroNivel, filtroFaixaMedia, filtroDisciplina, filtroTaxaAcertoMin, filtroTaxaAcertoMax, filtroQuestaoCodigo].filter(Boolean).length

  // Escolas e turmas filtradas
  const escolasFiltradas = useMemo(() => {
    if (!dados?.filtros.escolas) return []
    if (!filtroPoloId) return dados.filtros.escolas
    return dados.filtros.escolas.filter(e => e.polo_id === filtroPoloId)
  }, [dados?.filtros.escolas, filtroPoloId])

  const turmasFiltradas = useMemo(() => {
    if (!dados?.filtros.turmas) return []
    if (!filtroEscolaId) return dados.filtros.turmas
    return dados.filtros.turmas.filter(t => t.escola_id === filtroEscolaId)
  }, [dados?.filtros.turmas, filtroEscolaId])

  // Ordenação e paginação de escolas
  const escolasOrdenadas = useMemo(() => {
    if (!dados?.mediasPorEscola) return []
    return [...dados.mediasPorEscola].sort((a, b) => {
      const valorA = a[ordenacao.coluna as keyof typeof a]
      const valorB = b[ordenacao.coluna as keyof typeof b]
      if (typeof valorA === 'number' && typeof valorB === 'number') {
        return ordenacao.direcao === 'asc' ? valorA - valorB : valorB - valorA
      }
      return ordenacao.direcao === 'asc'
        ? String(valorA).localeCompare(String(valorB))
        : String(valorB).localeCompare(String(valorA))
    })
  }, [dados?.mediasPorEscola, ordenacao])

  const escolasPaginadas = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina
    return escolasOrdenadas.slice(inicio, inicio + itensPorPagina)
  }, [escolasOrdenadas, paginaAtual, itensPorPagina])

  // Ordenação e paginação de alunos
  const alunosOrdenados = useMemo(() => {
    if (!dados?.alunosDetalhados) return []
    return [...dados.alunosDetalhados].sort((a, b) => {
      const valorA = a[ordenacao.coluna as keyof typeof a]
      const valorB = b[ordenacao.coluna as keyof typeof b]
      if (valorA === null) return 1
      if (valorB === null) return -1
      if (typeof valorA === 'number' && typeof valorB === 'number') {
        return ordenacao.direcao === 'asc' ? valorA - valorB : valorB - valorA
      }
      return ordenacao.direcao === 'asc'
        ? String(valorA || '').localeCompare(String(valorB || ''))
        : String(valorB || '').localeCompare(String(valorA || ''))
    })
  }, [dados?.alunosDetalhados, ordenacao])

  const alunosPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina
    return alunosOrdenados.slice(inicio, inicio + itensPorPagina)
  }, [alunosOrdenados, paginaAtual, itensPorPagina])

  const totalPaginas = useMemo(() => {
    if (abaAtiva === 'escolas') return Math.ceil(escolasOrdenadas.length / itensPorPagina)
    if (abaAtiva === 'alunos') return Math.ceil(alunosOrdenados.length / itensPorPagina)
    if (abaAtiva === 'turmas') return Math.ceil((dados?.mediasPorTurma?.length || 0) / itensPorPagina)
    return 1
  }, [abaAtiva, escolasOrdenadas.length, alunosOrdenados.length, dados?.mediasPorTurma?.length, itensPorPagina])

  const handleOrdenacao = (coluna: string) => {
    setOrdenacao(prev => ({
      coluna,
      direcao: prev.coluna === coluna && prev.direcao === 'desc' ? 'asc' : 'desc'
    }))
    setPaginaAtual(1)
  }

  // Dados para gráfico radar de disciplinas
  const dadosRadar = useMemo(() => {
    if (!dados?.metricas) return []
    return [
      { disciplina: 'LP', media: dados.metricas.media_lp, fullMark: 10 },
      { disciplina: 'MAT', media: dados.metricas.media_mat, fullMark: 10 },
      { disciplina: 'CH', media: dados.metricas.media_ch || 0, fullMark: 10 },
      { disciplina: 'CN', media: dados.metricas.media_cn || 0, fullMark: 10 },
    ]
  }, [dados?.metricas])

  useEffect(() => {
    const carregarTipoUsuario = async () => {
      try {
        const response = await fetch('/api/auth/verificar')
        const data = await response.json()
        if (data.usuario) {
          const tipo = data.usuario.tipo_usuario === 'administrador' ? 'admin' : data.usuario.tipo_usuario
          setTipoUsuario(tipo)
          setUsuario(data.usuario)
          // Se for usuário escola, definir automaticamente o filtro de escola
          if (data.usuario.tipo_usuario === 'escola' && data.usuario.escola_id) {
            setFiltroEscolaId(data.usuario.escola_id)
          }
        }
      } catch (error) {
        console.error('Erro ao carregar tipo de usuário:', error)
      }
    }
    carregarTipoUsuario()
  }, [])

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
      <LayoutDashboard tipoUsuario={tipoUsuario}>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-indigo-600" />
                Painel de Dados
              </h1>
              <p className="text-gray-600 mt-1">Visualize e analise os resultados da avaliacao</p>
            </div>
            <button
              onClick={carregarDados}
              disabled={carregando}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>

          {/* Barra de Filtros */}
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border-2 border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Filter className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-gray-800">Filtros de Pesquisa</h2>
              {temFiltrosAtivos && (
                <span className="ml-auto flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600">
                    {qtdFiltros} {qtdFiltros === 1 ? 'filtro ativo' : 'filtros ativos'}
                  </span>
                  <button
                    onClick={limparFiltros}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm"
                  >
                    <X className="w-4 h-4" />
                    Limpar Filtros
                  </button>
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Ano Letivo */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  Ano Letivo
                </label>
                <select
                  value={filtroAnoLetivo}
                  onChange={(e) => { setFiltroAnoLetivo(e.target.value); setPaginaAtual(1); }}
                  className="w-full px-4 py-2.5 bg-white border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-gray-400"
                >
                  <option value="">Todos os anos</option>
                  {dados?.filtros.anosLetivos.map(ano => (
                    <option key={ano} value={ano}>{ano}</option>
                  ))}
                </select>
              </div>

              {/* Polo */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  Polo
                </label>
                <select
                  value={filtroPoloId}
                  onChange={(e) => { setFiltroPoloId(e.target.value); setFiltroEscolaId(''); setFiltroTurmaId(''); setPaginaAtual(1); }}
                  disabled={usuario?.tipo_usuario === 'escola' || usuario?.tipo_usuario === 'polo'}
                  className="w-full px-4 py-2.5 bg-white border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100"
                >
                  <option value="">Todos os polos</option>
                  {dados?.filtros.polos.map(polo => (
                    <option key={polo.id} value={polo.id}>{polo.nome}</option>
                  ))}
                </select>
              </div>

              {/* Escola */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  Escola
                </label>
                <select
                  value={filtroEscolaId}
                  onChange={(e) => { setFiltroEscolaId(e.target.value); setFiltroTurmaId(''); setPaginaAtual(1); }}
                  disabled={usuario?.tipo_usuario === 'escola'}
                  className="w-full px-4 py-2.5 bg-white border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100"
                >
                  <option value="">Todas as escolas</option>
                  {escolasFiltradas.map(escola => (
                    <option key={escola.id} value={escola.id}>{escola.nome}</option>
                  ))}
                </select>
              </div>

              {/* Serie */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  Série
                </label>
                <select
                  value={filtroSerie}
                  onChange={(e) => { setFiltroSerie(e.target.value); setPaginaAtual(1); }}
                  className="w-full px-4 py-2.5 bg-white border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-gray-400"
                >
                  <option value="">Todas as séries</option>
                  {dados?.filtros.series.map(serie => (
                    <option key={serie} value={serie}>{serie}</option>
                  ))}
                </select>
              </div>

              {/* Turma */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  Turma
                </label>
                <select
                  value={filtroTurmaId}
                  onChange={(e) => { setFiltroTurmaId(e.target.value); setPaginaAtual(1); }}
                  className="w-full px-4 py-2.5 bg-white border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-gray-400"
                >
                  <option value="">Todas as turmas</option>
                  {turmasFiltradas.map(turma => (
                    <option key={turma.id} value={turma.id}>{turma.codigo}</option>
                  ))}
                </select>
              </div>

              {/* Disciplina */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  Disciplina
                </label>
                <select
                  value={filtroDisciplina}
                  onChange={(e) => { setFiltroDisciplina(e.target.value); setPaginaAtual(1); }}
                  className="w-full px-4 py-2.5 bg-white border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-gray-400"
                >
                  <option value="">Todas as disciplinas</option>
                  <option value="LP">Língua Portuguesa</option>
                  <option value="MAT">Matemática</option>
                  <option value="CH">Ciências Humanas</option>
                  <option value="CN">Ciências da Natureza</option>
                  <option value="PT">Produção Textual</option>
                </select>
              </div>

              {/* Presenca */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  Presença
                </label>
                <select
                  value={filtroPresenca}
                  onChange={(e) => { setFiltroPresenca(e.target.value); setPaginaAtual(1); }}
                  className="w-full px-4 py-2.5 bg-white border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-gray-400"
                >
                  <option value="">Todos</option>
                  <option value="P">Presentes</option>
                  <option value="F">Faltantes</option>
                </select>
              </div>

              {/* Nivel */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  Nível
                </label>
                <select
                  value={filtroNivel}
                  onChange={(e) => { setFiltroNivel(e.target.value); setPaginaAtual(1); }}
                  className="w-full px-4 py-2.5 bg-white border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-gray-400"
                >
                  <option value="">Todos os níveis</option>
                  {dados?.filtros.niveis.map(nivel => (
                    <option key={nivel} value={nivel}>{nivel}</option>
                  ))}
                </select>
              </div>

              {/* Faixa de Media */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  Faixa de Média
                </label>
                <select
                  value={filtroFaixaMedia}
                  onChange={(e) => { setFiltroFaixaMedia(e.target.value); setPaginaAtual(1); }}
                  className="w-full px-4 py-2.5 bg-white border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-gray-400"
                >
                  <option value="">Todas as faixas</option>
                  {dados?.filtros.faixasMedia.map(faixa => (
                    <option key={faixa} value={faixa}>{faixa}</option>
                  ))}
                </select>
              </div>

              {/* Taxa de Acerto Mínima */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  Taxa de Acerto Mín. (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={filtroTaxaAcertoMin}
                  onChange={(e) => { setFiltroTaxaAcertoMin(e.target.value); setPaginaAtual(1); }}
                  className="w-full px-4 py-2.5 bg-white border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-gray-400"
                  placeholder="Ex: 50"
                />
              </div>

              {/* Taxa de Acerto Máxima */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  Taxa de Acerto Máx. (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={filtroTaxaAcertoMax}
                  onChange={(e) => { setFiltroTaxaAcertoMax(e.target.value); setPaginaAtual(1); }}
                  className="w-full px-4 py-2.5 bg-white border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-gray-400"
                  placeholder="Ex: 80"
                />
              </div>

              {/* Questão Específica */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  Questão Específica
                </label>
                <input
                  type="text"
                  value={filtroQuestaoCodigo}
                  onChange={(e) => { setFiltroQuestaoCodigo(e.target.value); setPaginaAtual(1); }}
                  className="w-full px-4 py-2.5 bg-white border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-gray-400"
                  placeholder="Ex: Q1, Q25"
                />
              </div>

            </div>
          </div>

          {/* Segmentacao Visual - Chips de Series */}
          {dados?.filtros.series && dados.filtros.series.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase self-center mr-2">Serie:</span>
              <button
                onClick={() => { setFiltroSerie(''); setPaginaAtual(1); }}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  !filtroSerie ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Todas
              </button>
              {dados.filtros.series.map(serie => (
                <button
                  key={serie}
                  onClick={() => { setFiltroSerie(serie); setPaginaAtual(1); }}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    filtroSerie === serie ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {serie}
                </button>
              ))}
            </div>
          )}

          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
              {erro}
            </div>
          )}

          {carregando ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto"></div>
                <p className="text-gray-500 mt-4 text-lg">Carregando dados...</p>
              </div>
            </div>
          ) : dados ? (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-10 gap-3">
                <MetricCard titulo="Alunos" valor={dados.metricas.total_alunos} icon={Users} cor="indigo" />
                <MetricCard titulo="Escolas" valor={dados.metricas.total_escolas} icon={School} cor="blue" />
                <MetricCard titulo="Turmas" valor={dados.metricas.total_turmas} icon={GraduationCap} cor="purple" />
                <MetricCard titulo="Presentes" valor={dados.metricas.total_presentes} subtitulo={`${dados.metricas.taxa_presenca}%`} icon={UserCheck} cor="green" />
                <MetricCard titulo="Faltantes" valor={dados.metricas.total_faltantes} icon={UserX} cor="red" />
                <MetricCard titulo="Media Geral" valor={dados.metricas.media_geral.toFixed(2)} icon={Award} cor="amber" isDecimal />
                <MetricCard titulo="Menor" valor={dados.metricas.menor_media.toFixed(2)} icon={TrendingDown} cor="rose" isDecimal />
                <MetricCard titulo="Maior" valor={dados.metricas.maior_media.toFixed(2)} icon={TrendingUp} cor="emerald" isDecimal />
                {dados.metricas.taxa_acerto_geral !== undefined && dados.metricas.taxa_erro_geral !== undefined && (
                  <>
                    <MetricCard titulo="Taxa Acerto" valor={`${dados.metricas.taxa_acerto_geral.toFixed(1)}%`} icon={Target} cor="green" />
                    <MetricCard titulo="Taxa Erro" valor={`${dados.metricas.taxa_erro_geral.toFixed(1)}%`} icon={AlertTriangle} cor="red" />
                  </>
                )}
              </div>

              {/* Medias por Disciplina */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <DisciplinaCard titulo="Lingua Portuguesa" media={dados.metricas.media_lp} cor="blue" sigla="LP" />
                <DisciplinaCard titulo="Matematica" media={dados.metricas.media_mat} cor="purple" sigla="MAT" />
                <DisciplinaCard titulo="Ciencias Humanas" media={dados.metricas.media_ch} cor="green" sigla="CH" />
                <DisciplinaCard titulo="Ciencias da Natureza" media={dados.metricas.media_cn} cor="amber" sigla="CN" />
                {dados.metricas.media_producao > 0 && (
                  <DisciplinaCard titulo="Producao Textual" media={dados.metricas.media_producao} cor="rose" sigla="PT" />
                )}
              </div>

              {/* Abas de Navegacao */}
              <div className="flex gap-1 border-b border-gray-200">
                {[
                  { id: 'visao_geral', label: 'Visao Geral', icon: PieChartIcon },
                  { id: 'escolas', label: 'Escolas', icon: School },
                  { id: 'turmas', label: 'Turmas', icon: Layers },
                  { id: 'alunos', label: 'Alunos', icon: Users },
                  { id: 'analises', label: 'Análises', icon: Target },
                ].map(aba => (
                  <button
                    key={aba.id}
                    onClick={() => { setAbaAtiva(aba.id as any); setPaginaAtual(1); }}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      abaAtiva === aba.id
                        ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <aba.icon className="w-4 h-4" />
                    {aba.label}
                  </button>
                ))}
              </div>

              {/* Conteudo das Abas */}
              {abaAtiva === 'visao_geral' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Grafico de Barras - Medias por Serie */}
                  {dados.mediasPorSerie.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Media por Serie</h3>
                      <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={dados.mediasPorSerie}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis dataKey="serie" tick={{ fill: '#6B7280', fontSize: 11 }} />
                            <YAxis domain={[0, 10]} tick={{ fill: '#6B7280', fontSize: 11 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Bar dataKey="media_lp" name="LP" fill={COLORS.disciplinas.lp} radius={[2, 2, 0, 0]} />
                            <Bar dataKey="media_mat" name="MAT" fill={COLORS.disciplinas.mat} radius={[2, 2, 0, 0]} />
                            <Bar dataKey="media_ch" name="CH" fill={COLORS.disciplinas.ch} radius={[2, 2, 0, 0]} />
                            <Bar dataKey="media_cn" name="CN" fill={COLORS.disciplinas.cn} radius={[2, 2, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Grafico de Pizza - Niveis */}
                  {dados.niveis.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribuicao por Nivel</h3>
                      <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={dados.niveis}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={90}
                              paddingAngle={2}
                              dataKey="quantidade"
                              nameKey="nivel"
                              label={({ nivel, percent }) => `${nivel}: ${(percent * 100).toFixed(0)}%`}
                              labelLine={false}
                            >
                              {dados.niveis.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={COLORS.niveis[entry.nivel as keyof typeof COLORS.niveis] || '#9CA3AF'}
                                />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex flex-wrap justify-center gap-3 mt-2">
                        {dados.niveis.map(n => (
                          <div key={n.nivel} className="flex items-center gap-1.5 text-xs">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: COLORS.niveis[n.nivel as keyof typeof COLORS.niveis] || '#9CA3AF' }}
                            ></div>
                            <span>{n.nivel}: {n.quantidade}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Distribuicao por Faixa de Nota */}
                  {dados.faixasNota.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribuicao por Faixa de Nota</h3>
                      <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={dados.faixasNota}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis dataKey="faixa" tick={{ fill: '#6B7280', fontSize: 11 }} />
                            <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="quantidade" name="Alunos" radius={[4, 4, 0, 0]}>
                              {dados.faixasNota.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS.faixas[index] || COLORS.primary} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Ranking de Polos */}
                  {dados.mediasPorPolo.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Ranking de Polos</h3>
                      <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={dados.mediasPorPolo.slice(0, 8)} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis type="number" domain={[0, 10]} tick={{ fill: '#6B7280', fontSize: 11 }} />
                            <YAxis type="category" dataKey="polo" width={100} tick={{ fill: '#6B7280', fontSize: 10 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="media_geral" name="Media" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {abaAtiva === 'escolas' && (
                <TabelaPaginada
                  dados={escolasPaginadas}
                  colunas={[
                    { key: 'escola', label: 'Escola', align: 'left' },
                    { key: 'polo', label: 'Polo', align: 'left' },
                    { key: 'total_alunos', label: 'Alunos', align: 'center' },
                    { key: 'media_geral', label: 'Media', align: 'center', format: 'nota' },
                    { key: 'media_lp', label: 'LP', align: 'center', format: 'decimal' },
                    { key: 'media_mat', label: 'MAT', align: 'center', format: 'decimal' },
                    { key: 'media_ch', label: 'CH', align: 'center', format: 'decimal' },
                    { key: 'media_cn', label: 'CN', align: 'center', format: 'decimal' },
                    { key: 'presentes', label: 'Pres.', align: 'center' },
                    { key: 'faltantes', label: 'Falt.', align: 'center' },
                  ]}
                  ordenacao={ordenacao}
                  onOrdenar={handleOrdenacao}
                  paginaAtual={paginaAtual}
                  totalPaginas={totalPaginas}
                  onPaginar={setPaginaAtual}
                  totalRegistros={escolasOrdenadas.length}
                  itensPorPagina={itensPorPagina}
                />
              )}

              {abaAtiva === 'turmas' && dados.mediasPorTurma && (
                <TabelaPaginada
                  dados={dados.mediasPorTurma.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina)}
                  colunas={[
                    { key: 'turma', label: 'Turma', align: 'left' },
                    { key: 'escola', label: 'Escola', align: 'left' },
                    { key: 'serie', label: 'Serie', align: 'center' },
                    { key: 'total_alunos', label: 'Alunos', align: 'center' },
                    { key: 'media_geral', label: 'Media', align: 'center', format: 'nota' },
                    { key: 'media_lp', label: 'LP', align: 'center', format: 'decimal' },
                    { key: 'media_mat', label: 'MAT', align: 'center', format: 'decimal' },
                    { key: 'presentes', label: 'Pres.', align: 'center' },
                    { key: 'faltantes', label: 'Falt.', align: 'center' },
                  ]}
                  ordenacao={ordenacao}
                  onOrdenar={handleOrdenacao}
                  paginaAtual={paginaAtual}
                  totalPaginas={Math.ceil(dados.mediasPorTurma.length / itensPorPagina)}
                  onPaginar={setPaginaAtual}
                  totalRegistros={dados.mediasPorTurma.length}
                  itensPorPagina={itensPorPagina}
                />
              )}

              {abaAtiva === 'alunos' && (
                <div className="space-y-4 overflow-x-hidden">
                  {/* Visualização Mobile - Cards */}
                  <div className="block sm:hidden space-y-4 p-4">
                    {alunosPaginados.length === 0 ? (
                      <div className="text-center py-12">
                        <Award className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <p className="text-base font-medium text-gray-500">Nenhum resultado encontrado</p>
                        <p className="text-sm mt-1 text-gray-400">Importe os dados primeiro</p>
                      </div>
                    ) : (
                      alunosPaginados.map((resultado: any, index: number) => {
                        const mediaNum = getNotaNumero(resultado.media_aluno)
                        const notaLP = getNotaNumero(resultado.nota_lp)
                        const notaCH = getNotaNumero(resultado.nota_ch)
                        const notaMAT = getNotaNumero(resultado.nota_mat)
                        const notaCN = getNotaNumero(resultado.nota_cn)

                        return (
                          <div key={resultado.id || index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex-shrink-0">
                                  {index + 1 + (paginaAtual - 1) * itensPorPagina}
                                </span>
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                  <span className="text-indigo-600 font-semibold text-xs">
                                    {resultado.aluno?.charAt(0).toUpperCase() || 'A'}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-gray-900 text-sm mb-1 truncate">{resultado.aluno}</div>
                                  <div className="text-xs text-gray-500 space-y-0.5">
                                    {resultado.escola && <div className="whitespace-normal break-words">Escola: {resultado.escola}</div>}
                                    {resultado.turma && <div>Turma: {resultado.turma}</div>}
                                    {resultado.serie && <div>Série: {resultado.serie}</div>}
                                    <div className="flex items-center gap-2">
                                      <span>Presença: </span>
                                      <span
                                        className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-semibold ${getPresencaColor(
                                          resultado.presenca || 'P'
                                        )}`}
                                      >
                                        {resultado.presenca === 'P' || resultado.presenca === 'p' ? '✓ Presente' : '✗ Falta'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Notas em Grid */}
                            <div className="grid grid-cols-2 gap-3 mb-3">
                              {/* LP */}
                              <div className={`p-3 rounded-lg ${getNotaBgColor(resultado.nota_lp)} border border-gray-200`}>
                                <div className="text-xs font-semibold text-gray-600 mb-1">Língua Portuguesa</div>
                                <div className="text-xs text-gray-600 mb-1">{resultado.total_acertos_lp || 0}/20</div>
                                <div className={`text-lg font-bold ${getNotaColor(resultado.nota_lp)} mb-1`}>
                                  {formatarNota(resultado.nota_lp, resultado.presenca, resultado.media_aluno)}
                                </div>
                                {notaLP !== null && notaLP !== 0 && (resultado.presenca === 'P' || resultado.presenca === 'p') && (
                                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                    <div
                                      className={`h-1.5 rounded-full ${
                                        notaLP >= 7 ? 'bg-green-500' : notaLP >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                                      }`}
                                      style={{ width: `${Math.min((notaLP / 10) * 100, 100)}%` }}
                                    ></div>
                                  </div>
                                )}
                              </div>
                              {/* CH */}
                              <div className={`p-3 rounded-lg ${getNotaBgColor(resultado.nota_ch)} border border-gray-200`}>
                                <div className="text-xs font-semibold text-gray-600 mb-1">Ciências Humanas</div>
                                <div className="text-xs text-gray-600 mb-1">{resultado.total_acertos_ch || 0}/10</div>
                                <div className={`text-lg font-bold ${getNotaColor(resultado.nota_ch)} mb-1`}>
                                  {formatarNota(resultado.nota_ch, resultado.presenca, resultado.media_aluno)}
                                </div>
                                {notaCH !== null && notaCH !== 0 && (resultado.presenca === 'P' || resultado.presenca === 'p') && (
                                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                    <div
                                      className={`h-1.5 rounded-full ${
                                        notaCH >= 7 ? 'bg-green-500' : notaCH >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                                      }`}
                                      style={{ width: `${Math.min((notaCH / 10) * 100, 100)}%` }}
                                    ></div>
                                  </div>
                                )}
                              </div>
                              {/* MAT */}
                              <div className={`p-3 rounded-lg ${getNotaBgColor(resultado.nota_mat)} border border-gray-200`}>
                                <div className="text-xs font-semibold text-gray-600 mb-1">Matemática</div>
                                <div className="text-xs text-gray-600 mb-1">{resultado.total_acertos_mat || 0}/20</div>
                                <div className={`text-lg font-bold ${getNotaColor(resultado.nota_mat)} mb-1`}>
                                  {formatarNota(resultado.nota_mat, resultado.presenca, resultado.media_aluno)}
                                </div>
                                {notaMAT !== null && notaMAT !== 0 && (resultado.presenca === 'P' || resultado.presenca === 'p') && (
                                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                    <div
                                      className={`h-1.5 rounded-full ${
                                        notaMAT >= 7 ? 'bg-green-500' : notaMAT >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                                      }`}
                                      style={{ width: `${Math.min((notaMAT / 10) * 100, 100)}%` }}
                                    ></div>
                                  </div>
                                )}
                              </div>
                              {/* CN */}
                              <div className={`p-3 rounded-lg ${getNotaBgColor(resultado.nota_cn)} border border-gray-200`}>
                                <div className="text-xs font-semibold text-gray-600 mb-1">Ciências da Natureza</div>
                                <div className="text-xs text-gray-600 mb-1">{resultado.total_acertos_cn || 0}/10</div>
                                <div className={`text-lg font-bold ${getNotaColor(resultado.nota_cn)} mb-1`}>
                                  {formatarNota(resultado.nota_cn, resultado.presenca, resultado.media_aluno)}
                                </div>
                                {notaCN !== null && notaCN !== 0 && (resultado.presenca === 'P' || resultado.presenca === 'p') && (
                                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                    <div
                                      className={`h-1.5 rounded-full ${
                                        notaCN >= 7 ? 'bg-green-500' : notaCN >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                                      }`}
                                      style={{ width: `${Math.min((notaCN / 10) * 100, 100)}%` }}
                                    ></div>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Média e Nível */}
                            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                              <div className={`flex flex-col items-center justify-center px-4 py-3 rounded-xl ${
                                mediaNum !== null && mediaNum >= 7 ? 'bg-green-50 border-green-500' : 
                                mediaNum !== null && mediaNum >= 5 ? 'bg-yellow-50 border-yellow-500' : 
                                'bg-red-50 border-red-500'
                              } border-2`}>
                                <div className="text-xs font-semibold text-gray-600 mb-1">Média</div>
                                <div className={`text-2xl font-extrabold ${
                                  mediaNum !== null && mediaNum >= 7 ? 'text-green-600' : 
                                  mediaNum !== null && mediaNum >= 5 ? 'text-yellow-600' : 
                                  'text-red-600'
                                }`}>
                                  {formatarNota(resultado.media_aluno, resultado.presenca, resultado.media_aluno)}
                                </div>
                              </div>
                              {resultado.nivel_aprendizagem && (
                                <div className="text-center">
                                  <div className="text-xs font-semibold text-gray-600 mb-1">Nível</div>
                                  <div className="text-sm font-bold text-indigo-600">{resultado.nivel_aprendizagem}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                  
                  {/* Visualização Tablet/Desktop - Tabela */}
                  <div className="hidden sm:block w-full">
                    <div className="w-full overflow-x-auto -mx-2 sm:mx-0">
                      <table className="w-full divide-y divide-gray-200 min-w-0 md:min-w-[600px] lg:min-w-[700px]">
                        <thead className="bg-gradient-to-r from-indigo-50 to-indigo-100">
                          <tr>
                            <th className="text-center py-1 px-0.5 sm:py-1.5 sm:px-1 md:py-2 md:px-1.5 lg:py-2.5 lg:px-2 font-bold text-indigo-900 text-[10px] sm:text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 w-8 md:w-10 lg:w-12">
                              #
                            </th>
                            <th className="text-left py-1 px-0.5 sm:py-1.5 sm:px-1 md:py-2 md:px-1 lg:py-2.5 lg:px-2 font-bold text-indigo-900 text-[10px] sm:text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 min-w-[120px] md:min-w-[140px] lg:min-w-[160px]">
                              Aluno
                            </th>
                            <th className="hidden lg:table-cell text-left py-1 px-1 md:py-2 md:px-1.5 lg:py-2.5 lg:px-2 font-bold text-indigo-900 text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 min-w-[150px]">
                              Escola
                            </th>
                            <th className="hidden md:table-cell text-left py-1 px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-indigo-900 text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 w-16 md:w-20">
                              Turma
                            </th>
                            <th className="hidden xl:table-cell text-left py-1 px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-indigo-900 text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 w-20">
                              Série
                            </th>
                            <th className="hidden lg:table-cell text-center py-1 px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-indigo-900 text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 w-20">
                              Presença
                            </th>
                            <th className="text-center py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-indigo-900 text-[10px] sm:text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 w-14 md:w-16 lg:w-18">
                              LP
                            </th>
                            <th className="text-center py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-indigo-900 text-[10px] sm:text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 w-14 md:w-16 lg:w-18">
                              CH
                            </th>
                            <th className="text-center py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-indigo-900 text-[10px] sm:text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 w-14 md:w-16 lg:w-18">
                              MAT
                            </th>
                            <th className="text-center py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-indigo-900 text-[10px] sm:text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 w-14 md:w-16 lg:w-18">
                              CN
                            </th>
                            <th className="text-center py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-indigo-900 text-[10px] sm:text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 w-14 md:w-16 lg:w-18">
                              Média
                            </th>
                            <th className="text-center py-1 px-0.5 sm:py-1.5 sm:px-1 md:py-2 md:px-1.5 lg:py-2.5 lg:px-2 font-bold text-indigo-900 text-[10px] sm:text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 w-16 md:w-20 lg:w-24">
                              Ações
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {alunosPaginados.length === 0 ? (
                            <tr>
                              <td colSpan={12} className="py-8 sm:py-12 text-center text-gray-500 px-4">
                                <Award className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-300 mb-3" />
                                <p className="text-base sm:text-lg font-medium">Nenhum resultado encontrado</p>
                                <p className="text-xs sm:text-sm mt-1">Importe os dados primeiro</p>
                              </td>
                            </tr>
                          ) : (
                            alunosPaginados.map((resultado: any, index: number) => {
                              const mediaNum = getNotaNumero(resultado.media_aluno)
                              const notaLP = getNotaNumero(resultado.nota_lp)
                              const notaCH = getNotaNumero(resultado.nota_ch)
                              const notaMAT = getNotaNumero(resultado.nota_mat)
                              const notaCN = getNotaNumero(resultado.nota_cn)

                              return (
                                <tr key={resultado.id || index} className="hover:bg-indigo-50 transition-colors border-b border-gray-100">
                                  <td className="text-center py-1 px-0.5 sm:py-1.5 sm:px-1 md:py-2 md:px-1.5 lg:py-2.5 lg:px-2">
                                    <span className="inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[9px] sm:text-[10px] md:text-xs lg:text-sm">
                                      {index + 1 + (paginaAtual - 1) * itensPorPagina}
                                    </span>
                                  </td>
                                  <td className="py-1 px-0.5 sm:py-1.5 sm:px-1 md:py-2 md:px-1 lg:py-2.5 lg:px-2">
                                    <div className="flex flex-col">
                                      <div className="flex items-center w-full text-left mb-1">
                                        <div className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-9 rounded-full bg-indigo-100 flex items-center justify-center mr-1 sm:mr-1.5 md:mr-2">
                                          <span className="text-indigo-600 font-semibold text-[9px] sm:text-[10px] md:text-xs">
                                            {resultado.aluno?.charAt(0).toUpperCase() || 'A'}
                                          </span>
                                        </div>
                                        <span className="font-semibold text-indigo-600 hover:text-indigo-800 underline text-[10px] sm:text-[11px] md:text-xs lg:text-sm truncate">{resultado.aluno}</span>
                                      </div>
                                      <div className="lg:hidden text-[9px] sm:text-[10px] md:text-xs text-gray-500 space-y-0.5 ml-6 sm:ml-7 md:ml-8 lg:ml-10">
                                        {resultado.escola && <div className="whitespace-normal break-words">Escola: {resultado.escola}</div>}
                                        {resultado.turma && <div>Turma: {resultado.turma}</div>}
                                        {resultado.serie && <div>Série: {resultado.serie}</div>}
                                        <div className="flex items-center gap-2">
                                          <span>Presença: </span>
                                          <span
                                            className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold ${getPresencaColor(
                                              resultado.presenca || 'P'
                                            )}`}
                                          >
                                            {resultado.presenca === 'P' || resultado.presenca === 'p' ? '✓ Presente' : '✗ Falta'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="hidden lg:table-cell py-1 px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-2">
                                    <span className="text-gray-700 font-medium text-[10px] md:text-xs lg:text-sm block whitespace-normal break-words">{resultado.escola}</span>
                                  </td>
                                  <td className="hidden md:table-cell py-1 px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 text-center">
                                    <span className="inline-flex items-center px-1 md:px-1.5 lg:px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-mono text-[9px] md:text-[10px] lg:text-xs font-medium">
                                      {resultado.turma || '-'}
                                    </span>
                                  </td>
                                  <td className="hidden xl:table-cell py-1 px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 text-center">
                                    <span className="inline-flex items-center px-1 md:px-1.5 lg:px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[9px] md:text-[10px] lg:text-xs font-medium">
                                      {resultado.serie || '-'}
                                    </span>
                                  </td>
                                  <td className="hidden lg:table-cell py-1 px-0.5 md:py-2 md:px-1 lg:py-3 lg:px-2 text-center">
                                    <span
                                      className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold shadow-sm ${getPresencaColor(
                                        resultado.presenca || 'P'
                                      )}`}
                                    >
                                      {resultado.presenca === 'P' || resultado.presenca === 'p' ? '✓ Presente' : '✗ Falta'}
                                    </span>
                                  </td>
                                  <td className="py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-3 lg:px-2 text-center">
                                    <div className={`inline-flex flex-col items-center p-0.5 sm:p-1 md:p-1.5 lg:p-2 rounded-lg ${getNotaBgColor(resultado.nota_lp)} w-full max-w-[50px] sm:max-w-[55px] md:max-w-[60px] lg:max-w-[70px]`}>
                                      <div className="text-[9px] sm:text-[10px] md:text-xs text-gray-600 mb-0.5 font-medium">
                                        {resultado.total_acertos_lp || 0}/20
                                      </div>
                                      <div className={`text-[10px] sm:text-[11px] md:text-xs lg:text-sm xl:text-base font-bold ${getNotaColor(resultado.nota_lp)}`}>
                                        {formatarNota(resultado.nota_lp, resultado.presenca, resultado.media_aluno)}
                                      </div>
                                      {notaLP !== null && notaLP !== 0 && (resultado.presenca === 'P' || resultado.presenca === 'p') && (
                                        <div className="w-full bg-gray-200 rounded-full h-0.5 md:h-1 mt-0.5 md:mt-1">
                                          <div
                                            className={`h-0.5 md:h-1 rounded-full ${
                                              notaLP >= 7 ? 'bg-green-500' : notaLP >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                                            }`}
                                            style={{ width: `${Math.min((notaLP / 10) * 100, 100)}%` }}
                                          ></div>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-3 lg:px-2 text-center">
                                    <div className={`inline-flex flex-col items-center p-0.5 sm:p-1 md:p-1.5 lg:p-2 rounded-lg ${getNotaBgColor(resultado.nota_ch)} w-full max-w-[50px] sm:max-w-[55px] md:max-w-[60px] lg:max-w-[70px]`}>
                                      <div className="text-[9px] sm:text-[10px] md:text-xs text-gray-600 mb-0.5 font-medium">
                                        {resultado.total_acertos_ch || 0}/10
                                      </div>
                                      <div className={`text-[10px] sm:text-[11px] md:text-xs lg:text-sm xl:text-base font-bold ${getNotaColor(resultado.nota_ch)}`}>
                                        {formatarNota(resultado.nota_ch, resultado.presenca, resultado.media_aluno)}
                                      </div>
                                      {notaCH !== null && notaCH !== 0 && (resultado.presenca === 'P' || resultado.presenca === 'p') && (
                                        <div className="w-full bg-gray-200 rounded-full h-0.5 md:h-1 mt-0.5 md:mt-1">
                                          <div
                                            className={`h-0.5 md:h-1 rounded-full ${
                                              notaCH >= 7 ? 'bg-green-500' : notaCH >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                                            }`}
                                            style={{ width: `${Math.min((notaCH / 10) * 100, 100)}%` }}
                                          ></div>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-3 lg:px-2 text-center">
                                    <div className={`inline-flex flex-col items-center p-0.5 sm:p-1 md:p-1.5 lg:p-2 rounded-lg ${getNotaBgColor(resultado.nota_mat)} w-full max-w-[50px] sm:max-w-[55px] md:max-w-[60px] lg:max-w-[70px]`}>
                                      <div className="text-[9px] sm:text-[10px] md:text-xs text-gray-600 mb-0.5 font-medium">
                                        {resultado.total_acertos_mat || 0}/20
                                      </div>
                                      <div className={`text-[10px] sm:text-[11px] md:text-xs lg:text-sm xl:text-base font-bold ${getNotaColor(resultado.nota_mat)}`}>
                                        {formatarNota(resultado.nota_mat, resultado.presenca, resultado.media_aluno)}
                                      </div>
                                      {notaMAT !== null && notaMAT !== 0 && (resultado.presenca === 'P' || resultado.presenca === 'p') && (
                                        <div className="w-full bg-gray-200 rounded-full h-0.5 md:h-1 mt-0.5 md:mt-1">
                                          <div
                                            className={`h-0.5 md:h-1 rounded-full ${
                                              notaMAT >= 7 ? 'bg-green-500' : notaMAT >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                                            }`}
                                            style={{ width: `${Math.min((notaMAT / 10) * 100, 100)}%` }}
                                          ></div>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-3 lg:px-2 text-center">
                                    <div className={`inline-flex flex-col items-center p-0.5 sm:p-1 md:p-1.5 lg:p-2 rounded-lg ${getNotaBgColor(resultado.nota_cn)} w-full max-w-[50px] sm:max-w-[55px] md:max-w-[60px] lg:max-w-[70px]`}>
                                      <div className="text-[9px] sm:text-[10px] md:text-xs text-gray-600 mb-0.5 font-medium">
                                        {resultado.total_acertos_cn || 0}/10
                                      </div>
                                      <div className={`text-[10px] sm:text-[11px] md:text-xs lg:text-sm xl:text-base font-bold ${getNotaColor(resultado.nota_cn)}`}>
                                        {formatarNota(resultado.nota_cn, resultado.presenca, resultado.media_aluno)}
                                      </div>
                                      {notaCN !== null && notaCN !== 0 && (resultado.presenca === 'P' || resultado.presenca === 'p') && (
                                        <div className="w-full bg-gray-200 rounded-full h-0.5 md:h-1 mt-0.5 md:mt-1">
                                          <div
                                            className={`h-0.5 md:h-1 rounded-full ${
                                              notaCN >= 7 ? 'bg-green-500' : notaCN >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                                            }`}
                                            style={{ width: `${Math.min((notaCN / 10) * 100, 100)}%` }}
                                          ></div>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-3 lg:px-2 text-center">
                                    <div className={`inline-flex flex-col items-center justify-center px-0.5 sm:px-1 md:px-1.5 lg:px-2 py-0.5 sm:py-1 md:py-1.5 lg:py-2 rounded-xl ${getNotaBgColor(resultado.media_aluno)} border-2 ${
                                      mediaNum !== null && mediaNum >= 7 ? 'border-green-500' : 
                                      mediaNum !== null && mediaNum >= 5 ? 'border-yellow-500' : 
                                      'border-red-500'
                                    } w-full max-w-[50px] sm:max-w-[55px] md:max-w-[60px] lg:max-w-[70px]`}>
                                      <div className={`text-[10px] sm:text-xs md:text-sm lg:text-base xl:text-lg font-extrabold ${getNotaColor(resultado.media_aluno)}`}>
                                        {formatarNota(resultado.media_aluno, resultado.presenca, resultado.media_aluno)}
                                      </div>
                                      {mediaNum !== null && mediaNum !== 0 && (resultado.presenca === 'P' || resultado.presenca === 'p') && (
                                        <div className="mt-0.5 text-[9px] sm:text-[10px] md:text-xs font-medium text-gray-600">
                                          Média
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-1 px-0.5 sm:py-1.5 sm:px-1 md:py-2 md:px-1.5 lg:py-3 lg:px-2 text-center">
                                    <button
                                      onClick={() => {
                                        setAlunoSelecionado({
                                          id: resultado.id || resultado.aluno_id || '',
                                          anoLetivo: filtroAnoLetivo || undefined,
                                        })
                                        setModalAberto(true)
                                      }}
                                      className="w-full inline-flex items-center justify-center px-1 sm:px-1.5 md:px-2 lg:px-3 py-1 sm:py-1 md:py-1.5 lg:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-[9px] sm:text-[10px] md:text-xs font-medium shadow-sm"
                                      title="Ver questões do aluno"
                                    >
                                      <Eye className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4 mr-0.5 sm:mr-1 flex-shrink-0" />
                                      <span className="hidden md:inline">Ver Questões</span>
                                      <span className="md:hidden">Ver</span>
                                    </button>
                                  </td>
                                </tr>
                              )
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Paginação */}
                    {totalPaginas > 1 && (
                      <div className="px-6 py-4 border-t-2 border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-gray-50 to-gray-100">
                        <p className="text-sm font-medium text-gray-700">
                          Mostrando <span className="font-bold text-indigo-600">{((paginaAtual - 1) * itensPorPagina) + 1}</span> até{' '}
                          <span className="font-bold text-indigo-600">{Math.min(paginaAtual * itensPorPagina, alunosOrdenados.length)}</span> de{' '}
                          <span className="font-bold text-gray-900">{alunosOrdenados.length.toLocaleString('pt-BR')}</span> registros
                        </p>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setPaginaAtual(Math.max(1, paginaAtual - 1))} 
                            disabled={paginaAtual === 1} 
                            className="px-4 py-2 text-sm font-medium border-2 border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Anterior
                          </button>
                          <div className="flex gap-1">
                            {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                              let p = i + 1
                              if (totalPaginas > 5) {
                                if (paginaAtual <= 3) p = i + 1
                                else if (paginaAtual >= totalPaginas - 2) p = totalPaginas - 4 + i
                                else p = paginaAtual - 2 + i
                              }
                              return (
                                <button 
                                  key={p} 
                                  onClick={() => setPaginaAtual(p)} 
                                  className={`px-3 py-2 text-sm font-semibold border-2 rounded-lg transition-colors ${
                                    paginaAtual === p 
                                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                                      : 'border-gray-300 hover:bg-gray-100 text-gray-700'
                                  }`}
                                >
                                  {p}
                                </button>
                              )
                            })}
                          </div>
                          <button 
                            onClick={() => setPaginaAtual(Math.min(totalPaginas, paginaAtual + 1))} 
                            disabled={paginaAtual === totalPaginas} 
                            className="px-4 py-2 text-sm font-medium border-2 border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Próximo
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {abaAtiva === 'analises' && dados.analiseAcertosErros && (
                <div className="space-y-6 overflow-x-hidden">
                  {/* Taxa de Acerto Geral */}
                  {dados.analiseAcertosErros.taxaAcertoGeral && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-semibold text-gray-600">Taxa de Acerto</h3>
                          <Target className="w-5 h-5 text-green-600" />
                        </div>
                        <p className="text-3xl font-bold text-green-600">
                          {dados.analiseAcertosErros.taxaAcertoGeral.taxa_acerto_geral.toFixed(2)}%
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {dados.analiseAcertosErros.taxaAcertoGeral.total_acertos.toLocaleString('pt-BR')} de {dados.analiseAcertosErros.taxaAcertoGeral.total_respostas.toLocaleString('pt-BR')} respostas
                        </p>
                      </div>
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-semibold text-gray-600">Taxa de Erro</h3>
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                        </div>
                        <p className="text-3xl font-bold text-red-600">
                          {dados.analiseAcertosErros.taxaAcertoGeral.taxa_erro_geral.toFixed(2)}%
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {dados.analiseAcertosErros.taxaAcertoGeral.total_erros.toLocaleString('pt-BR')} erros
                        </p>
                      </div>
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-semibold text-gray-600">Total de Respostas</h3>
                          <BarChart3 className="w-5 h-5 text-indigo-600" />
                        </div>
                        <p className="text-3xl font-bold text-indigo-600">
                          {dados.analiseAcertosErros.taxaAcertoGeral.total_respostas.toLocaleString('pt-BR')}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Respostas analisadas</p>
                      </div>
                    </div>
                  )}

                  {/* Taxa de Acerto por Disciplina */}
                  {dados.analiseAcertosErros.taxaAcertoPorDisciplina && dados.analiseAcertosErros.taxaAcertoPorDisciplina.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Taxa de Acerto por Disciplina</h3>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={dados.analiseAcertosErros.taxaAcertoPorDisciplina}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis dataKey="disciplina" tick={{ fill: '#6B7280', fontSize: 11 }} />
                            <YAxis domain={[0, 100]} tick={{ fill: '#6B7280', fontSize: 11 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Bar dataKey="taxa_acerto" name="Taxa de Acerto (%)" fill="#10B981" radius={[2, 2, 0, 0]} />
                            <Bar dataKey="taxa_erro" name="Taxa de Erro (%)" fill="#EF4444" radius={[2, 2, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Questões com Mais Erros */}
                  {dados.analiseAcertosErros.questoesComMaisErros && dados.analiseAcertosErros.questoesComMaisErros.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 overflow-x-hidden">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Questões com Mais Erros</h3>
                      <div className="overflow-x-auto">
                        <TabelaPaginada
                          dados={dados.analiseAcertosErros.questoesComMaisErros.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina)}
                          colunas={[
                            { key: 'questao_codigo', label: 'Questão', align: 'center' },
                            { key: 'questao_descricao', label: 'Descrição', align: 'left' },
                            { key: 'disciplina', label: 'Disciplina', align: 'center' },
                            { key: 'total_respostas', label: 'Total', align: 'center' },
                            { key: 'total_acertos', label: 'Acertos', align: 'center' },
                            { key: 'total_erros', label: 'Erros', align: 'center' },
                            { key: 'taxa_acerto', label: 'Taxa Acerto (%)', align: 'center', format: 'decimal' },
                            { key: 'taxa_erro', label: 'Taxa Erro (%)', align: 'center', format: 'decimal' },
                          ]}
                          ordenacao={ordenacao}
                          onOrdenar={handleOrdenacao}
                          paginaAtual={paginaAtual}
                          totalPaginas={Math.ceil(dados.analiseAcertosErros.questoesComMaisErros.length / itensPorPagina)}
                          onPaginar={setPaginaAtual}
                          totalRegistros={dados.analiseAcertosErros.questoesComMaisErros.length}
                          itensPorPagina={itensPorPagina}
                        />
                      </div>
                    </div>
                  )}

                  {/* Escolas com Mais Erros */}
                  {dados.analiseAcertosErros.escolasComMaisErros && dados.analiseAcertosErros.escolasComMaisErros.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 overflow-x-hidden">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Escolas com Mais Erros</h3>
                      <div className="overflow-x-auto">
                        <TabelaPaginada
                          dados={dados.analiseAcertosErros.escolasComMaisErros.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina)}
                          colunas={[
                            { key: 'escola', label: 'Escola', align: 'left' },
                            { key: 'polo', label: 'Polo', align: 'left' },
                            { key: 'total_alunos', label: 'Alunos', align: 'center' },
                            { key: 'total_respostas', label: 'Total', align: 'center' },
                            { key: 'total_acertos', label: 'Acertos', align: 'center' },
                            { key: 'total_erros', label: 'Erros', align: 'center' },
                            { key: 'taxa_acerto', label: 'Taxa Acerto (%)', align: 'center', format: 'decimal' },
                            { key: 'taxa_erro', label: 'Taxa Erro (%)', align: 'center', format: 'decimal' },
                          ]}
                          ordenacao={ordenacao}
                          onOrdenar={handleOrdenacao}
                          paginaAtual={paginaAtual}
                          totalPaginas={Math.ceil(dados.analiseAcertosErros.escolasComMaisErros.length / itensPorPagina)}
                          onPaginar={setPaginaAtual}
                          totalRegistros={dados.analiseAcertosErros.escolasComMaisErros.length}
                          itensPorPagina={itensPorPagina}
                        />
                      </div>
                    </div>
                  )}

                  {/* Turmas com Mais Erros */}
                  {dados.analiseAcertosErros.turmasComMaisErros && dados.analiseAcertosErros.turmasComMaisErros.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 overflow-x-hidden">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Turmas com Mais Erros</h3>
                      <div className="overflow-x-auto">
                        <TabelaPaginada
                          dados={dados.analiseAcertosErros.turmasComMaisErros.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina)}
                          colunas={[
                            { key: 'turma', label: 'Turma', align: 'left' },
                            { key: 'escola', label: 'Escola', align: 'left' },
                            { key: 'serie', label: 'Série', align: 'center' },
                            { key: 'total_alunos', label: 'Alunos', align: 'center' },
                            { key: 'total_respostas', label: 'Total', align: 'center' },
                            { key: 'total_acertos', label: 'Acertos', align: 'center' },
                            { key: 'total_erros', label: 'Erros', align: 'center' },
                            { key: 'taxa_acerto', label: 'Taxa Acerto (%)', align: 'center', format: 'decimal' },
                            { key: 'taxa_erro', label: 'Taxa Erro (%)', align: 'center', format: 'decimal' },
                          ]}
                          ordenacao={ordenacao}
                          onOrdenar={handleOrdenacao}
                          paginaAtual={paginaAtual}
                          totalPaginas={Math.ceil(dados.analiseAcertosErros.turmasComMaisErros.length / itensPorPagina)}
                          onPaginar={setPaginaAtual}
                          totalRegistros={dados.analiseAcertosErros.turmasComMaisErros.length}
                          itensPorPagina={itensPorPagina}
                        />
                      </div>
                    </div>
                  )}

                  {/* Questões com Mais Acertos */}
                  {dados.analiseAcertosErros.questoesComMaisAcertos && dados.analiseAcertosErros.questoesComMaisAcertos.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 overflow-x-hidden">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Questões com Mais Acertos</h3>
                      <div className="overflow-x-auto">
                        <TabelaPaginada
                        dados={dados.analiseAcertosErros.questoesComMaisAcertos.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina)}
                        colunas={[
                          { key: 'questao_codigo', label: 'Questão', align: 'center' },
                          { key: 'questao_descricao', label: 'Descrição', align: 'left' },
                          { key: 'disciplina', label: 'Disciplina', align: 'center' },
                          { key: 'total_respostas', label: 'Total', align: 'center' },
                          { key: 'total_acertos', label: 'Acertos', align: 'center' },
                          { key: 'total_erros', label: 'Erros', align: 'center' },
                          { key: 'taxa_acerto', label: 'Taxa Acerto (%)', align: 'center', format: 'decimal' },
                          { key: 'taxa_erro', label: 'Taxa Erro (%)', align: 'center', format: 'decimal' },
                        ]}
                        ordenacao={ordenacao}
                        onOrdenar={handleOrdenacao}
                        paginaAtual={paginaAtual}
                        totalPaginas={Math.ceil(dados.analiseAcertosErros.questoesComMaisAcertos.length / itensPorPagina)}
                        onPaginar={setPaginaAtual}
                        totalRegistros={dados.analiseAcertosErros.questoesComMaisAcertos.length}
                        itensPorPagina={itensPorPagina}
                      />
                      </div>
                    </div>
                  )}

                  {/* Escolas com Mais Acertos */}
                  {dados.analiseAcertosErros.escolasComMaisAcertos && dados.analiseAcertosErros.escolasComMaisAcertos.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 overflow-x-hidden">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Escolas com Mais Acertos</h3>
                      <div className="overflow-x-auto">
                        <TabelaPaginada
                        dados={dados.analiseAcertosErros.escolasComMaisAcertos.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina)}
                        colunas={[
                          { key: 'escola', label: 'Escola', align: 'left' },
                          { key: 'polo', label: 'Polo', align: 'left' },
                          { key: 'total_alunos', label: 'Alunos', align: 'center' },
                          { key: 'total_respostas', label: 'Total', align: 'center' },
                          { key: 'total_acertos', label: 'Acertos', align: 'center' },
                          { key: 'total_erros', label: 'Erros', align: 'center' },
                          { key: 'taxa_acerto', label: 'Taxa Acerto (%)', align: 'center', format: 'decimal' },
                          { key: 'taxa_erro', label: 'Taxa Erro (%)', align: 'center', format: 'decimal' },
                        ]}
                        ordenacao={ordenacao}
                        onOrdenar={handleOrdenacao}
                        paginaAtual={paginaAtual}
                        totalPaginas={Math.ceil(dados.analiseAcertosErros.escolasComMaisAcertos.length / itensPorPagina)}
                        onPaginar={setPaginaAtual}
                        totalRegistros={dados.analiseAcertosErros.escolasComMaisAcertos.length}
                        itensPorPagina={itensPorPagina}
                      />
                      </div>
                    </div>
                  )}

                  {/* Turmas com Mais Acertos */}
                  {dados.analiseAcertosErros.turmasComMaisAcertos && dados.analiseAcertosErros.turmasComMaisAcertos.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 overflow-x-hidden">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Turmas com Mais Acertos</h3>
                      <div className="overflow-x-auto">
                        <TabelaPaginada
                        dados={dados.analiseAcertosErros.turmasComMaisAcertos.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina)}
                        colunas={[
                          { key: 'turma', label: 'Turma', align: 'left' },
                          { key: 'escola', label: 'Escola', align: 'left' },
                          { key: 'serie', label: 'Série', align: 'center' },
                          { key: 'total_alunos', label: 'Alunos', align: 'center' },
                          { key: 'total_respostas', label: 'Total', align: 'center' },
                          { key: 'total_acertos', label: 'Acertos', align: 'center' },
                          { key: 'total_erros', label: 'Erros', align: 'center' },
                          { key: 'taxa_acerto', label: 'Taxa Acerto (%)', align: 'center', format: 'decimal' },
                          { key: 'taxa_erro', label: 'Taxa Erro (%)', align: 'center', format: 'decimal' },
                        ]}
                        ordenacao={ordenacao}
                        onOrdenar={handleOrdenacao}
                        paginaAtual={paginaAtual}
                        totalPaginas={Math.ceil(dados.analiseAcertosErros.turmasComMaisAcertos.length / itensPorPagina)}
                        onPaginar={setPaginaAtual}
                        totalRegistros={dados.analiseAcertosErros.turmasComMaisAcertos.length}
                        itensPorPagina={itensPorPagina}
                      />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20 bg-white rounded-xl">
              <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-500">Nenhum dado encontrado</p>
              <p className="text-sm text-gray-400">Verifique se existem dados importados</p>
            </div>
          )}
        </div>
        
        {/* Modal de Questões do Aluno */}
        {alunoSelecionado && (
          <ModalQuestoesAluno
            isOpen={modalAberto}
            alunoId={alunoSelecionado.id}
            anoLetivo={alunoSelecionado.anoLetivo}
            onClose={() => {
              setModalAberto(false)
              setAlunoSelecionado(null)
            }}
          />
        )}
      </LayoutDashboard>
    </ProtectedRoute>
  )
}

// Componentes auxiliares
function MetricCard({ titulo, valor, subtitulo, icon: Icon, cor, isDecimal }: any) {
  const cores: Record<string, { bg: string; text: string; border: string; iconBg: string }> = {
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', iconBg: 'bg-indigo-100' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', iconBg: 'bg-blue-100' },
    green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', iconBg: 'bg-green-100' },
    red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', iconBg: 'bg-red-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', iconBg: 'bg-purple-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', iconBg: 'bg-amber-100' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', iconBg: 'bg-rose-100' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', iconBg: 'bg-emerald-100' },
  }

  const corAtual = cores[cor] || cores.indigo

  const formatarValor = () => {
    if (typeof valor === 'number') {
      if (isDecimal) {
        return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      }
      return valor.toLocaleString('pt-BR')
    }
    return valor
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border-2 ${corAtual.border} p-4 hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg ${corAtual.iconBg}`}>
          <Icon className={`w-5 h-5 ${corAtual.text}`} />
        </div>
        {subtitulo && (
          <span className={`text-xs font-semibold ${corAtual.text} bg-white px-2 py-1 rounded-md`}>
            {subtitulo}
          </span>
        )}
      </div>
      <p className={`text-2xl font-bold ${corAtual.text} mb-1`}>
        {formatarValor()}
      </p>
      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">{titulo}</p>
    </div>
  )
}

function DisciplinaCard({ titulo, media, cor, sigla }: any) {
  const cores: Record<string, { bg: string; bar: string; text: string; border: string }> = {
    blue: { bg: 'bg-blue-50', bar: 'bg-blue-500', text: 'text-blue-700', border: 'border-blue-200' },
    purple: { bg: 'bg-purple-50', bar: 'bg-purple-500', text: 'text-purple-700', border: 'border-purple-200' },
    green: { bg: 'bg-green-50', bar: 'bg-green-500', text: 'text-green-700', border: 'border-green-200' },
    amber: { bg: 'bg-amber-50', bar: 'bg-amber-500', text: 'text-amber-700', border: 'border-amber-200' },
    rose: { bg: 'bg-rose-50', bar: 'bg-rose-500', text: 'text-rose-700', border: 'border-rose-200' },
  }
  const c = cores[cor] || cores.blue
  const porcentagem = Math.min((media / 10) * 100, 100)

  return (
    <div className={`${c.bg} rounded-xl p-4 border-2 ${c.border} hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">{sigla}</span>
        <span className={`text-xl font-bold ${c.text}`}>
          {media > 0 ? media.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
        </span>
      </div>
      <div className="w-full bg-white rounded-full h-2.5 mb-2 shadow-inner">
        <div 
          className={`h-2.5 rounded-full ${c.bar} transition-all duration-500 shadow-sm`} 
          style={{ width: `${porcentagem}%` }}
        ></div>
      </div>
      <p className="text-xs font-medium text-gray-600 truncate">{titulo}</p>
      {media > 0 && (
        <p className="text-xs text-gray-500 mt-1">{porcentagem.toFixed(1)}% da nota máxima</p>
      )}
    </div>
  )
}

function TabelaPaginada({ dados, colunas, ordenacao, onOrdenar, paginaAtual, totalPaginas, onPaginar, totalRegistros, itensPorPagina }: any) {
  const formatarValor = (valor: any, formato: string) => {
    if (valor === null || valor === undefined) return (
      <span className="text-gray-400 italic">-</span>
    )
    switch (formato) {
      case 'nota':
        const nota = parseFloat(valor)
        const corNota = nota >= 7 ? 'bg-green-100 text-green-800 border-green-200' :
                       nota >= 5 ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                       'bg-red-100 text-red-800 border-red-200'
        return (
          <span className={`inline-flex items-center justify-center px-3 py-1 rounded-lg text-sm font-bold border-2 ${corNota} min-w-[60px]`}>
            {nota.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        )
      case 'decimal':
        const decimal = parseFloat(valor)
        return (
          <span className="text-sm font-semibold text-gray-700">
            {decimal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        )
      case 'presenca':
        return valor === 'P' ? (
          <span className="inline-flex items-center justify-center px-3 py-1 rounded-lg text-xs font-bold bg-green-100 text-green-800 border-2 border-green-300">
            ✓ Presente
          </span>
        ) : (
          <span className="inline-flex items-center justify-center px-3 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-800 border-2 border-red-300">
            ✗ Faltante
          </span>
        )
      case 'nivel':
        const nivelCores: Record<string, string> = {
          'Insuficiente': 'bg-red-100 text-red-800 border-red-300',
          'Básico': 'bg-yellow-100 text-yellow-800 border-yellow-300',
          'Adequado': 'bg-blue-100 text-blue-800 border-blue-300',
          'Avançado': 'bg-green-100 text-green-800 border-green-300',
          'Não classificado': 'bg-gray-100 text-gray-600 border-gray-300',
        }
        return valor ? (
          <span className={`inline-flex items-center justify-center px-3 py-1 rounded-lg text-xs font-bold border-2 ${nivelCores[valor] || 'bg-gray-100 text-gray-600 border-gray-300'}`}>
            {valor}
          </span>
        ) : (
          <span className="text-gray-400 italic text-xs">Não classificado</span>
        )
      default:
        return <span className="text-sm text-gray-700">{valor}</span>
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-md border-2 border-gray-200 overflow-hidden w-full">
      <div className="overflow-x-auto max-w-full" style={{ maxWidth: '100%' }}>
        <table className="w-full">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
            <tr>
              {colunas.map((col: any) => (
                <th
                  key={col.key}
                  onClick={() => onOrdenar(col.key)}
                  className={`px-4 py-4 text-${col.align || 'left'} text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 select-none whitespace-nowrap transition-colors`}
                >
                  <div className={`flex items-center gap-2 ${col.align === 'center' ? 'justify-center' : col.align === 'right' ? 'justify-end' : ''}`}>
                    {col.label}
                    {ordenacao.coluna === col.key && (
                      ordenacao.direcao === 'asc' ? 
                        <ChevronUp className="w-4 h-4 text-indigo-600" /> : 
                        <ChevronDown className="w-4 h-4 text-indigo-600" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {dados.length === 0 ? (
              <tr>
                <td colSpan={colunas.length} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <Table className="w-12 h-12 text-gray-300 mb-2" />
                    <p className="text-gray-500 font-medium">Nenhum registro encontrado</p>
                    <p className="text-sm text-gray-400 mt-1">Tente ajustar os filtros</p>
                  </div>
                </td>
              </tr>
            ) : (
              dados.map((row: any, i: number) => (
                <tr 
                  key={i} 
                  className="hover:bg-indigo-50/30 transition-colors border-b border-gray-100"
                >
                  {colunas.map((col: any) => {
                    const valor = row[col.key]
                    const isNumero = typeof valor === 'number'
                    const alignClass = col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                    
                    return (
                      <td 
                        key={col.key} 
                        className={`px-4 py-3 ${alignClass} whitespace-nowrap align-middle`}
                      >
                        {col.format ? formatarValor(valor, col.format) : (
                          <span className={`text-sm ${isNumero ? 'font-semibold text-gray-800' : 'font-medium text-gray-700'}`}>
                            {valor !== null && valor !== undefined 
                              ? (isNumero ? valor.toLocaleString('pt-BR') : valor)
                              : <span className="text-gray-400 italic">-</span>
                            }
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {totalPaginas > 1 && (
        <div className="px-6 py-4 border-t-2 border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-gray-50 to-gray-100">
          <p className="text-sm font-medium text-gray-700">
            Mostrando <span className="font-bold text-indigo-600">{((paginaAtual - 1) * itensPorPagina) + 1}</span> até{' '}
            <span className="font-bold text-indigo-600">{Math.min(paginaAtual * itensPorPagina, totalRegistros)}</span> de{' '}
            <span className="font-bold text-gray-900">{totalRegistros.toLocaleString('pt-BR')}</span> registros
          </p>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => onPaginar(Math.max(1, paginaAtual - 1))} 
              disabled={paginaAtual === 1} 
              className="px-4 py-2 text-sm font-medium border-2 border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                let p = i + 1
                if (totalPaginas > 5) {
                  if (paginaAtual <= 3) p = i + 1
                  else if (paginaAtual >= totalPaginas - 2) p = totalPaginas - 4 + i
                  else p = paginaAtual - 2 + i
                }
                return (
                  <button 
                    key={p} 
                    onClick={() => onPaginar(p)} 
                    className={`px-3 py-2 text-sm font-semibold border-2 rounded-lg transition-colors ${
                      paginaAtual === p 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                        : 'border-gray-300 hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    {p}
                  </button>
                )
              })}
            </div>
            <button 
              onClick={() => onPaginar(Math.min(totalPaginas, paginaAtual + 1))} 
              disabled={paginaAtual === totalPaginas} 
              className="px-4 py-2 text-sm font-medium border-2 border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Próximo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
