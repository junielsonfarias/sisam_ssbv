import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic';

// Tamanho do batch para inserts
const BATCH_SIZE = 500

export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const arquivo = formData.get('arquivo') as File
    const anoLetivo = (formData.get('ano_letivo') as string) || new Date().getFullYear().toString()

    if (!arquivo) {
      return NextResponse.json(
        { mensagem: 'Arquivo não fornecido' },
        { status: 400 }
      )
    }

    const arrayBuffer = await arquivo.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'buffer' })
    const primeiraAba = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[primeiraAba]
    const dados = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' })

    if (!dados || dados.length === 0) {
      return NextResponse.json(
        { mensagem: 'Arquivo vazio ou inválido' },
        { status: 400 }
      )
    }

    // Mapear questoes para areas
    const questoesMap = [
      { inicio: 1, fim: 20, area: 'Língua Portuguesa', disciplina: 'Língua Portuguesa' },
      { inicio: 21, fim: 30, area: 'Ciências Humanas', disciplina: 'Ciências Humanas' },
      { inicio: 31, fim: 50, area: 'Matemática', disciplina: 'Matemática' },
      { inicio: 51, fim: 60, area: 'Ciências da Natureza', disciplina: 'Ciências da Natureza' },
    ]

    // Criar registro de importacao
    const importacaoResult = await pool.query(
      `INSERT INTO importacoes (usuario_id, nome_arquivo, total_linhas, status)
       VALUES ($1, $2, $3, 'processando')
       RETURNING id`,
      [usuario.id, arquivo.name, dados.length]
    )

    const importacaoId = importacaoResult.rows[0].id

    let linhasProcessadas = 0
    let linhasComErro = 0
    const erros: string[] = []

    // =====================================================
    // PRE-CARREGAR DADOS EM CACHE (evita N+1 queries)
    // =====================================================

    // Cache de questoes - carregar TODAS de uma vez
    const cacheQuestoes = new Map<string, string>()
    const questoesResult = await pool.query('SELECT id, codigo FROM questoes')
    for (const q of questoesResult.rows) {
      cacheQuestoes.set(q.codigo, q.id)
    }

    // Cache para escolas, alunos e turmas
    const cacheEscolas = new Map<string, string>()
    const cacheAlunos = new Map<string, string>()
    const cacheTurmas = new Map<string, string>()

    // Pre-carregar escolas ativas
    const escolasResult = await pool.query(
      'SELECT id, UPPER(TRIM(nome)) as nome_norm FROM escolas WHERE ativo = true'
    )
    for (const e of escolasResult.rows) {
      cacheEscolas.set(e.nome_norm, e.id)
    }

    // Pre-carregar alunos do ano letivo
    const alunosResult = await pool.query(
      `SELECT id, UPPER(TRIM(nome)) as nome_norm, escola_id
       FROM alunos WHERE ano_letivo = $1`,
      [anoLetivo]
    )
    for (const a of alunosResult.rows) {
      const key = `${a.nome_norm}_${a.escola_id}`
      cacheAlunos.set(key, a.id)
    }

    // Pre-carregar turmas do ano letivo
    const turmasResult = await pool.query(
      'SELECT id, codigo, escola_id FROM turmas WHERE ano_letivo = $1',
      [anoLetivo]
    )
    for (const t of turmasResult.rows) {
      const key = `${t.codigo}_${t.escola_id}`
      cacheTurmas.set(key, t.id)
    }

    // =====================================================
    // PROCESSAR DADOS E PREPARAR BATCHES
    // =====================================================

    // Buffer para batch insert
    let batchValues: any[][] = []
    let totalQuestoesImportadas = 0

    // Funcao para executar batch insert
    const executarBatch = async () => {
      if (batchValues.length === 0) return

      // Construir query de batch insert
      const placeholders: string[] = []
      const params: any[] = []
      let paramIndex = 1

      for (const values of batchValues) {
        const rowPlaceholders = values.map(() => `$${paramIndex++}`).join(', ')
        placeholders.push(`(${rowPlaceholders})`)
        params.push(...values)
      }

      const query = `
        INSERT INTO resultados_provas
        (escola_id, aluno_id, aluno_codigo, aluno_nome, turma_id, questao_id, questao_codigo,
         resposta_aluno, acertou, nota, ano_letivo, serie, turma, disciplina, area_conhecimento, presenca)
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (aluno_id, questao_codigo, ano_letivo)
        DO UPDATE SET
          resposta_aluno = EXCLUDED.resposta_aluno,
          acertou = EXCLUDED.acertou,
          nota = EXCLUDED.nota,
          presenca = EXCLUDED.presenca,
          atualizado_em = CURRENT_TIMESTAMP
      `

      await pool.query(query, params)
      totalQuestoesImportadas += batchValues.length
      batchValues = []
    }

    // Processar cada linha (cada linha = um aluno)
    for (let i = 0; i < dados.length; i++) {
      try {
        const linha = dados[i] as any

        // Extrair dados basicos
        const escolaNome = (linha['ESCOLA'] || linha['Escola'] || linha['escola'] || '').toString().trim()
        const alunoNome = (linha['ALUNO'] || linha['Aluno'] || linha['aluno'] || '').toString().trim()
        const turmaCodigo = (linha['TURMA'] || linha['Turma'] || linha['turma'] || '').toString().trim()
        const serie = (linha['ANO/SÉRIE'] || linha['ANO/SERIE'] || linha['Série'] || linha['serie'] || linha['Ano'] || '').toString().trim()

        // Tratamento da presenca/falta
        let presenca: string | null = null

        const colunaFalta = linha['FALTA'] || linha['Falta'] || linha['falta']
        const colunaPresenca = linha['PRESENÇA'] || linha['Presença'] || linha['presenca']

        const temColunaFalta = colunaFalta !== undefined && colunaFalta !== null && colunaFalta !== ''
        const temColunaPresenca = colunaPresenca !== undefined && colunaPresenca !== null && colunaPresenca !== ''

        if (temColunaFalta) {
          const valorFalta = colunaFalta.toString().trim().toUpperCase()
          if (valorFalta === 'F' || valorFalta === 'X' || valorFalta === 'FALTOU' || valorFalta === 'AUSENTE' || valorFalta === 'SIM' || valorFalta === '1' || valorFalta === 'S') {
            presenca = 'F'
          } else if (valorFalta === 'P' || valorFalta === 'PRESENTE' || valorFalta === 'NAO' || valorFalta === 'NÃO' || valorFalta === '0' || valorFalta === 'N') {
            presenca = 'P'
          } else {
            presenca = 'F'
          }
        } else if (temColunaPresenca) {
          const valorPresenca = colunaPresenca.toString().trim().toUpperCase()
          if (valorPresenca === 'P' || valorPresenca === 'PRESENTE' || valorPresenca === 'SIM' || valorPresenca === '1' || valorPresenca === 'S') {
            presenca = 'P'
          } else if (valorPresenca === 'F' || valorPresenca === 'FALTOU' || valorPresenca === 'AUSENTE' || valorPresenca === 'NAO' || valorPresenca === 'NÃO' || valorPresenca === '0' || valorPresenca === 'N') {
            presenca = 'F'
          }
        }

        if (!escolaNome || !alunoNome) {
          throw new Error('Linha sem escola ou aluno')
        }

        // Buscar escola do cache
        const escolaNomeNorm = escolaNome.toUpperCase().trim()
        const escolaId = cacheEscolas.get(escolaNomeNorm)

        if (!escolaId) {
          throw new Error(`Escola não encontrada: "${escolaNome}"`)
        }

        // Buscar turma do cache
        let turmaId: string | null = null
        if (turmaCodigo) {
          const turmaKey = `${turmaCodigo}_${escolaId}`
          turmaId = cacheTurmas.get(turmaKey) || null
        }

        // Buscar aluno do cache
        const alunoNomeNorm = alunoNome.toUpperCase().trim()
        const alunoCacheKey = `${alunoNomeNorm}_${escolaId}`
        const alunoId = cacheAlunos.get(alunoCacheKey) || null

        // Verificar se ha dados de resultados
        let temResultados = false
        for (const { inicio, fim } of questoesMap) {
          for (let num = inicio; num <= fim; num++) {
            const colunaQuestao = `Q${num}`
            const valorQuestao = linha[colunaQuestao]
            if (valorQuestao !== undefined && valorQuestao !== null && valorQuestao !== '') {
              temResultados = true
              break
            }
          }
          if (temResultados) break
        }

        // Determinar presenca final
        let presencaFinal: string
        if (presenca === null && !temResultados) {
          presencaFinal = '-'
        } else if (presenca === null) {
          presencaFinal = 'P'
        } else {
          presencaFinal = presenca
        }

        const alunoFaltou = presencaFinal === 'F'
        const semDados = presencaFinal === '-'

        // Processar cada questao e adicionar ao batch
        for (const { inicio, fim, area, disciplina } of questoesMap) {
          for (let num = inicio; num <= fim; num++) {
            const colunaQuestao = `Q${num}`
            const valorQuestao = linha[colunaQuestao]

            if (valorQuestao === undefined || valorQuestao === null || valorQuestao === '') {
              continue
            }

            const acertou = valorQuestao === '1' || valorQuestao === 1 || valorQuestao === 'X' || valorQuestao === 'x'
            const nota = acertou ? 1 : 0

            const questaoCodigo = `Q${num}`
            const questaoId = cacheQuestoes.get(questaoCodigo) || null

            // Adicionar ao batch
            batchValues.push([
              escolaId,
              alunoId || null,
              alunoId ? null : `ALU${(i + 1).toString().padStart(4, '0')}`,
              alunoNome,
              turmaId,
              questaoId,
              questaoCodigo,
              (alunoFaltou || semDados) ? null : (acertou ? '1' : '0'),
              (alunoFaltou || semDados) ? false : acertou,
              (alunoFaltou || semDados) ? 0 : nota,
              anoLetivo,
              serie || null,
              turmaCodigo || null,
              disciplina,
              area,
              presencaFinal,
            ])

            // Executar batch quando atingir o tamanho maximo
            if (batchValues.length >= BATCH_SIZE) {
              await executarBatch()
            }
          }
        }

        linhasProcessadas++
      } catch (error: any) {
        linhasComErro++
        const mensagemErro = error.message || 'Erro desconhecido'
        erros.push(`Linha ${i + 2}: ${mensagemErro}`)
        if (erros.length >= 100) {
          erros.push(`... e mais ${dados.length - i - 1} erros`)
          break
        }
      }
    }

    // Executar batch restante
    await executarBatch()

    // Atualizar importacao
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

    return NextResponse.json({
      mensagem: 'Resultados importados com sucesso',
      ano_letivo: anoLetivo,
      total_linhas: dados.length,
      linhas_processadas: linhasProcessadas,
      linhas_com_erro: linhasComErro,
      total_questoes_importadas: totalQuestoesImportadas,
      erros: erros.slice(0, 20),
    })
  } catch (error: any) {
    console.error('Erro ao importar resultados:', error)
    return NextResponse.json(
      { mensagem: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
