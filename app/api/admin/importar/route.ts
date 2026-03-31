import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { lerPlanilha } from '@/lib/excel-reader'
import { limparTodosOsCaches } from '@/lib/cache'
import { resolverAvaliacaoId } from '@/lib/avaliacoes'
import { validarArquivoUpload } from '@/lib/api-helpers'
import { createLogger } from '@/lib/logger'

const log = createLogger('Importar')

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutos (limite Vercel)

export const POST = withAuth(['administrador', 'tecnico'], async (request, usuario) => {
  const formData = await request.formData()
  const arquivo = formData.get('arquivo') as File

  if (!arquivo) {
    return NextResponse.json(
      { mensagem: 'Arquivo não fornecido' },
      { status: 400 }
    )
  }

  const erroUpload = validarArquivoUpload(arquivo)
  if (erroUpload) {
    return NextResponse.json({ mensagem: erroUpload }, { status: 400 })
  }

  const anoLetivoParam = (formData.get('ano_letivo') as string) || new Date().getFullYear().toString()
  const avaliacaoIdParam = formData.get('avaliacao_id') as string | null
  const avaliacaoId = await resolverAvaliacaoId(avaliacaoIdParam, anoLetivoParam)

  const arrayBuffer = await arquivo.arrayBuffer()
  const dados = await lerPlanilha(arrayBuffer)

  if (!dados || dados.length === 0) {
    return NextResponse.json(
      { mensagem: 'Arquivo vazio ou inválido' },
      { status: 400 }
    )
  }

  // Detectar nomes das colunas automaticamente
  const primeiraLinha = dados[0] as Record<string, unknown>
  const colunasDisponiveis = Object.keys(primeiraLinha)

  // Função para encontrar coluna por múltiplos nomes possíveis
  const encontrarColuna = (nomesPossiveis: string[]): string | null => {
    for (const nome of nomesPossiveis) {
      // Busca exata
      if (colunasDisponiveis.includes(nome)) {
        return nome
      }
      // Busca case-insensitive
      const encontrada = colunasDisponiveis.find(
        col => col.toLowerCase().trim() === nome.toLowerCase().trim()
      )
      if (encontrada) return encontrada
    }
    return null
  }

  // Mapear colunas
  const colEscola = encontrarColuna([
    'Código Escola', 'codigo_escola', 'Escola', 'escola',
    'Código da Escola', 'CODIGO_ESCOLA', 'ESCOLA',
    'CódigoEscola', 'CodigoEscola', 'codigoEscola'
  ])

  const colAluno = encontrarColuna([
    'Código Aluno', 'codigo_aluno', 'Aluno', 'aluno',
    'Código do Aluno', 'CODIGO_ALUNO', 'ALUNO',
    'CódigoAluno', 'CodigoAluno', 'codigoAluno', 'Matrícula', 'matricula'
  ])

  const colNomeAluno = encontrarColuna([
    'Nome Aluno', 'nome_aluno', 'Nome', 'nome',
    'Nome do Aluno', 'NOME_ALUNO', 'NOME',
    'NomeAluno', 'NomeCompleto', 'nome_completo'
  ])

  const colQuestao = encontrarColuna([
    'Código Questão', 'codigo_questao', 'Questão', 'questao',
    'Código da Questão', 'CODIGO_QUESTAO', 'QUESTAO',
    'CódigoQuestão', 'Questao', 'Item'
  ])

  const colResposta = encontrarColuna([
    'Resposta', 'resposta', 'Resposta Aluno', 'resposta_aluno',
    'RESPOSTA', 'Alternativa', 'alternativa'
  ])

  const colAcertou = encontrarColuna([
    'Acertou', 'acertou', 'ACERTOU', 'Acerto', 'acerto',
    'Correto', 'correto', 'Status', 'status'
  ])

  const colNota = encontrarColuna([
    'Nota', 'nota', 'NOTA', 'Pontuação', 'pontuacao', 'Pontos', 'pontos'
  ])

  const colData = encontrarColuna([
    'Data', 'data', 'DATA', 'Data Prova', 'data_prova',
    'Data da Prova', 'DataProva'
  ])

  const colAno = encontrarColuna([
    'Ano Letivo', 'ano_letivo', 'Ano', 'ano', 'ANO',
    'AnoLetivo', 'Ano Letivo', 'Ano Escolar'
  ])

  const colSerie = encontrarColuna([
    'Série', 'serie', 'SERIE', 'Serie', 'Série/Ano',
    'Ano Escolar', 'ano_escolar', 'Grade', 'grade'
  ])

  const colTurma = encontrarColuna([
    'Turma', 'turma', 'TURMA', 'Classe', 'classe'
  ])

  const colDisciplina = encontrarColuna([
    'Disciplina', 'disciplina', 'DISCIPLINA', 'Matéria', 'materia',
    'Componente Curricular', 'componente_curricular'
  ])

  const colArea = encontrarColuna([
    'Área', 'area', 'AREA', 'Área Conhecimento', 'area_conhecimento',
    'Área de Conhecimento', 'AreaConhecimento'
  ])

  // Log das colunas encontradas para debug
  log.debug('Colunas encontradas', { data: {
    escola: colEscola,
    aluno: colAluno,
    nomeAluno: colNomeAluno,
    questao: colQuestao,
    resposta: colResposta,
    acertou: colAcertou,
    nota: colNota,
    data: colData,
    ano: colAno,
    serie: colSerie,
    turma: colTurma,
    disciplina: colDisciplina,
    area: colArea,
    todasColunas: colunasDisponiveis
  }})

  // Validar colunas obrigatórias
  if (!colEscola && !colAluno) {
    return NextResponse.json(
      {
        mensagem: 'Colunas obrigatórias não encontradas. Colunas disponíveis: ' + colunasDisponiveis.join(', '),
        colunasDisponiveis
      },
      { status: 400 }
    )
  }

  // Verificar se há escolas cadastradas
  const escolasCount = await pool.query('SELECT COUNT(*) as total FROM escolas WHERE ativo = true')
  if (parseInt(escolasCount.rows[0].total) === 0) {
    return NextResponse.json(
      {
        mensagem: 'Nenhuma escola cadastrada no sistema. Cadastre escolas antes de importar dados.',
        colunasDisponiveis
      },
      { status: 400 }
    )
  }

  // Pré-carregar escolas e questões em memória (elimina N+1)
  const [escolasResult, questoesResult] = await Promise.all([
    pool.query('SELECT id, codigo, nome FROM escolas WHERE ativo = true'),
    pool.query('SELECT id, codigo FROM questoes'),
  ])

  const escolasCache = new Map<string, string>()
  for (const e of escolasResult.rows) {
    if (e.codigo) escolasCache.set(e.codigo.toLowerCase(), e.id)
    if (e.nome) {
      escolasCache.set(e.nome.toLowerCase(), e.id)
      escolasCache.set(e.nome.toUpperCase(), e.id)
    }
  }
  const escolasRows = escolasResult.rows

  const questoesCache = new Map<string, string>()
  for (const q of questoesResult.rows) {
    if (q.codigo) questoesCache.set(q.codigo, q.id)
  }

  // Função de busca de escola com fallback parcial
  const buscarEscolaId = (codigo: string): string | null => {
    const lower = codigo.toLowerCase()
    if (escolasCache.has(lower)) return escolasCache.get(lower)!
    // Busca parcial (contains)
    for (const e of escolasRows) {
      if (e.nome && e.nome.toLowerCase().includes(lower)) {
        escolasCache.set(lower, e.id)
        return e.id
      }
      if (e.codigo && e.codigo.toLowerCase().includes(lower)) {
        escolasCache.set(lower, e.id)
        return e.id
      }
    }
    return null
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
        const linha = batch[j] as Record<string, unknown>

        const escolaCodigo = colEscola ? (linha[colEscola] || '').toString().trim() : null
        const alunoCodigo = colAluno ? (linha[colAluno] || '').toString().trim() : null
        const alunoNome = colNomeAluno ? (linha[colNomeAluno] || '').toString().trim() : null
        const questaoCodigo = colQuestao ? (linha[colQuestao] || '').toString().trim() : null
        const respostaAluno = colResposta ? (linha[colResposta] || '').toString().trim() : null

        let acertou: boolean | null = null
        if (colAcertou) {
          const valorAcertou = (linha[colAcertou] || '').toString().toLowerCase().trim()
          if (['sim', 's', 'true', '1', 'x', '\u2713'].includes(valorAcertou)) {
            acertou = true
          } else if (['não', 'nao', 'n', 'false', '0'].includes(valorAcertou)) {
            acertou = false
          }
        }

        const nota = colNota ? parseFloat((linha[colNota] || '0').toString().replace(',', '.')) || null : null

        let dataProva: Date | null = null
        if (colData && linha[colData]) {
          try {
            const dataStr = linha[colData].toString()
            if (dataStr.includes('/')) {
              const [dia, mes, ano] = dataStr.split('/')
              dataProva = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia))
            } else {
              dataProva = new Date(dataStr)
            }
            if (isNaN(dataProva.getTime())) dataProva = null
          } catch { dataProva = null }
        }

        const anoLetivo = colAno ? (linha[colAno] || '').toString().trim() : null
        const serie = colSerie ? (linha[colSerie] || '').toString().trim() : null
        const turma = colTurma ? (linha[colTurma] || '').toString().trim() : null
        const disciplina = colDisciplina ? (linha[colDisciplina] || '').toString().trim() : null
        const areaConhecimento = colArea ? (linha[colArea] || '').toString().trim() : null

        if (!escolaCodigo && !alunoCodigo) {
          throw new Error('Linha sem código de escola ou aluno')
        }

        const escolaId = escolaCodigo ? buscarEscolaId(escolaCodigo) : null
        if (!escolaId) {
          throw new Error(`Escola não encontrada: "${escolaCodigo || 'vazio'}"`)
        }

        const questaoId = questaoCodigo ? (questoesCache.get(questaoCodigo) || null) : null

        const rowValues = [
          escolaId, alunoCodigo || null, alunoNome || null, questaoId,
          questaoCodigo || null, respostaAluno || null, acertou, nota,
          dataProva, anoLetivo || null, serie || null, turma || null,
          disciplina || null, areaConhecimento || null, avaliacaoId,
        ]

        const ph = rowValues.map(() => `$${paramIdx++}`).join(', ')
        placeholders.push(`(${ph})`)
        values.push(...rowValues)
        linhasProcessadas++
      } catch (error: unknown) {
        linhasComErro++
        erros.push(`Linha ${i + 2}: Erro ao processar registro`)
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
           (escola_id, aluno_codigo, aluno_nome, questao_id, questao_codigo,
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

  // Invalidar cache do dashboard após importação bem-sucedida
  try {
    limparTodosOsCaches()
    log.info('Cache do dashboard invalidado após importação')
  } catch (cacheError) {
    log.error('Erro ao invalidar cache (não crítico)', cacheError)
  }

  return NextResponse.json({
    mensagem: 'Importação concluída',
    total_linhas: dados.length,
    linhas_processadas: linhasProcessadas,
    linhas_com_erro: linhasComErro,
    colunas_detectadas: {
      escola: colEscola,
      aluno: colAluno,
      nomeAluno: colNomeAluno,
      questao: colQuestao,
      resposta: colResposta,
      acertou: colAcertou,
      nota: colNota,
      data: colData,
      ano: colAno,
      serie: colSerie,
      turma: colTurma,
      disciplina: colDisciplina,
      area: colArea,
    },
    todas_colunas: colunasDisponiveis,
    erros: erros.slice(0, 20),
    cache_invalidado: true,
  })
})
