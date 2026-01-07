'use client'

import ProtectedRoute from '@/components/protected-route'
import LayoutDashboard from '@/components/layout-dashboard'
import ModalQuestoesAluno from '@/components/modal-questoes-aluno'
import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts'
import {
  Users, School, GraduationCap, MapPin, TrendingUp, TrendingDown,
  Filter, X, ChevronDown, ChevronUp, RefreshCw, Download,
  BookOpen, Calculator, Award, UserCheck, UserX, BarChart3,
  Table, PieChartIcon, Activity, Layers, Eye, EyeOff, AlertTriangle, Target, WifiOff
} from 'lucide-react'
import { obterDisciplinasPorSerieSync } from '@/lib/disciplinas-por-serie'
import * as offlineStorage from '@/lib/offline-storage'

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
  return num.toFixed(1)
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
  // Estado para modo offline
  const [usandoDadosOffline, setUsandoDadosOffline] = useState(false)
  const [modoOffline, setModoOffline] = useState(false)

  // Componente auxiliar para tooltip customizado
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 text-sm">
          <p className="font-semibold text-gray-900 dark:text-white mb-1">{label}</p>
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
  const [filtroTipoEnsino, setFiltroTipoEnsino] = useState('')

  // Visualização
  const [abaAtiva, setAbaAtiva] = useState<'visao_geral' | 'escolas' | 'turmas' | 'alunos' | 'analises'>('visao_geral')
  const [ordenacao, setOrdenacao] = useState<{ coluna: string; direcao: 'asc' | 'desc' }>({ coluna: 'media_geral', direcao: 'desc' })
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [itensPorPagina] = useState(15)

  // Paginação independente para cada seção da aba Análises
  const [paginaQuestoesErros, setPaginaQuestoesErros] = useState(1)
  const [paginaEscolasErros, setPaginaEscolasErros] = useState(1)
  const [paginaTurmasErros, setPaginaTurmasErros] = useState(1)
  const [paginaQuestoesAcertos, setPaginaQuestoesAcertos] = useState(1)
  const [paginaEscolasAcertos, setPaginaEscolasAcertos] = useState(1)
  const [paginaTurmasAcertos, setPaginaTurmasAcertos] = useState(1)

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

  const carregarDados = async (forcarAtualizacao: boolean = false, signal?: AbortSignal) => {
    setCarregando(true)
    setErro(null)

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
        serie: filtroSerie,
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
      }
      const criarAcumulador = (): Acumulador => ({
        total: 0, presentes: 0, faltantes: 0,
        soma_geral: 0, count_geral: 0,
        soma_lp: 0, count_lp: 0,
        soma_mat: 0, count_mat: 0,
        soma_ch: 0, count_ch: 0,
        soma_cn: 0, count_cn: 0
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
        mediasPorSerie: Array.from(seriesMap.entries()).map(([serie, acc]) => ({
          serie,
          total_alunos: acc.total,
          presentes: acc.presentes,
          media_geral: calcMedia(acc.soma_geral, acc.count_geral),
          media_lp: calcMedia(acc.soma_lp, acc.count_lp),
          media_mat: calcMedia(acc.soma_mat, acc.count_mat),
          media_ch: calcMedia(acc.soma_ch, acc.count_ch),
          media_cn: calcMedia(acc.soma_cn, acc.count_cn)
        })).sort((a, b) => a.serie.localeCompare(b.serie)),
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
      return
    }

    // MODO ONLINE: Buscar da API
    try {
      const params = new URLSearchParams()
      if (filtroPoloId) params.append('polo_id', filtroPoloId)
      if (filtroEscolaId) params.append('escola_id', filtroEscolaId)
      if (filtroSerie) params.append('serie', filtroSerie)
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
      }
    }
  }

  useEffect(() => {
    // Criar AbortController para cancelar requisições anteriores
    const abortController = new AbortController()

    // Sempre forçar atualização quando filtros mudam para garantir dados atualizados
    carregarDados(true, abortController.signal)

    // Cleanup: cancelar requisição anterior quando filtros mudarem ou componente desmontar
    return () => {
      abortController.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroPoloId, filtroEscolaId, filtroSerie, filtroTurmaId, filtroAnoLetivo, filtroPresenca, filtroNivel, filtroFaixaMedia, filtroDisciplina, filtroTaxaAcertoMin, filtroTaxaAcertoMax, filtroQuestaoCodigo, filtroTipoEnsino])

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
  }

  const temFiltrosAtivos = filtroPoloId || filtroEscolaId || filtroSerie || filtroTurmaId || filtroAnoLetivo || filtroPresenca || filtroNivel || filtroFaixaMedia || filtroDisciplina || filtroTaxaAcertoMin || filtroTaxaAcertoMax || filtroQuestaoCodigo || filtroTipoEnsino
  const qtdFiltros = [filtroPoloId, filtroEscolaId, filtroSerie, filtroTurmaId, filtroAnoLetivo, filtroPresenca, filtroNivel, filtroFaixaMedia, filtroDisciplina, filtroTaxaAcertoMin, filtroTaxaAcertoMax, filtroQuestaoCodigo, filtroTipoEnsino].filter(Boolean).length

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

    // Sem filtro: usar série do primeiro aluno ou padrão anos finais
    return obterDisciplinasPorSerieSync(dados?.alunosDetalhados[0]?.serie)
  }, [filtroSerie, filtroTipoEnsino, dados?.alunosDetalhados])

  // Função para obter o total de questões correto para uma disciplina baseado na série do aluno
  const getTotalQuestoesPorSerie = useCallback((serie: string | null | undefined, codigoDisciplina: string): number | undefined => {
    const disciplinasSerie = obterDisciplinasPorSerieSync(serie)
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
        const response = await fetch('/api/auth/verificar')
        const data = await response.json()
        if (data.usuario) {
          const tipo = data.usuario.tipo_usuario === 'administrador' ? 'admin' : data.usuario.tipo_usuario
          setTipoUsuario(tipo)
          setUsuario(data.usuario)

          // Se for usuário escola, definir automaticamente os filtros e carregar nomes
          if (data.usuario.tipo_usuario === 'escola' && data.usuario.escola_id) {
            setFiltroEscolaId(data.usuario.escola_id)
            // Carregar nome da escola e polo
            try {
              const escolaRes = await fetch(`/api/admin/escolas?id=${data.usuario.escola_id}`)
              const escolaData = await escolaRes.json()
              if (Array.isArray(escolaData) && escolaData.length > 0) {
                setEscolaNome(escolaData[0].nome)
                setPoloNome(escolaData[0].polo_nome || '')
                // Definir polo_id para filtrar corretamente
                if (escolaData[0].polo_id) {
                  setFiltroPoloId(escolaData[0].polo_id)
                }
              }
            } catch (err) {
              console.error('Erro ao carregar dados da escola:', err)
            }
          }

          // Se for usuário polo, definir automaticamente o filtro de polo e carregar nome
          if (data.usuario.tipo_usuario === 'polo' && data.usuario.polo_id) {
            setFiltroPoloId(data.usuario.polo_id)
            // Carregar nome do polo
            try {
              const poloRes = await fetch(`/api/admin/polos?id=${data.usuario.polo_id}`)
              const poloData = await poloRes.json()
              if (Array.isArray(poloData) && poloData.length > 0) {
                setPoloNome(poloData[0].nome)
              }
            } catch (err) {
              console.error('Erro ao carregar dados do polo:', err)
            }
          }
        }
      } catch (error) {
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
  }, [])

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'polo', 'escola']}>
      <LayoutDashboard tipoUsuario={tipoUsuario}>
        <div className="space-y-4 overflow-x-hidden max-w-full">
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

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
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
              onClick={() => carregarDados(true)}
              disabled={carregando}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm sm:text-base flex-shrink-0"
              title="Pesquisar dados (força atualização do cache)"
            >
              <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Pesquisar</span>
            </button>
          </div>

          {/* Barra de Filtros */}
          <div className="bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 rounded-xl shadow-lg border-2 border-gray-200 dark:border-slate-700 p-3 sm:p-4 md:p-6">
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

              {/* Serie */}
              <div className={`space-y-1.5 p-3 rounded-lg transition-all ${filtroSerie ? 'bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-300 dark:border-indigo-700 shadow-sm' : 'bg-transparent'}`}>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${filtroSerie ? 'bg-indigo-600' : 'bg-indigo-500'}`}></span>
                  Série
                </label>
                <select
                  value={filtroSerie}
                  onChange={(e) => { setFiltroSerie(e.target.value); setFiltroTurmaId(''); setPaginaAtual(1); }}
                  className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400 ${
                    filtroSerie
                      ? 'bg-white dark:bg-slate-700 border-2 border-indigo-500 text-gray-900 dark:text-white shadow-sm'
                      : 'bg-white dark:bg-slate-700 border-2 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200'
                  }`}
                >
                  <option value="">Todas as séries</option>
                  {dados?.filtros.series
                    .filter(serie => {
                      if (!filtroTipoEnsino) return true
                      const numeroSerie = serie.match(/(\d+)/)?.[1]
                      if (filtroTipoEnsino === 'anos_iniciais') {
                        return ['2', '3', '5'].includes(numeroSerie || '')
                      } else if (filtroTipoEnsino === 'anos_finais') {
                        return ['6', '7', '8', '9'].includes(numeroSerie || '')
                      }
                      return true
                    })
                    .map(serie => (
                      <option key={serie} value={serie}>{serie}</option>
                    ))}
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

          {/* Segmentacao Visual - Chips de Series */}
          {dados?.filtros.series && dados.filtros.series.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase self-center mr-2">Serie:</span>
              <button
                onClick={() => { setFiltroSerie(''); setPaginaAtual(1); }}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  !filtroSerie ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
              >
                Todas
              </button>
              {dados.filtros.series.map(serie => (
                <button
                  key={serie}
                  onClick={() => { setFiltroSerie(serie); setPaginaAtual(1); }}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    filtroSerie === serie ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {serie}
                </button>
              ))}
            </div>
          )}

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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                <DisciplinaCard titulo="Lingua Portuguesa" media={dados.metricas.media_lp} cor="blue" sigla="LP" />
                <DisciplinaCard titulo="Matematica" media={dados.metricas.media_mat} cor="purple" sigla="MAT" />
                <DisciplinaCard titulo="Ciencias Humanas" media={dados.metricas.media_ch} cor="green" sigla="CH" />
                <DisciplinaCard titulo="Ciencias da Natureza" media={dados.metricas.media_cn} cor="amber" sigla="CN" />
                {dados.metricas.media_producao > 0 && (
                  <DisciplinaCard titulo="Producao Textual" media={dados.metricas.media_producao} cor="rose" sigla="PT" />
                )}
              </div>

              {/* Abas de Navegacao - Sticky e Scrollável em mobile */}
              <div className="sticky top-0 z-20 bg-gray-50 dark:bg-slate-900 py-2 -mx-2 px-2 sm:mx-0 sm:px-0">
                <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
                  <div className="flex gap-1 border-b border-gray-200 dark:border-slate-700 min-w-max sm:min-w-0">
                  {[
                    { id: 'visao_geral', label: 'Visão Geral', icon: PieChartIcon },
                    { id: 'escolas', label: 'Escolas', icon: School },
                    { id: 'turmas', label: 'Turmas', icon: Layers },
                    { id: 'alunos', label: 'Alunos', icon: Users },
                    { id: 'analises', label: 'Análises', icon: Target },
                  ].map(aba => (
                    <button
                      key={aba.id}
                      onClick={() => { setAbaAtiva(aba.id as any); setPaginaAtual(1); }}
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
              </div>

              {/* Conteudo das Abas */}
              {abaAtiva === 'visao_geral' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Grafico de Barras - Medias por Serie */}
                  {dados.mediasPorSerie.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Media por Serie</h3>
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
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Distribuicao por Nivel</h3>
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
                                    {resultado.serie && <div>Série: {resultado.serie}</div>}
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
                                        {getTotalQuestoesPorSerie(resultado.serie, disciplina.codigo) && acertos !== null && (
                                          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">{acertos}/{getTotalQuestoesPorSerie(resultado.serie, disciplina.codigo)}</div>
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
                    <div className="w-full overflow-x-auto -mx-2 sm:mx-0">
                      <table className="w-full divide-y divide-gray-200 dark:divide-slate-700 min-w-0 md:min-w-[600px] lg:min-w-[700px]">
                        <thead className="bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-900/50 dark:to-indigo-800/50">
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
                                        {resultado.serie && <div>Série: {resultado.serie}</div>}
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

                                    // Se a disciplina não é aplicável à série do aluno, mostrar célula vazia
                                    if (!disciplinaAplicavel) {
                                      return (
                                        <td key={disciplina.codigo} className="py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-3 lg:px-2 text-center">
                                          <span className="text-gray-400 dark:text-gray-500 text-xs">-</span>
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
                                            {getTotalQuestoesPorSerie(resultado.serie, disciplina.codigo) && acertos !== null && (
                                              <div className="text-[9px] sm:text-[10px] md:text-xs text-gray-600 dark:text-gray-400 mb-0.5 font-medium">
                                                {acertos}/{getTotalQuestoesPorSerie(resultado.serie, disciplina.codigo)}
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
                    </div>
                    
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
                </div>
              )}

              {abaAtiva === 'analises' && dados.analiseAcertosErros && (
                <div className="space-y-6 overflow-x-hidden">
                  {/* Taxa de Acerto Geral */}
                  {dados.analiseAcertosErros.taxaAcertoGeral && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">Taxa de Acerto</h3>
                          <Target className="w-5 h-5 text-green-600" />
                        </div>
                        <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                          {dados.analiseAcertosErros.taxaAcertoGeral.taxa_acerto_geral.toFixed(2)}%
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {dados.analiseAcertosErros.taxaAcertoGeral.total_acertos.toLocaleString('pt-BR')} de {dados.analiseAcertosErros.taxaAcertoGeral.total_respostas.toLocaleString('pt-BR')} respostas
                        </p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">Taxa de Erro</h3>
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                        </div>
                        <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                          {dados.analiseAcertosErros.taxaAcertoGeral.taxa_erro_geral.toFixed(2)}%
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {dados.analiseAcertosErros.taxaAcertoGeral.total_erros.toLocaleString('pt-BR')} erros
                        </p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">Total de Respostas</h3>
                          <BarChart3 className="w-5 h-5 text-indigo-600" />
                        </div>
                        <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                          {dados.analiseAcertosErros.taxaAcertoGeral.total_respostas.toLocaleString('pt-BR')}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Respostas analisadas</p>
                      </div>
                    </div>
                  )}

                  {/* Taxa de Acerto por Disciplina */}
                  {dados.analiseAcertosErros.taxaAcertoPorDisciplina && dados.analiseAcertosErros.taxaAcertoPorDisciplina.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Taxa de Acerto por Disciplina</h3>
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
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 overflow-x-hidden">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Questões com Mais Erros</h3>
                      <div className="overflow-x-auto">
                        <TabelaPaginada
                          dados={dados.analiseAcertosErros.questoesComMaisErros.slice((paginaQuestoesErros - 1) * itensPorPagina, paginaQuestoesErros * itensPorPagina)}
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
                          paginaAtual={paginaQuestoesErros}
                          totalPaginas={Math.ceil(dados.analiseAcertosErros.questoesComMaisErros.length / itensPorPagina)}
                          onPaginar={setPaginaQuestoesErros}
                          totalRegistros={dados.analiseAcertosErros.questoesComMaisErros.length}
                          itensPorPagina={itensPorPagina}
                        />
                      </div>
                    </div>
                  )}

                  {/* Escolas com Mais Erros */}
                  {dados.analiseAcertosErros.escolasComMaisErros && dados.analiseAcertosErros.escolasComMaisErros.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 overflow-x-hidden">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Escolas com Mais Erros</h3>
                      <div className="overflow-x-auto">
                        <TabelaPaginada
                          dados={dados.analiseAcertosErros.escolasComMaisErros.slice((paginaEscolasErros - 1) * itensPorPagina, paginaEscolasErros * itensPorPagina)}
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
                          paginaAtual={paginaEscolasErros}
                          totalPaginas={Math.ceil(dados.analiseAcertosErros.escolasComMaisErros.length / itensPorPagina)}
                          onPaginar={setPaginaEscolasErros}
                          totalRegistros={dados.analiseAcertosErros.escolasComMaisErros.length}
                          itensPorPagina={itensPorPagina}
                        />
                      </div>
                    </div>
                  )}

                  {/* Turmas com Mais Erros */}
                  {dados.analiseAcertosErros.turmasComMaisErros && dados.analiseAcertosErros.turmasComMaisErros.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 overflow-x-hidden">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Turmas com Mais Erros</h3>
                      <div className="overflow-x-auto">
                        <TabelaPaginada
                          dados={dados.analiseAcertosErros.turmasComMaisErros.slice((paginaTurmasErros - 1) * itensPorPagina, paginaTurmasErros * itensPorPagina)}
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
                          paginaAtual={paginaTurmasErros}
                          totalPaginas={Math.ceil(dados.analiseAcertosErros.turmasComMaisErros.length / itensPorPagina)}
                          onPaginar={setPaginaTurmasErros}
                          totalRegistros={dados.analiseAcertosErros.turmasComMaisErros.length}
                          itensPorPagina={itensPorPagina}
                        />
                      </div>
                    </div>
                  )}

                  {/* Questões com Mais Acertos */}
                  {dados.analiseAcertosErros.questoesComMaisAcertos && dados.analiseAcertosErros.questoesComMaisAcertos.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 overflow-x-hidden">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Questões com Mais Acertos</h3>
                      <div className="overflow-x-auto">
                        <TabelaPaginada
                          dados={dados.analiseAcertosErros.questoesComMaisAcertos.slice((paginaQuestoesAcertos - 1) * itensPorPagina, paginaQuestoesAcertos * itensPorPagina)}
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
                          paginaAtual={paginaQuestoesAcertos}
                          totalPaginas={Math.ceil(dados.analiseAcertosErros.questoesComMaisAcertos.length / itensPorPagina)}
                          onPaginar={setPaginaQuestoesAcertos}
                          totalRegistros={dados.analiseAcertosErros.questoesComMaisAcertos.length}
                          itensPorPagina={itensPorPagina}
                        />
                      </div>
                    </div>
                  )}

                  {/* Escolas com Mais Acertos */}
                  {dados.analiseAcertosErros.escolasComMaisAcertos && dados.analiseAcertosErros.escolasComMaisAcertos.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 overflow-x-hidden">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Escolas com Mais Acertos</h3>
                      <div className="overflow-x-auto">
                        <TabelaPaginada
                          dados={dados.analiseAcertosErros.escolasComMaisAcertos.slice((paginaEscolasAcertos - 1) * itensPorPagina, paginaEscolasAcertos * itensPorPagina)}
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
                          paginaAtual={paginaEscolasAcertos}
                          totalPaginas={Math.ceil(dados.analiseAcertosErros.escolasComMaisAcertos.length / itensPorPagina)}
                          onPaginar={setPaginaEscolasAcertos}
                          totalRegistros={dados.analiseAcertosErros.escolasComMaisAcertos.length}
                          itensPorPagina={itensPorPagina}
                        />
                      </div>
                    </div>
                  )}

                  {/* Turmas com Mais Acertos */}
                  {dados.analiseAcertosErros.turmasComMaisAcertos && dados.analiseAcertosErros.turmasComMaisAcertos.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 overflow-x-hidden">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Turmas com Mais Acertos</h3>
                      <div className="overflow-x-auto">
                        <TabelaPaginada
                          dados={dados.analiseAcertosErros.turmasComMaisAcertos.slice((paginaTurmasAcertos - 1) * itensPorPagina, paginaTurmasAcertos * itensPorPagina)}
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
                          paginaAtual={paginaTurmasAcertos}
                          totalPaginas={Math.ceil(dados.analiseAcertosErros.turmasComMaisAcertos.length / itensPorPagina)}
                          onPaginar={setPaginaTurmasAcertos}
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

function TabelaPaginada({ dados, colunas, ordenacao, onOrdenar, paginaAtual, totalPaginas, onPaginar, totalRegistros, itensPorPagina }: any) {
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
      default:
        return <span className="text-sm text-gray-700 dark:text-gray-300">{valor}</span>
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border-2 border-gray-200 dark:border-slate-700 overflow-hidden w-full max-w-full">
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
      <div className="hidden md:block overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        <table className="w-full">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-800 border-b-2 border-gray-300 dark:border-slate-600">
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
