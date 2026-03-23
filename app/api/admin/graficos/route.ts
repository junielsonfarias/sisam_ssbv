import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { verificarCache, carregarCache, salvarCache, limparCachesExpirados } from '@/lib/cache'
import { getGraficosData, GraficosFiltros } from '@/lib/services/graficos.service'

export const dynamic = 'force-dynamic'

export const GET = withAuth(['administrador', 'tecnico', 'escola', 'polo'], async (request, usuario) => {
  // Limpar caches expirados (não crítico)
  try { limparCachesExpirados() } catch { /* ignorar */ }

  const { searchParams } = new URL(request.url)
  const tipoGrafico = searchParams.get('tipo') || 'geral'
  const anoLetivo = searchParams.get('ano_letivo')
  const poloId = searchParams.get('polo_id')
  const escolaId = searchParams.get('escola_id')
  const serie = searchParams.get('serie')
  const disciplina = searchParams.get('disciplina')
  const turmaId = searchParams.get('turma_id')
  const tipoEnsino = searchParams.get('tipo_ensino')
  const tipoRanking = searchParams.get('tipo_ranking') || 'escolas'

  const filtros: GraficosFiltros = {
    tipoGrafico,
    anoLetivo,
    poloId,
    escolaId,
    serie,
    disciplina,
    turmaId,
    tipoEnsino,
    tipoRanking
  }

  // Verificar cache
  const cacheOptions = {
    filtros: {
      tipoGrafico,
      anoLetivo,
      poloId,
      escolaId,
      serie,
      disciplina,
      turmaId,
      tipoEnsino
    },
    tipoUsuario: usuario.tipo_usuario,
    usuarioId: usuario.id,
    poloId: usuario.polo_id || null,
    escolaId: usuario.escola_id || null
  }

  const forcarAtualizacao = searchParams.get('atualizar_cache') === 'true'

  try {
    if (!forcarAtualizacao && verificarCache(cacheOptions)) {
      const dadosCache = carregarCache<any>(cacheOptions)
      if (dadosCache) {
        console.log('Retornando gráficos do cache')
        return NextResponse.json({
          ...dadosCache,
          _cache: {
            origem: 'cache',
            carregadoEm: new Date().toISOString()
          }
        })
      }
    }
  } catch {
    console.log('[Gráficos] Cache não disponível, buscando do banco')
  }

  // Buscar dados do banco via service
  const resultado = await getGraficosData(usuario, filtros)

  // Salvar no cache
  try {
    salvarCache(cacheOptions, resultado, 'graficos')
  } catch (cacheError) {
    console.error('Erro ao salvar cache (nao critico):', cacheError)
  }

  return NextResponse.json({
    ...resultado,
    _cache: {
      origem: 'banco',
      geradoEm: new Date().toISOString()
    }
  })
})
