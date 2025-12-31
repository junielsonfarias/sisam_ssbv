import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import * as XLSX from 'xlsx'
import { gerarCodigoAluno } from '@/lib/gerar-codigo-aluno'

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

    // Criar registro de importação
    const importacaoResult = await pool.query(
      `INSERT INTO importacoes (usuario_id, nome_arquivo, total_linhas, status)
       VALUES ($1, $2, $3, 'processando')
       RETURNING id`,
      [usuario.id, arquivo.name, dados.length]
    )

    const importacaoId = importacaoResult.rows[0].id

    const resultado = {
      polos: { criados: 0, existentes: 0 },
      escolas: { criados: 0, existentes: 0 },
      turmas: { criados: 0, existentes: 0 },
      alunos: { criados: 0, existentes: 0 },
      questoes: { criadas: 0, existentes: 0 },
      resultados: { processados: 0, erros: 0 },
    }

    const erros: string[] = []

    // Maps para cache
    const polosMap = new Map<string, string>() // nome -> id
    const escolasMap = new Map<string, string>() // nome -> id
    const turmasMap = new Map<string, string>() // codigo+escola -> id
    const alunosMap = new Map<string, string>() // nome+escola -> id

    // FASE 1: Criar Polos
    const polosUnicos = new Set<string>()
    dados.forEach((linha: any) => {
      const polo = (linha['POLO'] || linha['Polo'] || linha['polo'] || '').toString().trim()
      if (polo) polosUnicos.add(polo)
    })

    for (const nomePolo of polosUnicos) {
      try {
        const existe = await pool.query(
          'SELECT id FROM polos WHERE UPPER(TRIM(nome)) = UPPER(TRIM($1))',
          [nomePolo]
        )

        if (existe.rows.length > 0) {
          polosMap.set(nomePolo, existe.rows[0].id)
          resultado.polos.existentes++
        } else {
          const poloResult = await pool.query(
            'INSERT INTO polos (nome, codigo) VALUES ($1, $2) RETURNING id',
            [nomePolo, nomePolo.toUpperCase().replace(/\s+/g, '_')]
          )
          polosMap.set(nomePolo, poloResult.rows[0].id)
          resultado.polos.criados++
        }
      } catch (error: any) {
        erros.push(`Polo "${nomePolo}": ${error.message}`)
      }
    }

    // FASE 2: Criar Escolas
    const escolasUnicas = new Map<string, string>() // escola -> polo
    dados.forEach((linha: any) => {
      const polo = (linha['POLO'] || '').toString().trim()
      const escola = (linha['ESCOLA'] || linha['Escola'] || linha['escola'] || '').toString().trim()
      if (escola && polo) escolasUnicas.set(escola, polo)
    })

    // Função para normalizar nome de escola (remover prefixos e variações conhecidas)
    const normalizarNomeEscola = (nome: string): string => {
      let normalizado = nome.toUpperCase().trim()
      
      // Mapeamento de variações conhecidas específicas (após remoção de prefixos)
      const variacoes: Record<string, string> = {
        'MAG. BARATA': 'MAGALHÃES BARATA',
        'MAG BARATA': 'MAGALHÃES BARATA',
        'ANCHIETA': 'PDE JOSÉ DE ANCHIETA',
        'EMANNOEL LOBATO': 'EMMANOEL',
      }
      
      // Verificar se há variação conhecida específica primeiro
      for (const [variacao, nomeCorreto] of Object.entries(variacoes)) {
        if (normalizado === variacao || normalizado.includes(variacao)) {
          return nomeCorreto
        }
      }
      
      // Remover prefixos comuns (EMEIF, EMEF, EMEB, etc.)
      const prefixos = [
        'EMEIF ',
        'EMEF ',
        'EMEB ',
        'EMEI ',
        'EM ',
        'ESCOLA ',
        'COLÉGIO ',
        'INSTITUTO '
      ]
      
      for (const prefixo of prefixos) {
        if (normalizado.startsWith(prefixo)) {
          normalizado = normalizado.substring(prefixo.length).trim()
          break
        }
      }
      
      return normalizado
    }

    for (const [nomeEscola, nomePolo] of escolasUnicas) {
      try {
        const poloId = polosMap.get(nomePolo)
        if (!poloId) {
          erros.push(`Escola "${nomeEscola}": Polo "${nomePolo}" não encontrado`)
          continue
        }

        // Normalizar nome da escola
        const nomeNormalizado = normalizarNomeEscola(nomeEscola)

        // Buscar escola por nome normalizado (case-insensitive)
        const existe = await pool.query(
          'SELECT id, nome FROM escolas WHERE UPPER(TRIM(nome)) = UPPER(TRIM($1))',
          [nomeNormalizado]
        )

        if (existe.rows.length > 0) {
          // Usar o nome correto do banco
          const nomeCorreto = existe.rows[0].nome
          escolasMap.set(nomeEscola, existe.rows[0].id)
          escolasMap.set(nomeNormalizado, existe.rows[0].id)
          resultado.escolas.existentes++
        } else {
          // Criar nova escola com nome normalizado
          const escolaResult = await pool.query(
            'INSERT INTO escolas (nome, codigo, polo_id) VALUES ($1, $2, $3) RETURNING id',
            [
              nomeNormalizado,
              nomeNormalizado.replace(/\s+/g, '_').substring(0, 50),
              poloId
            ]
          )
          escolasMap.set(nomeEscola, escolaResult.rows[0].id)
          escolasMap.set(nomeNormalizado, escolaResult.rows[0].id)
          resultado.escolas.criados++
        }
      } catch (error: any) {
        erros.push(`Escola "${nomeEscola}": ${error.message}`)
      }
    }

    // FASE 3: Criar Questões (Q1 a Q60)
    const questoesMap = new Map<string, string>() // codigo -> id
    const areas = [
      { inicio: 1, fim: 20, area: 'Língua Portuguesa', disciplina: 'Língua Portuguesa' },
      { inicio: 21, fim: 30, area: 'Ciências Humanas', disciplina: 'Ciências Humanas' },
      { inicio: 31, fim: 50, area: 'Matemática', disciplina: 'Matemática' },
      { inicio: 51, fim: 60, area: 'Ciências da Natureza', disciplina: 'Ciências da Natureza' },
    ]

    for (const { inicio, fim, area, disciplina } of areas) {
      for (let num = inicio; num <= fim; num++) {
        const codigo = `Q${num}`
        try {
          const existe = await pool.query(
            'SELECT id FROM questoes WHERE codigo = $1',
            [codigo]
          )

          if (existe.rows.length > 0) {
            questoesMap.set(codigo, existe.rows[0].id)
            resultado.questoes.existentes++
          } else {
            const questaoResult = await pool.query(
              `INSERT INTO questoes (codigo, descricao, disciplina, area_conhecimento)
               VALUES ($1, $2, $3, $4) RETURNING id`,
              [codigo, `Questão ${num}`, disciplina, area]
            )
            questoesMap.set(codigo, questaoResult.rows[0].id)
            resultado.questoes.criadas++
          }
        } catch (error: any) {
          console.error(`Erro ao criar questão ${codigo}:`, error.message)
        }
      }
    }

    // FASE 4: Processar cada linha (criar turmas, alunos e resultados)
    for (let i = 0; i < dados.length; i++) {
      try {
        const linha = dados[i] as any

        // Extrair dados
        let escolaNome = (linha['ESCOLA'] || linha['Escola'] || linha['escola'] || '').toString().trim()
        
        // Normalizar nome da escola antes de buscar
        const nomeNormalizado = normalizarNomeEscola(escolaNome)
        const alunoNome = (linha['ALUNO'] || linha['Aluno'] || linha['aluno'] || '').toString().trim()
        const turmaCodigo = (linha['TURMA'] || linha['Turma'] || linha['turma'] || '').toString().trim()
        const serie = (linha['ANO/SÉRIE'] || linha['ANO/SERIE'] || linha['Série'] || linha['serie'] || linha['Ano'] || '').toString().trim()
        const presenca = (linha['FALTA'] || linha['Falta'] || linha['falta'] || linha['Presença'] || linha['presenca'] || 'P').toString().trim().toUpperCase()

        if (!escolaNome || !alunoNome) {
          throw new Error('Linha sem escola ou aluno')
        }

        // Tentar buscar pelo nome original e pelo nome normalizado
        let escolaId = escolasMap.get(escolaNome) || escolasMap.get(nomeNormalizado)
        if (!escolaId) {
          throw new Error(`Escola não encontrada: "${escolaNome}" (normalizado: "${nomeNormalizado}")`)
        }

        // Criar/Buscar Turma
        let turmaId: string | null = null
        if (turmaCodigo) {
          const turmaKey = `${turmaCodigo}_${escolaId}`
          turmaId = turmasMap.get(turmaKey) || null

          if (!turmaId) {
            const existe = await pool.query(
              'SELECT id FROM turmas WHERE escola_id = $1 AND codigo = $2 AND ano_letivo = $3',
              [escolaId, turmaCodigo, anoLetivo]
            )

            if (existe.rows.length > 0) {
              turmaId = existe.rows[0].id
              if (turmaId) {
                turmasMap.set(turmaKey, turmaId)
              }
              resultado.turmas.existentes++
            } else {
              const turmaResult = await pool.query(
                'INSERT INTO turmas (codigo, nome, escola_id, serie, ano_letivo) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                [turmaCodigo, turmaCodigo, escolaId, serie || null, anoLetivo]
              )
              turmaId = turmaResult.rows[0].id
              if (turmaId) {
                turmasMap.set(turmaKey, turmaId)
              }
              resultado.turmas.criados++
            }
          }
        }

        // Criar/Buscar Aluno
        const alunoKey = `${alunoNome}_${escolaId}`
        let alunoId = alunosMap.get(alunoKey) || null

        if (!alunoId) {
          const existe = await pool.query(
            'SELECT id FROM alunos WHERE UPPER(TRIM(nome)) = UPPER(TRIM($1)) AND escola_id = $2 AND ano_letivo = $3',
            [alunoNome, escolaId, anoLetivo]
          )

          if (existe.rows.length > 0) {
            alunoId = existe.rows[0].id
            if (alunoId) {
              alunosMap.set(alunoKey, alunoId)
            }
            resultado.alunos.existentes++
          } else {
            // Gerar código único para o aluno
            const codigoAluno = await gerarCodigoAluno()
            const alunoResult = await pool.query(
              'INSERT INTO alunos (codigo, nome, escola_id, turma_id, serie, ano_letivo) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
              [codigoAluno, alunoNome, escolaId, turmaId, serie || null, anoLetivo]
            )
            alunoId = alunoResult.rows[0].id
            if (alunoId) {
              alunosMap.set(alunoKey, alunoId)
            }
            resultado.alunos.criados++
          }
        }

        // Extrair notas e totais de acertos
        const extrairNumero = (valor: any): number => {
          if (!valor) return 0
          const num = parseInt(valor.toString().replace(/[^\d]/g, ''))
          return isNaN(num) ? 0 : num
        }

        const extrairDecimal = (valor: any): number | null => {
          if (!valor || valor === '' || valor === null || valor === undefined) return null
          const str = valor.toString().replace(',', '.').trim()
          const num = parseFloat(str)
          return isNaN(num) ? null : num
        }

        const totalAcertosLP = extrairNumero(linha['Total Acertos LP'] || linha['Total AcertosLP'])
        const totalAcertosCH = extrairNumero(linha['Total Acertos CH'] || linha['Total AcertosCH'])
        const totalAcertosMAT = extrairNumero(linha['Total Acertos MAT'] || linha['Total AcertosMAT'])
        const totalAcertosCN = extrairNumero(linha['Total Acertos  CN'] || linha['Total Acertos CN'] || linha['Total AcertosCN'])
        
        const notaLP = extrairDecimal(linha['NOTA-LP'] || linha['NOTA_LP'] || linha['Nota-LP'])
        const notaCH = extrairDecimal(linha['NOTA-CH'] || linha['NOTA_CH'] || linha['Nota-CH'])
        const notaMAT = extrairDecimal(linha['NOTA-MAT'] || linha['NOTA_MAT'] || linha['Nota-MAT'])
        const notaCN = extrairDecimal(linha['NOTA-CN'] || linha['NOTA_CN'] || linha['Nota-CN'])
        const mediaAluno = extrairDecimal(linha['MED_ALUNO'] || linha['MED ALUNO'] || linha['Media'] || linha['Média'])

        // Criar/Atualizar resultado consolidado
        await pool.query(
          `INSERT INTO resultados_consolidados 
           (aluno_id, escola_id, turma_id, ano_letivo, serie, presenca,
            total_acertos_lp, total_acertos_ch, total_acertos_mat, total_acertos_cn,
            nota_lp, nota_ch, nota_mat, nota_cn, media_aluno)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
           ON CONFLICT (aluno_id, ano_letivo) 
           DO UPDATE SET
             escola_id = EXCLUDED.escola_id,
             turma_id = EXCLUDED.turma_id,
             serie = EXCLUDED.serie,
             presenca = EXCLUDED.presenca,
             total_acertos_lp = EXCLUDED.total_acertos_lp,
             total_acertos_ch = EXCLUDED.total_acertos_ch,
             total_acertos_mat = EXCLUDED.total_acertos_mat,
             total_acertos_cn = EXCLUDED.total_acertos_cn,
             nota_lp = EXCLUDED.nota_lp,
             nota_ch = EXCLUDED.nota_ch,
             nota_mat = EXCLUDED.nota_mat,
             nota_cn = EXCLUDED.nota_cn,
             media_aluno = EXCLUDED.media_aluno,
             atualizado_em = CURRENT_TIMESTAMP`,
          [
            alunoId,
            escolaId,
            turmaId,
            anoLetivo,
            serie || null,
            presenca || 'P',
            totalAcertosLP,
            totalAcertosCH,
            totalAcertosMAT,
            totalAcertosCN,
            notaLP,
            notaCH,
            notaMAT,
            notaCN,
            mediaAluno,
          ]
        )

        // Processar questões (Q1 a Q60)
        for (const { inicio, fim, area, disciplina } of areas) {
          for (let num = inicio; num <= fim; num++) {
            const colunaQuestao = `Q${num}`
            const valorQuestao = linha[colunaQuestao]

            if (valorQuestao === undefined || valorQuestao === null || valorQuestao === '') {
              continue
            }

            const acertou = valorQuestao === '1' || valorQuestao === 1 || valorQuestao === 'X' || valorQuestao === 'x'
            const nota = acertou ? 1 : 0
            const questaoCodigo = `Q${num}`
            const questaoId = questoesMap.get(questaoCodigo) || null

            // Inserir resultado
            await pool.query(
              `INSERT INTO resultados_provas 
               (escola_id, aluno_id, aluno_codigo, aluno_nome, turma_id, questao_id, questao_codigo, 
                resposta_aluno, acertou, nota, ano_letivo, serie, turma, disciplina, area_conhecimento, presenca)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
              [
                escolaId,
                alunoId,
                null, // aluno_codigo (já está no aluno)
                alunoNome,
                turmaId,
                questaoId,
                questaoCodigo,
                acertou ? '1' : '0',
                acertou,
                nota,
                anoLetivo,
                serie || null,
                turmaCodigo || null,
                disciplina,
                area,
                presenca || 'P',
              ]
            )
          }
        }

        resultado.resultados.processados++
      } catch (error: any) {
        resultado.resultados.erros++
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
        resultado.resultados.processados,
        resultado.resultados.erros,
        resultado.resultados.erros === dados.length ? 'erro' : 'concluido',
        erros.length > 0 ? erros.slice(0, 50).join('\n') : null,
        importacaoId,
      ]
    )

    return NextResponse.json({
      mensagem: 'Importação completa realizada com sucesso',
      ano_letivo: anoLetivo,
      resultado: {
        polos: {
          total: polosUnicos.size,
          criados: resultado.polos.criados,
          existentes: resultado.polos.existentes,
        },
        escolas: {
          total: escolasUnicas.size,
          criados: resultado.escolas.criados,
          existentes: resultado.escolas.existentes,
        },
        turmas: {
          criados: resultado.turmas.criados,
          existentes: resultado.turmas.existentes,
        },
        alunos: {
          criados: resultado.alunos.criados,
          existentes: resultado.alunos.existentes,
        },
        questoes: {
          criadas: resultado.questoes.criadas,
          existentes: resultado.questoes.existentes,
        },
        resultados: {
          total_linhas: dados.length,
          processados: resultado.resultados.processados,
          erros: resultado.resultados.erros,
          total_questoes: resultado.resultados.processados * 60,
        },
      },
      erros: erros.slice(0, 20),
    })
  } catch (error: any) {
    console.error('Erro ao importar:', error)
    return NextResponse.json(
      { mensagem: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

