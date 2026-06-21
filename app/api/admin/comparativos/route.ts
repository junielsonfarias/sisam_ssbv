import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { verificarCache, carregarCache, salvarCache, limparCachesExpirados } from '@/lib/cache'
import { createLogger } from '@/lib/logger'
import { buscarComparativoAdmin } from '@/lib/services/comparativos'

const log = createLogger('AdminComparativos')

export const dynamic = 'force-dynamic';

export const GET = withAuth(['administrador', 'tecnico', 'polo'], async (request, usuario) => {
  try {
    // Limpar caches expirados
    try {
      limparCachesExpirados()
    } catch (error: unknown) {
      // Não crítico
    }

    const { searchParams } = new URL(request.url)
    const escolasIds = searchParams.get('escolas_ids')?.split(',').filter(Boolean) || []
    const poloId = searchParams.get('polo_id')
    const anoLetivo = searchParams.get('ano_letivo')
    const serie = searchParams.get('serie')
    const turmaId = searchParams.get('turma_id')
    const tipoEnsino = searchParams.get('tipo_ensino')
    const avaliacaoId = searchParams.get('avaliacao_id')

    // Verificar cache
    const cacheOptions = {
      filtros: {
        escolasIds: escolasIds.join(','),
        poloId,
        anoLetivo,
        serie,
        turmaId,
        tipoEnsino,
        avaliacaoId
      },
      tipoUsuario: usuario.tipo_usuario,
      usuarioId: usuario.id,
      poloId: usuario.polo_id || null,
      escolaId: usuario.escola_id || null
    }

    const forcarAtualizacao = searchParams.get('atualizar_cache') === 'true'

    // Verificar cache com tratamento de erro para ambientes serverless
    try {
      if (!forcarAtualizacao && verificarCache(cacheOptions)) {
        const dadosCache = carregarCache<any>(cacheOptions)
        if (dadosCache) {
          log.info('Retornando comparativos do cache')
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
      // Ignorar erros de cache em ambientes serverless
      log.info('Cache não disponível, buscando do banco')
    }

    if (escolasIds.length === 0 && !poloId) {
      return NextResponse.json(
        { mensagem: 'Selecione pelo menos uma escola ou um polo' },
        { status: 400 }
      )
    }

    const dadosResposta = await buscarComparativoAdmin({
      escolasIds,
      poloId,
      anoLetivo,
      serie,
      turmaId,
      tipoEnsino,
      avaliacaoId,
      usuario: {
        tipo_usuario: usuario.tipo_usuario,
        polo_id: usuario.polo_id || null,
        escola_id: usuario.escola_id || null,
      },
    })

    // Salvar no cache (expira em 1 hora)
    try {
      salvarCache(cacheOptions, dadosResposta, 'comparativos')
    } catch (cacheError) {
      log.error('Erro ao salvar cache (não crítico)', cacheError)
    }

    return NextResponse.json({
      ...dadosResposta,
      _cache: {
        origem: 'banco',
        geradoEm: new Date().toISOString()
      }
    })
  } catch (error: unknown) {
    log.error('Erro ao buscar comparativos', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})
