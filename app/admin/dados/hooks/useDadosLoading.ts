import { useState, useEffect } from 'react'
import * as offlineStorage from '@/lib/offline-storage'
import { useDebouncedCallback } from '@/lib/hooks/useDebounce'
import { toNumber } from '@/lib/dados/utils'
import type { DashboardData, Usuario } from '@/lib/dados/types'
import type { Acumulador, FiltrosCache } from '../types'
import { criarAcumulador } from '../types'

interface UseDadosLoadingParams {
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
  setFiltrosCache: (v: FiltrosCache | null) => void
  usuario: Usuario | null
  setTipoUsuario: (v: string) => void
  setUsuario: (v: Usuario | null) => void
  setFiltroPoloId: (v: string) => void
  setFiltroEscolaId: (v: string) => void
  setEscolaNome: (v: string) => void
  setPoloNome: (v: string) => void
}

export function useDadosLoading(params: UseDadosLoadingParams) {
  const {
    filtroPoloId, filtroEscolaId, filtroSerie, filtroTurmaId,
    filtroAnoLetivo, filtroPresenca, filtroNivel, filtroFaixaMedia,
    filtroDisciplina, filtroTipoEnsino,
    setFiltrosCache,
    usuario, setTipoUsuario, setUsuario,
    setFiltroPoloId, setFiltroEscolaId, setEscolaNome, setPoloNome,
  } = params

  // Estado para modo offline e cache
  const [usandoDadosOffline, setUsandoDadosOffline] = useState(false)
  const [modoOffline, setModoOffline] = useState(false)
  const [usandoCache, setUsandoCache] = useState(false)

  const [dados, setDados] = useState<DashboardData | null>(null)
  const [dadosCache, setDadosCache] = useState<DashboardData | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [carregandoEmSegundoPlano, setCarregandoEmSegundoPlano] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

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

      // DEBUG: Verificar se nota_producao está nos dados carregados
      const comNotaProd = resultadosFiltrados.filter(r => r.nota_producao && parseFloat(String(r.nota_producao)) > 0)
      if (comNotaProd.length > 0) {
      } else if (resultadosFiltrados.length > 0) {
      }

      // Calcular estatísticas usando função do offlineStorage
      const estatisticas = offlineStorage.calcularEstatisticas(resultadosFiltrados)

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

        // Níveis - apenas para anos iniciais (2º, 3º, 5º) e com presença
        const numeroSerie = r.serie?.toString().replace(/[^0-9]/g, '')
        const isAnosIniciaisAluno = numeroSerie === '2' || numeroSerie === '3' || numeroSerie === '5'
        if (isAnosIniciaisAluno && (isPresente || isFaltante)) {
          const nivel = r.nivel_aluno || r.nivel_aprendizagem || 'Não classificado'
          niveisMap[nivel] = (niveisMap[nivel] || 0) + 1
        }

        // Valores numéricos
        const mediaAluno = toNumber(r.media_aluno)
        const notaLp = toNumber(r.nota_lp)
        const notaMat = toNumber(r.nota_mat)
        const notaCh = toNumber(r.nota_ch)
        const notaCn = toNumber(r.nota_cn)
        const notaProd = toNumber(r.nota_producao)

        // DEBUG: Log para verificar nota_producao
        if (notaProd > 0) {
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
            media_ch: isAnosFinais ? calcMedia(acc.soma_ch, acc.count_ch) : null,
            media_cn: isAnosFinais ? calcMedia(acc.soma_cn, acc.count_cn) : null,
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
            total_turmas: 0,
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

          const numeroSerie = r.serie?.toString().replace(/[^0-9]/g, '')
          const isAnosIniciaisAluno = numeroSerie === '2' || numeroSerie === '3' || numeroSerie === '5'

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
            acertos_lp: toNumber(r.total_acertos_lp),
            acertos_mat: toNumber(r.total_acertos_mat),
            acertos_ch: toNumber(r.total_acertos_ch),
            acertos_cn: toNumber(r.total_acertos_cn),
            qtd_questoes_lp: r.qtd_questoes_lp,
            qtd_questoes_mat: r.qtd_questoes_mat,
            qtd_questoes_ch: r.qtd_questoes_ch,
            qtd_questoes_cn: r.qtd_questoes_cn,
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
      params.append('limite_alunos', '10000')
      if (forcarAtualizacao) params.append('atualizar_cache', 'true')

      const response = await fetch(`/api/admin/dashboard-dados?${params}`, { signal })

      if (signal?.aborted) {
        return
      }

      const data = await response.json()

      if (signal?.aborted) {
        return
      }

      if (response.ok) {
        // Calcular níveis a partir dos alunos
        const niveisMap: Record<string, number> = {}
        if (data.alunosDetalhados && Array.isArray(data.alunosDetalhados)) {
          for (const aluno of data.alunosDetalhados) {
            const presencaUpper = aluno.presenca?.toString().toUpperCase()
            const isPresente = presencaUpper === 'P'
            const isFaltante = presencaUpper === 'F'
            const numeroSerie = aluno.serie?.toString().replace(/[^0-9]/g, '')
            const isAnosIniciaisAluno = numeroSerie === '2' || numeroSerie === '3' || numeroSerie === '5'

            if (isAnosIniciaisAluno && (isPresente || isFaltante)) {
              const nivel = aluno.nivel_aluno || aluno.nivel_aprendizagem || 'Não classificado'
              niveisMap[nivel] = (niveisMap[nivel] || 0) + 1
            }
          }
        }
        const ordemNiveis: Record<string, number> = {
          'Pré-Alfabético': 1, 'N1': 1,
          'Básico': 2, 'N2': 2,
          'Adequado': 3, 'N3': 3,
          'Avançado': 4, 'N4': 4,
          'Não classificado': 5
        }
        const niveisArray = Object.entries(niveisMap)
          .map(([nivel, quantidade]) => ({ nivel, quantidade }))
          .sort((a, b) => (ordemNiveis[a.nivel] || 6) - (ordemNiveis[b.nivel] || 6))

        const dadosComNiveis = { ...data, niveis: niveisArray }

        setDados(dadosComNiveis)
        setUsandoDadosOffline(false)
        setUsandoCache(false)
        if (!serieParaFiltrar) {
          setDadosCache(dadosComNiveis)
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
    } catch (error: unknown) {
      if (error instanceof Error && (error as any).name === 'AbortError') {
        return
      }

      // Fallback para dados offline em caso de erro de rede
      if (offlineStorage.hasOfflineData()) {
        setUsandoDadosOffline(true)
        setModoOffline(true)
        await carregarDados(false, signal)
        return
      }

      setErro('Erro de conexão')
    } finally {
      if (!signal?.aborted) {
        setCarregando(false)
        setCarregandoEmSegundoPlano(false)
      }
    }
  }

  // Versão debounced do carregarDados
  const carregarDadosDebounced = useDebouncedCallback(
    (mostrarLoading: boolean, signal?: AbortSignal, usarFiltroAtual?: boolean, serieOverride?: string) => {
      carregarDados(mostrarLoading, signal, usarFiltroAtual, serieOverride)
    },
    300
  )

  // Carregar tipo de usuário ao montar
  useEffect(() => {
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
        if (signal.aborted) return
        const data = await response.json()
        if (signal.aborted) return

        if (data.usuario) {
          const tipo = data.usuario.tipo_usuario === 'administrador' ? 'admin' : data.usuario.tipo_usuario
          setTipoUsuario(tipo)
          setUsuario(data.usuario)

          if (data.usuario.tipo_usuario === 'escola' && data.usuario.escola_id) {
            setFiltroEscolaId(data.usuario.escola_id)
            try {
              const escolaRes = await fetch(`/api/admin/escolas?id=${data.usuario.escola_id}`, { signal })
              if (signal.aborted) return
              const escolaData = await escolaRes.json()
              if (signal.aborted) return
              if (Array.isArray(escolaData) && escolaData.length > 0) {
                setEscolaNome(escolaData[0].nome)
                setPoloNome(escolaData[0].polo_nome || '')
                if (escolaData[0].polo_id) {
                  setFiltroPoloId(escolaData[0].polo_id)
                }
              }
            } catch (err: unknown) {
              if (!(err instanceof Error) || (err as any).name !== 'AbortError') {
              }
            }
          }

          if (data.usuario.tipo_usuario === 'polo' && data.usuario.polo_id) {
            setFiltroPoloId(data.usuario.polo_id)
            try {
              const poloRes = await fetch(`/api/admin/polos?id=${data.usuario.polo_id}`, { signal })
              if (signal.aborted) return
              const poloData = await poloRes.json()
              if (signal.aborted) return
              if (Array.isArray(poloData) && poloData.length > 0) {
                setPoloNome(poloData[0].nome)
              }
            } catch (err: unknown) {
              if (!(err instanceof Error) || (err as any).name !== 'AbortError') {
              }
            }
          }
        }
      } catch (error: unknown) {
        if (error instanceof Error && (error as any).name === 'AbortError') return
        const offlineUser = offlineStorage.getUser()
        if (offlineUser) {
          const tipo = offlineUser.tipo_usuario === 'administrador' ? 'admin' : offlineUser.tipo_usuario
          setTipoUsuario(tipo)
          setUsuario(offlineUser)
        }
      }
    }
    carregarTipoUsuario()

    return () => {
      abortController.abort()
    }
  }, [])

  return {
    dados, setDados,
    dadosCache, setDadosCache,
    carregando, carregandoEmSegundoPlano,
    erro,
    usandoDadosOffline, modoOffline, usandoCache, setUsandoCache,
    carregarDados, carregarDadosDebounced,
  }
}
