import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic';
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

    // Mapear questões para áreas
    const questoesMap = [
      { inicio: 1, fim: 20, area: 'Língua Portuguesa', disciplina: 'Língua Portuguesa' },
      { inicio: 21, fim: 30, area: 'Ciências Humanas', disciplina: 'Ciências Humanas' },
      { inicio: 31, fim: 50, area: 'Matemática', disciplina: 'Matemática' },
      { inicio: 51, fim: 60, area: 'Ciências da Natureza', disciplina: 'Ciências da Natureza' },
    ]

    // Criar registro de importação
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

    // Cache para evitar consultas repetidas
    const cacheEscolas = new Map<string, string>() // nome -> id
    const cacheAlunos = new Map<string, string>() // nome+escola -> id
    const cacheTurmas = new Map<string, string>() // codigo+escola -> id

    // Processar cada linha (cada linha = um aluno)
    for (let i = 0; i < dados.length; i++) {
      try {
        const linha = dados[i] as any

        // Extrair dados básicos
        const escolaNome = (linha['ESCOLA'] || linha['Escola'] || linha['escola'] || '').toString().trim()
        const alunoNome = (linha['ALUNO'] || linha['Aluno'] || linha['aluno'] || '').toString().trim()
        const turmaCodigo = (linha['TURMA'] || linha['Turma'] || linha['turma'] || '').toString().trim()
        const serie = (linha['ANO/SÉRIE'] || linha['ANO/SERIE'] || linha['Série'] || linha['serie'] || linha['Ano'] || '').toString().trim()
        
        // Tratamento da presença/falta (mesma lógica do importar-completo)
        // Se não houver coluna de frequência, usar "-" (não deve ser contado nas médias)
        let presenca: string | null = null // null indica que não há dados de frequência
        
        // Verificar se existe coluna FALTA (indica falta)
        const colunaFalta = linha['FALTA'] || linha['Falta'] || linha['falta']
        const colunaPresenca = linha['PRESENÇA'] || linha['Presença'] || linha['presenca']
        
        // Verificar se existe alguma coluna de frequência com valor
        const temColunaFalta = colunaFalta !== undefined && colunaFalta !== null && colunaFalta !== ''
        const temColunaPresenca = colunaPresenca !== undefined && colunaPresenca !== null && colunaPresenca !== ''
        
        if (temColunaFalta) {
          // Se existe coluna FALTA e tem valor, verificar o valor
          const valorFalta = colunaFalta.toString().trim().toUpperCase()
          if (valorFalta === 'F' || valorFalta === 'X' || valorFalta === 'FALTOU' || valorFalta === 'AUSENTE' || valorFalta === 'SIM' || valorFalta === '1' || valorFalta === 'S') {
            presenca = 'F'
          } else if (valorFalta === 'P' || valorFalta === 'PRESENTE' || valorFalta === 'NAO' || valorFalta === 'NÃO' || valorFalta === '0' || valorFalta === 'N') {
            presenca = 'P'
          } else {
            presenca = 'F'
          }
        } else if (temColunaPresenca) {
          // Se existe coluna PRESENÇA, verificar o valor
          const valorPresenca = colunaPresenca.toString().trim().toUpperCase()
          if (valorPresenca === 'P' || valorPresenca === 'PRESENTE' || valorPresenca === 'SIM' || valorPresenca === '1' || valorPresenca === 'S') {
            presenca = 'P'
          } else if (valorPresenca === 'F' || valorPresenca === 'FALTOU' || valorPresenca === 'AUSENTE' || valorPresenca === 'NAO' || valorPresenca === 'NÃO' || valorPresenca === '0' || valorPresenca === 'N') {
            presenca = 'F'
          }
        }
        // Se não houver coluna de frequência (nem FALTA nem PRESENÇA), presenca permanece null (será tratado como "-")

        if (!escolaNome || !alunoNome) {
          throw new Error('Linha sem escola ou aluno')
        }

        // Buscar escola (com cache)
        let escolaId = cacheEscolas.get(escolaNome)
        if (!escolaId) {
          const escolaResult = await pool.query(
            'SELECT id FROM escolas WHERE UPPER(TRIM(nome)) = UPPER(TRIM($1)) AND ativo = true LIMIT 1',
            [escolaNome]
          )

          if (escolaResult.rows.length === 0) {
            throw new Error(`Escola não encontrada: "${escolaNome}"`)
          }

          escolaId = escolaResult.rows[0].id
          if (escolaId) {
            cacheEscolas.set(escolaNome, escolaId)
          }
        }

        // Buscar turma (com cache)
        let turmaId: string | null = null
        if (turmaCodigo) {
          const cacheKey = `${turmaCodigo}_${escolaId}`
          turmaId = cacheTurmas.get(cacheKey) || null

          if (!turmaId) {
            const turmaResult = await pool.query(
              'SELECT id FROM turmas WHERE codigo = $1 AND escola_id = $2 AND ano_letivo = $3 LIMIT 1',
              [turmaCodigo, escolaId, anoLetivo]
            )
            if (turmaResult.rows.length > 0) {
              turmaId = turmaResult.rows[0].id
              if (turmaId) {
                cacheTurmas.set(cacheKey, turmaId)
              }
            }
          }
        }

        // Buscar aluno (com cache)
        const alunoCacheKey = `${alunoNome}_${escolaId}`
        let alunoId = cacheAlunos.get(alunoCacheKey)

        if (!alunoId) {
          const alunoResult = await pool.query(
            'SELECT id FROM alunos WHERE UPPER(TRIM(nome)) = UPPER(TRIM($1)) AND escola_id = $2 AND ano_letivo = $3 LIMIT 1',
            [alunoNome, escolaId, anoLetivo]
          )

          if (alunoResult.rows.length > 0) {
            alunoId = alunoResult.rows[0].id
            if (alunoId) {
              cacheAlunos.set(alunoCacheKey, alunoId)
            }
          }
        }

        // Verificar se há dados de resultados (questões respondidas)
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
        
        // Determinar presença final
        // Se não houver dados de frequência E não houver resultados, usar "-" (não deve ser contado)
        let presencaFinal: string
        if (presenca === null && !temResultados) {
          // Não há frequência nem resultados - usar "-"
          presencaFinal = '-'
        } else if (presenca === null) {
          // Não há frequência, mas há resultados - assumir presente para não perder os dados
          presencaFinal = 'P'
        } else {
          // Há dados de frequência - usar o valor
          presencaFinal = presenca
        }
        
        const alunoFaltou = presencaFinal === 'F'
        const semDados = presencaFinal === '-'
        
        // Processar cada questão (Q1 a Q60)
        for (const { inicio, fim, area, disciplina } of questoesMap) {
          for (let num = inicio; num <= fim; num++) {
            const colunaQuestao = `Q${num}`
            const valorQuestao = linha[colunaQuestao]

            if (valorQuestao === undefined || valorQuestao === null || valorQuestao === '') {
              continue // Pular se não houver valor
            }

            // Converter para boolean (1 = acertou, 0 = errou)
            const acertou = valorQuestao === '1' || valorQuestao === 1 || valorQuestao === 'X' || valorQuestao === 'x'
            const nota = acertou ? 1 : 0

            // Buscar questão
            const questaoCodigo = `Q${num}`
            const questaoResult = await pool.query(
              'SELECT id FROM questoes WHERE codigo = $1 LIMIT 1',
              [questaoCodigo]
            )

            const questaoId = questaoResult.rows.length > 0 ? questaoResult.rows[0].id : null

            // Inserir resultado
            await pool.query(
              `INSERT INTO resultados_provas 
               (escola_id, aluno_id, aluno_codigo, aluno_nome, turma_id, questao_id, questao_codigo, 
                resposta_aluno, acertou, nota, ano_letivo, serie, turma, disciplina, area_conhecimento, presenca)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
               ON CONFLICT (aluno_id, questao_codigo, ano_letivo) 
               DO UPDATE SET
                 resposta_aluno = EXCLUDED.resposta_aluno,
                 acertou = EXCLUDED.acertou,
                 nota = EXCLUDED.nota,
                 presenca = EXCLUDED.presenca,
                 atualizado_em = CURRENT_TIMESTAMP`,
              [
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
              ]
            )
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

    return NextResponse.json({
      mensagem: 'Resultados importados com sucesso',
      ano_letivo: anoLetivo,
      total_linhas: dados.length,
      linhas_processadas: linhasProcessadas,
      linhas_com_erro: linhasComErro,
      total_questoes_importadas: linhasProcessadas * 60, // Cada aluno tem 60 questões
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
