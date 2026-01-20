'use client'

import ProtectedRoute from '@/components/protected-route'
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
  Table, PieChartIcon, Activity, Layers, Eye, EyeOff, AlertTriangle, Target, WifiOff, Search, Zap, FileText, ArrowUpDown
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

// Imports dos componentes e utilitarios refatorados
import {
  MetricCard,
  DisciplinaCard,
  NivelBadge,
  TabelaPaginada,
  CustomTooltip,
  StatusIndicators,
  LoadingSpinner,
  AbaNavegacao,
  SeriesChips,
  FiltroSelect,
  type AbaConfig
} from '@/components/dados'
import type { DashboardData, AlunoSelecionado } from '@/lib/dados/types'
import {
  COLORS,
  NIVEL_NAMES,
  PAGINACAO_ANALISES_INICIAL,
  FILTROS_STORAGE_KEY
} from '@/lib/dados/constants'
import {
  getNivelName,
  getNivelBadgeClass,
  calcularNivelPorMedia,
  formatarSerie,
  getPresencaColor,
  formatarNota,
  getNotaNumero,
  getNotaColor,
  getNotaBgColor,
  toNumber
} from '@/lib/dados/utils'


export default function DadosPage() {
  // Estado para modo offline e cache
  const [usandoDadosOffline, setUsandoDadosOffline] = useState(false)
  const [modoOffline, setModoOffline] = useState(false)
  const [usandoCache, setUsandoCache] = useState(false) // Indica se está usando dados do cache local

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
  const [filtroTipoEnsino, setFiltroTipoEnsino] = useState('')

  // Visualização
  const [abaAtiva, setAbaAtiva] = useState<'visao_geral' | 'escolas' | 'turmas' | 'alunos' | 'analises'>('visao_geral')

  // Flag para controlar se os filtros foram carregados do localStorage
  const [filtrosCarregados, setFiltrosCarregados] = useState(false)

  // Carregar filtros do localStorage ao iniciar
  useEffect(() => {
    if (typeof window !== 'undefined' && !filtrosCarregados) {
      try {
        const filtrosSalvos = localStorage.getItem(FILTROS_STORAGE_KEY)
        if (filtrosSalvos) {
          const filtros = JSON.parse(filtrosSalvos)
          // Restaurar filtros (exceto polo e escola para usuários restritos)
          if (filtros.serie) setFiltroSerie(filtros.serie)
          if (filtros.anoLetivo) setFiltroAnoLetivo(filtros.anoLetivo)
          if (filtros.presenca) setFiltroPresenca(filtros.presenca)
          if (filtros.nivel) setFiltroNivel(filtros.nivel)
          if (filtros.faixaMedia) setFiltroFaixaMedia(filtros.faixaMedia)
          if (filtros.disciplina) setFiltroDisciplina(filtros.disciplina)
          if (filtros.tipoEnsino) setFiltroTipoEnsino(filtros.tipoEnsino)
          if (filtros.abaAtiva) setAbaAtiva(filtros.abaAtiva)
        }
      } catch (e) {
        console.warn('Erro ao carregar filtros do localStorage:', e)
      }
      setFiltrosCarregados(true)
    }
  }, [filtrosCarregados])

  // Salvar filtros no localStorage quando mudarem
  useEffect(() => {
    if (typeof window !== 'undefined' && filtrosCarregados) {
      try {
        const filtros = {
          serie: filtroSerie,
          anoLetivo: filtroAnoLetivo,
          presenca: filtroPresenca,
          nivel: filtroNivel,
          faixaMedia: filtroFaixaMedia,
          disciplina: filtroDisciplina,
          tipoEnsino: filtroTipoEnsino,
          abaAtiva: abaAtiva,
        }
        localStorage.setItem(FILTROS_STORAGE_KEY, JSON.stringify(filtros))
      } catch (e) {
        console.warn('Erro ao salvar filtros no localStorage:', e)
      }
    }
  }, [filtroSerie, filtroAnoLetivo, filtroPresenca, filtroNivel, filtroFaixaMedia, filtroDisciplina, filtroTipoEnsino, abaAtiva, filtrosCarregados])
  const [ordenacao, setOrdenacao] = useState<{ coluna: string; direcao: 'asc' | 'desc' }>({ coluna: 'media_geral', direcao: 'desc' })
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [itensPorPagina] = useState(50)

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
    niveisDisciplinas?: {
      nivel_lp?: string | null;
      nivel_mat?: string | null;
      nivel_prod?: string | null;
      nivel_aluno?: string | null;
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

      // DEBUG: Verificar se nota_producao está nos dados carregados
      const comNotaProd = resultadosFiltrados.filter(r => r.nota_producao && parseFloat(String(r.nota_producao)) > 0)
      console.log('[DEBUG] Resultados com nota_producao > 0:', comNotaProd.length)
      if (comNotaProd.length > 0) {
        console.log('[DEBUG] Primeiro resultado com nota_producao:', comNotaProd[0])
      } else if (resultadosFiltrados.length > 0) {
        console.log('[DEBUG] Campos do primeiro resultado:', Object.keys(resultadosFiltrados[0]))
        console.log('[DEBUG] Primeiro resultado completo:', resultadosFiltrados[0])
      }

      // Calcular estatísticas usando função do offlineStorage
      const estatisticas = offlineStorage.calcularEstatisticas(resultadosFiltrados)

      // =====================================================
      // OTIMIZAÇÃO: Agregar todas as estatísticas em uma única passagem O(n)
      // Em vez de múltiplas iterações O(n²) a O(n⁴)
      // =====================================================

      // Usa toNumber de lib/dados/utils (evita duplicação)

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
        const mediaAluno = toNumber(r.media_aluno)
        const notaLp = toNumber(r.nota_lp)
        const notaMat = toNumber(r.nota_mat)
        const notaCh = toNumber(r.nota_ch)
        const notaCn = toNumber(r.nota_cn)
        const notaProd = toNumber(r.nota_producao)

        // DEBUG: Log para verificar nota_producao
        if (notaProd > 0) {
          console.log('[DEBUG] Aluno com nota_producao:', { serie: r.serie, notaLp, notaMat, notaProd, mediaAluno })
        }

        // Faixas de nota (apenas presentes com média > 0)
        if (isPresente && mediaAluno > 0) {
          if (mediaAluno < 2) faixasCount[0]++
          else if (mediaAluno < 4) faixasCount[1]++
          else if (mediaAluno < 6) faixasCount[2]++
          else if (mediaAluno < 8) faixasCount[3]++
          else faixasCount[4]++
        }

        // Função para acumular valores
        // CORREÇÃO: total_alunos conta apenas alunos com presença P ou F (não os "-")
        const acumular = (acc: Acumulador) => {
          if (isPresente || isFaltante) {
            acc.total++
          }
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
            total_turmas: 0, // Não disponível offline
            total_alunos: acc.total,
            media_geral: calcMedia(acc.soma_geral, acc.count_geral),
            media_lp: calcMedia(acc.soma_lp, acc.count_lp),
            media_mat: calcMedia(acc.soma_mat, acc.count_mat),
            media_prod: calcMedia(acc.soma_prod, acc.count_prod),
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
            media_prod: calcMedia(acc.soma_prod, acc.count_prod),
            media_ch: calcMedia(acc.soma_ch, acc.count_ch),
            media_cn: calcMedia(acc.soma_cn, acc.count_cn),
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
          const presentes = resultadosFiltrados.filter(r => r.presenca?.toString().toUpperCase() === 'P')
          return presentes
            .map(r => ({
              nome: r.aluno_nome,
              escola: r.escola_nome,
              media_geral: toNumber(r.media_aluno)
            }))
            .filter(a => a.media_geral > 0)
            .sort((a, b) => b.media_geral - a.media_geral)
            .slice(0, 10)
        })(),
        alunosDetalhados: resultadosFiltrados.map((r) => {
          const notaLp = toNumber(r.nota_lp)
          const notaMat = toNumber(r.nota_mat)
          const notaCh = toNumber(r.nota_ch)
          const notaCn = toNumber(r.nota_cn)
          const notaProd = toNumber(r.nota_producao)

          // Calcular média com divisor fixo baseado na série
          const numeroSerie = r.serie?.toString().replace(/[^0-9]/g, '')
          const isAnosIniciaisAluno = numeroSerie === '2' || numeroSerie === '3' || numeroSerie === '5'

          // Anos iniciais: LP + MAT + PROD / 3 (divisor fixo)
          // Anos finais: LP + CH + MAT + CN / 4 (divisor fixo)
          const mediaCalculada = isAnosIniciaisAluno
            ? Math.round(((notaLp + notaMat + notaProd) / 3) * 100) / 100
            : Math.round(((notaLp + notaCh + notaMat + notaCn) / 4) * 100) / 100

          return {
            id: r.id,
            aluno_id: r.aluno_id,
            aluno: r.aluno_nome,
            escola: r.escola_nome,
            serie: r.serie,
            turma: r.turma_codigo,
            presenca: r.presenca,
            media_aluno: mediaCalculada,
            nota_lp: notaLp,
            nota_mat: notaMat,
            nota_ch: notaCh,
            nota_cn: notaCn,
            nota_producao: notaProd,
            // Campos de acertos para exibição
            acertos_lp: toNumber(r.total_acertos_lp),
            acertos_mat: toNumber(r.total_acertos_mat),
            acertos_ch: toNumber(r.total_acertos_ch),
            acertos_cn: toNumber(r.total_acertos_cn),
            // Campos de configuração de questões por série
            qtd_questoes_lp: r.qtd_questoes_lp,
            qtd_questoes_mat: r.qtd_questoes_mat,
            qtd_questoes_ch: r.qtd_questoes_ch,
            qtd_questoes_cn: r.qtd_questoes_cn,
            // Campos de níveis por disciplina (Anos Iniciais)
            nivel_lp: r.nivel_lp,
            nivel_mat: r.nivel_mat,
            nivel_prod: r.nivel_prod,
            nivel_aluno: r.nivel_aluno,
            nivel_aprendizagem: r.nivel_aprendizagem || 'Não classificado'
          }
        }).sort((a, b) => b.media_aluno - a.media_aluno),
        filtros: {
          polos: polosOffline.map((p) => ({ id: p.id.toString(), nome: p.nome })),
          escolas: escolasOffline.map((e) => ({ id: e.id.toString(), nome: e.nome, polo_id: e.polo_id?.toString() || '' })),
          series: offlineStorage.getSeries(),
          turmas: turmasOffline.map((t) => ({ id: t.id.toString(), codigo: t.codigo, escola_id: t.escola_id?.toString() || '' })),
          anosLetivos: offlineStorage.getAnosLetivos(),
          niveis: Object.keys(niveisMap).sort(),
          faixasMedia: ['0-2', '2-4', '4-6', '6-8', '8-10']
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
            tipo_ensino: filtroTipoEnsino
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
    setFiltroTipoEnsino('')
    setPaginaAtual(1)
    // Limpar cache pois os filtros foram resetados
    setDadosCache(null)
    setFiltrosCache(null)
    // Limpar filtros persistidos no localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(FILTROS_STORAGE_KEY)
      } catch (e) {
        console.warn('Erro ao limpar filtros do localStorage:', e)
      }
    }
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
      filtrosCache.tipo_ensino === filtroTipoEnsino
    )
  }, [filtrosCache, filtroPoloId, filtroEscolaId, filtroTurmaId, filtroAnoLetivo, filtroPresenca, filtroNivel, filtroFaixaMedia, filtroDisciplina, filtroTipoEnsino])

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
      tipo_ensino: filtroTipoEnsino
    })
  }, [filtroPoloId, filtroEscolaId, filtroTurmaId, filtroAnoLetivo, filtroPresenca, filtroNivel, filtroFaixaMedia, filtroDisciplina, filtroTipoEnsino])

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

    // Filtrar turmas pela série (recalcular baseado nos alunos filtrados)
    let turmasFiltradas: typeof dadosCache.mediasPorTurma = []

    if (serie && alunosFiltrados.length > 0) {
      // Recalcular dados da turma baseado apenas nos alunos da série filtrada
      const turmasMap = new Map<string, {
        turma_id: string
        turma: string
        escola: string
        serie: string
        total_alunos: number
        presentes: number
        faltantes: number
        soma_geral: number
        count_geral: number
        soma_lp: number
        count_lp: number
        soma_mat: number
        count_mat: number
        soma_prod: number
        count_prod: number
        soma_ch: number
        count_ch: number
        soma_cn: number
        count_cn: number
      }>()

      // Obter dados das turmas do cache original e dos filtros
      const turmasDados = new Map<string, { turma: string, escola: string, serie: string }>()
      dadosCache.mediasPorTurma?.forEach(t => {
        turmasDados.set(t.turma_id, { turma: t.turma, escola: t.escola, serie: t.serie })
      })
      // Fallback: usar dados dos filtros de turmas se disponíveis
      const escolasNomes = new Map<string, string>()
      dadosCache.mediasPorEscola?.forEach(e => {
        escolasNomes.set(e.escola_id, e.escola)
      })
      dadosCache.filtros?.turmas?.forEach((t: any) => {
        if (!turmasDados.has(String(t.id))) {
          const escolaNome = escolasNomes.get(String(t.escola_id)) || ''
          turmasDados.set(String(t.id), { turma: t.codigo || '', escola: escolaNome, serie: '' })
        }
      })

      // Processar alunos filtrados
      for (const aluno of alunosFiltrados) {
        const turmaId = aluno.turma_id ? String(aluno.turma_id) : ''
        if (!turmaId || turmaId === 'undefined' || turmaId === 'null' || turmaId === '') continue

        const presencaUpper = aluno.presenca?.toString().toUpperCase()
        const isPresente = presencaUpper === 'P'
        const isFaltante = presencaUpper === 'F'

        // Só contabilizar alunos com presença P ou F
        if (!isPresente && !isFaltante) continue

        if (!turmasMap.has(turmaId)) {
          const dados = turmasDados.get(turmaId)
          turmasMap.set(turmaId, {
            turma_id: turmaId,
            turma: dados?.turma || '',
            escola: dados?.escola || '',
            serie: dados?.serie || aluno.serie || '',
            total_alunos: 0,
            presentes: 0,
            faltantes: 0,
            soma_geral: 0,
            count_geral: 0,
            soma_lp: 0,
            count_lp: 0,
            soma_mat: 0,
            count_mat: 0,
            soma_prod: 0,
            count_prod: 0,
            soma_ch: 0,
            count_ch: 0,
            soma_cn: 0,
            count_cn: 0
          })
        }

        const acc = turmasMap.get(turmaId)!
        acc.total_alunos++

        if (isPresente) {
          acc.presentes++
          const notaLp = toNumber(aluno.nota_lp)
          const notaMat = toNumber(aluno.nota_mat)
          const notaCh = toNumber(aluno.nota_ch)
          const notaCn = toNumber(aluno.nota_cn)
          const notaProd = toNumber(aluno.nota_producao)

          // Calcular média dinamicamente baseado na série (Anos Iniciais vs Anos Finais)
          const numeroSerie = aluno.serie?.match(/(\d+)/)?.[1]
          const isAnosIniciaisAluno = numeroSerie === '2' || numeroSerie === '3' || numeroSerie === '5'

          let somaNotas = 0
          let countNotas = 0
          if (notaLp > 0) { somaNotas += notaLp; countNotas++ }
          if (notaMat > 0) { somaNotas += notaMat; countNotas++ }
          if (isAnosIniciaisAluno) {
            // Anos Iniciais: LP + MAT + PROD
            if (notaProd > 0) { somaNotas += notaProd; countNotas++ }
          } else {
            // Anos Finais: LP + MAT + CH + CN
            if (notaCh > 0) { somaNotas += notaCh; countNotas++ }
            if (notaCn > 0) { somaNotas += notaCn; countNotas++ }
          }
          const mediaCalculada = countNotas > 0 ? somaNotas / countNotas : 0

          if (mediaCalculada > 0) { acc.soma_geral += mediaCalculada; acc.count_geral++ }
          if (notaLp > 0) { acc.soma_lp += notaLp; acc.count_lp++ }
          if (notaMat > 0) { acc.soma_mat += notaMat; acc.count_mat++ }
          if (notaCh > 0) { acc.soma_ch += notaCh; acc.count_ch++ }
          if (notaCn > 0) { acc.soma_cn += notaCn; acc.count_cn++ }
          if (notaProd > 0) { acc.soma_prod += notaProd; acc.count_prod++ }
        }
        if (isFaltante) acc.faltantes++
      }

      // Converter para formato esperado (arredondar para 2 casas decimais)
      const calcMediaArredondada = (soma: number, count: number) => count > 0 ? Math.round((soma / count) * 100) / 100 : 0
      turmasFiltradas = Array.from(turmasMap.values()).map(acc => ({
        turma_id: acc.turma_id,
        turma: acc.turma,
        escola: acc.escola,
        serie: acc.serie,
        total_alunos: acc.total_alunos,
        media_geral: calcMediaArredondada(acc.soma_geral, acc.count_geral),
        media_lp: calcMediaArredondada(acc.soma_lp, acc.count_lp),
        media_mat: calcMediaArredondada(acc.soma_mat, acc.count_mat),
        media_prod: calcMediaArredondada(acc.soma_prod, acc.count_prod),
        media_ch: calcMediaArredondada(acc.soma_ch, acc.count_ch),
        media_cn: calcMediaArredondada(acc.soma_cn, acc.count_cn),
        presentes: acc.presentes,
        faltantes: acc.faltantes
      }))

      // Fallback: se o recálculo não encontrou turmas, usar filtro do cache
      if (turmasFiltradas.length === 0) {
        turmasFiltradas = dadosCache.mediasPorTurma?.filter(t => compararSeries(t.serie, serie)) || []
      }
    } else if (serie) {
      // Filtrar turmas pela série do cache
      turmasFiltradas = dadosCache.mediasPorTurma?.filter(t => compararSeries(t.serie, serie)) || []
    } else {
      turmasFiltradas = dadosCache.mediasPorTurma || []
    }

    // Filtrar escolas (recalcular baseado nos alunos filtrados)
    const escolasIds = [...new Set(alunosFiltrados.map(a => a.escola_id))]
    let escolasFiltradas: typeof dadosCache.mediasPorEscola = []

    if (serie && alunosFiltrados.length > 0) {
      // Recalcular dados da escola baseado apenas nos alunos da série filtrada
      const escolasMap = new Map<string, {
        escola_id: string
        escola: string
        polo: string
        turmas_ids: Set<string>
        total_alunos: number
        presentes: number
        faltantes: number
        soma_geral: number
        count_geral: number
        soma_lp: number
        count_lp: number
        soma_mat: number
        count_mat: number
        soma_prod: number
        count_prod: number
        soma_ch: number
        count_ch: number
        soma_cn: number
        count_cn: number
      }>()

      // Obter nomes das escolas e polos do cache original
      const escolasDados = new Map<string, { escola: string, polo: string }>()
      dadosCache.mediasPorEscola?.forEach(e => {
        escolasDados.set(e.escola_id, { escola: e.escola, polo: e.polo })
      })

      // Processar alunos filtrados
      for (const aluno of alunosFiltrados) {
        const escolaId = String(aluno.escola_id)
        const presencaUpper = aluno.presenca?.toString().toUpperCase()
        const isPresente = presencaUpper === 'P'
        const isFaltante = presencaUpper === 'F'

        // Só contabilizar alunos com presença P ou F
        if (!isPresente && !isFaltante) continue

        if (!escolasMap.has(escolaId)) {
          const dados = escolasDados.get(escolaId)
          escolasMap.set(escolaId, {
            escola_id: escolaId,
            escola: dados?.escola || '',
            polo: dados?.polo || '',
            turmas_ids: new Set<string>(),
            total_alunos: 0,
            presentes: 0,
            faltantes: 0,
            soma_geral: 0,
            count_geral: 0,
            soma_lp: 0,
            count_lp: 0,
            soma_mat: 0,
            count_mat: 0,
            soma_prod: 0,
            count_prod: 0,
            soma_ch: 0,
            count_ch: 0,
            soma_cn: 0,
            count_cn: 0
          })
        }

        const acc = escolasMap.get(escolaId)!
        // Adicionar turma_id ao Set para contar turmas distintas
        if (aluno.turma_id) {
          acc.turmas_ids.add(String(aluno.turma_id))
        }
        acc.total_alunos++

        if (isPresente) {
          acc.presentes++
          const notaLp = toNumber(aluno.nota_lp)
          const notaMat = toNumber(aluno.nota_mat)
          const notaCh = toNumber(aluno.nota_ch)
          const notaCn = toNumber(aluno.nota_cn)
          const notaProd = toNumber(aluno.nota_producao)

          // Calcular média dinamicamente baseado na série (Anos Iniciais vs Anos Finais)
          const numeroSerie = aluno.serie?.match(/(\d+)/)?.[1]
          const isAnosIniciaisAluno = numeroSerie === '2' || numeroSerie === '3' || numeroSerie === '5'

          let somaNotas = 0
          let countNotas = 0
          if (notaLp > 0) { somaNotas += notaLp; countNotas++ }
          if (notaMat > 0) { somaNotas += notaMat; countNotas++ }
          if (isAnosIniciaisAluno) {
            // Anos Iniciais: LP + MAT + PROD
            if (notaProd > 0) { somaNotas += notaProd; countNotas++ }
          } else {
            // Anos Finais: LP + MAT + CH + CN
            if (notaCh > 0) { somaNotas += notaCh; countNotas++ }
            if (notaCn > 0) { somaNotas += notaCn; countNotas++ }
          }
          const mediaCalculada = countNotas > 0 ? somaNotas / countNotas : 0

          if (mediaCalculada > 0) { acc.soma_geral += mediaCalculada; acc.count_geral++ }
          if (notaLp > 0) { acc.soma_lp += notaLp; acc.count_lp++ }
          if (notaMat > 0) { acc.soma_mat += notaMat; acc.count_mat++ }
          if (notaCh > 0) { acc.soma_ch += notaCh; acc.count_ch++ }
          if (notaCn > 0) { acc.soma_cn += notaCn; acc.count_cn++ }
          if (notaProd > 0) { acc.soma_prod += notaProd; acc.count_prod++ }
        }
        if (isFaltante) acc.faltantes++
      }

      // Converter para formato esperado (arredondar para 2 casas decimais para consistência com API)
      const calcMediaArredondada = (soma: number, count: number) => count > 0 ? Math.round((soma / count) * 100) / 100 : 0
      escolasFiltradas = Array.from(escolasMap.values()).map(acc => ({
        escola_id: acc.escola_id,
        escola: acc.escola,
        polo: acc.polo,
        total_turmas: acc.turmas_ids.size,
        total_alunos: acc.total_alunos,
        media_geral: calcMediaArredondada(acc.soma_geral, acc.count_geral),
        media_lp: calcMediaArredondada(acc.soma_lp, acc.count_lp),
        media_mat: calcMediaArredondada(acc.soma_mat, acc.count_mat),
        media_prod: calcMediaArredondada(acc.soma_prod, acc.count_prod),
        media_ch: calcMediaArredondada(acc.soma_ch, acc.count_ch),
        media_cn: calcMediaArredondada(acc.soma_cn, acc.count_cn),
        presentes: acc.presentes,
        faltantes: acc.faltantes
      }))

      // Fallback: se o recálculo não encontrou escolas, usar filtro do cache
      if (escolasFiltradas.length === 0) {
        escolasFiltradas = dadosCache.mediasPorEscola?.filter(e => escolasIds.includes(e.escola_id)) || []
      }
    } else if (serie) {
      // Filtrar escolas pelos IDs dos alunos da série
      escolasFiltradas = dadosCache.mediasPorEscola?.filter(e => escolasIds.includes(e.escola_id)) || []
    } else {
      escolasFiltradas = dadosCache.mediasPorEscola || []
    }

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
        // Usar compararDisciplinas para comparação robusta em vez de includes
        return disciplinasValidas.some(dv => compararDisciplinas(d.disciplina, dv))
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
      const notaLp = parseFloat(aluno.nota_lp) || 0
      const notaMat = parseFloat(aluno.nota_mat) || 0
      const notaCh = parseFloat(aluno.nota_ch) || 0
      const notaCn = parseFloat(aluno.nota_cn) || 0
      const notaProd = parseFloat(aluno.nota_producao) || 0

      // Calcular média dinamicamente baseado na série (Anos Iniciais vs Anos Finais)
      const numeroSerie = aluno.serie?.match(/(\d+)/)?.[1]
      const isAnosIniciaisAluno = numeroSerie === '2' || numeroSerie === '3' || numeroSerie === '5'

      let somaNotas = 0
      let countNotas = 0
      if (notaLp > 0) { somaNotas += notaLp; countNotas++ }
      if (notaMat > 0) { somaNotas += notaMat; countNotas++ }
      if (isAnosIniciaisAluno) {
        // Anos Iniciais: LP + MAT + PROD
        if (notaProd > 0) { somaNotas += notaProd; countNotas++ }
      } else {
        // Anos Finais: LP + MAT + CH + CN
        if (notaCh > 0) { somaNotas += notaCh; countNotas++ }
        if (notaCn > 0) { somaNotas += notaCn; countNotas++ }
      }
      const mediaCalculada = countNotas > 0 ? somaNotas / countNotas : 0

      // Acumular somas e contagens para médias (apenas valores válidos > 0)
      if (mediaCalculada > 0) {
        acc.somaGeral += mediaCalculada
        acc.countGeral++
        // Min/Max
        if (mediaCalculada < acc.menorMedia) acc.menorMedia = mediaCalculada
        if (mediaCalculada > acc.maiorMedia) acc.maiorMedia = mediaCalculada

        // Faixas de nota (apenas presentes)
        if (isPresente) {
          if (mediaCalculada < 2) acc.faixas['0 a 2']++
          else if (mediaCalculada < 4) acc.faixas['2 a 4']++
          else if (mediaCalculada < 6) acc.faixas['4 a 6']++
          else if (mediaCalculada < 8) acc.faixas['6 a 8']++
          else acc.faixas['8 a 10']++
        }
      }
      if (notaLp > 0) { acc.somaLp += notaLp; acc.countLp++ }
      if (notaMat > 0) { acc.somaMat += notaMat; acc.countMat++ }
      if (notaCh > 0) { acc.somaCh += notaCh; acc.countCh++ }
      if (notaCn > 0) { acc.somaCn += notaCn; acc.countCn++ }
      if (notaProd > 0) { acc.somaProd += notaProd; acc.countProd++ }

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

    // Resetar Etapa de Ensino para "Todos" ao trocar série via chips
    // Isso evita conflitos quando troca de anos iniciais para finais ou vice-versa
    setFiltroTipoEnsino('')

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

  // MELHORIA: Limpar disciplina selecionada se não estiver mais disponível na etapa/série atual
  useEffect(() => {
    if (!filtroDisciplina) return // Nada selecionado, não precisa limpar

    // Verificar se a disciplina atual está disponível
    const isAnosIniciais = filtroTipoEnsino === 'anos_iniciais' ||
      (filtroSerie && isAnosIniciaisLib(filtroSerie))
    const isAnosFinais = filtroTipoEnsino === 'anos_finais' ||
      (filtroSerie && !isAnosIniciaisLib(filtroSerie) && filtroSerie.match(/\d+/)?.[0] &&
        ['6', '7', '8', '9'].includes(filtroSerie.match(/\d+/)![0]))

    // Anos Iniciais não tem CH e CN
    if (isAnosIniciais && (filtroDisciplina === 'CH' || filtroDisciplina === 'CN')) {
      setFiltroDisciplina('')
    }
    // Anos Finais não tem PT (Produção Textual)
    if (isAnosFinais && filtroDisciplina === 'PT') {
      setFiltroDisciplina('')
    }
  }, [filtroTipoEnsino, filtroSerie, filtroDisciplina])

  const temFiltrosAtivos = filtroPoloId || filtroEscolaId || filtroTurmaId || filtroAnoLetivo || filtroPresenca || filtroNivel || filtroFaixaMedia || filtroDisciplina || filtroTipoEnsino || filtroSerie
  const qtdFiltros = [filtroPoloId, filtroEscolaId, filtroTurmaId, filtroAnoLetivo, filtroPresenca, filtroNivel, filtroFaixaMedia, filtroDisciplina, filtroTipoEnsino, filtroSerie].filter(Boolean).length

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

  // Séries para os chips - sempre mostra todas as séries disponíveis
  // A sincronização Série → Etapa de Ensino é feita automaticamente ao clicar no chip
  const seriesFiltradas = useMemo(() => {
    if (!dados?.filtros.series) return []
    return dados.filtros.series
  }, [dados?.filtros.series])

  // MELHORIA: Disciplinas disponíveis filtradas por Etapa/Série
  const disciplinasDisponiveis = useMemo(() => {
    const todas = [
      { value: '', label: 'Todas as disciplinas' },
      { value: 'LP', label: 'Lingua Portuguesa' },
      { value: 'MAT', label: 'Matematica' },
      { value: 'CH', label: 'Ciencias Humanas' },
      { value: 'CN', label: 'Ciencias da Natureza' },
      { value: 'PT', label: 'Producao Textual' }
    ]

    // Verificar se é anos iniciais (série ou etapa de ensino)
    const isAnosIniciais = filtroTipoEnsino === 'anos_iniciais' ||
      (filtroSerie && isAnosIniciaisLib(filtroSerie))

    // Verificar se é anos finais (série ou etapa de ensino)
    const isAnosFinais = filtroTipoEnsino === 'anos_finais' ||
      (filtroSerie && !isAnosIniciaisLib(filtroSerie) && filtroSerie.match(/\d+/)?.[0] &&
        ['6', '7', '8', '9'].includes(filtroSerie.match(/\d+/)![0]))

    if (isAnosIniciais) {
      // Anos Iniciais: LP, MAT, PT (sem CH e CN)
      return todas.filter(d => ['', 'LP', 'MAT', 'PT'].includes(d.value))
    }

    if (isAnosFinais) {
      // Anos Finais: LP, MAT, CH, CN (sem PT)
      return todas.filter(d => ['', 'LP', 'MAT', 'CH', 'CN'].includes(d.value))
    }

    // Sem filtro específico: mostrar todas
    return todas
  }, [filtroTipoEnsino, filtroSerie])

  // MELHORIA: Helper para obter dados da disciplina selecionada
  const disciplinaSelecionadaInfo = useMemo(() => {
    if (!filtroDisciplina || !dados?.metricas) return null

    const mapaDisciplinas: Record<string, { nome: string; media: number; sigla: string; cor: string }> = {
      'LP': { nome: 'Língua Portuguesa', media: dados.metricas.media_lp, sigla: 'LP', cor: 'blue' },
      'MAT': { nome: 'Matemática', media: dados.metricas.media_mat, sigla: 'MAT', cor: 'purple' },
      'CH': { nome: 'Ciências Humanas', media: dados.metricas.media_ch, sigla: 'CH', cor: 'green' },
      'CN': { nome: 'Ciências da Natureza', media: dados.metricas.media_cn, sigla: 'CN', cor: 'amber' },
      'PT': { nome: 'Produção Textual', media: dados.metricas.media_producao, sigla: 'PT', cor: 'rose' }
    }

    return mapaDisciplinas[filtroDisciplina] || null
  }, [filtroDisciplina, dados?.metricas])

  // MELHORIA: Função para obter a média da disciplina de um registro (escola, turma, aluno)
  const getMediaDisciplina = useCallback((registro: any): number => {
    if (!filtroDisciplina) return registro.media_geral || registro.media_aluno || 0

    switch (filtroDisciplina) {
      case 'LP': return registro.nota_lp || registro.media_lp || 0
      case 'MAT': return registro.nota_mat || registro.media_mat || 0
      case 'CH': return registro.nota_ch || registro.media_ch || 0
      case 'CN': return registro.nota_cn || registro.media_cn || 0
      case 'PT': return registro.nota_producao || registro.media_prod || 0
      default: return registro.media_geral || registro.media_aluno || 0
    }
  }, [filtroDisciplina])

  // Calcular médias por etapa de ensino (Anos Iniciais e Anos Finais) para cada escola
  const mediasPorEtapaEscola = useMemo(() => {
    if (!dadosCache?.alunosDetalhados) return new Map<string, { media_ai: number | null; media_af: number | null }>()

    const escolasMap = new Map<string, {
      soma_ai: number; count_ai: number;
      soma_af: number; count_af: number;
    }>()

    // Processar todos os alunos do cache (dados completos, não filtrados)
    for (const aluno of dadosCache.alunosDetalhados) {
      const escolaId = String(aluno.escola_id)
      const presencaUpper = aluno.presenca?.toString().toUpperCase()
      const isPresente = presencaUpper === 'P'

      // Só calcular média para alunos presentes
      if (!isPresente) continue

      // Determinar etapa de ensino
      const numeroSerie = aluno.serie?.match(/(\d+)/)?.[1]
      const isAnosIniciais = numeroSerie === '2' || numeroSerie === '3' || numeroSerie === '5'
      const isAnosFinais = numeroSerie === '6' || numeroSerie === '7' || numeroSerie === '8' || numeroSerie === '9'

      if (!isAnosIniciais && !isAnosFinais) continue

      // Parse das notas
      const notaLp = parseFloat(aluno.nota_lp) || 0
      const notaMat = parseFloat(aluno.nota_mat) || 0
      const notaCh = parseFloat(aluno.nota_ch) || 0
      const notaCn = parseFloat(aluno.nota_cn) || 0
      const notaProd = parseFloat(aluno.nota_producao) || 0

      // Calcular média do aluno baseado na etapa
      let somaNotas = 0
      let countNotas = 0
      if (notaLp > 0) { somaNotas += notaLp; countNotas++ }
      if (notaMat > 0) { somaNotas += notaMat; countNotas++ }
      if (isAnosIniciais) {
        if (notaProd > 0) { somaNotas += notaProd; countNotas++ }
      } else {
        if (notaCh > 0) { somaNotas += notaCh; countNotas++ }
        if (notaCn > 0) { somaNotas += notaCn; countNotas++ }
      }
      const mediaAluno = countNotas > 0 ? somaNotas / countNotas : 0

      if (mediaAluno <= 0) continue

      // Inicializar escola se necessário
      if (!escolasMap.has(escolaId)) {
        escolasMap.set(escolaId, { soma_ai: 0, count_ai: 0, soma_af: 0, count_af: 0 })
      }

      const acc = escolasMap.get(escolaId)!
      if (isAnosIniciais) {
        acc.soma_ai += mediaAluno
        acc.count_ai++
      } else {
        acc.soma_af += mediaAluno
        acc.count_af++
      }
    }

    // Converter para médias finais
    const resultado = new Map<string, { media_ai: number | null; media_af: number | null }>()
    escolasMap.forEach((acc, escolaId) => {
      resultado.set(escolaId, {
        media_ai: acc.count_ai > 0 ? Math.round((acc.soma_ai / acc.count_ai) * 100) / 100 : null,
        media_af: acc.count_af > 0 ? Math.round((acc.soma_af / acc.count_af) * 100) / 100 : null
      })
    })

    return resultado
  }, [dadosCache?.alunosDetalhados])

  // Ordenação e paginação de escolas
  const escolasOrdenadas = useMemo(() => {
    if (!dados?.mediasPorEscola) return []
    // Ordenar
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
    const escolasPagina = escolasOrdenadas.slice(inicio, inicio + itensPorPagina)

    // Adicionar médias por etapa de ensino aos dados
    return escolasPagina.map(escola => {
      const mediaEtapa = mediasPorEtapaEscola.get(escola.escola_id)
      return {
        ...escola,
        media_ai: mediaEtapa?.media_ai ?? null,
        media_af: mediaEtapa?.media_af ?? null
      }
    })
  }, [escolasOrdenadas, paginaAtual, itensPorPagina, mediasPorEtapaEscola])

  // Ordenação e paginação de turmas
  const turmasOrdenadas = useMemo(() => {
    if (!dados?.mediasPorTurma) return []
    // Ordenar
    return [...dados.mediasPorTurma].sort((a, b) => {
      const valorA = a[ordenacao.coluna as keyof typeof a]
      const valorB = b[ordenacao.coluna as keyof typeof b]
      if (valorA === null || valorA === undefined) return 1
      if (valorB === null || valorB === undefined) return -1
      if (typeof valorA === 'number' && typeof valorB === 'number') {
        return ordenacao.direcao === 'asc' ? valorA - valorB : valorB - valorA
      }
      return ordenacao.direcao === 'asc'
        ? String(valorA || '').localeCompare(String(valorB || ''))
        : String(valorB || '').localeCompare(String(valorA || ''))
    })
  }, [dados?.mediasPorTurma, ordenacao])

  const turmasPaginadas = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina
    return turmasOrdenadas.slice(inicio, inicio + itensPorPagina)
  }, [turmasOrdenadas, paginaAtual, itensPorPagina])

  // Ordenação e paginação de alunos
  const alunosOrdenados = useMemo(() => {
    if (!dados?.alunosDetalhados) return []
    // Ordenar
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
    if (abaAtiva === 'turmas') return Math.ceil(turmasOrdenadas.length / itensPorPagina)
    return 1
  }, [abaAtiva, escolasOrdenadas.length, alunosOrdenados.length, turmasOrdenadas.length, itensPorPagina])

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
        <div className="max-w-full">
          {/* Indicadores de status (offline/cache) */}
          <StatusIndicators
            modoOffline={modoOffline}
            usandoDadosOffline={usandoDadosOffline}
            usandoCache={usandoCache}
          />

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
              <FiltroSelect
                label="Ano Letivo"
                value={filtroAnoLetivo}
                onChange={(v) => { setFiltroAnoLetivo(v); setPaginaAtual(1); }}
                opcoes={dados?.filtros.anosLetivos.map(ano => ({ value: ano, label: ano })) || []}
                placeholder="Todos os anos"
              />

              {/* Polo */}
              <FiltroSelect
                label="Polo"
                value={filtroPoloId}
                onChange={(v) => { setFiltroPoloId(v); setFiltroEscolaId(''); setFiltroTurmaId(''); setPaginaAtual(1); }}
                opcoes={dados?.filtros.polos.map(polo => ({ value: polo.id, label: polo.nome })) || []}
                placeholder="Todos os polos"
                fixedValue={(usuario?.tipo_usuario === 'escola' || usuario?.tipo_usuario === 'polo') ? poloNome : undefined}
              />

              {/* Escola */}
              <FiltroSelect
                label="Escola"
                value={filtroEscolaId}
                onChange={(v) => { setFiltroEscolaId(v); setFiltroTurmaId(''); setPaginaAtual(1); }}
                opcoes={escolasFiltradas.map(escola => ({ value: escola.id, label: escola.nome }))}
                placeholder="Todas as escolas"
                disabled={!filtroPoloId && usuario?.tipo_usuario !== 'escola'}
                disabledMessage="Selecione um polo primeiro"
                fixedValue={usuario?.tipo_usuario === 'escola' ? escolaNome : undefined}
              />

              {/* Tipo de Ensino */}
              <FiltroSelect
                label="Etapa de Ensino"
                value={filtroTipoEnsino}
                onChange={(v) => { setFiltroTipoEnsino(v); setFiltroSerie(''); setFiltroTurmaId(''); setPaginaAtual(1); }}
                opcoes={[
                  { value: 'anos_iniciais', label: 'Anos Iniciais (2º, 3º, 5º)' },
                  { value: 'anos_finais', label: 'Anos Finais (6º, 7º, 8º, 9º)' }
                ]}
                placeholder="Todas as etapas"
              />

              {/* Turma */}
              <FiltroSelect
                label="Turma"
                value={filtroTurmaId}
                onChange={(v) => { setFiltroTurmaId(v); setPaginaAtual(1); }}
                opcoes={turmasFiltradas.map(turma => ({ value: turma.id, label: turma.codigo }))}
                placeholder="Todas as turmas"
                disabled={!filtroSerie}
                disabledMessage="Selecione uma série primeiro"
              />

              {/* Disciplina */}
              <FiltroSelect
                label="Disciplina"
                value={filtroDisciplina}
                onChange={(v) => { setFiltroDisciplina(v); setPaginaAtual(1); }}
                opcoes={disciplinasDisponiveis}
              />

              {/* Presenca */}
              <FiltroSelect
                label="Presença"
                value={filtroPresenca}
                onChange={(v) => { setFiltroPresenca(v); setPaginaAtual(1); }}
                opcoes={[
                  { value: 'P', label: 'Presentes' },
                  { value: 'F', label: 'Faltantes' }
                ]}
                placeholder="Todos"
              />

              {/* Nivel */}
              <FiltroSelect
                label="Nível"
                value={filtroNivel}
                onChange={(v) => { setFiltroNivel(v); setPaginaAtual(1); }}
                opcoes={dados?.filtros.niveis.map(nivel => ({ value: nivel, label: nivel })) || []}
                placeholder="Todos os níveis"
              />

              {/* Faixa de Media */}
              <FiltroSelect
                label="Faixa de Média"
                value={filtroFaixaMedia}
                onChange={(v) => { setFiltroFaixaMedia(v); setPaginaAtual(1); }}
                opcoes={dados?.filtros.faixasMedia.map(faixa => ({ value: faixa, label: faixa })) || []}
                placeholder="Todas as faixas"
              />

              {/* Botão Pesquisar */}
              <div className="flex items-end p-3">
                <button
                  onClick={handlePesquisar}
                  disabled={carregando}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm font-semibold shadow-md"
                  title="Pesquisar dados (usa cache quando possível)"
                >
                  <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
                  Pesquisar
                </button>
              </div>

            </div>
          </div>

          {erro && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-4 rounded-lg">
              {erro}
            </div>
          )}

          {carregando ? (
            <LoadingSpinner mensagem="Carregando dados..." />
          ) : dados ? (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-10 gap-2 sm:gap-3">
                <MetricCard titulo="Alunos" valor={dados.metricas.total_alunos} icon={Users} cor="indigo" />
                <MetricCard titulo="Escolas" valor={dados.metricas.total_escolas} icon={School} cor="blue" />
                <MetricCard titulo="Turmas" valor={dados.metricas.total_turmas} icon={GraduationCap} cor="purple" />
                <MetricCard titulo="Presentes" valor={dados.metricas.total_presentes} subtitulo={`${(dados.metricas.taxa_presenca || 0).toFixed(1)}%`} icon={UserCheck} cor="green" />
                <MetricCard titulo="Faltantes" valor={dados.metricas.total_faltantes} icon={UserX} cor="red" />
                {/* MELHORIA: Mostra média da disciplina selecionada ou média geral */}
                <MetricCard
                  titulo={disciplinaSelecionadaInfo ? `Media ${disciplinaSelecionadaInfo.sigla}` : "Media Geral"}
                  valor={(disciplinaSelecionadaInfo ? disciplinaSelecionadaInfo.media : dados.metricas.media_geral).toFixed(2)}
                  icon={Award}
                  cor={disciplinaSelecionadaInfo ? disciplinaSelecionadaInfo.cor : "amber"}
                  isDecimal
                />
                <MetricCard titulo="Menor" valor={dados.metricas.menor_media.toFixed(2)} icon={TrendingDown} cor="rose" isDecimal />
                <MetricCard titulo="Maior" valor={dados.metricas.maior_media.toFixed(2)} icon={TrendingUp} cor="emerald" isDecimal />
                {dados.metricas.taxa_acerto_geral !== undefined && dados.metricas.taxa_erro_geral !== undefined && (
                  <>
                    <MetricCard titulo="Taxa Acerto" valor={`${dados.metricas.taxa_acerto_geral.toFixed(1)}%`} icon={Target} cor="green" />
                    <MetricCard titulo="Taxa Erro" valor={`${dados.metricas.taxa_erro_geral.toFixed(1)}%`} icon={AlertTriangle} cor="red" />
                  </>
                )}
              </div>

              {/* Medias por Disciplina - MELHORIA: Destaque na disciplina selecionada */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                <DisciplinaCard titulo="Lingua Portuguesa" media={dados.metricas.media_lp} cor="blue" sigla="LP" destaque={filtroDisciplina === 'LP'} />
                <DisciplinaCard titulo="Matematica" media={dados.metricas.media_mat} cor="purple" sigla="MAT" destaque={filtroDisciplina === 'MAT'} />
                <DisciplinaCard titulo="Ciencias Humanas" media={dados.metricas.media_ch} cor="green" sigla="CH" destaque={filtroDisciplina === 'CH'} />
                <DisciplinaCard titulo="Ciencias da Natureza" media={dados.metricas.media_cn} cor="amber" sigla="CN" destaque={filtroDisciplina === 'CN'} />
                {dados.metricas.media_producao > 0 && (
                  <DisciplinaCard titulo="Producao Textual" media={dados.metricas.media_producao} cor="rose" sigla="PT" destaque={filtroDisciplina === 'PT'} />
                )}
              </div>

              {/* Container Sticky para Abas + Serie - Fixo abaixo do header */}
              <div className="sticky top-14 sm:top-16 z-40 -mx-2 sm:-mx-4 md:-mx-6 lg:-mx-8 px-2 sm:px-4 md:px-6 lg:px-8 pt-4 pb-2 bg-gray-50 dark:bg-slate-900 space-y-2 shadow-md" style={{ marginTop: '1rem' }}>
                {/* Abas de Navegacao */}
                <AbaNavegacao
                  abas={[
                    { id: 'visao_geral', label: 'Visão Geral', icon: PieChartIcon },
                    { id: 'escolas', label: 'Escolas', icon: School },
                    { id: 'turmas', label: 'Turmas', icon: Layers },
                    { id: 'alunos', label: 'Alunos', icon: Users },
                    { id: 'analises', label: 'Análises', icon: Target },
                  ]}
                  abaAtiva={abaAtiva}
                  onChange={(novaAba) => {
                    setAbaAtiva(novaAba as typeof abaAtiva)
                    setPaginaAtual(1)
                    // Se mudou para aba Análises e tem filtro de série, recarregar da API
                    if (novaAba === 'analises' && filtroSerie && pesquisaRealizada) {
                      setUsandoCache(false)
                      carregarDados(true, undefined, true, filtroSerie)
                    }
                  }}
                />

                {/* Chips de Series - Clique atualiza pesquisa automaticamente */}
                {/* MELHORIA: Usa seriesFiltradas que filtra baseado na Etapa de Ensino */}
                <SeriesChips
                  series={seriesFiltradas || []}
                  serieSelecionada={filtroSerie}
                  onChange={handleSerieChipClick}
                  carregando={carregandoEmSegundoPlano}
                />
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

                  {/* Gráfico Comparativo Anos Iniciais vs Anos Finais */}
                  {dados.mediasPorSerie.length > 0 && (() => {
                    // Calcular médias por etapa de ensino
                    const anosIniciaisDados = dados.mediasPorSerie.filter(item => {
                      const num = item.serie?.match(/(\d+)/)?.[1]
                      return num === '2' || num === '3' || num === '5'
                    })
                    const anosFinaisDados = dados.mediasPorSerie.filter(item => {
                      const num = item.serie?.match(/(\d+)/)?.[1]
                      return num === '6' || num === '7' || num === '8' || num === '9'
                    })

                    // Calcular médias gerais para cada etapa
                    const calcularMediaEtapa = (etapaDados: typeof dados.mediasPorSerie, disciplinas: string[]) => {
                      if (etapaDados.length === 0) return { media_geral: 0, total_alunos: 0 }
                      let somaTotal = 0
                      let countTotal = 0
                      let totalAlunos = 0
                      etapaDados.forEach(item => {
                        totalAlunos += item.total_alunos || 0
                        disciplinas.forEach(disc => {
                          const valor = (item as any)[`media_${disc}`]
                          if (valor && valor > 0) {
                            somaTotal += valor * (item.total_alunos || 1)
                            countTotal += item.total_alunos || 1
                          }
                        })
                      })
                      return {
                        media_geral: countTotal > 0 ? Math.round((somaTotal / countTotal) * 100) / 100 : 0,
                        total_alunos: totalAlunos
                      }
                    }

                    const mediaAI = calcularMediaEtapa(anosIniciaisDados, ['lp', 'mat', 'prod'])
                    const mediaAF = calcularMediaEtapa(anosFinaisDados, ['lp', 'mat', 'ch', 'cn'])

                    // Dados para o gráfico
                    const dadosComparativo = [
                      { etapa: 'Anos Iniciais', media: mediaAI.media_geral, alunos: mediaAI.total_alunos, cor: '#10B981' },
                      { etapa: 'Anos Finais', media: mediaAF.media_geral, alunos: mediaAF.total_alunos, cor: '#3B82F6' }
                    ].filter(d => d.alunos > 0)

                    if (dadosComparativo.length === 0) return null

                    return (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Comparativo por Etapa de Ensino</h3>
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={dadosComparativo} layout="vertical" barCategoryGap="30%">
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis type="number" domain={[0, 10]} tick={{ fill: '#6B7280', fontSize: 11 }} />
                            <YAxis type="category" dataKey="etapa" tick={{ fill: '#6B7280', fontSize: 12 }} width={100} />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload
                                  return (
                                    <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700">
                                      <p className="font-semibold text-gray-900 dark:text-white">{data.etapa}</p>
                                      <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Média: <span className="font-bold">{data.media.toFixed(2)}</span>
                                      </p>
                                      <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Alunos: <span className="font-bold">{data.alunos}</span>
                                      </p>
                                    </div>
                                  )
                                }
                                return null
                              }}
                            />
                            <Bar dataKey="media" name="Média" radius={[0, 4, 4, 0]}>
                              {dadosComparativo.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.cor} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      {/* Cards com detalhes */}
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        {dadosComparativo.map(item => (
                          <div key={item.etapa} className="p-3 rounded-lg border" style={{ borderColor: item.cor, backgroundColor: `${item.cor}10` }}>
                            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{item.etapa}</p>
                            <p className="text-2xl font-bold" style={{ color: item.cor }}>{item.media.toFixed(2)}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{item.alunos} alunos</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    )
                  })()}

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
                      colunas={(() => {
                        // Determinar se é anos iniciais ou finais baseado no filtro de série
                        const numSerie = filtroSerie?.replace(/[^0-9]/g, '') || ''
                        const isAnosIniciais = ['2', '3', '5'].includes(numSerie)
                        const isAnosFinais = ['6', '7', '8', '9'].includes(numSerie)
                        const temFiltro = !!filtroSerie && filtroSerie.trim() !== ''

                        const colunas: any[] = [
                          { key: 'escola', label: 'Escola', align: 'left' },
                          { key: 'polo', label: 'Polo', align: 'left' },
                          { key: 'total_turmas', label: 'Turmas', align: 'center', format: 'badge_turmas' },
                          { key: 'total_alunos', label: 'Alunos', align: 'center' },
                          { key: 'media_geral', label: 'Media', align: 'center', format: 'nota', destaque: !filtroDisciplina },
                        ]

                        // Média por etapa de ensino: mostrar apenas quando sem filtro de série (Todos)
                        if (!temFiltro) {
                          colunas.push({ key: 'media_ai', label: 'Média AI', align: 'center', format: 'media_etapa' })
                          colunas.push({ key: 'media_af', label: 'Média AF', align: 'center', format: 'media_etapa' })
                        }

                        colunas.push({ key: 'media_lp', label: 'LP', align: 'center', format: 'decimal_com_nivel', destaque: filtroDisciplina === 'LP' })
                        colunas.push({ key: 'media_mat', label: 'MAT', align: 'center', format: 'decimal_com_nivel', destaque: filtroDisciplina === 'MAT' })

                        // PROD: mostrar apenas para anos iniciais (2, 3, 5) ou quando sem filtro
                        if (!temFiltro || isAnosIniciais) {
                          colunas.push({ key: 'media_prod', label: 'PROD', align: 'center', format: 'decimal_com_nivel', destaque: filtroDisciplina === 'PT' })
                        }

                        // CH/CN: mostrar apenas para anos finais (6, 7, 8, 9) ou quando sem filtro
                        if (!temFiltro || isAnosFinais) {
                          colunas.push({ key: 'media_ch', label: 'CH', align: 'center', format: 'decimal_com_nivel', destaque: filtroDisciplina === 'CH' })
                          colunas.push({ key: 'media_cn', label: 'CN', align: 'center', format: 'decimal_com_nivel', destaque: filtroDisciplina === 'CN' })
                        }

                        colunas.push({ key: 'presentes', label: 'Pres.', align: 'center' })
                        colunas.push({ key: 'faltantes', label: 'Falt.', align: 'center' })

                        return colunas
                      })()}
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
                      dados={turmasPaginadas.map(turma => ({
                        ...turma,
                        nivel_turma: calcularNivelPorMedia(turma.media_geral).codigo
                      }))}
                      colunas={(() => {
                        // Determinar se é anos iniciais ou finais baseado no filtro de série
                        const numSerie = filtroSerie?.replace(/[^0-9]/g, '') || ''
                        const isAnosIniciais = ['2', '3', '5'].includes(numSerie)
                        const isAnosFinais = ['6', '7', '8', '9'].includes(numSerie)
                        const temFiltro = !!filtroSerie && filtroSerie.trim() !== ''

                        const colunas: any[] = [
                          { key: 'turma', label: 'Turma', align: 'left' },
                          { key: 'escola', label: 'Escola', align: 'left' },
                          { key: 'serie', label: 'Serie', align: 'center', format: 'serie' },
                          { key: 'total_alunos', label: 'Alunos', align: 'center' },
                          { key: 'media_geral', label: 'Media', align: 'center', format: 'nota', destaque: !filtroDisciplina },
                          { key: 'media_lp', label: 'LP', align: 'center', format: 'decimal_com_nivel', destaque: filtroDisciplina === 'LP' },
                          { key: 'media_mat', label: 'MAT', align: 'center', format: 'decimal_com_nivel', destaque: filtroDisciplina === 'MAT' },
                        ]

                        // PROD: mostrar apenas para anos iniciais (2, 3, 5) ou quando sem filtro
                        if (!temFiltro || isAnosIniciais) {
                          colunas.push({ key: 'media_prod', label: 'PROD', align: 'center', format: 'decimal_com_nivel', destaque: filtroDisciplina === 'PT' })
                        }

                        // CH/CN: mostrar apenas para anos finais (6, 7, 8, 9) ou quando sem filtro
                        if (!temFiltro || isAnosFinais) {
                          colunas.push({ key: 'media_ch', label: 'CH', align: 'center', format: 'decimal_com_nivel', destaque: filtroDisciplina === 'CH' })
                          colunas.push({ key: 'media_cn', label: 'CN', align: 'center', format: 'decimal_com_nivel', destaque: filtroDisciplina === 'CN' })
                        }

                        colunas.push({ key: 'presentes', label: 'Pres.', align: 'center' })
                        colunas.push({ key: 'faltantes', label: 'Falt.', align: 'center' })

                        return colunas
                      })()}
                      ordenacao={ordenacao}
                      onOrdenar={handleOrdenacao}
                      paginaAtual={paginaAtual}
                      totalPaginas={Math.ceil(turmasOrdenadas.length / itensPorPagina)}
                      onPaginar={setPaginaAtual}
                      totalRegistros={turmasOrdenadas.length}
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
                                          {formatarNota(nota, resultado.presenca, resultado.media_aluno, disciplina.codigo, resultado.serie)}
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
                            <th className="text-center py-1 px-0.5 sm:py-1.5 sm:px-1 md:py-2 md:px-1.5 lg:py-2.5 lg:px-2 font-bold text-indigo-900 dark:text-indigo-200 text-[11px] sm:text-xs md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700 w-8 md:w-10 lg:w-12">
                              #
                            </th>
                            <th className="text-left py-1 px-0.5 sm:py-1.5 sm:px-1 md:py-2 md:px-1 lg:py-2.5 lg:px-2 font-bold text-indigo-900 dark:text-indigo-200 text-[11px] sm:text-xs md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700 min-w-[120px] md:min-w-[140px] lg:min-w-[160px]">
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
                            {disciplinasExibir.map((disciplina) => {
                              // Mapear PT -> PROD para comparação (filtro usa PT, disciplina usa PROD)
                              const isDestaque = filtroDisciplina === disciplina.codigo ||
                                (filtroDisciplina === 'PT' && disciplina.codigo === 'PROD')
                              return (
                                <th key={disciplina.codigo} className={`text-center py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-[11px] sm:text-xs md:text-xs lg:text-sm uppercase tracking-wider border-b w-14 md:w-16 lg:w-18 ${isDestaque ? 'bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-100 border-indigo-400 dark:border-indigo-600 ring-2 ring-indigo-400' : 'text-indigo-900 dark:text-indigo-200 border-indigo-200 dark:border-indigo-700'}`}>
                                  {disciplina.codigo}
                                  {isDestaque && <span className="ml-1 text-[8px]">●</span>}
                                </th>
                              )
                            })}
                            <th className="text-center py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-indigo-900 dark:text-indigo-200 text-[11px] sm:text-xs md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700 w-14 md:w-16 lg:w-18">
                              Média
                            </th>
                            <th className="text-center py-1 px-0.5 sm:py-1.5 sm:px-1 md:py-2 md:px-1.5 lg:py-2.5 lg:px-2 font-bold text-indigo-900 dark:text-indigo-200 text-[11px] sm:text-xs md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700 w-16 md:w-20 lg:w-24">
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
                                    // Mapear PT -> PROD para comparação (filtro usa PT, disciplina usa PROD)
                                    const isDestaqueDisciplina = filtroDisciplina === disciplina.codigo ||
                                      (filtroDisciplina === 'PT' && disciplina.codigo === 'PROD')
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
                                        <td key={disciplina.codigo} className={`py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-3 lg:px-2 text-center ${isDestaqueDisciplina ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''}`}>
                                          <span className="text-gray-400 dark:text-gray-500 text-xs italic">N/A</span>
                                        </td>
                                      )
                                    }

                                    // Obter nível correspondente à disciplina (Anos Iniciais)
                                    const nivelDisciplina = disciplina.codigo === 'LP' ? resultado.nivel_lp :
                                                           disciplina.codigo === 'MAT' ? resultado.nivel_mat :
                                                           disciplina.codigo === 'PROD' ? resultado.nivel_prod : null

                                    return (
                                      <td key={disciplina.codigo} className={`py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-3 lg:px-2 text-center ${isDestaqueDisciplina ? 'bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-indigo-300 dark:ring-indigo-700' : ''}`}>
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
                                              {formatarNota(nota, resultado.presenca, resultado.media_aluno, disciplina.codigo, resultado.serie)}
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
                                            {/* Badge de nível dentro da célula (Anos Iniciais) */}
                                            {isAnosIniciaisLib(resultado.serie) && nivelDisciplina && (
                                              <div className="mt-0.5">
                                                <NivelBadge nivel={nivelDisciplina} />
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
                                      {/* Nível geral do aluno (Anos Iniciais) */}
                                      {isAnosIniciaisLib(resultado.serie) && resultado.nivel_aluno && (
                                        <NivelBadge nivel={resultado.nivel_aluno} className="mt-0.5 font-extrabold" />
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
                                          niveisDisciplinas: {
                                            nivel_lp: resultado.nivel_lp,
                                            nivel_mat: resultado.nivel_mat,
                                            nivel_prod: resultado.nivel_prod,
                                            nivel_aluno: resultado.nivel_aluno,
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
                      {/* Verificar se é Anos Iniciais para mostrar análise de Produção Textual */}
                      {(() => {
                        const serieNum = filtroSerie?.match(/(\d+)/)?.[1]
                        const isAnosIniciaisSelecionado = serieNum === '2' || serieNum === '3' || serieNum === '5'
                        const temDadosQuestoes = dados.analiseAcertosErros?.taxaAcertoGeral ||
                          (dados.analiseAcertosErros?.questoesComMaisErros && dados.analiseAcertosErros.questoesComMaisErros.length > 0)

                        // Calcular estatísticas de Produção Textual para Anos Iniciais
                        // Incluir todos os alunos presentes (mesmo com nota 0) - PROD é obrigatória
                        const alunosComProducao = dados.alunosDetalhados?.filter(a => {
                          const notaProd = parseFloat(a.nota_producao as any)
                          const isPresente = a.presenca === 'P' || a.presenca === 'p'
                          // Incluir alunos presentes, mesmo com nota 0 (PROD obrigatória)
                          return isPresente && !isNaN(notaProd) && notaProd >= 0 &&
                            (filtroSerie ? compararSeries(a.serie, filtroSerie) : true)
                        }) || []

                        const estatisticasProducao = alunosComProducao.length > 0 ? {
                          total: alunosComProducao.length,
                          media: alunosComProducao.reduce((acc, a) => acc + parseFloat(a.nota_producao as any), 0) / alunosComProducao.length,
                          minima: Math.min(...alunosComProducao.map(a => parseFloat(a.nota_producao as any))),
                          maxima: Math.max(...alunosComProducao.map(a => parseFloat(a.nota_producao as any))),
                          faixas: {
                            baixa: alunosComProducao.filter(a => parseFloat(a.nota_producao as any) < 4).length,
                            media: alunosComProducao.filter(a => parseFloat(a.nota_producao as any) >= 4 && parseFloat(a.nota_producao as any) < 7).length,
                            alta: alunosComProducao.filter(a => parseFloat(a.nota_producao as any) >= 7).length
                          }
                        } : null

                        return (
                          <>
                            {/* Mensagem quando não há dados de questões para Anos Iniciais */}
                            {isAnosIniciaisSelecionado && !temDadosQuestoes && (
                              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
                                <div className="flex items-start gap-3">
                                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                      Dados de Questões Objetivas Não Disponíveis
                                    </h4>
                                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                                      Não há registros de respostas de questões objetivas para esta série.
                                      Verifique se os dados foram importados corretamente na tabela de resultados de provas.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Análise de Produção Textual para Anos Iniciais */}
                            {isAnosIniciaisSelecionado && estatisticasProducao && (
                              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6 mb-6">
                                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                  <FileText className="w-5 h-5 text-rose-600" />
                                  Análise de Produção Textual
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                                  <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{estatisticasProducao.total}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Alunos Avaliados</p>
                                  </div>
                                  <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{estatisticasProducao.media.toFixed(2)}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Média Geral</p>
                                  </div>
                                  <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{estatisticasProducao.minima.toFixed(2)}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Nota Mínima</p>
                                  </div>
                                  <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{estatisticasProducao.maxima.toFixed(2)}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Nota Máxima</p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
                                    <p className="text-xl font-bold text-red-600 dark:text-red-400">{estatisticasProducao.faixas.baixa}</p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">Abaixo de 4</p>
                                    <p className="text-[10px] text-gray-500">({((estatisticasProducao.faixas.baixa / estatisticasProducao.total) * 100).toFixed(1)}%)</p>
                                  </div>
                                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-center">
                                    <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{estatisticasProducao.faixas.media}</p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">Entre 4 e 7</p>
                                    <p className="text-[10px] text-gray-500">({((estatisticasProducao.faixas.media / estatisticasProducao.total) * 100).toFixed(1)}%)</p>
                                  </div>
                                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                                    <p className="text-xl font-bold text-green-600 dark:text-green-400">{estatisticasProducao.faixas.alta}</p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">Acima de 7</p>
                                    <p className="text-[10px] text-gray-500">({((estatisticasProducao.faixas.alta / estatisticasProducao.total) * 100).toFixed(1)}%)</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        )
                      })()}

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
            niveisDisciplinas={alunoSelecionado.niveisDisciplinas}
            onClose={() => {
              setModalAberto(false)
              setAlunoSelecionado(null)
            }}
          />
        )}
    </ProtectedRoute>
  )
}

