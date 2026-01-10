'use client'

import ProtectedRoute from '@/components/protected-route'
import LayoutDashboard from '@/components/layout-dashboard'
import ModalQuestoesAluno from '@/components/modal-questoes-aluno'
import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import {
  Users, School, GraduationCap, MapPin, TrendingUp, TrendingDown,
  Filter, X, ChevronDown, ChevronUp, RefreshCw, Download,
  BookOpen, Calculator, Award, UserCheck, UserX, BarChart3,
  Table, PieChartIcon, Activity, Layers, Eye, EyeOff, AlertTriangle, Target, WifiOff, Search, Zap
} from 'lucide-react'
import { obterDisciplinasPorSerieSync } from '@/lib/disciplinas-por-serie'
import * as offlineStorage from '@/lib/offline-storage'
import {
  compararSeries as compararSeriesLib,
  compararDisciplinas as compararDisciplinasLib,
  isAnosIniciais as isAnosIniciaisLib,
  getDisciplinasValidas
} from '@/lib/disciplinas-mapping'
import { useDebouncedCallback } from '@/lib/hooks/useDebounce'

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
  mediasPorSerie: { serie: string; total_alunos: number; presentes: number; media_geral: number; media_lp: number; media_mat: number; media_ch: number | null; media_cn: number | null; media_prod: number | null }[]
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
  // Resumos por série para cálculo dinâmico (evita chamadas de API ao filtrar por série)
  resumosPorSerie?: {
    questoes: {
      questao_codigo: string
      questao_descricao: string
      disciplina: string
      serie: string
      total_respostas: number
      total_acertos: number
      total_erros: number
    }[]
    escolas: {
      escola_id: string
      escola: string
      polo: string
      serie: string
      disciplina: string
      total_respostas: number
      total_acertos: number
      total_erros: number
      total_alunos: number
    }[]
    turmas: {
      turma_id: string
      turma: string
      escola: string
      serie: string
      disciplina: string
      total_respostas: number
      total_acertos: number
      total_erros: number
      total_alunos: number
    }[]
    disciplinas: {
      disciplina: string
      serie: string
      total_respostas: number
      total_acertos: number
      total_erros: number
    }[]
  }
}

const COLORS = {
  primary: '#4F46E5',
  niveis: {
    'Insuficiente': '#EF4444',
    'Básico': '#F59E0B',
    'Basico': '#F59E0B',
    'Adequado': '#3B82F6',
    'Avançado': '#10B981',
    'Avancado': '#10B981',
    'Não classificado': '#9CA3AF',
    'Nao classificado': '#9CA3AF',
    // Códigos de nível (N1, N2, N3, N4)
    'N1': '#EF4444',  // Insuficiente - Vermelho
    'N2': '#F59E0B',  // Básico - Amarelo
    'N3': '#3B82F6',  // Adequado - Azul
    'N4': '#10B981'   // Avançado - Verde
  },
  disciplinas: {
    lp: '#3B82F6',
    mat: '#8B5CF6',
    ch: '#10B981',
    cn: '#F59E0B',
    prod: '#EC4899'
  },
  faixas: ['#EF4444', '#F97316', '#FBBF24', '#84CC16', '#22C55E'],
  ranking: ['#4F46E5', '#7C3AED', '#2563EB', '#0891B2', '#059669', '#D97706', '#DC2626', '#DB2777']
}

// Mapeamento de códigos de nível para nomes completos
const NIVEL_NAMES: Record<string, string> = {
  'N1': 'Insuficiente',
  'N2': 'Básico',
  'N3': 'Adequado',
  'N4': 'Avançado',
  'Insuficiente': 'Insuficiente',
  'Básico': 'Básico',
  'Basico': 'Básico',
  'Adequado': 'Adequado',
  'Avançado': 'Avançado',
  'Avancado': 'Avançado',
  'Não classificado': 'Não classificado',
  'Nao classificado': 'Não classificado'
}

const getNivelName = (nivel: string): string => {
  return NIVEL_NAMES[nivel] || nivel
}

// Função para formatar série no padrão "Xº Ano"
const formatarSerie = (serie: string | null | undefined): string => {
  if (!serie) return '-'

  // Se já está no formato correto (ex: "2º Ano", "5º Ano"), retorna como está
  if (serie.toLowerCase().includes('ano')) return serie

  // Extrai o número da série
  const numeroMatch = serie.match(/(\d+)/)
  if (!numeroMatch) return serie

  const numero = numeroMatch[1]
  return `${numero}º Ano`
}

// Funções helper para formatação
const getPresencaColor = (presenca: string) => {
  if (presenca === 'P' || presenca === 'p') {
    return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'
  }
  if (presenca === '-') {
    return 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400'
  }
  return 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'
}

const formatarNota = (nota: number | string | null | undefined, presenca?: string, mediaAluno?: number | string | null): string => {
  // Se não houver dados de frequência, sempre retornar "-"
  if (presenca === '-') {
    return '-'
  }
  
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
  return num.toFixed(2)
}

const getNotaNumero = (nota: number | string | null | undefined): number | null => {
  if (nota === null || nota === undefined || nota === '') return null
  const num = typeof nota === 'string' ? parseFloat(nota) : nota
  return isNaN(num) ? null : num
}

const getNotaColor = (nota: number | string | null | undefined) => {
  const num = getNotaNumero(nota)
  if (num === null) return 'text-gray-500 dark:text-gray-400'
  if (num >= 7) return 'text-green-600 dark:text-green-400 font-semibold'
  if (num >= 5) return 'text-yellow-600 dark:text-yellow-400 font-semibold'
  return 'text-red-600 dark:text-red-400 font-semibold'
}

const getNotaBgColor = (nota: number | string | null | undefined) => {
  const num = getNotaNumero(nota)
  if (num === null) return 'bg-gray-50 dark:bg-slate-700'
  if (num >= 7) return 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800'
  if (num >= 5) return 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800'
  return 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800'
}

