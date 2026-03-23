import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import {
  verificarCache,
  carregarCache,
  salvarCache,
  memoryCache,
  CACHE_TTL,
  getCacheKeyDashboard,
} from '@/lib/cache'
import {
  getDashboardData,
  DashboardFiltros,
  PaginacaoAlunos,
} from '@/lib/services/dashboard.service'

export const dynamic = 'force-dynamic'

// Flag para usar cache em memória (mais rápido) ou arquivo (persistente)
const USE_MEMORY_CACHE = true

/**
 * GET /api/admin/dashboard-dados
 * Retorna dados consolidados para o dashboard estilo Power BI
 */
export const GET = withAuth(
  ['administrador', 'tecnico', 'polo', 'escola'],
  async (request, usuario) => {
    const { searchParams } = new URL(request.url)

    // Extrair filtros
    const filtros: DashboardFiltros = {
      poloId: searchParams.get('polo_id'),
      escolaId: searchParams.get('escola_id'),
      anoLetivo: searchParams.get('ano_letivo'),
      avaliacaoId: searchParams.get('avaliacao_id'),
      serie: searchParams.get('serie'),
      turmaId: searchParams.get('turma_id'),
      presenca: searchParams.get('presenca'),
      tipoEnsino: searchParams.get('tipo_ensino'),
      nivelAprendizagem: searchParams.get('nivel'),
      faixaMedia: searchParams.get('faixa_media'),
      disciplina: searchParams.get('disciplina'),
      taxaAcertoMin: searchParams.get('taxa_acerto_min'),
      taxaAcertoMax: searchParams.get('taxa_acerto_max'),
      questaoCodigo: searchParams.get('questao_codigo'),
      areaConhecimento: searchParams.get('area_conhecimento'),
      tipoAnalise: searchParams.get('tipo_analise'),
    }

    // Paginação para alunos detalhados
    const paginaAlunos = parseInt(searchParams.get('pagina_alunos') || '1')
    const limiteAlunos = Math.min(
      parseInt(searchParams.get('limite_alunos') || '50'),
      10000
    )
    const offsetAlunos = (paginaAlunos - 1) * limiteAlunos

    const paginacao: PaginacaoAlunos = {
      pagina: paginaAlunos,
      limite: limiteAlunos,
      offset: offsetAlunos,
    }

    const forcarAtualizacao = searchParams.get('atualizar_cache') === 'true'

    // Opções de cache (arquivo)
    const cacheOptions = {
      filtros: {
        ...filtros,
        paginaAlunos,
        limiteAlunos,
      },
      tipoUsuario: usuario.tipo_usuario,
      usuarioId: usuario.id,
      poloId: usuario.polo_id || null,
      escolaId: usuario.escola_id || null,
    }

    // Chave de cache em memória (sem paginação para hit rate)
    const memoryCacheKey = getCacheKeyDashboard(
      usuario.tipo_usuario,
      usuario.polo_id || filtros.poloId,
      usuario.escola_id || filtros.escolaId,
      {
        poloId: filtros.poloId,
        escolaId: filtros.escolaId,
        anoLetivo: filtros.anoLetivo,
        serie: filtros.serie,
        turmaId: filtros.turmaId,
        presenca: filtros.presenca,
        tipoEnsino: filtros.tipoEnsino,
        nivelAprendizagem: filtros.nivelAprendizagem,
        faixaMedia: filtros.faixaMedia,
        disciplina: filtros.disciplina,
      }
    )

    // VERIFICAR CACHE EM MEMÓRIA PRIMEIRO
    if (USE_MEMORY_CACHE && !forcarAtualizacao) {
      const cachedData = memoryCache.get<any>(memoryCacheKey)
      if (cachedData) {
        console.log('[Dashboard] Cache em memória encontrado')
        const alunosDetalhados = cachedData.alunosDetalhados || []
        const totalItens = alunosDetalhados.length
        const alunosPaginados = alunosDetalhados.slice(
          offsetAlunos,
          offsetAlunos + limiteAlunos
        )

        return NextResponse.json({
          ...cachedData,
          alunosDetalhados: alunosPaginados,
          paginacaoAlunos: {
            paginaAtual: paginaAlunos,
            itensPorPagina: limiteAlunos,
            totalItens,
            totalPaginas: Math.ceil(totalItens / limiteAlunos),
          },
          _cache: {
            origem: 'memoria',
            carregadoEm: new Date().toISOString(),
            ttlRestante: memoryCache.getTTL(memoryCacheKey),
          },
        })
      }
    }

    // Verificar cache em arquivo (fallback)
    try {
      if (!forcarAtualizacao && verificarCache(cacheOptions)) {
        const dadosCache = carregarCache<any>(cacheOptions)
        if (dadosCache) {
          console.log('[Dashboard] Cache em arquivo encontrado')
          if (USE_MEMORY_CACHE) {
            memoryCache.set(memoryCacheKey, dadosCache, CACHE_TTL.DASHBOARD)
          }
          return NextResponse.json({
            ...dadosCache,
            _cache: {
              origem: 'arquivo',
              carregadoEm: new Date().toISOString(),
            },
          })
        }
      }
    } catch {
      console.log('[Dashboard] Cache de arquivo não disponível, buscando do banco')
    }

    // Buscar dados do banco via service
    const dadosResposta = await getDashboardData(usuario, filtros, paginacao)

    // SALVAR NO CACHE EM MEMÓRIA
    if (USE_MEMORY_CACHE) {
      try {
        memoryCache.set(memoryCacheKey, dadosResposta, CACHE_TTL.DASHBOARD)
        console.log('[Dashboard] Cache em memória salvo')
      } catch (cacheError) {
        console.error('[Dashboard] Erro ao salvar cache em memória:', cacheError)
      }
    }

    // Salvar no cache em arquivo (backup/persistência)
    try {
      const { limparCachesExpirados } = await import('@/lib/cache')
      limparCachesExpirados()
      salvarCache(cacheOptions, dadosResposta, 'dashboard')
    } catch {
      // Não crítico, continuar
    }

    return NextResponse.json({
      ...dadosResposta,
      _cache: {
        origem: 'banco',
        geradoEm: new Date().toISOString(),
      },
      _stats: memoryCache.getStats(),
    })
  }
)
