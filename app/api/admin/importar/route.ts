import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { lerPlanilha } from '@/lib/excel-reader'
import { limparTodosOsCaches, invalidateDashboardCache, invalidateFiltrosCache, cacheDelPattern } from '@/lib/cache'
import { resolverAvaliacaoId } from '@/lib/avaliacoes'
import { validarArquivoUpload } from '@/lib/api-helpers'
import { createLogger } from '@/lib/logger'
import {
  detectarColunasResultado, carregarCachesImportacao, contarEscolas, montarLinhaResultado,
} from '@/lib/services/importar-resultados.service'

const log = createLogger('Importar')

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutos (limite Vercel)

export const POST = withAuth(['administrador', 'tecnico'], async (request, usuario) => {
  const formData = await request.formData()
  const arquivo = formData.get('arquivo') as File

  if (!arquivo) {
    return NextResponse.json({ mensagem: 'Arquivo não fornecido' }, { status: 400 })
  }

  const erroUpload = validarArquivoUpload(arquivo)
  if (erroUpload) {
    return NextResponse.json({ mensagem: erroUpload }, { status: 400 })
  }

  const anoLetivoParam = (formData.get('ano_letivo') as string) || new Date().getFullYear().toString()
  const avaliacaoIdParam = formData.get('avaliacao_id') as string | null
  const avaliacaoId = await resolverAvaliacaoId(avaliacaoIdParam, anoLetivoParam)

  // V7 (auditoria 31/05): parsing protegido — arquivo corrompido ou xlsx
  // malformado pode lançar exceção dentro do reader. Sem try/catch, a
  // exceção sobe e o handler retorna 500 sem mensagem amigável.
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

  // V7: limite operacional de linhas por importação. Acima disso, a SEMED
  // deve fragmentar o arquivo. Protege contra OOM no processamento.
  const MAX_LINHAS_IMPORTACAO = 50_000
  if (dados.length > MAX_LINHAS_IMPORTACAO) {
    return NextResponse.json(
      {
        mensagem: `Planilha excede o limite de ${MAX_LINHAS_IMPORTACAO.toLocaleString('pt-BR')} linhas. Divida o arquivo e tente novamente.`,
        total_linhas: dados.length,
      },
      { status: 413 }
    )
  }

  // Detectar colunas automaticamente
  const primeiraLinha = dados[0] as Record<string, unknown>
  const colunasDisponiveis = Object.keys(primeiraLinha)
  const cols = detectarColunasResultado(colunasDisponiveis)

  log.debug('Colunas encontradas', { data: { ...cols, todasColunas: colunasDisponiveis } })

  // Validar colunas obrigatórias
  if (!cols.escola && !cols.aluno) {
    return NextResponse.json(
      {
        mensagem: 'Colunas obrigatórias não encontradas. Colunas disponíveis: ' + colunasDisponiveis.join(', '),
        colunasDisponiveis,
      },
      { status: 400 }
    )
  }

  // Pré-carregar escolas, questões e alunos em memória (elimina N+1)
  const caches = await carregarCachesImportacao()

  if (contarEscolas(caches) === 0) {
    return NextResponse.json(
      {
        mensagem: 'Nenhuma escola cadastrada no sistema. Cadastre escolas antes de importar dados.',
        colunasDisponiveis,
      },
      { status: 400 }
    )
  }

  // Criar registro de importação
  const importacaoResult = await pool.query(
    `INSERT INTO importacoes (usuario_id, nome_arquivo, total_linhas, status, ano_letivo, avaliacao_id)
     VALUES ($1, $2, $3, 'processando', $4, $5)
     RETURNING id`,
    [usuario.id, arquivo.name, dados.length, anoLetivoParam, avaliacaoId]
  )
  const importacaoId = importacaoResult.rows[0].id

  let linhasProcessadas = 0
  let linhasComErro = 0
  const erros: string[] = []

  // Processar em batches de 100 linhas
  const BATCH_SIZE = 100

  for (let batchStart = 0; batchStart < dados.length; batchStart += BATCH_SIZE) {
    const batch = dados.slice(batchStart, batchStart + BATCH_SIZE)
    const values: any[] = []
    const placeholders: string[] = []
    let paramIdx = 1

    for (let j = 0; j < batch.length; j++) {
      const i = batchStart + j
      try {
        const rowValues = montarLinhaResultado(batch[j] as Record<string, unknown>, cols, caches, avaliacaoId)
        const ph = rowValues.map(() => `$${paramIdx++}`).join(', ')
        placeholders.push(`(${ph})`)
        values.push(...rowValues)
        linhasProcessadas++
      } catch (error: unknown) {
        linhasComErro++
        erros.push(`Linha ${i + 2}: ${(error as Error)?.message || 'Erro ao processar registro'}`)
        if (erros.length >= 100) {
          erros.push(`... e mais ${dados.length - i - 1} erros`)
          break
        }
      }
    }

    // Executar batch INSERT
    if (placeholders.length > 0) {
      try {
        await pool.query(
          `INSERT INTO resultados_provas
           (escola_id, aluno_id, aluno_codigo, aluno_nome, questao_id, questao_codigo,
            resposta_aluno, acertou, nota, data_prova, ano_letivo, serie,
            turma, disciplina, area_conhecimento, avaliacao_id)
           VALUES ${placeholders.join(', ')}
           ON CONFLICT (aluno_id, questao_codigo, avaliacao_id)
           DO UPDATE SET
             resposta_aluno = EXCLUDED.resposta_aluno,
             acertou = EXCLUDED.acertou,
             nota = EXCLUDED.nota,
             data_prova = EXCLUDED.data_prova,
             atualizado_em = CURRENT_TIMESTAMP`,
          values
        )
      } catch (batchError: unknown) {
        // Se batch falha, linhas ficam como erro
        log.error(`Erro no batch ${batchStart}: ${(batchError as Error)?.message}`, batchError)
        linhasComErro += placeholders.length
        linhasProcessadas -= placeholders.length
        erros.push(`Batch ${batchStart + 1}-${batchStart + batch.length}: Erro ao inserir`)
      }
    }

    if (erros.length >= 100) break
  }

  // Atualizar importação
  await pool.query(
    `UPDATE importacoes
     SET linhas_processadas = $1, linhas_com_erro = $2,
         status = $3, concluido_em = CURRENT_TIMESTAMP,
         erros = $4
     WHERE id = $5`,
    [
      linhasProcessadas,
      linhasComErro,
      linhasComErro === dados.length ? 'erro' : 'concluido',
      erros.length > 0 ? erros.slice(0, 50).join('\n') : null,
      importacaoId,
    ]
  )

  // Invalidar cache após importação bem-sucedida. limparTodosOsCaches() só
  // limpa o cache de ARQUIVO; os dashboards leem do memoryCache (Map) e do
  // Redis — precisam ser invalidados explicitamente, senão mostram números
  // pré-importação até o TTL.
  try {
    limparTodosOsCaches()
    invalidateDashboardCache()
    invalidateFiltrosCache()
    for (const p of ['dashboard:*', 'stats:*', 'graficos:*', 'alunos:*']) {
      try { await cacheDelPattern(p) } catch {}
    }
    log.info('Cache (arquivo + memoria + Redis) invalidado após importação')
  } catch (cacheError) {
    log.error('Erro ao invalidar cache (não crítico)', cacheError)
  }

  return NextResponse.json({
    mensagem: 'Importação concluída',
    total_linhas: dados.length,
    linhas_processadas: linhasProcessadas,
    linhas_com_erro: linhasComErro,
    colunas_detectadas: cols,
    todas_colunas: colunasDisponiveis,
    erros: erros.slice(0, 20),
    cache_invalidado: true,
  })
})