export default function DadosPage() {
  // Estado para modo offline e cache
  const [usandoDadosOffline, setUsandoDadosOffline] = useState(false)
  const [modoOffline, setModoOffline] = useState(false)
  const [usandoCache, setUsandoCache] = useState(false) // Indica se está usando dados do cache local

  // Componente auxiliar para tooltip customizado
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Filtrar valores null/undefined para não mostrar disciplinas não aplicáveis
      const filteredPayload = payload.filter((entry: any) => entry.value !== null && entry.value !== undefined)
      if (filteredPayload.length === 0) return null

      return (
        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 text-sm">
          <p className="font-semibold text-gray-900 dark:text-white mb-1">{label}</p>
          {filteredPayload.map((entry: any, index: number) => {
            // Formatar valor: inteiro para contagens, decimal para médias/notas
            const isContagem = entry.name === 'Alunos' || entry.dataKey === 'quantidade' || entry.dataKey === 'total_alunos'
            const valorFormatado = typeof entry.value === 'number'
              ? (isContagem ? Math.round(entry.value).toLocaleString('pt-BR') : entry.value.toFixed(2))
              : entry.value
            return (
              <p key={index} style={{ color: entry.color }} className="flex justify-between gap-4">
                <span>{entry.name}:</span>
                <span className="font-medium">{valorFormatado}</span>
              </p>
            )
          })}
        </div>
      )
    }
    return null
  }

  const [dados, setDados] = useState<DashboardData | null>(null)
  const [dadosCache, setDadosCache] = useState<DashboardData | null>(null) // Cache dos dados completos para filtragem local
  const [filtrosCache, setFiltrosCache] = useState<{
    polo_id: string
    escola_id: string
    turma_id: string
    ano_letivo: string
    presenca: string
    nivel: string
    faixa_media: string
    disciplina: string
    tipo_ensino: string
    taxa_acerto_min: string
    taxa_acerto_max: string
    questao_codigo: string
  } | null>(null) // Filtros usados no cache (exceto série)
  const [carregando, setCarregando] = useState(false)
  const [carregandoEmSegundoPlano, setCarregandoEmSegundoPlano] = useState(false) // Loading sem ocultar dados atuais
  const [erro, setErro] = useState<string | null>(null)
  const [pesquisaRealizada, setPesquisaRealizada] = useState(false)

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
  const [filtroTipoEnsino, setFiltroTipoEnsino] = useState('')

  // Visualização
  const [abaAtiva, setAbaAtiva] = useState<'visao_geral' | 'escolas' | 'turmas' | 'alunos' | 'analises'>('visao_geral')
  const [ordenacao, setOrdenacao] = useState<{ coluna: string; direcao: 'asc' | 'desc' }>({ coluna: 'media_geral', direcao: 'desc' })
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [itensPorPagina] = useState(50)

  // Estado inicial padrão para paginação das análises (evita duplicação)
  const PAGINACAO_ANALISES_INICIAL = {
    questoesErros: 1,
    escolasErros: 1,
    turmasErros: 1,
    questoesAcertos: 1,
    escolasAcertos: 1,
    turmasAcertos: 1
  }

  // Paginação consolidada para aba Análises (reduz de 6 useState para 1)
  const [paginasAnalises, setPaginasAnalises] = useState(PAGINACAO_ANALISES_INICIAL)

  // Modal de questões
  const [modalAberto, setModalAberto] = useState(false)
  const [alunoSelecionado, setAlunoSelecionado] = useState<{
    id: string;
    anoLetivo?: string;
    mediaAluno?: number | string | null;
    notasDisciplinas?: {
      nota_lp?: number | string | null;
      nota_ch?: number | string | null;
      nota_mat?: number | string | null;
      nota_cn?: number | string | null;
    };
  } | null>(null)
  
  // Usuário e tipo de usuário
  const [tipoUsuario, setTipoUsuario] = useState<string>('admin')
  const [usuario, setUsuario] = useState<any>(null)
  const [escolaNome, setEscolaNome] = useState<string>('')
  const [poloNome, setPoloNome] = useState<string>('')

  const carregarDados = async (forcarAtualizacao: boolean = false, signal?: AbortSignal, emSegundoPlano: boolean = false, serieOverride?: string) => {
    // Se em segundo plano, não oculta os dados atuais
    if (emSegundoPlano) {
      setCarregandoEmSegundoPlano(true)
    } else {
      setCarregando(true)
    }
    setErro(null)

    // Usar serieOverride se fornecido, senão usar o estado atual
    const serieParaFiltrar = serieOverride !== undefined ? serieOverride : filtroSerie

    // Verificar se já foi cancelado antes de iniciar
    if (signal?.aborted) {
      return
    }

    // Verificar se está offline
    const online = offlineStorage.isOnline()
    setModoOffline(!online)

    // MODO OFFLINE: Usar dados do localStorage diretamente
    if (!online) {
      console.log('[Dados] Carregando dados do localStorage (modo offline)')
      setUsandoDadosOffline(true)

      // Carregar dados do localStorage
      const polosOffline = offlineStorage.getPolos()
      const escolasOffline = offlineStorage.getEscolas()
      const turmasOffline = offlineStorage.getTurmas()

      // Usar função de filtro do offlineStorage
      const resultadosFiltrados = offlineStorage.filterResultados({
        polo_id: filtroPoloId,
        escola_id: filtroEscolaId,
        turma_id: filtroTurmaId,
        serie: serieParaFiltrar,
        ano_letivo: filtroAnoLetivo,
        presenca: filtroPresenca
      })

      console.log('[Dados] Dados offline carregados:', {
        polos: polosOffline.length,
        escolas: escolasOffline.length,
        turmas: turmasOffline.length,
        resultados: resultadosFiltrados.length
      })

      // Calcular estatísticas usando função do offlineStorage
      const estatisticas = offlineStorage.calcularEstatisticas(resultadosFiltrados)

      // =====================================================
      // OTIMIZAÇÃO: Agregar todas as estatísticas em uma única passagem O(n)
      // Em vez de múltiplas iterações O(n²) a O(n⁴)
      // =====================================================

      // Helpers definidos uma única vez
      const toNum = (v: any) => typeof v === 'string' ? parseFloat(v) || 0 : (v || 0)

      // Pré-criar mapas de lookup para evitar .find() em loops
      const escolaParaPolo = new Map<string, string>()
      const escolaNomes = new Map<string, string>()
      const poloNomes = new Map<string, string>()
      const turmaNomes = new Map<string, { codigo: string; escola_id: string; serie: string }>()

      for (const e of escolasOffline) {
        escolaParaPolo.set(String(e.id), String(e.polo_id))
        escolaNomes.set(String(e.id), e.nome)
      }
      for (const p of polosOffline) {
        poloNomes.set(String(p.id), p.nome)
      }
      for (const t of turmasOffline) {
        turmaNomes.set(String(t.id), { codigo: t.codigo, escola_id: String(t.escola_id), serie: t.serie })
      }

      // Estruturas para acumular estatísticas em uma única passagem
      interface Acumulador {
        total: number
        presentes: number
        faltantes: number
        soma_geral: number; count_geral: number
        soma_lp: number; count_lp: number
        soma_mat: number; count_mat: number
        soma_ch: number; count_ch: number
        soma_cn: number; count_cn: number
        soma_prod: number; count_prod: number
      }
      const criarAcumulador = (): Acumulador => ({
        total: 0, presentes: 0, faltantes: 0,
        soma_geral: 0, count_geral: 0,
        soma_lp: 0, count_lp: 0,
        soma_mat: 0, count_mat: 0,
        soma_ch: 0, count_ch: 0,
        soma_cn: 0, count_cn: 0,
        soma_prod: 0, count_prod: 0
      })

      const niveisMap: Record<string, number> = {}
      const seriesMap = new Map<string, Acumulador>()
      const polosMap = new Map<string, Acumulador>()
      const escolasMap = new Map<string, Acumulador>()
      const turmasMap = new Map<string, Acumulador>()
      const faixasCount = [0, 0, 0, 0, 0] // 0-2, 2-4, 4-6, 6-8, 8-10

      // UMA ÚNICA PASSAGEM para agregar todas as estatísticas
      for (const r of resultadosFiltrados) {
        const presencaUpper = r.presenca?.toString().toUpperCase()
        const isPresente = presencaUpper === 'P'
        const isFaltante = presencaUpper === 'F'

        // Níveis
        const nivel = r.nivel_aprendizagem || 'Não classificado'
        niveisMap[nivel] = (niveisMap[nivel] || 0) + 1

        // Valores numéricos
        const mediaAluno = toNum(r.media_aluno)
        const notaLp = toNum(r.nota_lp)
        const notaMat = toNum(r.nota_mat)
        const notaCh = toNum(r.nota_ch)
        const notaCn = toNum(r.nota_cn)
        const notaProd = toNum(r.nota_producao)

        // Faixas de nota (apenas presentes com média > 0)
        if (isPresente && mediaAluno > 0) {
          if (mediaAluno < 2) faixasCount[0]++
          else if (mediaAluno < 4) faixasCount[1]++
          else if (mediaAluno < 6) faixasCount[2]++
          else if (mediaAluno < 8) faixasCount[3]++
          else faixasCount[4]++
        }

        // Função para acumular valores
        const acumular = (acc: Acumulador) => {
          acc.total++
          if (isPresente) {
            acc.presentes++
            if (mediaAluno > 0) { acc.soma_geral += mediaAluno; acc.count_geral++ }
            if (notaLp > 0) { acc.soma_lp += notaLp; acc.count_lp++ }
            if (notaMat > 0) { acc.soma_mat += notaMat; acc.count_mat++ }
            if (notaCh > 0) { acc.soma_ch += notaCh; acc.count_ch++ }
            if (notaCn > 0) { acc.soma_cn += notaCn; acc.count_cn++ }
            if (notaProd > 0) { acc.soma_prod += notaProd; acc.count_prod++ }
          }
          if (isFaltante) acc.faltantes++
        }

        // Por série
        if (r.serie) {
          if (!seriesMap.has(r.serie)) seriesMap.set(r.serie, criarAcumulador())
          acumular(seriesMap.get(r.serie)!)
        }

        // Por escola
        const escolaId = String(r.escola_id)
        if (!escolasMap.has(escolaId)) escolasMap.set(escolaId, criarAcumulador())
        acumular(escolasMap.get(escolaId)!)

        // Por polo (usando lookup map)
        const poloId = escolaParaPolo.get(escolaId)
        if (poloId) {
          if (!polosMap.has(poloId)) polosMap.set(poloId, criarAcumulador())
          acumular(polosMap.get(poloId)!)
        }

        // Por turma
        const turmaId = String(r.turma_id)
        if (turmaId && turmaId !== 'undefined' && turmaId !== 'null') {
          if (!turmasMap.has(turmaId)) turmasMap.set(turmaId, criarAcumulador())
          acumular(turmasMap.get(turmaId)!)
        }
      }

      // Função para converter acumulador em médias
      const calcMedia = (soma: number, count: number) => count > 0 ? soma / count : 0

      // Construir dados do dashboard a partir dos dados agregados
      const dadosOffline: DashboardData = {
        metricas: {
          total_alunos: estatisticas.total,
          total_escolas: escolasOffline.length,
          total_turmas: turmasOffline.length,
          total_polos: polosOffline.length,
          total_presentes: estatisticas.presentes,
          total_faltantes: estatisticas.faltosos,
          media_geral: estatisticas.media_geral,
          media_lp: estatisticas.media_lp,
          media_mat: estatisticas.media_mat,
          media_ch: estatisticas.media_ch,
          media_cn: estatisticas.media_cn,
          media_producao: 0,
          menor_media: 0,
          maior_media: 10,
          taxa_presenca: estatisticas.total > 0 ? (estatisticas.presentes / estatisticas.total) * 100 : 0
        },
        niveis: Object.entries(niveisMap).map(([nivel, quantidade]) => ({ nivel, quantidade })),
        mediasPorSerie: Array.from(seriesMap.entries()).map(([serie, acc]) => {
          // Verificar se é anos iniciais (2º, 3º, 5º) ou anos finais (6º-9º)
          const numeroSerie = serie.match(/(\d+)/)?.[1]
          const isAnosIniciais = numeroSerie === '2' || numeroSerie === '3' || numeroSerie === '5'
          const isAnosFinais = numeroSerie === '6' || numeroSerie === '7' || numeroSerie === '8' || numeroSerie === '9'

          return {
            serie,
            total_alunos: acc.total,
            presentes: acc.presentes,
            media_geral: calcMedia(acc.soma_geral, acc.count_geral),
            media_lp: calcMedia(acc.soma_lp, acc.count_lp),
            media_mat: calcMedia(acc.soma_mat, acc.count_mat),
            // CH e CN apenas para anos finais
            media_ch: isAnosFinais ? calcMedia(acc.soma_ch, acc.count_ch) : null,
            media_cn: isAnosFinais ? calcMedia(acc.soma_cn, acc.count_cn) : null,
            // PROD apenas para anos iniciais
            media_prod: isAnosIniciais ? calcMedia(acc.soma_prod, acc.count_prod) : null
          }
        }).sort((a, b) => a.serie.localeCompare(b.serie)),
        mediasPorPolo: polosOffline.map((p) => {
          const acc = polosMap.get(String(p.id)) || criarAcumulador()
          return {
            polo_id: p.id.toString(),
            polo: p.nome,
            total_alunos: acc.total,
            media_geral: calcMedia(acc.soma_geral, acc.count_geral),
            media_lp: calcMedia(acc.soma_lp, acc.count_lp),
            media_mat: calcMedia(acc.soma_mat, acc.count_mat),
            presentes: acc.presentes,
            faltantes: acc.faltantes
          }
        }),
        mediasPorEscola: escolasOffline.map((e) => {
          const acc = escolasMap.get(String(e.id)) || criarAcumulador()
          return {
            escola_id: e.id.toString(),
            escola: e.nome,
            polo: poloNomes.get(String(e.polo_id)) || '',
            total_alunos: acc.total,
            media_geral: calcMedia(acc.soma_geral, acc.count_geral),
            media_lp: calcMedia(acc.soma_lp, acc.count_lp),
            media_mat: calcMedia(acc.soma_mat, acc.count_mat),
            media_ch: calcMedia(acc.soma_ch, acc.count_ch),
            media_cn: calcMedia(acc.soma_cn, acc.count_cn),
            presentes: acc.presentes,
            faltantes: acc.faltantes
          }
        }),
        mediasPorTurma: turmasOffline.map(t => {
          const acc = turmasMap.get(String(t.id)) || criarAcumulador()
          if (acc.total === 0) return null
          return {
            turma_id: t.id.toString(),
            turma: t.codigo,
            escola: escolaNomes.get(String(t.escola_id)) || '',
            serie: t.serie,
            total_alunos: acc.total,
            media_geral: calcMedia(acc.soma_geral, acc.count_geral),
            media_lp: calcMedia(acc.soma_lp, acc.count_lp),
            media_mat: calcMedia(acc.soma_mat, acc.count_mat),
            presentes: acc.presentes,
            faltantes: acc.faltantes
          }
        }).filter((t): t is NonNullable<typeof t> => t !== null),
        faixasNota: [
          { faixa: '0 a 2', quantidade: faixasCount[0] },
          { faixa: '2 a 4', quantidade: faixasCount[1] },
          { faixa: '4 a 6', quantidade: faixasCount[2] },
          { faixa: '6 a 8', quantidade: faixasCount[3] },
          { faixa: '8 a 10', quantidade: faixasCount[4] }
        ],
        presenca: [
          { status: 'Presentes', quantidade: estatisticas.presentes },
          { status: 'Faltantes', quantidade: estatisticas.faltosos }
        ],
        topAlunos: (() => {
          // Top 10 alunos com maior média
          const toNum = (v: any) => typeof v === 'string' ? parseFloat(v) || 0 : (v || 0)
          const presentes = resultadosFiltrados.filter(r => r.presenca?.toString().toUpperCase() === 'P')
          return presentes
            .map(r => ({
              nome: r.aluno_nome,
              escola: r.escola_nome,
              media_geral: toNum(r.media_aluno)
            }))
            .filter(a => a.media_geral > 0)
            .sort((a, b) => b.media_geral - a.media_geral)
            .slice(0, 10)
        })(),
        alunosDetalhados: resultadosFiltrados.map((r) => {
          const toNum = (v: any) => typeof v === 'string' ? parseFloat(v) || 0 : (v || 0)
          return {
            id: r.id,
            aluno_id: r.aluno_id,
            aluno: r.aluno_nome,
            escola: r.escola_nome,
            serie: r.serie,
            turma: r.turma_codigo,
            presenca: r.presenca,
            media_aluno: toNum(r.media_aluno),
            nota_lp: toNum(r.nota_lp),
            nota_mat: toNum(r.nota_mat),
            nota_ch: toNum(r.nota_ch),
            nota_cn: toNum(r.nota_cn),
            nota_producao: toNum(r.nota_producao),
            // Campos de acertos para exibição
            acertos_lp: toNum(r.total_acertos_lp),
            acertos_mat: toNum(r.total_acertos_mat),
            acertos_ch: toNum(r.total_acertos_ch),
            acertos_cn: toNum(r.total_acertos_cn),
            // Campos de configuração de questões por série
            qtd_questoes_lp: r.qtd_questoes_lp,
            qtd_questoes_mat: r.qtd_questoes_mat,
            qtd_questoes_ch: r.qtd_questoes_ch,
            qtd_questoes_cn: r.qtd_questoes_cn,
            nivel_aprendizagem: r.nivel_aprendizagem || 'Não classificado'
          }
        }),
        filtros: {
          polos: polosOffline.map((p) => ({ id: p.id.toString(), nome: p.nome })),
          escolas: escolasOffline.map((e) => ({ id: e.id.toString(), nome: e.nome, polo_id: e.polo_id?.toString() || '' })),
          series: offlineStorage.getSeries(),
          turmas: turmasOffline.map((t) => ({ id: t.id.toString(), codigo: t.codigo, escola_id: t.escola_id?.toString() || '' })),
          anosLetivos: offlineStorage.getAnosLetivos(),
          niveis: [],
          faixasMedia: []
        }
      }

      // Verificar se foi cancelado antes de atualizar estado
      if (signal?.aborted) {
        return
      }

      setDados(dadosOffline)
      setCarregando(false)
      setCarregandoEmSegundoPlano(false)
      return
    }

    // MODO ONLINE: Buscar da API
    try {
      const params = new URLSearchParams()
      if (filtroPoloId) params.append('polo_id', filtroPoloId)
      if (filtroEscolaId) params.append('escola_id', filtroEscolaId)
      if (serieParaFiltrar) params.append('serie', serieParaFiltrar)
      if (filtroTurmaId) params.append('turma_id', filtroTurmaId)
      if (filtroAnoLetivo) params.append('ano_letivo', filtroAnoLetivo)
      if (filtroPresenca) params.append('presenca', filtroPresenca)
      if (filtroTipoEnsino) params.append('tipo_ensino', filtroTipoEnsino)
      if (filtroNivel) params.append('nivel', filtroNivel)
      if (filtroFaixaMedia) params.append('faixa_media', filtroFaixaMedia)
      if (filtroDisciplina) params.append('disciplina', filtroDisciplina)
      if (filtroTaxaAcertoMin) params.append('taxa_acerto_min', filtroTaxaAcertoMin)
      if (filtroTaxaAcertoMax) params.append('taxa_acerto_max', filtroTaxaAcertoMax)
      if (filtroQuestaoCodigo) params.append('questao_codigo', filtroQuestaoCodigo)
      // Aumentar limite de alunos para trazer todos (paginação feita no frontend)
      params.append('limite_alunos', '10000')
      // Forçar atualização do cache quando clicado no botão Atualizar
      if (forcarAtualizacao) params.append('atualizar_cache', 'true')

      const response = await fetch(`/api/admin/dashboard-dados?${params}`, { signal })

      // Verificar se foi cancelado durante o fetch
      if (signal?.aborted) {
        return
      }

      const data = await response.json()

      // Verificar novamente após parse do JSON
      if (signal?.aborted) {
        return
      }

      if (response.ok) {
        setDados(data)
        setUsandoDadosOffline(false)
        setUsandoCache(false) // Dados vieram da API, não do cache
        // Salvar no cache se não tem filtro de série (dados completos para filtragem local)
        if (!serieParaFiltrar) {
          setDadosCache(data)
          // Salvar os filtros usados para verificar se pode usar cache depois
          setFiltrosCache({
            polo_id: filtroPoloId,
            escola_id: filtroEscolaId,
            turma_id: filtroTurmaId,
            ano_letivo: filtroAnoLetivo,
            presenca: filtroPresenca,
            nivel: filtroNivel,
            faixa_media: filtroFaixaMedia,
            disciplina: filtroDisciplina,
            tipo_ensino: filtroTipoEnsino,
            taxa_acerto_min: filtroTaxaAcertoMin,
            taxa_acerto_max: filtroTaxaAcertoMax,
            questao_codigo: filtroQuestaoCodigo
          })
        }
      } else {
        setErro(data.mensagem || 'Erro ao carregar dados')
      }
    } catch (error: any) {
      // Ignorar erros de abort - são esperados quando filtros mudam rápido
      if (error.name === 'AbortError') {
        return
      }

      console.error('[Dados] Erro ao carregar dados:', error)

      // Fallback para dados offline em caso de erro de rede
      if (offlineStorage.hasOfflineData()) {
        console.log('[Dados] Fallback para dados offline após erro de rede')
        setUsandoDadosOffline(true)
        setModoOffline(true)
        // Recarregar usando modo offline
        await carregarDados(false, signal)
        return
      }

      setErro('Erro de conexão')
    } finally {
      // Só atualizar loading se não foi cancelado
      if (!signal?.aborted) {
        setCarregando(false)
        setCarregandoEmSegundoPlano(false)
      }
    }
  }

  // NÃO carregar automaticamente - apenas quando clicar em Pesquisar
  // useEffect removido para melhorar performance e evitar carregamentos desnecessários

  // Versão debounced do carregarDados para evitar múltiplas chamadas rápidas
  const carregarDadosDebounced = useDebouncedCallback(
    (mostrarLoading: boolean, signal?: AbortSignal, usarFiltroAtual?: boolean, serieOverride?: string) => {
      carregarDados(mostrarLoading, signal, usarFiltroAtual, serieOverride)
    },
    300 // 300ms de debounce
  )

  const limparFiltros = () => {
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
    setFiltroTaxaAcertoMin('')
    setFiltroTaxaAcertoMax('')
    setFiltroQuestaoCodigo('')
    setFiltroTipoEnsino('')
    setPaginaAtual(1)
    // Limpar cache pois os filtros foram resetados
    setDadosCache(null)
    setFiltrosCache(null)
  }

  // Função para verificar se os filtros atuais são iguais aos do cache (exceto série)
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
      filtrosCache.tipo_ensino === filtroTipoEnsino &&
      filtrosCache.taxa_acerto_min === filtroTaxaAcertoMin &&
      filtrosCache.taxa_acerto_max === filtroTaxaAcertoMax &&
      filtrosCache.questao_codigo === filtroQuestaoCodigo
    )
  }, [filtrosCache, filtroPoloId, filtroEscolaId, filtroTurmaId, filtroAnoLetivo, filtroPresenca, filtroNivel, filtroFaixaMedia, filtroDisciplina, filtroTipoEnsino, filtroTaxaAcertoMin, filtroTaxaAcertoMax, filtroQuestaoCodigo])

  // Função para salvar filtros atuais no cache
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
      tipo_ensino: filtroTipoEnsino,
      taxa_acerto_min: filtroTaxaAcertoMin,
      taxa_acerto_max: filtroTaxaAcertoMax,
      questao_codigo: filtroQuestaoCodigo
    })
  }, [filtroPoloId, filtroEscolaId, filtroTurmaId, filtroAnoLetivo, filtroPresenca, filtroNivel, filtroFaixaMedia, filtroDisciplina, filtroTipoEnsino, filtroTaxaAcertoMin, filtroTaxaAcertoMax, filtroQuestaoCodigo])

  // Funções de comparação importadas do módulo centralizado
  const compararSeries = compararSeriesLib
  const compararDisciplinas = compararDisciplinasLib

  // Função para calcular dados de análise a partir dos resumos por série (cálculo dinâmico)
  const calcularAnaliseDeResumos = useCallback((resumos: DashboardData['resumosPorSerie'], serie: string, disciplina?: string) => {
    if (!resumos) return null

    // Filtrar resumos pela série selecionada (se série vazia, manter todos)
    let questoesFiltradas = serie
      ? (resumos.questoes?.filter(q => compararSeries(q.serie, serie)) || [])
      : (resumos.questoes || [])
    let escolasFiltradas = serie
      ? (resumos.escolas?.filter(e => compararSeries(e.serie, serie)) || [])
      : (resumos.escolas || [])
    let turmasFiltradas = serie
      ? (resumos.turmas?.filter(t => compararSeries(t.serie, serie)) || [])
      : (resumos.turmas || [])
    let disciplinasFiltradas = serie
      ? (resumos.disciplinas?.filter(d => compararSeries(d.serie, serie)) || [])
      : (resumos.disciplinas || [])

    // Se há filtro de disciplina, aplicar também (agora escolas e turmas também têm disciplina)
    if (disciplina) {
      questoesFiltradas = questoesFiltradas.filter(q => compararDisciplinas(q.disciplina, disciplina))
      disciplinasFiltradas = disciplinasFiltradas.filter(d => compararDisciplinas(d.disciplina, disciplina))
      escolasFiltradas = escolasFiltradas.filter(e => compararDisciplinas(e.disciplina, disciplina))
      turmasFiltradas = turmasFiltradas.filter(t => compararDisciplinas(t.disciplina, disciplina))
    }

    // Agregar escolas (podem ter múltiplas entradas se não filtradas por disciplina)
    const escolasAgregadas = new Map<string, typeof escolasFiltradas[0] & { disciplinas: Set<string> }>()
    escolasFiltradas.forEach(e => {
      const key = e.escola_id
      if (escolasAgregadas.has(key)) {
        const existing = escolasAgregadas.get(key)!
        existing.total_respostas += e.total_respostas
        existing.total_acertos += e.total_acertos
        existing.total_erros += e.total_erros
        existing.total_alunos = Math.max(existing.total_alunos, e.total_alunos) // Evitar duplicatas de alunos
        existing.disciplinas.add(e.disciplina)
      } else {
        escolasAgregadas.set(key, { ...e, disciplinas: new Set([e.disciplina]) })
      }
    })
    escolasFiltradas = Array.from(escolasAgregadas.values())

    // Agregar turmas (podem ter múltiplas entradas se não filtradas por disciplina)
    const turmasAgregadas = new Map<string, typeof turmasFiltradas[0] & { disciplinas: Set<string> }>()
    turmasFiltradas.forEach(t => {
      const key = t.turma_id
      if (turmasAgregadas.has(key)) {
        const existing = turmasAgregadas.get(key)!
        existing.total_respostas += t.total_respostas
        existing.total_acertos += t.total_acertos
        existing.total_erros += t.total_erros
        existing.total_alunos = Math.max(existing.total_alunos, t.total_alunos) // Evitar duplicatas de alunos
        existing.disciplinas.add(t.disciplina)
      } else {
        turmasAgregadas.set(key, { ...t, disciplinas: new Set([t.disciplina]) })
      }
    })
    turmasFiltradas = Array.from(turmasAgregadas.values())

    // Calcular taxa geral
    const totalRespostasGeral = disciplinasFiltradas.reduce((acc, d) => acc + d.total_respostas, 0)
    const totalAcertosGeral = disciplinasFiltradas.reduce((acc, d) => acc + d.total_acertos, 0)
    const totalErrosGeral = disciplinasFiltradas.reduce((acc, d) => acc + d.total_erros, 0)

    const taxaAcertoGeral = totalRespostasGeral > 0 ? {
      total_respostas: totalRespostasGeral,
      total_acertos: totalAcertosGeral,
      total_erros: totalErrosGeral,
      taxa_acerto_geral: (totalAcertosGeral / totalRespostasGeral) * 100,
      taxa_erro_geral: (totalErrosGeral / totalRespostasGeral) * 100
    } : null

    // Taxa por disciplina
    const taxaAcertoPorDisciplina = disciplinasFiltradas.map(d => ({
      disciplina: d.disciplina,
      total_respostas: d.total_respostas,
      total_acertos: d.total_acertos,
      total_erros: d.total_erros,
      taxa_acerto: d.total_respostas > 0 ? (d.total_acertos / d.total_respostas) * 100 : 0,
      taxa_erro: d.total_respostas > 0 ? (d.total_erros / d.total_respostas) * 100 : 0
    }))

    // Questões com mais erros (ordenar por taxa de erro decrescente)
    const questoesComMaisErros = questoesFiltradas
      .map(q => ({
        questao_codigo: q.questao_codigo,
        questao_descricao: q.questao_descricao,
        disciplina: q.disciplina,
        total_respostas: q.total_respostas,
        total_acertos: q.total_acertos,
        total_erros: q.total_erros,
        taxa_acerto: q.total_respostas > 0 ? (q.total_acertos / q.total_respostas) * 100 : 0,
        taxa_erro: q.total_respostas > 0 ? (q.total_erros / q.total_respostas) * 100 : 0
      }))
      .sort((a, b) => b.taxa_erro - a.taxa_erro)
      .slice(0, 20)

    // Questões com mais acertos (ordenar por taxa de acerto decrescente)
    const questoesComMaisAcertos = questoesFiltradas
      .map(q => ({
        questao_codigo: q.questao_codigo,
        questao_descricao: q.questao_descricao,
        disciplina: q.disciplina,
        total_respostas: q.total_respostas,
        total_acertos: q.total_acertos,
        total_erros: q.total_erros,
        taxa_acerto: q.total_respostas > 0 ? (q.total_acertos / q.total_respostas) * 100 : 0,
        taxa_erro: q.total_respostas > 0 ? (q.total_erros / q.total_respostas) * 100 : 0
      }))
      .sort((a, b) => b.taxa_acerto - a.taxa_acerto)
      .slice(0, 20)

    // Escolas com mais erros
    const escolasComMaisErros = escolasFiltradas
      .map(e => ({
        escola_id: e.escola_id,
        escola: e.escola,
        polo: e.polo,
        total_respostas: e.total_respostas,
        total_acertos: e.total_acertos,
        total_erros: e.total_erros,
        taxa_acerto: e.total_respostas > 0 ? (e.total_acertos / e.total_respostas) * 100 : 0,
        taxa_erro: e.total_respostas > 0 ? (e.total_erros / e.total_respostas) * 100 : 0,
        total_alunos: e.total_alunos
      }))
      .sort((a, b) => b.taxa_erro - a.taxa_erro)

    // Escolas com mais acertos
    const escolasComMaisAcertos = [...escolasComMaisErros].sort((a, b) => b.taxa_acerto - a.taxa_acerto)

    // Turmas com mais erros
    const turmasComMaisErros = turmasFiltradas
      .map(t => ({
        turma_id: t.turma_id,
        turma: t.turma,
        escola: t.escola,
        serie: serie,
        total_respostas: t.total_respostas,
        total_acertos: t.total_acertos,
        total_erros: t.total_erros,
        taxa_acerto: t.total_respostas > 0 ? (t.total_acertos / t.total_respostas) * 100 : 0,
        taxa_erro: t.total_respostas > 0 ? (t.total_erros / t.total_respostas) * 100 : 0,
        total_alunos: t.total_alunos
      }))
      .sort((a, b) => b.taxa_erro - a.taxa_erro)

    // Turmas com mais acertos
    const turmasComMaisAcertos = [...turmasComMaisErros].sort((a, b) => b.taxa_acerto - a.taxa_acerto)

    return {
      taxaAcertoGeral,
      taxaAcertoPorDisciplina,
      questoesComMaisErros,
      questoesComMaisAcertos,
      escolasComMaisErros,
      escolasComMaisAcertos,
      turmasComMaisErros,
      turmasComMaisAcertos
    }
  }, []) // compararSeries e compararDisciplinas são imports estáveis

  // Função para filtrar dados localmente do cache (muito mais rápido que API)
  const filtrarDadosLocal = useCallback((serie: string, disciplina?: string) => {
    if (!dadosCache) return null

    // Se série vazia E disciplina vazia, retorna os dados completos do cache
    if (!serie && !disciplina) return dadosCache

    // Usar funções centralizadas para verificar tipo de ensino e disciplinas válidas
    const isAnosIniciais = isAnosIniciaisLib(serie)
    const disciplinasValidas = getDisciplinasValidas(serie)

    // Filtrar alunos pela série (comparação flexível)
    // Se série vazia, manter todos os alunos
    const alunosFiltrados = serie
      ? (dadosCache.alunosDetalhados?.filter(aluno => compararSeries(aluno.serie, serie)) || [])
      : (dadosCache.alunosDetalhados || [])

    // Filtrar médias por série (comparação flexível)
    // Se série vazia, manter todas as médias
    const mediasPorSerieFiltradas = serie
      ? (dadosCache.mediasPorSerie?.filter(m => compararSeries(m.serie, serie)) || [])
      : (dadosCache.mediasPorSerie || [])

    // Filtrar turmas pela série (comparação flexível)
    // Se série vazia, manter todas as turmas
    const turmasFiltradas = serie
      ? (dadosCache.mediasPorTurma?.filter(t => compararSeries(t.serie, serie)) || [])
      : (dadosCache.mediasPorTurma || [])

    // Filtrar escolas (recalcular baseado nos alunos filtrados)
    const escolasIds = [...new Set(alunosFiltrados.map(a => a.escola_id))]
    const escolasFiltradas = serie
      ? (dadosCache.mediasPorEscola?.filter(e => escolasIds.includes(e.escola_id)) || [])
      : (dadosCache.mediasPorEscola || [])

    // Filtrar análise de acertos/erros
    // PRIORIDADE: Usar cálculo dinâmico a partir de resumosPorSerie (dados corretos por série e disciplina)
    let analiseAcertosErrosFiltrada = dadosCache.analiseAcertosErros

    if (dadosCache.resumosPorSerie && (serie || disciplina)) {
      // Usar cálculo dinâmico - dados precisos por série e disciplina
      const analiseCalculada = calcularAnaliseDeResumos(dadosCache.resumosPorSerie, serie, disciplina)
      if (analiseCalculada) {
        analiseAcertosErrosFiltrada = analiseCalculada
      }
    } else if (dadosCache.analiseAcertosErros) {
      // Fallback: filtrar dados existentes (quando não há resumos)
      // Aplicar filtro de disciplina se selecionada, senão usar disciplinas válidas da série
      const filtrarPorDisciplina = (d: { disciplina: string }) => {
        if (disciplina) {
          return compararDisciplinas(d.disciplina, disciplina)
        }
        return disciplinasValidas.some(dv => d.disciplina.toLowerCase().includes(dv.toLowerCase()))
      }

      const taxaAcertoPorDisciplinaFiltrada = dadosCache.analiseAcertosErros.taxaAcertoPorDisciplina?.filter(filtrarPorDisciplina) || []
      const questoesComMaisErrosFiltradas = dadosCache.analiseAcertosErros.questoesComMaisErros?.filter(filtrarPorDisciplina) || []
      const questoesComMaisAcertosFiltradas = dadosCache.analiseAcertosErros.questoesComMaisAcertos?.filter(filtrarPorDisciplina) || []

      const turmasComMaisErrosFiltradas = dadosCache.analiseAcertosErros.turmasComMaisErros?.filter(t =>
        compararSeries(t.serie, serie)
      ) || []

      const turmasComMaisAcertosFiltradas = dadosCache.analiseAcertosErros.turmasComMaisAcertos?.filter(t =>
        compararSeries(t.serie, serie)
      ) || []

      const escolasComMaisErrosFiltradas = dadosCache.analiseAcertosErros.escolasComMaisErros?.filter(e =>
        escolasIds.includes(e.escola_id)
      ) || []

      const escolasComMaisAcertosFiltradas = dadosCache.analiseAcertosErros.escolasComMaisAcertos?.filter(e =>
        escolasIds.includes(e.escola_id)
      ) || []

      const totalRespostas = taxaAcertoPorDisciplinaFiltrada.reduce((acc, d) => acc + d.total_respostas, 0)
      const totalAcertos = taxaAcertoPorDisciplinaFiltrada.reduce((acc, d) => acc + d.total_acertos, 0)
      const totalErros = taxaAcertoPorDisciplinaFiltrada.reduce((acc, d) => acc + d.total_erros, 0)

      analiseAcertosErrosFiltrada = {
        taxaAcertoGeral: totalRespostas > 0 ? {
          total_respostas: totalRespostas,
          total_acertos: totalAcertos,
          total_erros: totalErros,
          taxa_acerto_geral: (totalAcertos / totalRespostas) * 100,
          taxa_erro_geral: (totalErros / totalRespostas) * 100
        } : null,
        taxaAcertoPorDisciplina: taxaAcertoPorDisciplinaFiltrada,
        questoesComMaisErros: questoesComMaisErrosFiltradas,
        questoesComMaisAcertos: questoesComMaisAcertosFiltradas,
        turmasComMaisErros: turmasComMaisErrosFiltradas,
        turmasComMaisAcertos: turmasComMaisAcertosFiltradas,
        escolasComMaisErros: escolasComMaisErrosFiltradas,
        escolasComMaisAcertos: escolasComMaisAcertosFiltradas
      }
    }

    // ========== CÁLCULO OTIMIZADO EM UMA ÚNICA PASSADA ==========
    // Em vez de múltiplos loops (map, filter, reduce, forEach), fazemos tudo em um único reduce
    const totalAlunos = alunosFiltrados.length

    const estatisticas = alunosFiltrados.reduce((acc, aluno) => {
      const isPresente = aluno.presenca === 'P' || aluno.presenca === 'p'
      const isFaltante = aluno.presenca === 'F' || aluno.presenca === 'f'

      // Contagem de presença
      if (isPresente) acc.presentes++

      // Parse das notas (apenas uma vez por aluno)
      const mediaAluno = parseFloat(aluno.media_aluno)
      const notaLp = parseFloat(aluno.nota_lp)
      const notaMat = parseFloat(aluno.nota_mat)
      const notaCh = parseFloat(aluno.nota_ch)
      const notaCn = parseFloat(aluno.nota_cn)
      const notaProd = parseFloat(aluno.nota_producao)

      // Acumular somas e contagens para médias (apenas valores válidos > 0)
      if (!isNaN(mediaAluno) && mediaAluno > 0) {
        acc.somaGeral += mediaAluno
        acc.countGeral++
        // Min/Max
        if (mediaAluno < acc.menorMedia) acc.menorMedia = mediaAluno
        if (mediaAluno > acc.maiorMedia) acc.maiorMedia = mediaAluno

        // Faixas de nota (apenas presentes)
        if (isPresente) {
          if (mediaAluno < 2) acc.faixas['0 a 2']++
          else if (mediaAluno < 4) acc.faixas['2 a 4']++
          else if (mediaAluno < 6) acc.faixas['4 a 6']++
          else if (mediaAluno < 8) acc.faixas['6 a 8']++
          else acc.faixas['8 a 10']++
        }
      }
      if (!isNaN(notaLp) && notaLp > 0) { acc.somaLp += notaLp; acc.countLp++ }
      if (!isNaN(notaMat) && notaMat > 0) { acc.somaMat += notaMat; acc.countMat++ }
      if (!isNaN(notaCh) && notaCh > 0) { acc.somaCh += notaCh; acc.countCh++ }
      if (!isNaN(notaCn) && notaCn > 0) { acc.somaCn += notaCn; acc.countCn++ }
      if (!isNaN(notaProd) && notaProd > 0) { acc.somaProd += notaProd; acc.countProd++ }

      // Níveis de aprendizagem (apenas anos iniciais e com presença registrada)
      if (isAnosIniciais && (isPresente || isFaltante)) {
        const nivel = aluno.nivel_aprendizagem || 'Não classificado'
        acc.niveis[nivel] = (acc.niveis[nivel] || 0) + 1
      }

      return acc
    }, {
      presentes: 0,
      somaGeral: 0, countGeral: 0,
      somaLp: 0, countLp: 0,
      somaMat: 0, countMat: 0,
      somaCh: 0, countCh: 0,
      somaCn: 0, countCn: 0,
      somaProd: 0, countProd: 0,
      menorMedia: Infinity,
      maiorMedia: 0,
      faixas: { '0 a 2': 0, '2 a 4': 0, '4 a 6': 0, '6 a 8': 0, '8 a 10': 0 } as Record<string, number>,
      niveis: {} as Record<string, number>
    })

    // Calcular médias finais
    const presentes = estatisticas.presentes
    const faltantes = totalAlunos - presentes
    const mediaGeral = estatisticas.countGeral > 0 ? estatisticas.somaGeral / estatisticas.countGeral : 0
    const mediaLp = estatisticas.countLp > 0 ? estatisticas.somaLp / estatisticas.countLp : 0
    const mediaMat = estatisticas.countMat > 0 ? estatisticas.somaMat / estatisticas.countMat : 0
    const mediaCh = estatisticas.countCh > 0 ? estatisticas.somaCh / estatisticas.countCh : 0
    const mediaCn = estatisticas.countCn > 0 ? estatisticas.somaCn / estatisticas.countCn : 0
    const mediaProducao = estatisticas.countProd > 0 ? estatisticas.somaProd / estatisticas.countProd : 0
    const menorMedia = estatisticas.menorMedia === Infinity ? 0 : estatisticas.menorMedia
    const maiorMedia = estatisticas.maiorMedia

    // Formatar níveis ordenados
    const ordemNiveis: Record<string, number> = {
      'Insuficiente': 1, 'N1': 1,
      'Básico': 2, 'N2': 2,
      'Adequado': 3, 'N3': 3,
      'Avançado': 4, 'N4': 4,
      'Não classificado': 5
    }
    const niveisFiltrados = Object.entries(estatisticas.niveis)
      .map(([nivel, quantidade]) => ({ nivel, quantidade }))
      .sort((a, b) => (ordemNiveis[a.nivel] || 6) - (ordemNiveis[b.nivel] || 6))

    // Formatar faixas de nota
    const faixasNotaFiltradas = Object.entries(estatisticas.faixas).map(([faixa, quantidade]) => ({
      faixa,
      quantidade
    }))

    // Recalcular presença
    const presencaFiltrada = [
      { status: 'Presente', quantidade: presentes },
      { status: 'Faltante', quantidade: faltantes }
    ]

    return {
      ...dadosCache,
      metricas: {
        ...dadosCache.metricas,
        total_alunos: totalAlunos,
        total_escolas: escolasFiltradas.length,
        total_turmas: turmasFiltradas.length,
        total_presentes: presentes,
        total_faltantes: faltantes,
        taxa_presenca: totalAlunos > 0 ? (presentes / totalAlunos) * 100 : 0,
        media_geral: mediaGeral,
        media_lp: mediaLp,
        media_mat: mediaMat,
        media_ch: mediaCh,
        media_cn: mediaCn,
        media_producao: mediaProducao,
        menor_media: menorMedia,
        maior_media: maiorMedia
      },
      niveis: niveisFiltrados,
      faixasNota: faixasNotaFiltradas,
      presenca: presencaFiltrada,
      alunosDetalhados: alunosFiltrados,
      mediasPorSerie: mediasPorSerieFiltradas,
      mediasPorTurma: turmasFiltradas,
      mediasPorEscola: escolasFiltradas,
      analiseAcertosErros: analiseAcertosErrosFiltrada
    } as DashboardData
  }, [dadosCache, calcularAnaliseDeResumos]) // compararSeries e compararDisciplinas são imports estáveis

  // Função para alterar série via chips
  // Usa cache local com cálculo dinâmico para filtragem instantânea em TODAS as abas
  const handleSerieChipClick = (serie: string) => {
    setFiltroSerie(serie)
    setPaginaAtual(1)
    // Resetar paginações das análises ao trocar série
    setPaginasAnalises(PAGINACAO_ANALISES_INICIAL)

    // Só atualiza se já fez uma pesquisa antes
    if (!pesquisaRealizada) return

    // Usar cache local com cálculo dinâmico para TODAS as abas (incluindo Análises)
    if (dadosCache) {
      const dadosFiltrados = filtrarDadosLocal(serie, filtroDisciplina)
      if (dadosFiltrados) {
        setDados(dadosFiltrados)
        setUsandoCache(true)
        return
      }
    }

    // Fallback: chamar API se não tem cache (usa versão debounced)
    setUsandoCache(false)
    carregarDadosDebounced(true, undefined, true, serie)
  }

  // Função para pesquisar - Busca dados completos para cache
  // Usa versão debounced para evitar múltiplos cliques rápidos
  const handlePesquisar = () => {
    setPesquisaRealizada(true)
    // Resetar TODAS as paginações ao fazer nova pesquisa
    setPaginaAtual(1)
    setPaginasAnalises(PAGINACAO_ANALISES_INICIAL)

    // Sempre buscar dados SEM filtro de série para ter cache completo
    // Passa string vazia como serieOverride para garantir que o cache será salvo
    setUsandoCache(false)
    carregarDadosDebounced(true, undefined, false, '')
  }

  // useEffect para aplicar filtro de série/disciplina após cache ser atualizado
  useEffect(() => {
    // Se tem cache e tem filtro de série ou disciplina, aplicar filtragem local
    if (dadosCache && (filtroSerie || filtroDisciplina) && pesquisaRealizada) {
      const dadosFiltrados = filtrarDadosLocal(filtroSerie, filtroDisciplina)
      if (dadosFiltrados) {
        setDados(dadosFiltrados)
        setUsandoCache(true)
      }
    }
  }, [dadosCache, filtroSerie, filtroDisciplina, pesquisaRealizada, filtrarDadosLocal])

  const temFiltrosAtivos = filtroPoloId || filtroEscolaId || filtroTurmaId || filtroAnoLetivo || filtroPresenca || filtroNivel || filtroFaixaMedia || filtroDisciplina || filtroTaxaAcertoMin || filtroTaxaAcertoMax || filtroQuestaoCodigo || filtroTipoEnsino
  const qtdFiltros = [filtroPoloId, filtroEscolaId, filtroTurmaId, filtroAnoLetivo, filtroPresenca, filtroNivel, filtroFaixaMedia, filtroDisciplina, filtroTaxaAcertoMin, filtroTaxaAcertoMax, filtroQuestaoCodigo, filtroTipoEnsino].filter(Boolean).length

  // Função para verificar se uma disciplina é aplicável à série do aluno
  const isDisciplinaAplicavel = useCallback((serie: string | null | undefined, disciplinaCodigo: string): boolean => {
    if (!serie) return true // Se não tem série, mostrar todas

    const numeroSerie = serie.match(/(\d+)/)?.[1]
    const isAnosIniciais = ['2', '3', '5'].includes(numeroSerie || '')

    // Anos iniciais não tem CH e CN
    if (isAnosIniciais && (disciplinaCodigo === 'CH' || disciplinaCodigo === 'CN')) {
      return false
    }

    // Anos finais não tem PROD e NIVEL
    if (!isAnosIniciais && (disciplinaCodigo === 'PROD' || disciplinaCodigo === 'NIVEL')) {
      return false
    }

    return true
  }, [])

  // Obter disciplinas que devem ser exibidas baseadas no filtro de série ou tipo de ensino
  const disciplinasExibir = useMemo(() => {
    // Se tem filtro de série específica, usar disciplinas dessa série
    if (filtroSerie) {
      return obterDisciplinasPorSerieSync(filtroSerie)
    }

    // Se tem filtro de tipo de ensino, usar disciplinas desse tipo
    if (filtroTipoEnsino === 'anos_iniciais') {
      // Anos iniciais: LP, MAT, PROD, NIVEL (usar série 2 como referência)
      return obterDisciplinasPorSerieSync('2º Ano')
    } else if (filtroTipoEnsino === 'anos_finais') {
      // Anos finais: LP, CH, MAT, CN (usar série 6 como referência)
      return obterDisciplinasPorSerieSync('6º Ano')
    }

    // Sem filtro específico: mostrar todas as disciplinas (incluindo PROD)
    return obterDisciplinasPorSerieSync(null)
  }, [filtroSerie, filtroTipoEnsino])

  // Função para obter o total de questões correto para uma disciplina baseado na série do aluno
  const getTotalQuestoesPorSerie = useCallback((resultado: { serie?: string | null; qtd_questoes_lp?: number | null; qtd_questoes_mat?: number | null; qtd_questoes_ch?: number | null; qtd_questoes_cn?: number | null }, codigoDisciplina: string): number | undefined => {
    // Primeiro, tentar usar os valores do banco (vindos da API)
    if (codigoDisciplina === 'LP' && resultado.qtd_questoes_lp) {
      return Number(resultado.qtd_questoes_lp)
    }
    if (codigoDisciplina === 'MAT' && resultado.qtd_questoes_mat) {
      return Number(resultado.qtd_questoes_mat)
    }
    if (codigoDisciplina === 'CH' && resultado.qtd_questoes_ch) {
      return Number(resultado.qtd_questoes_ch)
    }
    if (codigoDisciplina === 'CN' && resultado.qtd_questoes_cn) {
      return Number(resultado.qtd_questoes_cn)
    }

    // Fallback para valores hardcoded (quando não há dados do banco)
    const disciplinasSerie = obterDisciplinasPorSerieSync(resultado.serie)
    const disciplina = disciplinasSerie.find(d => d.codigo === codigoDisciplina)
    return disciplina?.total_questoes
  }, [])

  // Escolas filtradas por polo
  const escolasFiltradas = useMemo(() => {
    if (!dados?.filtros.escolas) return []
    if (!filtroPoloId) return [] // Não mostra escolas se nenhum polo selecionado
    return dados.filtros.escolas.filter(e => String(e.polo_id) === String(filtroPoloId))
  }, [dados?.filtros.escolas, filtroPoloId])

  // Turmas filtradas por escola E série
  const turmasFiltradas = useMemo(() => {
    if (!dados?.filtros.turmas) return []
    if (!filtroSerie) return [] // Não mostra turmas se nenhuma série selecionada
    // Filtra por escola se selecionada
    let turmas = dados.filtros.turmas
    if (filtroEscolaId) {
      turmas = turmas.filter(t => String(t.escola_id) === String(filtroEscolaId))
    }
    return turmas
  }, [dados?.filtros.turmas, filtroEscolaId, filtroSerie])

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

  useEffect(() => {
    // AbortController para cancelar requisições se componente desmontar
    const abortController = new AbortController()
    const signal = abortController.signal

    const carregarTipoUsuario = async () => {
      // Se offline, usar usuário do localStorage
      if (!offlineStorage.isOnline()) {
        const offlineUser = offlineStorage.getUser()
        if (offlineUser) {
          const tipo = offlineUser.tipo_usuario === 'administrador' ? 'admin' : offlineUser.tipo_usuario
          setTipoUsuario(tipo)
          setUsuario(offlineUser)

          // Definir filtros baseado no tipo de usuário offline
          if (offlineUser.tipo_usuario === 'escola' && offlineUser.escola_id) {
            setFiltroEscolaId(offlineUser.escola_id.toString())
            setEscolaNome(offlineUser.escola_nome || '')
            setPoloNome(offlineUser.polo_nome || '')
            if (offlineUser.polo_id) {
              setFiltroPoloId(offlineUser.polo_id.toString())
            }
          }

          if (offlineUser.tipo_usuario === 'polo' && offlineUser.polo_id) {
            setFiltroPoloId(offlineUser.polo_id.toString())
            setPoloNome(offlineUser.polo_nome || '')
          }
        }
        return
      }

      try {
        const response = await fetch('/api/auth/verificar', { signal })

        // Verificar se foi cancelado
        if (signal.aborted) return

        const data = await response.json()

        // Verificar novamente após parse
        if (signal.aborted) return

        if (data.usuario) {
          const tipo = data.usuario.tipo_usuario === 'administrador' ? 'admin' : data.usuario.tipo_usuario
          setTipoUsuario(tipo)
          setUsuario(data.usuario)

          // Se for usuário escola, definir automaticamente os filtros e carregar nomes
          if (data.usuario.tipo_usuario === 'escola' && data.usuario.escola_id) {
            setFiltroEscolaId(data.usuario.escola_id)
            // Carregar nome da escola e polo
            try {
              const escolaRes = await fetch(`/api/admin/escolas?id=${data.usuario.escola_id}`, { signal })
              if (signal.aborted) return
              const escolaData = await escolaRes.json()
              if (signal.aborted) return
              if (Array.isArray(escolaData) && escolaData.length > 0) {
                setEscolaNome(escolaData[0].nome)
                setPoloNome(escolaData[0].polo_nome || '')
                // Definir polo_id para filtrar corretamente
                if (escolaData[0].polo_id) {
                  setFiltroPoloId(escolaData[0].polo_id)
                }
              }
            } catch (err: any) {
              if (err.name !== 'AbortError') {
                console.error('Erro ao carregar dados da escola:', err)
              }
            }
          }

          // Se for usuário polo, definir automaticamente o filtro de polo e carregar nome
          if (data.usuario.tipo_usuario === 'polo' && data.usuario.polo_id) {
            setFiltroPoloId(data.usuario.polo_id)
            // Carregar nome do polo
            try {
              const poloRes = await fetch(`/api/admin/polos?id=${data.usuario.polo_id}`, { signal })
              if (signal.aborted) return
              const poloData = await poloRes.json()
              if (signal.aborted) return
              if (Array.isArray(poloData) && poloData.length > 0) {
                setPoloNome(poloData[0].nome)
              }
            } catch (err: any) {
              if (err.name !== 'AbortError') {
                console.error('Erro ao carregar dados do polo:', err)
              }
            }
          }
        }
      } catch (error: any) {
        // Ignorar erros de abort
        if (error.name === 'AbortError') return

        console.error('Erro ao carregar tipo de usuário:', error)
        // Fallback para usuário offline
        const offlineUser = offlineStorage.getUser()
        if (offlineUser) {
          const tipo = offlineUser.tipo_usuario === 'administrador' ? 'admin' : offlineUser.tipo_usuario
          setTipoUsuario(tipo)
          setUsuario(offlineUser)
        }
      }
    }
    carregarTipoUsuario()

    // Cleanup: cancelar requisições pendentes ao desmontar
    return () => {
      abortController.abort()
    }
  }, [])

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'polo', 'escola']}>
      <LayoutDashboard tipoUsuario={tipoUsuario}>
        <div className="max-w-full">
          {/* Indicador de modo offline */}
          {(usandoDadosOffline || modoOffline) && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-center gap-3">
              <WifiOff className="w-5 h-5 text-orange-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-orange-800">Modo Offline</p>
                <p className="text-xs text-orange-600">Exibindo dados sincronizados. Conecte-se para atualizar.</p>
              </div>
            </div>
          )}

          {/* Indicador de cache ativo */}
          {usandoCache && !usandoDadosOffline && !modoOffline && (
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-2 flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              <p className="text-xs font-medium text-green-700 dark:text-green-300">Carregamento instantâneo (usando cache local)</p>
            </div>
          )}

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mt-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 sm:gap-3">
                <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600 flex-shrink-0" />
                <span className="truncate">Painel de Dados</span>
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                {usuario?.tipo_usuario === 'escola' && escolaNome ? (
                  <>
                    {escolaNome}
                    {poloNome && <span className="text-gray-500 dark:text-gray-400"> - Polo: {poloNome}</span>}
                  </>
                ) : usuario?.tipo_usuario === 'polo' && poloNome ? (
                  <>Polo: {poloNome}</>
                ) : (
                  'Visualize e analise os resultados'
                )}
              </p>
            </div>
            <button
              onClick={handlePesquisar}
              disabled={carregando}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm sm:text-base flex-shrink-0"
              title="Pesquisar dados (usa cache quando possível)"
            >
              <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Pesquisar</span>
            </button>
          </div>

          {/* Barra de Filtros */}
          <div className="bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 rounded-xl shadow-lg border-2 border-gray-200 dark:border-slate-700 p-3 sm:p-4 md:p-6 mt-4">
            <div className="flex items-center gap-3 mb-4">
              <Filter className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">Filtros de Pesquisa</h2>
              {temFiltrosAtivos && (
                <span className="ml-auto flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
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
              <div className={`space-y-1.5 p-3 rounded-lg transition-all ${filtroAnoLetivo ? 'bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-300 dark:border-indigo-700 shadow-sm' : 'bg-transparent'}`}>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${filtroAnoLetivo ? 'bg-indigo-600' : 'bg-indigo-500'}`}></span>
                  Ano Letivo
                </label>
                <select
                  value={filtroAnoLetivo}
                  onChange={(e) => { setFiltroAnoLetivo(e.target.value); setPaginaAtual(1); }}
                  className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400 ${
                    filtroAnoLetivo 
                      ? 'bg-white dark:bg-slate-700 border-2 border-indigo-500 text-gray-900 dark:text-white shadow-sm' 
                      : 'bg-white dark:bg-slate-700 border-2 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200'
                  }`}
                >
                  <option value="">Todos os anos</option>
                  {dados?.filtros.anosLetivos.map(ano => (
                    <option key={ano} value={ano}>{ano}</option>
                  ))}
                </select>
              </div>

              {/* Polo */}
              <div className={`space-y-1.5 p-3 rounded-lg transition-all ${filtroPoloId ? 'bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-300 dark:border-indigo-700 shadow-sm' : 'bg-transparent'}`}>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${filtroPoloId ? 'bg-indigo-600' : 'bg-indigo-500'}`}></span>
                  Polo
                </label>
                {/* Para usuários escola ou polo, mostrar input fixo com o nome do polo */}
                {(usuario?.tipo_usuario === 'escola' || usuario?.tipo_usuario === 'polo') ? (
                  <input
                    type="text"
                    value={poloNome || 'Carregando...'}
                    disabled
                    className="w-full px-4 py-2.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-slate-700 border-2 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 cursor-not-allowed"
                  />
                ) : (
                  <select
                    value={filtroPoloId}
                    onChange={(e) => { setFiltroPoloId(e.target.value); setFiltroEscolaId(''); setFiltroTurmaId(''); setPaginaAtual(1); }}
                    className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400 ${
                      filtroPoloId
                        ? 'bg-white dark:bg-slate-700 border-2 border-indigo-500 text-gray-900 dark:text-white shadow-sm'
                        : 'bg-white dark:bg-slate-700 border-2 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    <option value="">Todos os polos</option>
                    {dados?.filtros.polos.map(polo => (
                      <option key={polo.id} value={polo.id}>{polo.nome}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Escola */}
              <div className={`space-y-1.5 p-3 rounded-lg transition-all ${filtroEscolaId ? 'bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-300 dark:border-indigo-700 shadow-sm' : 'bg-transparent'}`}>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${filtroEscolaId ? 'bg-indigo-600' : 'bg-indigo-500'}`}></span>
                  Escola
                </label>
                {/* Para usuários escola, mostrar input fixo com o nome da escola */}
                {usuario?.tipo_usuario === 'escola' ? (
                  <input
                    type="text"
                    value={escolaNome || 'Carregando...'}
                    disabled
                    className="w-full px-4 py-2.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-slate-700 border-2 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 cursor-not-allowed"
                  />
                ) : (
                  <select
                    value={filtroEscolaId}
                    onChange={(e) => { setFiltroEscolaId(e.target.value); setFiltroTurmaId(''); setPaginaAtual(1); }}
                    disabled={!filtroPoloId}
                    className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 ${
                      filtroEscolaId
                        ? 'bg-white dark:bg-slate-700 border-2 border-indigo-500 text-gray-900 dark:text-white shadow-sm'
                        : 'bg-white dark:bg-slate-700 border-2 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200'
                    }`}
                    title={!filtroPoloId ? 'Selecione um polo primeiro' : ''}
                  >
                    <option value="">{!filtroPoloId ? 'Selecione um polo primeiro' : 'Todas as escolas'}</option>
                    {escolasFiltradas.map(escola => (
                      <option key={escola.id} value={escola.id}>{escola.nome}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Tipo de Ensino */}
              <div className={`space-y-1.5 p-3 rounded-lg transition-all ${filtroTipoEnsino ? 'bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-300 dark:border-indigo-700 shadow-sm' : 'bg-transparent'}`}>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${filtroTipoEnsino ? 'bg-indigo-600' : 'bg-indigo-500'}`}></span>
                  Etapa de Ensino
                </label>
                <select
                  value={filtroTipoEnsino}
                  onChange={(e) => { setFiltroTipoEnsino(e.target.value); setFiltroSerie(''); setFiltroTurmaId(''); setPaginaAtual(1); }}
                  className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400 ${
                    filtroTipoEnsino
                      ? 'bg-white dark:bg-slate-700 border-2 border-indigo-500 text-gray-900 dark:text-white shadow-sm'
                      : 'bg-white dark:bg-slate-700 border-2 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200'
                  }`}
                >
                  <option value="">Todas as etapas</option>
                  <option value="anos_iniciais">Anos Iniciais (2º, 3º, 5º)</option>
                  <option value="anos_finais">Anos Finais (6º, 7º, 8º, 9º)</option>
                </select>
              </div>

              {/* Turma */}
              <div className={`space-y-1.5 p-3 rounded-lg transition-all ${filtroTurmaId ? 'bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-300 dark:border-indigo-700 shadow-sm' : 'bg-transparent'}`}>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${filtroTurmaId ? 'bg-indigo-600' : 'bg-indigo-500'}`}></span>
                  Turma
                </label>
                <select
                  value={filtroTurmaId}
                  onChange={(e) => { setFiltroTurmaId(e.target.value); setPaginaAtual(1); }}
                  disabled={!filtroSerie}
                  className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 ${
                    filtroTurmaId
                      ? 'bg-white dark:bg-slate-700 border-2 border-indigo-500 text-gray-900 dark:text-white shadow-sm'
                      : 'bg-white dark:bg-slate-700 border-2 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200'
                  }`}
                  title={!filtroSerie ? 'Selecione uma série primeiro' : ''}
                >
                  <option value="">{!filtroSerie ? 'Selecione uma série primeiro' : 'Todas as turmas'}</option>
                  {turmasFiltradas.map(turma => (
                    <option key={turma.id} value={turma.id}>{turma.codigo}</option>
                  ))}
                </select>
              </div>

              {/* Disciplina */}
              <div className={`space-y-1.5 p-3 rounded-lg transition-all ${filtroDisciplina ? 'bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-300 dark:border-indigo-700 shadow-sm' : 'bg-transparent'}`}>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${filtroDisciplina ? 'bg-indigo-600' : 'bg-indigo-500'}`}></span>
                  Disciplina
                </label>
                <select
                  value={filtroDisciplina}
                  onChange={(e) => { setFiltroDisciplina(e.target.value); setPaginaAtual(1); }}
                  className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400 ${
                    filtroDisciplina 
                      ? 'bg-white dark:bg-slate-700 border-2 border-indigo-500 text-gray-900 dark:text-white shadow-sm' 
                      : 'bg-white dark:bg-slate-700 border-2 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200'
                  }`}
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
              <div className={`space-y-1.5 p-3 rounded-lg transition-all ${filtroPresenca ? 'bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-300 dark:border-indigo-700 shadow-sm' : 'bg-transparent'}`}>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${filtroPresenca ? 'bg-indigo-600' : 'bg-indigo-500'}`}></span>
                  Presença
                </label>
                <select
                  value={filtroPresenca}
                  onChange={(e) => { setFiltroPresenca(e.target.value); setPaginaAtual(1); }}
                  className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400 ${
                    filtroPresenca
                      ? 'bg-white dark:bg-slate-700 border-2 border-indigo-500 text-gray-900 dark:text-white shadow-sm'
                      : 'bg-white dark:bg-slate-700 border-2 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200'
                  }`}
                >
                  <option value="">Todos</option>
                  <option value="P">Presentes</option>
                  <option value="F">Faltantes</option>
                </select>
              </div>

              {/* Nivel */}
              <div className={`space-y-1.5 p-3 rounded-lg transition-all ${filtroNivel ? 'bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-300 dark:border-indigo-700 shadow-sm' : 'bg-transparent'}`}>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${filtroNivel ? 'bg-indigo-600' : 'bg-indigo-500'}`}></span>
                  Nível
                </label>
                <select
                  value={filtroNivel}
                  onChange={(e) => { setFiltroNivel(e.target.value); setPaginaAtual(1); }}
                  className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400 ${
                    filtroNivel 
                      ? 'bg-white dark:bg-slate-700 border-2 border-indigo-500 text-gray-900 dark:text-white shadow-sm' 
                      : 'bg-white dark:bg-slate-700 border-2 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200'
                  }`}
                >
                  <option value="">Todos os níveis</option>
                  {dados?.filtros.niveis.map(nivel => (
                    <option key={nivel} value={nivel}>{nivel}</option>
                  ))}
                </select>
              </div>

              {/* Faixa de Media */}
              <div className={`space-y-1.5 p-3 rounded-lg transition-all ${filtroFaixaMedia ? 'bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-300 dark:border-indigo-700 shadow-sm' : 'bg-transparent'}`}>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${filtroFaixaMedia ? 'bg-indigo-600' : 'bg-indigo-500'}`}></span>
                  Faixa de Média
                </label>
                <select
                  value={filtroFaixaMedia}
                  onChange={(e) => { setFiltroFaixaMedia(e.target.value); setPaginaAtual(1); }}
                  className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400 ${
                    filtroFaixaMedia 
                      ? 'bg-white dark:bg-slate-700 border-2 border-indigo-500 text-gray-900 dark:text-white shadow-sm' 
                      : 'bg-white dark:bg-slate-700 border-2 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200'
                  }`}
                >
                  <option value="">Todas as faixas</option>
                  {dados?.filtros.faixasMedia.map(faixa => (
                    <option key={faixa} value={faixa}>{faixa}</option>
                  ))}
                </select>
              </div>

              {/* Taxa de Acerto Mínima */}
              <div className={`space-y-1.5 p-3 rounded-lg transition-all ${filtroTaxaAcertoMin ? 'bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-300 dark:border-indigo-700 shadow-sm' : 'bg-transparent'}`}>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${filtroTaxaAcertoMin ? 'bg-indigo-600' : 'bg-indigo-500'}`}></span>
                  Taxa de Acerto Mín. (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={filtroTaxaAcertoMin}
                  onChange={(e) => { setFiltroTaxaAcertoMin(e.target.value); setPaginaAtual(1); }}
                  className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400 ${
                    filtroTaxaAcertoMin 
                      ? 'bg-white dark:bg-slate-700 border-2 border-indigo-500 text-gray-900 dark:text-white shadow-sm' 
                      : 'bg-white dark:bg-slate-700 border-2 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200'
                  }`}
                  placeholder="Ex: 50"
                />
              </div>

              {/* Taxa de Acerto Máxima */}
              <div className={`space-y-1.5 p-3 rounded-lg transition-all ${filtroTaxaAcertoMax ? 'bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-300 dark:border-indigo-700 shadow-sm' : 'bg-transparent'}`}>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${filtroTaxaAcertoMax ? 'bg-indigo-600' : 'bg-indigo-500'}`}></span>
                  Taxa de Acerto Máx. (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={filtroTaxaAcertoMax}
                  onChange={(e) => { setFiltroTaxaAcertoMax(e.target.value); setPaginaAtual(1); }}
                  className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400 ${
                    filtroTaxaAcertoMax 
                      ? 'bg-white dark:bg-slate-700 border-2 border-indigo-500 text-gray-900 dark:text-white shadow-sm' 
                      : 'bg-white dark:bg-slate-700 border-2 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200'
                  }`}
                  placeholder="Ex: 80"
                />
              </div>

              {/* Questão Específica */}
              <div className={`space-y-1.5 p-3 rounded-lg transition-all ${filtroQuestaoCodigo ? 'bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-300 dark:border-indigo-700 shadow-sm' : 'bg-transparent'}`}>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${filtroQuestaoCodigo ? 'bg-indigo-600' : 'bg-indigo-500'}`}></span>
                  Questão Específica
                </label>
                <input
                  type="text"
                  value={filtroQuestaoCodigo}
                  onChange={(e) => { setFiltroQuestaoCodigo(e.target.value); setPaginaAtual(1); }}
                  className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400 ${
                    filtroQuestaoCodigo 
                      ? 'bg-white dark:bg-slate-700 border-2 border-indigo-500 text-gray-900 dark:text-white shadow-sm' 
                      : 'bg-white dark:bg-slate-700 border-2 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200'
                  }`}
                  placeholder="Ex: Q1, Q25"
                />
              </div>

            </div>
          </div>

          {erro && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-4 rounded-lg">
              {erro}
            </div>
          )}

          {carregando ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 mx-auto"></div>
                <p className="text-gray-500 dark:text-gray-400 mt-4 text-lg">Carregando dados...</p>
              </div>
            </div>
          ) : dados ? (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-10 gap-2 sm:gap-3">
                <MetricCard titulo="Alunos" valor={dados.metricas.total_alunos} icon={Users} cor="indigo" />
                <MetricCard titulo="Escolas" valor={dados.metricas.total_escolas} icon={School} cor="blue" />
                <MetricCard titulo="Turmas" valor={dados.metricas.total_turmas} icon={GraduationCap} cor="purple" />
                <MetricCard titulo="Presentes" valor={dados.metricas.total_presentes} subtitulo={`${(dados.metricas.taxa_presenca || 0).toFixed(1)}%`} icon={UserCheck} cor="green" />
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                <DisciplinaCard titulo="Lingua Portuguesa" media={dados.metricas.media_lp} cor="blue" sigla="LP" />
                <DisciplinaCard titulo="Matematica" media={dados.metricas.media_mat} cor="purple" sigla="MAT" />
                <DisciplinaCard titulo="Ciencias Humanas" media={dados.metricas.media_ch} cor="green" sigla="CH" />
                <DisciplinaCard titulo="Ciencias da Natureza" media={dados.metricas.media_cn} cor="amber" sigla="CN" />
                {dados.metricas.media_producao > 0 && (
                  <DisciplinaCard titulo="Producao Textual" media={dados.metricas.media_producao} cor="rose" sigla="PT" />
                )}
              </div>

              {/* Container Sticky para Abas + Serie - Fixo abaixo do header */}
              <div className="sticky top-14 sm:top-16 z-40 -mx-2 sm:-mx-4 md:-mx-6 lg:-mx-8 px-2 sm:px-4 md:px-6 lg:px-8 pt-4 pb-2 bg-gray-50 dark:bg-slate-900 space-y-2 shadow-md" style={{ marginTop: '1rem' }}>
                {/* Abas de Navegacao */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
                  <div className="flex gap-1 border-b border-gray-200 dark:border-slate-700 overflow-x-auto">
                  {[
                    { id: 'visao_geral', label: 'Visão Geral', icon: PieChartIcon },
                    { id: 'escolas', label: 'Escolas', icon: School },
                    { id: 'turmas', label: 'Turmas', icon: Layers },
                    { id: 'alunos', label: 'Alunos', icon: Users },
                    { id: 'analises', label: 'Análises', icon: Target },
                  ].map(aba => (
                    <button
                      key={aba.id}
                      onClick={() => {
                        const novaAba = aba.id as any
                        setAbaAtiva(novaAba)
                        setPaginaAtual(1)
                        // Se mudou para aba Análises e tem filtro de série, recarregar da API
                        if (novaAba === 'analises' && filtroSerie && pesquisaRealizada) {
                          setUsandoCache(false)
                          carregarDados(true, undefined, true, filtroSerie)
                        }
                      }}
                      className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                        abaAtiva === aba.id
                          ? 'border-indigo-600 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      <aba.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="hidden xs:inline sm:inline">{aba.label}</span>
                      <span className="xs:hidden sm:hidden">{aba.label.split(' ')[0]}</span>
                    </button>
                  ))}
                  </div>
                </div>

                {/* Chips de Series - Clique atualiza pesquisa automaticamente */}
                {dados?.filtros.series && dados.filtros.series.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-2">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase self-center mr-2 flex items-center gap-2">
                      Serie:
                      {carregandoEmSegundoPlano && (
                        <RefreshCw className="w-3 h-3 animate-spin text-indigo-500" />
                      )}
                    </span>
                    <button
                      onClick={() => handleSerieChipClick('')}
                      disabled={carregandoEmSegundoPlano}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors disabled:opacity-70 ${
                        !filtroSerie ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      Todas
                    </button>
                    {dados.filtros.series.map(serie => (
                      <button
                        key={serie}
                        onClick={() => handleSerieChipClick(serie)}
                        disabled={carregandoEmSegundoPlano}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors disabled:opacity-70 ${
                          filtroSerie === serie ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                        }`}
                      >
                        {formatarSerie(serie)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Conteudo das Abas */}
              {abaAtiva === 'visao_geral' && (
                <div className="mt-4">
                  {!pesquisaRealizada ? (
                    <div className="text-center py-12">
                      <Search className="w-12 h-12 mx-auto text-indigo-300 mb-3" />
                      <p className="text-base font-medium text-gray-600 dark:text-gray-300">Selecione os filtros desejados</p>
                      <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">Use os filtros acima e clique em <strong>Pesquisar</strong> para carregar os dados</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Grafico de Barras - Medias por Serie */}
                      {dados.mediasPorSerie.length > 0 && (() => {
                        // Separar dados em anos iniciais (2º, 3º, 5º) e anos finais (6º-9º)
                        const anosIniciais = dados.mediasPorSerie
                          .filter(item => {
                            const num = item.serie?.match(/(\d+)/)?.[1]
                            return num === '2' || num === '3' || num === '5'
                          })
                          .map(item => ({
                            serie: formatarSerie(item.serie),
                            media_lp: item.media_lp,
                            media_mat: item.media_mat,
                            media_prod: item.media_prod
                          }))

                        const anosFinais = dados.mediasPorSerie
                          .filter(item => {
                            const num = item.serie?.match(/(\d+)/)?.[1]
                            return num === '6' || num === '7' || num === '8' || num === '9'
                          })
                          .map(item => ({
                            serie: formatarSerie(item.serie),
                            media_lp: item.media_lp,
                            media_mat: item.media_mat,
                            media_ch: item.media_ch,
                            media_cn: item.media_cn
                          }))

                        return (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Media por Serie</h3>
                      <div className="space-y-4">
                        {/* Anos Iniciais: LP, MAT, PROD */}
                        {anosIniciais.length > 0 && (
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">Anos Iniciais (2º, 3º, 5º) - LP, MAT, PROD</p>
                            <div className="h-[120px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={anosIniciais} barCategoryGap="20%">
                                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                  <XAxis dataKey="serie" tick={{ fill: '#6B7280', fontSize: 10 }} />
                                  <YAxis domain={[0, 10]} tick={{ fill: '#6B7280', fontSize: 10 }} width={30} />
                                  <Tooltip content={<CustomTooltip />} />
                                  <Bar dataKey="media_lp" name="LP" fill={COLORS.disciplinas.lp} radius={[2, 2, 0, 0]} />
                                  <Bar dataKey="media_mat" name="MAT" fill={COLORS.disciplinas.mat} radius={[2, 2, 0, 0]} />
                                  <Bar dataKey="media_prod" name="PROD" fill={COLORS.disciplinas.prod} radius={[2, 2, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        )}

                        {/* Anos Finais: LP, MAT, CH, CN */}
                        {anosFinais.length > 0 && (
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">Anos Finais (6º-9º) - LP, MAT, CH, CN</p>
                            <div className="h-[120px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={anosFinais} barCategoryGap="20%">
                                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                  <XAxis dataKey="serie" tick={{ fill: '#6B7280', fontSize: 10 }} />
                                  <YAxis domain={[0, 10]} tick={{ fill: '#6B7280', fontSize: 10 }} width={30} />
                                  <Tooltip content={<CustomTooltip />} />
                                  <Bar dataKey="media_lp" name="LP" fill={COLORS.disciplinas.lp} radius={[2, 2, 0, 0]} />
                                  <Bar dataKey="media_mat" name="MAT" fill={COLORS.disciplinas.mat} radius={[2, 2, 0, 0]} />
                                  <Bar dataKey="media_ch" name="CH" fill={COLORS.disciplinas.ch} radius={[2, 2, 0, 0]} />
                                  <Bar dataKey="media_cn" name="CN" fill={COLORS.disciplinas.cn} radius={[2, 2, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        )}

                        {/* Legenda unificada */}
                        <div className="flex flex-wrap justify-center gap-4 pt-2 border-t border-gray-200 dark:border-slate-700">
                          <div className="flex items-center gap-1.5 text-xs">
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.disciplinas.lp }}></div>
                            <span>LP</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs">
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.disciplinas.mat }}></div>
                            <span>MAT</span>
                          </div>
                          {anosFinais.length > 0 && (
                            <>
                              <div className="flex items-center gap-1.5 text-xs">
                                <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.disciplinas.ch }}></div>
                                <span>CH</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs">
                                <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.disciplinas.cn }}></div>
                                <span>CN</span>
                              </div>
                            </>
                          )}
                          {anosIniciais.length > 0 && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.disciplinas.prod }}></div>
                              <span>PROD</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                        )
                      })()}

                  {/* Grafico de Pizza - Niveis */}
                  {dados.niveis.length > 0 && (() => {
                    // Processar dados para converter códigos de nível em nomes
                    const niveisProcessados = dados.niveis.map(n => ({
                      ...n,
                      nivelOriginal: n.nivel,
                      nivel: getNivelName(n.nivel)
                    }))

                    return (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Distribuicao por Nivel</h3>
                      <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={niveisProcessados}
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
                              {niveisProcessados.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={COLORS.niveis[entry.nivelOriginal as keyof typeof COLORS.niveis] || COLORS.niveis[entry.nivel as keyof typeof COLORS.niveis] || '#9CA3AF'}
                                />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex flex-wrap justify-center gap-3 mt-2">
                        {niveisProcessados.map(n => (
                          <div key={n.nivelOriginal} className="flex items-center gap-1.5 text-xs">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: COLORS.niveis[n.nivelOriginal as keyof typeof COLORS.niveis] || COLORS.niveis[n.nivel as keyof typeof COLORS.niveis] || '#9CA3AF' }}
                            ></div>
                            <span>{n.nivel}: {n.quantidade}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    )
                  })()}

                  {/* Distribuicao por Faixa de Nota */}
                  {dados.faixasNota.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Distribuicao por Faixa de Nota</h3>
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
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Ranking de Polos</h3>
                      <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={dados.mediasPorPolo.slice(0, 8)} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis type="number" domain={[0, 10]} tick={{ fill: '#6B7280', fontSize: 11 }} />
                            <YAxis type="category" dataKey="polo" width={100} tick={{ fill: '#6B7280', fontSize: 10 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="media_geral" name="Media" radius={[0, 4, 4, 0]}>
                              {dados.mediasPorPolo.slice(0, 8).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS.ranking[index % COLORS.ranking.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                    </div>
                  )}
                </div>
              )}

              {abaAtiva === 'escolas' && (
                <div className="mt-4">
                  {!pesquisaRealizada ? (
                    <div className="text-center py-12">
                      <Search className="w-12 h-12 mx-auto text-indigo-300 mb-3" />
                      <p className="text-base font-medium text-gray-600 dark:text-gray-300">Selecione os filtros desejados</p>
                      <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">Use os filtros acima e clique em <strong>Pesquisar</strong> para carregar os dados</p>
                    </div>
                  ) : (
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
                      stickyHeader={true}
                    />
                  )}
                </div>
              )}

              {abaAtiva === 'turmas' && (
                <div className="mt-4">
                  {!pesquisaRealizada ? (
                    <div className="text-center py-12">
                      <Search className="w-12 h-12 mx-auto text-indigo-300 mb-3" />
                      <p className="text-base font-medium text-gray-600 dark:text-gray-300">Selecione os filtros desejados</p>
                      <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">Use os filtros acima e clique em <strong>Pesquisar</strong> para carregar os dados</p>
                    </div>
                  ) : dados.mediasPorTurma ? (
                    <TabelaPaginada
                      dados={dados.mediasPorTurma.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina)}
                      colunas={[
                        { key: 'turma', label: 'Turma', align: 'left' },
                        { key: 'escola', label: 'Escola', align: 'left' },
                        { key: 'serie', label: 'Serie', align: 'center', format: 'serie' },
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
                      stickyHeader={true}
                    />
                  ) : null}
                </div>
              )}

              {abaAtiva === 'alunos' && (
                <div className="space-y-4 mt-4">
                  {!pesquisaRealizada ? (
                    <div className="text-center py-12">
                      <Search className="w-12 h-12 mx-auto text-indigo-300 mb-3" />
                      <p className="text-base font-medium text-gray-600 dark:text-gray-300">Selecione os filtros desejados</p>
                      <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">Use os filtros acima e clique em <strong>Pesquisar</strong> para carregar os dados</p>
                    </div>
                  ) : (
                    <>
                      {/* Visualização Mobile - Cards */}
                      <div className="block sm:hidden space-y-4 p-4">
                        {alunosPaginados.length === 0 ? (
                          <div className="text-center py-12">
                            <Award className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                            <p className="text-base font-medium text-gray-500 dark:text-gray-400">Nenhum resultado encontrado</p>
                            <p className="text-sm mt-1 text-gray-400 dark:text-gray-500">Importe os dados primeiro</p>
                          </div>
                        ) : (
                      alunosPaginados.map((resultado: any, index: number) => {
                        const mediaNum = getNotaNumero(resultado.media_aluno)
                        // Notas serão obtidas dinamicamente pelas disciplinas

                        return (
                          <div key={resultado.id || index} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 shadow-sm dark:shadow-slate-900/50">
                            <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200 dark:border-slate-700">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex-shrink-0">
                                  {index + 1 + (paginaAtual - 1) * itensPorPagina}
                                </span>
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                  <span className="text-indigo-600 font-semibold text-xs">
                                    {resultado.aluno?.charAt(0).toUpperCase() || 'A'}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-gray-900 dark:text-white text-sm mb-1 truncate">{resultado.aluno}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                                    {resultado.escola && <div className="whitespace-normal break-words">Escola: {resultado.escola}</div>}
                                    {resultado.turma && <div>Turma: {resultado.turma}</div>}
                                    {resultado.serie && <div>Série: {formatarSerie(resultado.serie)}</div>}
                                    <div className="flex items-center gap-2">
                                      <span>Presença: </span>
                                      <span
                                        className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-semibold ${getPresencaColor(
                                          resultado.presenca || 'P'
                                        )}`}
                                      >
                                        {resultado.presenca === 'P' || resultado.presenca === 'p' ? '✓ Presente' : resultado.presenca === '-' ? '— Sem dados' : '✗ Falta'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Notas em Grid - Dinâmico baseado na série */}
                            <div className="grid grid-cols-2 gap-3 mb-3">
                              {disciplinasExibir.map((disciplina) => {
                                // Verificar se a disciplina é aplicável à série do aluno
                                const disciplinaAplicavel = isDisciplinaAplicavel(resultado.serie, disciplina.codigo)
                                // Se a disciplina não é aplicável, não mostrar o card
                                if (!disciplinaAplicavel) return null

                                const nota = getNotaNumero((resultado as any)[disciplina.campo_nota])
                                const acertos = disciplina.campo_acertos ? ((resultado as any)[disciplina.campo_acertos] || 0) : null
                                const nivelAprendizagem = disciplina.tipo === 'nivel' ? (resultado as any).nivel_aprendizagem : null
                                const getNivelColor = (nivel: string | undefined | null): string => {
                                  if (!nivel) return 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200'
                                  const nivelLower = nivel.toLowerCase()
                                  if (nivelLower.includes('avançado') || nivelLower.includes('avancado')) return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 border-green-300'
                                  if (nivelLower.includes('adequado')) return 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border-blue-300'
                                  if (nivelLower.includes('básico') || nivelLower.includes('basico')) return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 border-yellow-300'
                                  if (nivelLower.includes('insuficiente')) return 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 border-red-300'
                                  return 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200'
                                }

                                return (
                                  <div key={disciplina.codigo} className={`p-3 rounded-lg ${getNotaBgColor(nota)} border border-gray-200 dark:border-slate-600`}>
                                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">{disciplina.nome}</div>
                                    {disciplina.tipo === 'nivel' ? (
                                      <div className={`text-sm font-bold ${nivelAprendizagem ? getNivelColor(nivelAprendizagem).replace('bg-', 'text-').split(' ')[0] : 'text-gray-500'}`}>
                                        {nivelAprendizagem || '-'}
                                      </div>
                                    ) : (
                                      <>
                                        {getTotalQuestoesPorSerie(resultado, disciplina.codigo) && acertos !== null && (
                                          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">{acertos}/{getTotalQuestoesPorSerie(resultado, disciplina.codigo)}</div>
                                        )}
                                        <div className={`text-lg font-bold ${getNotaColor(nota)} mb-1`}>
                                          {formatarNota(nota, resultado.presenca, resultado.media_aluno)}
                                        </div>
                                        {nota !== null && nota !== 0 && (resultado.presenca === 'P' || resultado.presenca === 'p') && (
                                          <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-1.5 mt-1">
                                            <div
                                              className={`h-1.5 rounded-full ${
                                                nota >= 7 ? 'bg-green-500' : nota >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                                              }`}
                                              style={{ width: `${Math.min((nota / 10) * 100, 100)}%` }}
                                            ></div>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                            
                            {/* Média e Nível */}
                            <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-slate-700">
                              <div className={`flex flex-col items-center justify-center px-4 py-3 rounded-xl ${
                                mediaNum !== null && mediaNum >= 7 ? 'bg-green-50 border-green-500' : 
                                mediaNum !== null && mediaNum >= 5 ? 'bg-yellow-50 border-yellow-500' : 
                                'bg-red-50 border-red-500'
                              } border-2`}>
                                <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Média</div>
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
                                  <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{resultado.nivel_aprendizagem}</div>
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
                    <table className="w-full divide-y divide-gray-200 dark:divide-slate-700 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
                      <thead className="bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-900/50 dark:to-indigo-800/50 sticky top-[180px] sm:top-[190px] z-30">
                          <tr>
                            <th className="text-center py-1 px-0.5 sm:py-1.5 sm:px-1 md:py-2 md:px-1.5 lg:py-2.5 lg:px-2 font-bold text-indigo-900 dark:text-indigo-200 text-[10px] sm:text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700 w-8 md:w-10 lg:w-12">
                              #
                            </th>
                            <th className="text-left py-1 px-0.5 sm:py-1.5 sm:px-1 md:py-2 md:px-1 lg:py-2.5 lg:px-2 font-bold text-indigo-900 dark:text-indigo-200 text-[10px] sm:text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700 min-w-[120px] md:min-w-[140px] lg:min-w-[160px]">
                              Aluno
                            </th>
                            <th className="hidden lg:table-cell text-left py-1 px-1 md:py-2 md:px-1.5 lg:py-2.5 lg:px-2 font-bold text-indigo-900 dark:text-indigo-200 text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700 min-w-[150px]">
                              Escola
                            </th>
                            <th className="hidden md:table-cell text-left py-1 px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-indigo-900 dark:text-indigo-200 text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700 w-16 md:w-20">
                              Turma
                            </th>
                            <th className="hidden xl:table-cell text-left py-1 px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-indigo-900 dark:text-indigo-200 text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700 w-20">
                              Série
                            </th>
                            <th className="hidden lg:table-cell text-center py-1 px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-indigo-900 dark:text-indigo-200 text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700 w-20">
                              Presença
                            </th>
                            {disciplinasExibir.map((disciplina) => (
                              <th key={disciplina.codigo} className="text-center py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-indigo-900 dark:text-indigo-200 text-[10px] sm:text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700 w-14 md:w-16 lg:w-18">
                                {disciplina.codigo}
                              </th>
                            ))}
                            <th className="text-center py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-indigo-900 dark:text-indigo-200 text-[10px] sm:text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700 w-14 md:w-16 lg:w-18">
                              Média
                            </th>
                            <th className="text-center py-1 px-0.5 sm:py-1.5 sm:px-1 md:py-2 md:px-1.5 lg:py-2.5 lg:px-2 font-bold text-indigo-900 dark:text-indigo-200 text-[10px] sm:text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700 w-16 md:w-20 lg:w-24">
                              Ações
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                          {alunosPaginados.length === 0 ? (
                            <tr>
                              <td colSpan={6 + disciplinasExibir.length + 1} className="py-8 sm:py-12 text-center text-gray-500 dark:text-gray-400 px-4">
                                <Award className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-300 mb-3" />
                                <p className="text-base sm:text-lg font-medium">Nenhum resultado encontrado</p>
                                <p className="text-xs sm:text-sm mt-1">Importe os dados primeiro</p>
                              </td>
                            </tr>
                          ) : (
                            alunosPaginados.map((resultado: any, index: number) => {
                              const mediaNum = getNotaNumero(resultado.media_aluno)
                              // Notas serão obtidas dinamicamente pelas disciplinas

                              return (
                                <tr key={resultado.id || index} className="hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors border-b border-gray-100 dark:border-slate-700">
                                  <td className="text-center py-1 px-0.5 sm:py-1.5 sm:px-1 md:py-2 md:px-1.5 lg:py-2.5 lg:px-2">
                                    <span className="inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold text-[9px] sm:text-[10px] md:text-xs lg:text-sm">
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
                                      <div className="lg:hidden text-[9px] sm:text-[10px] md:text-xs text-gray-500 dark:text-gray-400 space-y-0.5 ml-6 sm:ml-7 md:ml-8 lg:ml-10">
                                        {resultado.escola && <div className="whitespace-normal break-words">Escola: {resultado.escola}</div>}
                                        {resultado.turma && <div>Turma: {resultado.turma}</div>}
                                        {resultado.serie && <div>Série: {formatarSerie(resultado.serie)}</div>}
                                        <div className="flex items-center gap-2">
                                          <span>Presença: </span>
                                          <span
                                            className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold ${getPresencaColor(
                                              resultado.presenca || 'P'
                                            )}`}
                                          >
                                            {resultado.presenca === 'P' || resultado.presenca === 'p' ? '✓ Presente' : resultado.presenca === '-' ? '— Sem dados' : '✗ Falta'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="hidden lg:table-cell py-1 px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-2">
                                    <span className="text-gray-700 dark:text-gray-200 font-medium text-[10px] md:text-xs lg:text-sm block whitespace-normal break-words">{resultado.escola}</span>
                                  </td>
                                  <td className="hidden md:table-cell py-1 px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 text-center">
                                    <span className="inline-flex items-center px-1 md:px-1.5 lg:px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 font-mono text-[9px] md:text-[10px] lg:text-xs font-medium">
                                      {resultado.turma || '-'}
                                    </span>
                                  </td>
                                  <td className="hidden xl:table-cell py-1 px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 text-center">
                                    <span className="inline-flex items-center px-1 md:px-1.5 lg:px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-[9px] md:text-[10px] lg:text-xs font-medium">
                                      {formatarSerie(resultado.serie)}
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
                                  {disciplinasExibir.map((disciplina) => {
                                    // Verificar se a disciplina é aplicável à série do aluno
                                    const disciplinaAplicavel = isDisciplinaAplicavel(resultado.serie, disciplina.codigo)
                                    const nota = disciplinaAplicavel ? getNotaNumero((resultado as any)[disciplina.campo_nota]) : null
                                    const acertos = disciplinaAplicavel && disciplina.campo_acertos ? ((resultado as any)[disciplina.campo_acertos] || 0) : null
                                    const nivelAprendizagem = disciplina.tipo === 'nivel' ? (resultado as any).nivel_aprendizagem : null
                                    const getNivelColor = (nivel: string | undefined | null): string => {
                                      if (!nivel) return 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200'
                                      const nivelLower = nivel.toLowerCase()
                                      if (nivelLower.includes('avançado') || nivelLower.includes('avancado')) return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 border-green-300'
                                      if (nivelLower.includes('adequado')) return 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border-blue-300'
                                      if (nivelLower.includes('básico') || nivelLower.includes('basico')) return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 border-yellow-300'
                                      if (nivelLower.includes('insuficiente')) return 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 border-red-300'
                                      return 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200'
                                    }

                                    // Se a disciplina não é aplicável à série do aluno, mostrar N/A
                                    if (!disciplinaAplicavel) {
                                      return (
                                        <td key={disciplina.codigo} className="py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-3 lg:px-2 text-center">
                                          <span className="text-gray-400 dark:text-gray-500 text-xs italic">N/A</span>
                                        </td>
                                      )
                                    }

                                    return (
                                      <td key={disciplina.codigo} className="py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-3 lg:px-2 text-center">
                                        {disciplina.tipo === 'nivel' ? (
                                          <span className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] md:text-xs font-semibold ${getNivelColor(nivelAprendizagem || '')}`}>
                                            {nivelAprendizagem || '-'}
                                          </span>
                                        ) : (
                                          <div className={`inline-flex flex-col items-center p-0.5 sm:p-1 md:p-1.5 lg:p-2 rounded-lg ${getNotaBgColor(nota)} w-full max-w-[50px] sm:max-w-[55px] md:max-w-[60px] lg:max-w-[70px]`}>
                                            {getTotalQuestoesPorSerie(resultado, disciplina.codigo) && acertos !== null && (
                                              <div className="text-[9px] sm:text-[10px] md:text-xs text-gray-600 dark:text-gray-400 mb-0.5 font-medium">
                                                {acertos}/{getTotalQuestoesPorSerie(resultado, disciplina.codigo)}
                                              </div>
                                            )}
                                            <div className={`text-[10px] sm:text-[11px] md:text-xs lg:text-sm xl:text-base font-bold ${getNotaColor(nota)}`}>
                                              {formatarNota(nota, resultado.presenca, resultado.media_aluno)}
                                            </div>
                                            {nota !== null && nota !== 0 && (resultado.presenca === 'P' || resultado.presenca === 'p') && (
                                              <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-0.5 md:h-1 mt-0.5 md:mt-1">
                                                <div
                                                  className={`h-0.5 md:h-1 rounded-full ${
                                                    nota >= 7 ? 'bg-green-500' : nota >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                                                  }`}
                                                  style={{ width: `${Math.min((nota / 10) * 100, 100)}%` }}
                                                ></div>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </td>
                                    )
                                  })}
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
                                        <div className="mt-0.5 text-[9px] sm:text-[10px] md:text-xs font-medium text-gray-600 dark:text-gray-400">
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
                                          mediaAluno: resultado.media_aluno,
                                          notasDisciplinas: {
                                            nota_lp: resultado.nota_lp,
                                            nota_ch: resultado.nota_ch,
                                            nota_mat: resultado.nota_mat,
                                            nota_cn: resultado.nota_cn,
                                          },
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

                    {/* Paginação */}
                    {totalPaginas > 1 && (
                      <div className="px-6 py-4 border-t-2 border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-gray-50 to-gray-100">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Mostrando <span className="font-bold text-indigo-600 dark:text-indigo-400">{((paginaAtual - 1) * itensPorPagina) + 1}</span> até{' '}
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">{Math.min(paginaAtual * itensPorPagina, alunosOrdenados.length)}</span> de{' '}
                          <span className="font-bold text-gray-900 dark:text-white">{alunosOrdenados.length.toLocaleString('pt-BR')}</span> registros
                        </p>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setPaginaAtual(Math.max(1, paginaAtual - 1))} 
                            disabled={paginaAtual === 1} 
                            className="px-4 py-2 text-sm font-medium border-2 border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                                      : 'border-gray-300 dark:border-slate-600 hover:bg-gray-100 text-gray-700'
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
                            className="px-4 py-2 text-sm font-medium border-2 border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Próximo
                          </button>
                        </div>
                      </div>
                    )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {abaAtiva === 'analises' && (
                <div className="space-y-6 mt-4">
                  {!pesquisaRealizada ? (
                    <div className="text-center py-12">
                      <Search className="w-12 h-12 mx-auto text-indigo-300 mb-3" />
                      <p className="text-base font-medium text-gray-600 dark:text-gray-300">Selecione os filtros desejados</p>
                      <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">Use os filtros acima e clique em <strong>Pesquisar</strong> para carregar os dados</p>
                    </div>
                  ) : (
                    <>
                      {/* Cards de Resumo - Taxa de Acerto Geral */}
                      {dados.analiseAcertosErros?.taxaAcertoGeral && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400">Taxa de Acerto</h3>
                              <Target className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                            </div>
                            <p className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
                              {dados.analiseAcertosErros?.taxaAcertoGeral.taxa_acerto_geral.toFixed(2)}%
                            </p>
                            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {dados.analiseAcertosErros?.taxaAcertoGeral.total_acertos.toLocaleString('pt-BR')} de {dados.analiseAcertosErros?.taxaAcertoGeral.total_respostas.toLocaleString('pt-BR')} respostas
                            </p>
                          </div>
                          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400">Taxa de Erro</h3>
                              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                            </div>
                            <p className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400">
                              {dados.analiseAcertosErros?.taxaAcertoGeral.taxa_erro_geral.toFixed(2)}%
                            </p>
                            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {dados.analiseAcertosErros?.taxaAcertoGeral.total_erros.toLocaleString('pt-BR')} erros
                            </p>
                          </div>
                          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400">Total de Respostas</h3>
                              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                            </div>
                            <p className="text-2xl sm:text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                              {dados.analiseAcertosErros?.taxaAcertoGeral.total_respostas.toLocaleString('pt-BR')}
                            </p>
                            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">Respostas analisadas</p>
                          </div>
                        </div>
                      )}

                      {/* Taxa de Acerto por Disciplina */}
                      {dados.analiseAcertosErros?.taxaAcertoPorDisciplina && dados.analiseAcertosErros?.taxaAcertoPorDisciplina.length > 0 && (
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">Taxa de Acerto por Disciplina</h3>
                          <div className="h-[250px] sm:h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={dados.analiseAcertosErros?.taxaAcertoPorDisciplina}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis dataKey="disciplina" tick={{ fill: '#6B7280', fontSize: 10 }} />
                                <YAxis domain={[0, 100]} tick={{ fill: '#6B7280', fontSize: 10 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ fontSize: '11px' }} />
                                <Bar dataKey="taxa_acerto" name="Taxa de Acerto (%)" fill="#10B981" radius={[2, 2, 0, 0]} />
                                <Bar dataKey="taxa_erro" name="Taxa de Erro (%)" fill="#EF4444" radius={[2, 2, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}

                      {/* Questões com Mais Erros */}
                      {dados.analiseAcertosErros?.questoesComMaisErros && dados.analiseAcertosErros?.questoesComMaisErros.length > 0 && (
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6 overflow-hidden">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">Questões com Mais Erros</h3>
                          <div className="overflow-x-auto -mx-4 sm:mx-0">
                            <TabelaPaginada
                              dados={dados.analiseAcertosErros?.questoesComMaisErros.slice((paginasAnalises.questoesErros - 1) * itensPorPagina, paginasAnalises.questoesErros * itensPorPagina)}
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
                              paginaAtual={paginasAnalises.questoesErros}
                              totalPaginas={Math.ceil(dados.analiseAcertosErros?.questoesComMaisErros.length / itensPorPagina)}
                              onPaginar={(p: number) => setPaginasAnalises(prev => ({ ...prev, questoesErros: p }))}
                              totalRegistros={dados.analiseAcertosErros?.questoesComMaisErros.length}
                              itensPorPagina={itensPorPagina}
                            />
                          </div>
                        </div>
                      )}

                      {/* Escolas com Mais Erros */}
                      {dados.analiseAcertosErros?.escolasComMaisErros && dados.analiseAcertosErros?.escolasComMaisErros.length > 0 && (
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6 overflow-hidden">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">Escolas com Mais Erros</h3>
                          <div className="overflow-x-auto -mx-4 sm:mx-0">
                            <TabelaPaginada
                              dados={dados.analiseAcertosErros?.escolasComMaisErros.slice((paginasAnalises.escolasErros - 1) * itensPorPagina, paginasAnalises.escolasErros * itensPorPagina)}
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
                              paginaAtual={paginasAnalises.escolasErros}
                              totalPaginas={Math.ceil(dados.analiseAcertosErros?.escolasComMaisErros.length / itensPorPagina)}
                              onPaginar={(p: number) => setPaginasAnalises(prev => ({ ...prev, escolasErros: p }))}
                              totalRegistros={dados.analiseAcertosErros?.escolasComMaisErros.length}
                              itensPorPagina={itensPorPagina}
                            />
                          </div>
                        </div>
                      )}

                      {/* Turmas com Mais Erros */}
                      {dados.analiseAcertosErros?.turmasComMaisErros && dados.analiseAcertosErros?.turmasComMaisErros.length > 0 && (
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6 overflow-hidden">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">Turmas com Mais Erros</h3>
                          <div className="overflow-x-auto -mx-4 sm:mx-0">
                            <TabelaPaginada
                              dados={dados.analiseAcertosErros?.turmasComMaisErros.slice((paginasAnalises.turmasErros - 1) * itensPorPagina, paginasAnalises.turmasErros * itensPorPagina)}
                              colunas={[
                                { key: 'turma', label: 'Turma', align: 'left' },
                                { key: 'escola', label: 'Escola', align: 'left' },
                                { key: 'serie', label: 'Série', align: 'center', format: 'serie' },
                                { key: 'total_alunos', label: 'Alunos', align: 'center' },
                                { key: 'total_respostas', label: 'Total', align: 'center' },
                                { key: 'total_acertos', label: 'Acertos', align: 'center' },
                                { key: 'total_erros', label: 'Erros', align: 'center' },
                                { key: 'taxa_acerto', label: 'Taxa Acerto (%)', align: 'center', format: 'decimal' },
                                { key: 'taxa_erro', label: 'Taxa Erro (%)', align: 'center', format: 'decimal' },
                              ]}
                              ordenacao={ordenacao}
                              onOrdenar={handleOrdenacao}
                              paginaAtual={paginasAnalises.turmasErros}
                              totalPaginas={Math.ceil(dados.analiseAcertosErros?.turmasComMaisErros.length / itensPorPagina)}
                              onPaginar={(p: number) => setPaginasAnalises(prev => ({ ...prev, turmasErros: p }))}
                              totalRegistros={dados.analiseAcertosErros?.turmasComMaisErros.length}
                              itensPorPagina={itensPorPagina}
                            />
                          </div>
                        </div>
                      )}

                      {/* Questões com Mais Acertos */}
                      {dados.analiseAcertosErros?.questoesComMaisAcertos && dados.analiseAcertosErros?.questoesComMaisAcertos.length > 0 && (
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6 overflow-hidden">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">Questões com Mais Acertos</h3>
                          <div className="overflow-x-auto -mx-4 sm:mx-0">
                            <TabelaPaginada
                              dados={dados.analiseAcertosErros?.questoesComMaisAcertos.slice((paginasAnalises.questoesAcertos - 1) * itensPorPagina, paginasAnalises.questoesAcertos * itensPorPagina)}
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
                              paginaAtual={paginasAnalises.questoesAcertos}
                              totalPaginas={Math.ceil(dados.analiseAcertosErros?.questoesComMaisAcertos.length / itensPorPagina)}
                              onPaginar={(p: number) => setPaginasAnalises(prev => ({ ...prev, questoesAcertos: p }))}
                              totalRegistros={dados.analiseAcertosErros?.questoesComMaisAcertos.length}
                              itensPorPagina={itensPorPagina}
                            />
                          </div>
                        </div>
                      )}

                      {/* Escolas com Mais Acertos */}
                      {dados.analiseAcertosErros?.escolasComMaisAcertos && dados.analiseAcertosErros?.escolasComMaisAcertos.length > 0 && (
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6 overflow-hidden">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">Escolas com Mais Acertos</h3>
                          <div className="overflow-x-auto -mx-4 sm:mx-0">
                            <TabelaPaginada
                              dados={dados.analiseAcertosErros?.escolasComMaisAcertos.slice((paginasAnalises.escolasAcertos - 1) * itensPorPagina, paginasAnalises.escolasAcertos * itensPorPagina)}
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
                              paginaAtual={paginasAnalises.escolasAcertos}
                              totalPaginas={Math.ceil(dados.analiseAcertosErros?.escolasComMaisAcertos.length / itensPorPagina)}
                              onPaginar={(p: number) => setPaginasAnalises(prev => ({ ...prev, escolasAcertos: p }))}
                              totalRegistros={dados.analiseAcertosErros?.escolasComMaisAcertos.length}
                              itensPorPagina={itensPorPagina}
                            />
                          </div>
                        </div>
                      )}

                      {/* Turmas com Mais Acertos */}
                      {dados.analiseAcertosErros?.turmasComMaisAcertos && dados.analiseAcertosErros?.turmasComMaisAcertos.length > 0 && (
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6 overflow-hidden">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">Turmas com Mais Acertos</h3>
                          <div className="overflow-x-auto -mx-4 sm:mx-0">
                            <TabelaPaginada
                              dados={dados.analiseAcertosErros?.turmasComMaisAcertos.slice((paginasAnalises.turmasAcertos - 1) * itensPorPagina, paginasAnalises.turmasAcertos * itensPorPagina)}
                              colunas={[
                                { key: 'turma', label: 'Turma', align: 'left' },
                                { key: 'escola', label: 'Escola', align: 'left' },
                                { key: 'serie', label: 'Série', align: 'center', format: 'serie' },
                                { key: 'total_alunos', label: 'Alunos', align: 'center' },
                                { key: 'total_respostas', label: 'Total', align: 'center' },
                                { key: 'total_acertos', label: 'Acertos', align: 'center' },
                                { key: 'total_erros', label: 'Erros', align: 'center' },
                                { key: 'taxa_acerto', label: 'Taxa Acerto (%)', align: 'center', format: 'decimal' },
                                { key: 'taxa_erro', label: 'Taxa Erro (%)', align: 'center', format: 'decimal' },
                              ]}
                              ordenacao={ordenacao}
                              onOrdenar={handleOrdenacao}
                              paginaAtual={paginasAnalises.turmasAcertos}
                              totalPaginas={Math.ceil(dados.analiseAcertosErros?.turmasComMaisAcertos.length / itensPorPagina)}
                              onPaginar={(p: number) => setPaginasAnalises(prev => ({ ...prev, turmasAcertos: p }))}
                              totalRegistros={dados.analiseAcertosErros?.turmasComMaisAcertos.length}
                              itensPorPagina={itensPorPagina}
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-xl">
              <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-500 dark:text-gray-400">Nenhum dado encontrado</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Verifique se existem dados importados</p>
            </div>
          )}
        </div>
        
        {/* Modal de Questões do Aluno */}
        {alunoSelecionado && (
          <ModalQuestoesAluno
            isOpen={modalAberto}
            alunoId={alunoSelecionado.id}
            anoLetivo={alunoSelecionado.anoLetivo}
            mediaAluno={alunoSelecionado.mediaAluno}
            notasDisciplinas={alunoSelecionado.notasDisciplinas}
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
    amber: { bg: 'bg-amber-50', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200', iconBg: 'bg-amber-100' },
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
    <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border-2 ${corAtual.border} p-4 hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg ${corAtual.iconBg}`}>
          <Icon className={`w-5 h-5 ${corAtual.text}`} />
        </div>
        {subtitulo && (
          <span className={`text-xs font-semibold ${corAtual.text} bg-white dark:bg-slate-700 px-2 py-1 rounded-md`}>
            {subtitulo}
          </span>
        )}
      </div>
      <p className={`text-2xl font-bold ${corAtual.text} mb-1`}>
        {formatarValor()}
      </p>
      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">{titulo}</p>
    </div>
  )
}

function DisciplinaCard({ titulo, media, cor, sigla }: any) {
  const cores: Record<string, { bg: string; bar: string; text: string; border: string }> = {
    blue: { bg: 'bg-blue-50 dark:bg-blue-900/30', bar: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
    purple: { bg: 'bg-purple-50 dark:bg-purple-900/30', bar: 'bg-purple-500', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
    green: { bg: 'bg-green-50 dark:bg-green-900/30', bar: 'bg-green-500', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-900/30', bar: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
    rose: { bg: 'bg-rose-50 dark:bg-rose-900/30', bar: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800' },
  }
  const c = cores[cor] || cores.blue
  const porcentagem = Math.min((media / 10) * 100, 100)

  return (
    <div className={`${c.bg} rounded-xl p-4 border-2 ${c.border} hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">{sigla}</span>
        <span className={`text-xl font-bold ${c.text}`}>
          {media > 0 ? media.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
        </span>
      </div>
      <div className="w-full bg-white dark:bg-slate-800 rounded-full h-2.5 mb-2 shadow-inner">
        <div 
          className={`h-2.5 rounded-full ${c.bar} transition-all duration-500 shadow-sm`} 
          style={{ width: `${porcentagem}%` }}
        ></div>
      </div>
      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate">{titulo}</p>
      {media > 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{porcentagem.toFixed(1)}% da nota máxima</p>
      )}
    </div>
  )
}

function TabelaPaginada({ dados, colunas, ordenacao, onOrdenar, paginaAtual, totalPaginas, onPaginar, totalRegistros, itensPorPagina, stickyHeader = false }: any) {
  const formatarValor = (valor: any, formato: string) => {
    if (valor === null || valor === undefined) return (
      <span className="text-gray-400 italic">-</span>
    )
    switch (formato) {
      case 'nota':
        const nota = parseFloat(valor)
        const corNota = nota >= 7 ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 border-green-200' :
                       nota >= 5 ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 border-yellow-200' :
                       'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 border-red-200'
        return (
          <span className={`inline-flex items-center justify-center px-3 py-1 rounded-lg text-sm font-bold border-2 ${corNota} min-w-[60px]`}>
            {nota.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        )
      case 'decimal':
        const decimal = parseFloat(valor)
        return (
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {decimal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        )
      case 'presenca':
        return valor === 'P' ? (
          <span className="inline-flex items-center justify-center px-3 py-1 rounded-lg text-xs font-bold bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 border-2 border-green-300">
            ✓ Presente
          </span>
        ) : (
          <span className="inline-flex items-center justify-center px-3 py-1 rounded-lg text-xs font-bold bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 border-2 border-red-300">
            ✗ Faltante
          </span>
        )
      case 'nivel':
        const nivelCores: Record<string, string> = {
          'Insuficiente': 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 border-red-300',
          'Básico': 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 border-yellow-300',
          'Adequado': 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border-blue-300',
          'Avançado': 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 border-green-300',
          'Não classificado': 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-slate-600',
        }
        return valor ? (
          <span className={`inline-flex items-center justify-center px-3 py-1 rounded-lg text-xs font-bold border-2 ${nivelCores[valor] || 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-slate-600'}`}>
            {valor}
          </span>
        ) : (
          <span className="text-gray-400 dark:text-gray-500 italic text-xs">Não classificado</span>
        )
      case 'serie':
        // Formatar série para exibir como "Xº Ano"
        if (!valor) return <span className="text-gray-400 italic">-</span>
        const serieStr = String(valor)
        if (serieStr.toLowerCase().includes('ano')) {
          return <span className="text-sm text-gray-700 dark:text-gray-300">{serieStr}</span>
        }
        const numeroMatch = serieStr.match(/(\d+)/)
        if (!numeroMatch) {
          return <span className="text-sm text-gray-700 dark:text-gray-300">{serieStr}</span>
        }
        const numero = numeroMatch[1]
        return <span className="text-sm text-gray-700 dark:text-gray-300">{numero}º Ano</span>
      default:
        return <span className="text-sm text-gray-700 dark:text-gray-300">{valor}</span>
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border-2 border-gray-200 dark:border-slate-700 w-full max-w-full">
      {/* Visualização Mobile - Cards */}
      <div className="block md:hidden">
        {dados.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <div className="flex flex-col items-center justify-center">
              <Table className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">Nenhum registro encontrado</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Tente ajustar os filtros</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-slate-700">
            {dados.map((row: any, i: number) => (
              <div key={i} className="p-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors">
                {colunas.map((col: any, colIndex: number) => {
                  const valor = row[col.key]
                  const isNumero = typeof valor === 'number'
                  // Primeira coluna é o título principal
                  if (colIndex === 0) {
                    return (
                      <div key={col.key} className="font-semibold text-gray-900 dark:text-white text-sm mb-2 pb-2 border-b border-gray-100 dark:border-slate-700">
                        {valor || '-'}
                      </div>
                    )
                  }
                  return (
                    <div key={col.key} className="flex justify-between items-center py-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{col.label}:</span>
                      <span className="text-xs">
                        {col.format ? formatarValor(valor, col.format) : (
                          <span className={`${isNumero ? 'font-semibold text-gray-800 dark:text-gray-100' : 'font-medium text-gray-700 dark:text-gray-200'}`}>
                            {valor !== null && valor !== undefined
                              ? (isNumero ? valor.toLocaleString('pt-BR') : valor)
                              : <span className="text-gray-400 dark:text-gray-500 italic">-</span>
                            }
                          </span>
                        )}
                      </span>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Visualização Desktop - Tabela */}
      <div className="hidden md:block">
        <table className="w-full min-w-[800px]">
          <thead className={`bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-800 border-b-2 border-gray-300 dark:border-slate-600 ${stickyHeader ? 'sticky top-[180px] sm:top-[190px] z-30' : ''}`}>
            <tr>
              {colunas.map((col: any) => (
                <th
                  key={col.key}
                  onClick={() => onOrdenar(col.key)}
                  className={`px-2 lg:px-4 py-2 lg:py-4 text-${col.align || 'left'} text-[10px] lg:text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600 select-none whitespace-nowrap transition-colors`}
                >
                  <div className={`flex items-center gap-1 lg:gap-2 ${col.align === 'center' ? 'justify-center' : col.align === 'right' ? 'justify-end' : ''}`}>
                    {col.label}
                    {ordenacao.coluna === col.key && (
                      ordenacao.direcao === 'asc' ?
                        <ChevronUp className="w-3 h-3 lg:w-4 lg:h-4 text-indigo-600" /> :
                        <ChevronDown className="w-3 h-3 lg:w-4 lg:h-4 text-indigo-600" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
            {dados.length === 0 ? (
              <tr>
                <td colSpan={colunas.length} className="px-4 py-8 lg:py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <Table className="w-10 h-10 lg:w-12 lg:h-12 text-gray-300 dark:text-gray-600 mb-2" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium text-sm lg:text-base">Nenhum registro encontrado</p>
                    <p className="text-xs lg:text-sm text-gray-400 dark:text-gray-500 mt-1">Tente ajustar os filtros</p>
                  </div>
                </td>
              </tr>
            ) : (
              dados.map((row: any, i: number) => (
                <tr
                  key={i}
                  className="hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors border-b border-gray-100 dark:border-slate-700"
                >
                  {colunas.map((col: any) => {
                    const valor = row[col.key]
                    const isNumero = typeof valor === 'number'
                    const alignClass = col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'

                    return (
                      <td
                        key={col.key}
                        className={`px-2 lg:px-4 py-2 lg:py-3 ${alignClass} whitespace-nowrap align-middle`}
                      >
                        {col.format ? formatarValor(valor, col.format) : (
                          <span className={`text-xs lg:text-sm ${isNumero ? 'font-semibold text-gray-800 dark:text-gray-100' : 'font-medium text-gray-700 dark:text-gray-200'}`}>
                            {valor !== null && valor !== undefined
                              ? (isNumero ? valor.toLocaleString('pt-BR') : valor)
                              : <span className="text-gray-400 dark:text-gray-500 italic">-</span>
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
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-t-2 border-gray-200 dark:border-slate-600 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-800">
          <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 text-center sm:text-left">
            <span className="font-bold text-indigo-600 dark:text-indigo-400">{((paginaAtual - 1) * itensPorPagina) + 1}</span>-<span className="font-bold text-indigo-600 dark:text-indigo-400">{Math.min(paginaAtual * itensPorPagina, totalRegistros)}</span> de{' '}
            <span className="font-bold text-gray-900 dark:text-white">{totalRegistros.toLocaleString('pt-BR')}</span>
          </p>
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => onPaginar(Math.max(1, paginaAtual - 1))}
              disabled={paginaAtual === 1}
              className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 border-2 border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Ant.
            </button>
            <div className="flex gap-0.5 sm:gap-1">
              {Array.from({ length: Math.min(3, totalPaginas) }, (_, i) => {
                let p = i + 1
                if (totalPaginas > 3) {
                  if (paginaAtual <= 2) p = i + 1
                  else if (paginaAtual >= totalPaginas - 1) p = totalPaginas - 2 + i
                  else p = paginaAtual - 1 + i
                }
                return (
                  <button
                    key={p}
                    onClick={() => onPaginar(p)}
                    className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold border-2 rounded-lg transition-colors ${
                      paginaAtual === p
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                        : 'border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300'
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
              className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 border-2 border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Prox.
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
