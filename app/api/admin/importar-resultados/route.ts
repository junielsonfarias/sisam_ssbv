/**
 * POST /api/admin/importar-resultados
 *
 * Importa resultados de avaliações SISAM a partir de uma planilha xlsx.
 *
 * Decomposto em 2026-05-31 (auditoria) — antes era 1 arquivo de 872 linhas.
 * Arquivos auxiliares (mesma pasta):
 *   helpers-serie.ts    — normalizarSerie, padronizarSerie, inferirSerieDaTurma,
 *                         detectarSeriePorQuestoes, obterQuestoesMap, obterConfigSerie
 *   parsers.ts          — extrairPresenca, lerItensProducao, lerNotasPlanilha
 *   caches.ts           — carregarCaches (questões, escolas, alunos, turmas, configSeries)
 *   batch-inserts.ts    — criarBatchProvas, criarBatchConsolidados
 *   calcular-medias.ts  — calcularNotasEMedia, calcularNiveis
 *   processar-linha.ts  — processarLinha (orquestra todos acima para 1 linha)
 */
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { lerPlanilha } from '@/lib/excel-reader'
import { limparTodosOsCaches, invalidateDashboardCache, invalidateFiltrosCache, cacheDelPattern } from '@/lib/cache'
import { resolverAvaliacaoId } from '@/lib/avaliacoes'
import { validarArquivoUpload } from '@/lib/api-helpers'
import { createLogger } from '@/lib/logger'
import { registrarAuditoria } from '@/lib/services/auditoria.service'

import { carregarCaches } from './caches'
import { criarBatchConsolidados, criarBatchProvas } from './batch-inserts'
import { processarLinha } from './processar-linha'

const log = createLogger('ImportarResultados')

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutos (limite Vercel)

export const POST = withAuth(['administrador', 'tecnico'], async (request, usuario) => {
  try {
    const formData = await request.formData()
    const arquivo = formData.get('arquivo') as File
    const anoLetivo = (formData.get('ano_letivo') as string) || new Date().getFullYear().toString()
    const avaliacaoIdParam = formData.get('avaliacao_id') as string | null

    if (!arquivo) {
      return NextResponse.json({ mensagem: 'Arquivo não fornecido' }, { status: 400 })
    }

    const erroUpload = validarArquivoUpload(arquivo)
    if (erroUpload) {
      return NextResponse.json({ mensagem: erroUpload }, { status: 400 })
    }

    const arrayBuffer = await arquivo.arrayBuffer()
    let dados: unknown[]
    try {
      dados = await lerPlanilha(arrayBuffer)
    } catch (err: unknown) {
      log.error('Falha ao ler planilha', err)
      return NextResponse.json(
        { mensagem: 'Não foi possível ler a planilha. Verifique se o arquivo está íntegro e em formato xlsx/xls/csv.' },
        { status: 400 }
      )
    }

    if (!dados || dados.length === 0) {
      return NextResponse.json({ mensagem: 'Arquivo vazio ou inválido' }, { status: 400 })
    }

    const avaliacaoId = await resolverAvaliacaoId(avaliacaoIdParam, anoLetivo)

    // Pré-carregar caches em paralelo (evita N+1 queries)
    const caches = await carregarCaches(anoLetivo)

    // Criar registro de importação
    const importacaoResult = await pool.query(
      `INSERT INTO importacoes (usuario_id, nome_arquivo, total_linhas, status, ano_letivo, avaliacao_id)
       VALUES ($1, $2, $3, 'processando', $4, $5)
       RETURNING id`,
      [usuario.id, arquivo.name, dados.length, anoLetivo, avaliacaoId]
    )
    const importacaoId = importacaoResult.rows[0].id

    const batchProvas = criarBatchProvas()
    const batchConsolidados = criarBatchConsolidados()

    let linhasProcessadas = 0
    let linhasComErro = 0
    const erros: string[] = []

    for (let i = 0; i < dados.length; i++) {
      try {
        await processarLinha(
          dados[i] as Record<string, unknown>,
          i,
          { caches, batchProvas, batchConsolidados, anoLetivo, avaliacaoId, importacaoId, usuarioId: usuario.id },
        )
        linhasProcessadas++
      } catch (error: unknown) {
        linhasComErro++
        log.error(`Erro na linha ${i + 2}`, error)
        erros.push(`Linha ${i + 2}: Erro ao processar registro`)
        if (erros.length >= 100) {
          erros.push(`... e mais ${dados.length - i - 1} erros`)
          break
        }
      }
    }

    // Flush dos batches restantes
    await batchProvas.flush()
    await batchConsolidados.flush()

    // Atualizar importação
    await pool.query(
      `UPDATE importacoes
          SET linhas_processadas = $1, linhas_com_erro = $2,
              status = $3, concluido_em = CURRENT_TIMESTAMP, erros = $4
        WHERE id = $5`,
      [
        linhasProcessadas,
        linhasComErro,
        linhasComErro === dados.length ? 'erro' : 'concluido',
        erros.length > 0 ? erros.slice(0, 50).join('\n') : null,
        importacaoId,
      ]
    )

    // Invalidar cache após importação. limparTodosOsCaches() só limpa o cache de
    // ARQUIVO; os dashboards/análises leem do memoryCache (Map) e do Redis e
    // precisam ser invalidados explicitamente, senão mostram números pré-importação
    // até o TTL (mesmo bug que c3b9c00 corrigiu em /importar — aqui faltava).
    try {
      limparTodosOsCaches()
      invalidateDashboardCache()
      invalidateFiltrosCache()
      for (const p of ['dashboard:*', 'stats:*', 'graficos:*', 'alunos:*', 'executivo:*', 'evolucao:*', 'alunos-risco:*', 'dashboard-gestor:*']) {
        try { await cacheDelPattern(p) } catch {}
      }
      log.info('Cache (arquivo + memoria + Redis) invalidado após importação')
    } catch (cacheError) {
      log.error('Erro ao invalidar cache (não crítico)', cacheError)
    }

    registrarAuditoria({
      usuarioId: usuario.id,
      usuarioEmail: usuario.email,
      acao: 'importar',
      entidade: 'resultados',
      detalhes: {
        arquivo: arquivo.name,
        ano_letivo: anoLetivo,
        total_linhas: dados.length,
        linhas_processadas: linhasProcessadas,
        linhas_com_erro: linhasComErro,
        total_questoes: batchProvas.total(),
      },
    })

    return NextResponse.json({
      mensagem: 'Resultados importados com sucesso',
      ano_letivo: anoLetivo,
      total_linhas: dados.length,
      linhas_processadas: linhasProcessadas,
      linhas_com_erro: linhasComErro,
      total_questoes_importadas: batchProvas.total(),
      erros: erros.slice(0, 20),
      cache_invalidado: true,
    })
  } catch (error: unknown) {
    log.error('Erro ao importar resultados', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})
