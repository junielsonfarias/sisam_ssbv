import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import * as XLSX from 'xlsx'
import { limparTodosOsCaches } from '@/lib/cache'

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

    // Detectar colunas
    const primeiraLinha = dados[0] as any
    const colunasDisponiveis = Object.keys(primeiraLinha)

    const encontrarColuna = (nomesPossiveis: string[]): string | null => {
      for (const nome of nomesPossiveis) {
        const encontrada = colunasDisponiveis.find(
          col => col.toLowerCase().trim() === nome.toLowerCase().trim()
        )
        if (encontrada) return encontrada
      }
      return null
    }

    const colPolo = encontrarColuna(['POLO', 'polo', 'Polo'])
    const colEscola = encontrarColuna(['ESCOLA', 'escola', 'Escola'])
    const colTurma = encontrarColuna(['TURMA', 'turma', 'Turma'])
    const colSerie = encontrarColuna(['ANO/SÉRIE', 'ANO/SERIE', 'Série', 'serie', 'Ano'])
    const colAluno = encontrarColuna(['ALUNO', 'aluno', 'Aluno'])

    if (!colPolo || !colEscola) {
      return NextResponse.json(
        { 
          mensagem: 'Colunas POLO e ESCOLA são obrigatórias',
          colunasDisponiveis 
        },
        { status: 400 }
      )
    }

    const resultado = {
      polos: { criados: 0, existentes: 0, erros: [] as string[] },
      escolas: { criados: 0, existentes: 0, erros: [] as string[] },
      turmas: { criados: 0, existentes: 0, erros: [] as string[] },
      alunos: { criados: 0, existentes: 0, erros: [] as string[] },
    }

    // Extrair valores únicos
    const polosUnicos = new Set<string>()
    const escolasUnicas = new Map<string, string>() // escola -> polo
    const turmasUnicas = new Map<string, { escola: string, serie: string }>() // turma -> {escola, serie}
    const alunosUnicos = new Map<string, { escola: string, turma: string, serie: string }>() // aluno -> {escola, turma, serie}

    dados.forEach((linha: any) => {
      const polo = (linha[colPolo] || '').toString().trim()
      const escola = (linha[colEscola] || '').toString().trim()
      const turma = colTurma ? (linha[colTurma] || '').toString().trim() : null
      const serie = colSerie ? (linha[colSerie] || '').toString().trim() : null
      const aluno = colAluno ? (linha[colAluno] || '').toString().trim() : null

      if (polo) polosUnicos.add(polo)
      if (escola && polo) escolasUnicas.set(escola, polo)
      if (turma && escola) {
        turmasUnicas.set(turma, { escola, serie: serie || '' })
      }
      if (aluno && escola) {
        alunosUnicos.set(aluno, { escola, turma: turma || '', serie: serie || '' })
      }
    })

    // Criar Polos
    for (const nomePolo of polosUnicos) {
      try {
        const existe = await pool.query(
          'SELECT id FROM polos WHERE UPPER(TRIM(nome)) = UPPER(TRIM($1))',
          [nomePolo]
        )

        if (existe.rows.length > 0) {
          resultado.polos.existentes++
        } else {
          await pool.query(
            'INSERT INTO polos (nome, codigo) VALUES ($1, $2)',
            [nomePolo, nomePolo.toUpperCase().replace(/\s+/g, '_')]
          )
          resultado.polos.criados++
        }
      } catch (error: any) {
        resultado.polos.erros.push(`Polo "${nomePolo}": ${error.message}`)
      }
    }

    // Criar Escolas
    const escolasMap = new Map<string, string>() // nome escola -> id
    for (const [nomeEscola, nomePolo] of escolasUnicas) {
      try {
        const poloResult = await pool.query(
          'SELECT id FROM polos WHERE UPPER(TRIM(nome)) = UPPER(TRIM($1))',
          [nomePolo]
        )

        if (poloResult.rows.length === 0) {
          resultado.escolas.erros.push(`Escola "${nomeEscola}": Polo "${nomePolo}" não encontrado`)
          continue
        }

        const poloId = poloResult.rows[0].id

        // Normalizar nome da escola para comparação (remove pontos, espaços extras)
        const nomeEscolaNormalizado = nomeEscola
          .toUpperCase()
          .trim()
          .replace(/\./g, '')
          .replace(/\s+/g, ' ')

        // Buscar escola existente usando normalização
        const existe = await pool.query(
          `SELECT id FROM escolas 
           WHERE UPPER(TRIM(REGEXP_REPLACE(REGEXP_REPLACE(nome, '\\.', '', 'g'), '\\s+', ' ', 'g'))) = $1 
           AND ativo = true 
           LIMIT 1`,
          [nomeEscolaNormalizado]
        )

        if (existe.rows.length > 0) {
          escolasMap.set(nomeEscola, existe.rows[0].id)
          resultado.escolas.existentes++
        } else {
          const codigoEscola = nomeEscolaNormalizado.replace(/\s+/g, '_').substring(0, 50)
          const escolaResult = await pool.query(
            'INSERT INTO escolas (nome, codigo, polo_id) VALUES ($1, $2, $3) RETURNING id',
            [
              nomeEscola.trim(),
              codigoEscola,
              poloId
            ]
          )
          escolasMap.set(nomeEscola, escolaResult.rows[0].id)
          resultado.escolas.criados++
        }
      } catch (error: any) {
        resultado.escolas.erros.push(`Escola "${nomeEscola}": ${error.message}`)
      }
    }

    // Criar Turmas
    const turmasMap = new Map<string, string>() // codigo turma -> id
    for (const [codigoTurma, { escola, serie }] of turmasUnicas) {
      try {
        const escolaId = escolasMap.get(escola)
        if (!escolaId) {
          resultado.turmas.erros.push(`Turma "${codigoTurma}": Escola "${escola}" não encontrada`)
          continue
        }

        const existe = await pool.query(
          'SELECT id FROM turmas WHERE escola_id = $1 AND codigo = $2 AND ano_letivo = $3',
          [escolaId, codigoTurma, anoLetivo]
        )

        if (existe.rows.length > 0) {
          turmasMap.set(codigoTurma, existe.rows[0].id)
          resultado.turmas.existentes++
        } else {
          const turmaResult = await pool.query(
            'INSERT INTO turmas (codigo, nome, escola_id, serie, ano_letivo) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [codigoTurma, codigoTurma, escolaId, serie || null, anoLetivo]
          )
          turmasMap.set(codigoTurma, turmaResult.rows[0].id)
          resultado.turmas.criados++
        }
      } catch (error: any) {
        resultado.turmas.erros.push(`Turma "${codigoTurma}": ${error.message}`)
      }
    }

    // Criar Alunos
    for (const [nomeAluno, { escola, turma, serie }] of alunosUnicos) {
      try {
        const escolaId = escolasMap.get(escola)
        if (!escolaId) {
          resultado.alunos.erros.push(`Aluno "${nomeAluno}": Escola "${escola}" não encontrada`)
          continue
        }

        const turmaId = turma ? turmasMap.get(turma) : null

        const existe = await pool.query(
          `SELECT id FROM alunos 
           WHERE UPPER(TRIM(nome)) = UPPER(TRIM($1)) 
           AND escola_id = $2 
           AND (turma_id = $3 OR (turma_id IS NULL AND $3::uuid IS NULL))
           AND (ano_letivo = $4 OR (ano_letivo IS NULL AND $4 IS NULL))
           AND ativo = true
           LIMIT 1`,
          [nomeAluno, escolaId, turmaId, anoLetivo]
        )

        if (existe.rows.length > 0) {
          // Aluno já existe - atualizar turma e série se necessário
          const alunoIdExistente = existe.rows[0].id
          await pool.query(
            `UPDATE alunos 
             SET turma_id = $1, serie = $2, atualizado_em = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [turmaId, serie || null, alunoIdExistente]
          )
          resultado.alunos.existentes++
        } else {
          // Gerar código único para o aluno
          const { gerarCodigoAluno } = await import('@/lib/gerar-codigo-aluno')
          const codigoAluno = await gerarCodigoAluno()
          await pool.query(
            'INSERT INTO alunos (codigo, nome, escola_id, turma_id, serie, ano_letivo) VALUES ($1, $2, $3, $4, $5, $6)',
            [codigoAluno, nomeAluno, escolaId, turmaId, serie || null, anoLetivo]
          )
          resultado.alunos.criados++
        }
      } catch (error: any) {
        resultado.alunos.erros.push(`Aluno "${nomeAluno}": ${error.message}`)
      }
    }

    // Criar Questões (Q1 a Q60)
    const questoesCriadas = { criadas: 0, existentes: 0 }
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
            questoesCriadas.existentes++
          } else {
            await pool.query(
              `INSERT INTO questoes (codigo, descricao, disciplina, area_conhecimento)
               VALUES ($1, $2, $3, $4)`,
              [codigo, `Questão ${num}`, disciplina, area]
            )
            questoesCriadas.criadas++
          }
        } catch (error: any) {
          console.error(`Erro ao criar questão ${codigo}:`, error.message)
        }
      }
    }

    // Invalidar cache do dashboard após importação bem-sucedida
    try {
      limparTodosOsCaches()
      console.log('[Importação] Cache do dashboard invalidado após importação')
    } catch (cacheError) {
      console.error('[Importação] Erro ao invalidar cache (não crítico):', cacheError)
    }

    return NextResponse.json({
      mensagem: 'Cadastros importados com sucesso',
      ano_letivo: anoLetivo,
      resultado: {
        ...resultado,
        questoes: questoesCriadas,
      },
      resumo: {
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
          total: turmasUnicas.size,
          criados: resultado.turmas.criados,
          existentes: resultado.turmas.existentes,
        },
        alunos: {
          total: alunosUnicos.size,
          criados: resultado.alunos.criados,
          existentes: resultado.alunos.existentes,
        },
        questoes: {
          criadas: questoesCriadas.criadas,
          existentes: questoesCriadas.existentes,
        },
      },
      cache_invalidado: true,
    })
  } catch (error: any) {
    console.error('Erro ao importar cadastros:', error)
    return NextResponse.json(
      { mensagem: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
