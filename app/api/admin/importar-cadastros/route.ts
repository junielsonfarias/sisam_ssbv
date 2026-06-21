import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { withTransaction } from '@/lib/database/with-transaction'
import { withSavepoint } from '@/lib/database/with-savepoint'
import { criarGeradorCodigoAlunoTx } from '@/lib/gerar-codigo-aluno'
import { lerPlanilha } from '@/lib/excel-reader'
import { limparTodosOsCaches, invalidateDashboardCache, invalidateFiltrosCache, cacheDelPattern } from '@/lib/cache'
import { validarArquivoUpload } from '@/lib/api-helpers'
import { createLogger } from '@/lib/logger'
import {
  ORIGEM_GESTOR,
  chaveAluno,
  codigoEscola,
  codigoPolo,
  normalizarNomeEscola,
  normalizarNomePolo,
  resolverAnoLetivoId,
} from '@/lib/services/gestor/mestre.service'

const log = createLogger('ImportarCadastros')

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutos (limite Vercel)

export const POST = withAuth(['administrador', 'tecnico'], async (request: NextRequest, usuario) => {
  try {
    const formData = await request.formData()
    const arquivo = formData.get('arquivo') as File
    const anoLetivo = (formData.get('ano_letivo') as string) || new Date().getFullYear().toString()

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

    const arrayBuffer = await arquivo.arrayBuffer()
    const dados = await lerPlanilha(arrayBuffer)

    if (!dados || dados.length === 0) {
      return NextResponse.json(
        { mensagem: 'Arquivo vazio ou inválido' },
        { status: 400 }
      )
    }

    // Detectar colunas
    const primeiraLinha = dados[0] as Record<string, unknown>
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

    // E2-B: TODA a gravação roda numa única transação. Se o request falhar no
    // meio (timeout, erro, conexão), nada é persistido (antes ficava cadastro
    // parcial: alguns polos/escolas/turmas/alunos sim, outros não).
    const { resultado, questoesCriadas } = await withTransaction(async (client) => {
      const resultado = {
        polos: { criados: 0, existentes: 0, erros: [] as string[] },
        escolas: { criados: 0, existentes: 0, erros: [] as string[] },
        turmas: { criados: 0, existentes: 0, erros: [] as string[] },
        alunos: { criados: 0, existentes: 0, erros: [] as string[] },
      }

      // Pré-carregar polos existentes (elimina N+1)
      const polosExistentes = await client.query('SELECT id, nome, UPPER(TRIM(nome)) as nome_norm FROM polos')
      const polosMap = new Map<string, string>()
      for (const p of polosExistentes.rows) {
        polosMap.set(normalizarNomePolo(p.nome_norm || p.nome), p.id)
      }

      // Criar Polos (com pré-cache)
      for (const nomePolo of polosUnicos) {
        try {
          const nomeNorm = normalizarNomePolo(nomePolo)
          if (polosMap.has(nomeNorm)) {
            resultado.polos.existentes++
          } else {
            const novoResult = await withSavepoint(client, () => client.query(
              "INSERT INTO polos (nome, codigo, origem) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING id",
              [nomePolo, codigoPolo(nomePolo), ORIGEM_GESTOR]
            ))
            if (novoResult.rows.length > 0) {
              polosMap.set(nomeNorm, novoResult.rows[0].id)
            }
            resultado.polos.criados++
          }
        } catch (error: unknown) {
          resultado.polos.erros.push(`Polo "${nomePolo}": Erro ao processar`)
        }
      }

      // Pré-carregar escolas existentes (elimina N+1)
      const escolasExistentes = await client.query('SELECT id, nome, polo_id FROM escolas WHERE ativo = true')
      const escolasMap = new Map<string, string>() // nome escola -> id
      for (const e of escolasExistentes.rows) {
        const nomeNorm = normalizarNomeEscola(e.nome)
        escolasMap.set(nomeNorm, e.id)
      }

      // Criar Escolas (com pré-cache de polos)
      for (const [nomeEscola, nomePolo] of escolasUnicas) {
        try {
          const nomePoloNorm = normalizarNomePolo(nomePolo)
          const poloId = polosMap.get(nomePoloNorm)

          if (!poloId) {
            resultado.escolas.erros.push(`Escola "${nomeEscola}": Polo "${nomePolo}" não encontrado`)
            continue
          }

          const nomeEscolaNormalizado = normalizarNomeEscola(nomeEscola)

          if (escolasMap.has(nomeEscolaNormalizado)) {
            resultado.escolas.existentes++
          } else {
            const escolaResult = await withSavepoint(client, () => client.query(
              "INSERT INTO escolas (nome, codigo, polo_id, origem) VALUES ($1, $2, $3, $4) RETURNING id",
              [nomeEscola.trim(), codigoEscola(nomeEscola), poloId, ORIGEM_GESTOR]
            ))
            escolasMap.set(nomeEscolaNormalizado, escolaResult.rows[0].id)
            // Também mapear pelo nome original
            escolasMap.set(nomeEscola, escolaResult.rows[0].id)
            resultado.escolas.criados++
          }
        } catch (error: unknown) {
          resultado.escolas.erros.push(`Escola "${nomeEscola}": Erro ao processar`)
        }
      }

      // Resolver a chave temporal canonica (anos_letivos.id) uma unica vez por
      // transacao. Grava-se ano_letivo_id junto do varchar ano_letivo nas
      // turmas/alunos para que a chave canonica nao nasca vazia (backfill nao
      // ser efemero). Lookup centralizado em mestre.service (fonte unica).
      const anoLetivoId = await resolverAnoLetivoId(client, anoLetivo)

      // Pré-carregar turmas existentes (elimina N+1)
      const turmasExistentes = await client.query(
        'SELECT id, codigo, escola_id FROM turmas WHERE ano_letivo = $1',
        [anoLetivo]
      )
      const turmasMap = new Map<string, string>() // "escola_id:codigo" -> id
      for (const t of turmasExistentes.rows) {
        turmasMap.set(`${t.escola_id}:${t.codigo}`, t.id)
      }

      // Criar Turmas (com pré-cache)
      for (const [codigoTurma, { escola, serie }] of turmasUnicas) {
        try {
          const nomeEscolaNorm = normalizarNomeEscola(escola)
          const escolaId = escolasMap.get(nomeEscolaNorm) || escolasMap.get(escola)
          if (!escolaId) {
            resultado.turmas.erros.push(`Turma "${codigoTurma}": Escola "${escola}" não encontrada`)
            continue
          }

          const chave = `${escolaId}:${codigoTurma}`
          if (turmasMap.has(chave)) {
            resultado.turmas.existentes++
          } else {
            // origem='gestor' explicito: este endpoint e o cadastro mestre do
            // Gestor. Nao depender do DEFAULT da coluna (rastreabilidade clara
            // vs. registros criados pelo ETL Sisam, que marcam origem='sisam_etl').
            const turmaResult = await withSavepoint(client, () => client.query(
              `INSERT INTO turmas (codigo, nome, escola_id, serie, ano_letivo, ano_letivo_id, origem)
               VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
              [codigoTurma, codigoTurma, escolaId, serie || null, anoLetivo, anoLetivoId, ORIGEM_GESTOR]
            ))
            turmasMap.set(chave, turmaResult.rows[0].id)
            resultado.turmas.criados++
          }
        } catch (error: unknown) {
          resultado.turmas.erros.push(`Turma "${codigoTurma}": erro ao processar`)
        }
      }

      // Pré-carregar alunos existentes (elimina N+1)
      const alunosExistentes = await client.query(
        'SELECT id, UPPER(TRIM(nome)) as nome_upper, escola_id, turma_id FROM alunos WHERE ano_letivo = $1 AND ativo = true',
        [anoLetivo]
      )
      const alunosExistentesMap = new Map<string, string>()
      for (const a of alunosExistentes.rows) {
        alunosExistentesMap.set(`${a.nome_upper}:${a.escola_id}:${a.turma_id || 'null'}`, a.id)
      }

      // Geração de código sequencial DENTRO da transação (vê inserts não
      // commitados; não abre 2ª conexão como gerarCodigoAluno). Lock 42 tomado
      // só na 1ª criação de aluno.
      const proximoCodigoAluno = criarGeradorCodigoAlunoTx(client)

      // Criar Alunos (com pré-cache)
      for (const [nomeAluno, { escola, turma, serie }] of alunosUnicos) {
        try {
          const nomeEscolaNorm = normalizarNomeEscola(escola)
          const escolaId = escolasMap.get(nomeEscolaNorm) || escolasMap.get(escola)
          if (!escolaId) {
            resultado.alunos.erros.push(`Aluno "${nomeAluno}": Escola "${escola}" não encontrada`)
            continue
          }

          const turmaChave = turma ? `${escolaId}:${turma}` : null
          const turmaId = turmaChave ? turmasMap.get(turmaChave) : null
          const alunoChave = chaveAluno(nomeAluno, escolaId, turmaId || null)

          if (alunosExistentesMap.has(alunoChave)) {
            // Aluno já existe - atualizar turma e série se necessário
            const alunoIdExistente = alunosExistentesMap.get(alunoChave)!
            await withSavepoint(client, () => client.query(
              `UPDATE alunos
               SET turma_id = $1, serie = $2, ano_letivo_id = $3, atualizado_em = CURRENT_TIMESTAMP
               WHERE id = $4`,
              [turmaId, serie || null, anoLetivoId, alunoIdExistente]
            ))
            resultado.alunos.existentes++
          } else {
            const codigoAluno = await proximoCodigoAluno()
            // origem='gestor' explicito (cadastro mestre do Gestor). Distingue
            // do ETL Sisam, que cria alunos com origem='sisam_etl'.
            await withSavepoint(client, () => client.query(
              `INSERT INTO alunos (codigo, nome, escola_id, turma_id, serie, ano_letivo, ano_letivo_id, origem)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [codigoAluno, nomeAluno, escolaId, turmaId, serie || null, anoLetivo, anoLetivoId, ORIGEM_GESTOR]
            ))
            resultado.alunos.criados++
          }
        } catch (error: unknown) {
          resultado.alunos.erros.push(`Aluno "${nomeAluno}": erro ao processar`)
        }
      }

      // Criar Questões (Q1 a Q60) — pré-cache + batch INSERT
      const questoesCriadas = { criadas: 0, existentes: 0 }
      const areas = [
        { inicio: 1, fim: 20, area: 'Língua Portuguesa', disciplina: 'Língua Portuguesa' },
        { inicio: 21, fim: 30, area: 'Ciências Humanas', disciplina: 'Ciências Humanas' },
        { inicio: 31, fim: 50, area: 'Matemática', disciplina: 'Matemática' },
        { inicio: 51, fim: 60, area: 'Ciências da Natureza', disciplina: 'Ciências da Natureza' },
      ]

      // Pré-carregar questões existentes (1 query em vez de 60)
      const questoesExistentes = await client.query('SELECT codigo FROM questoes')
      const questoesSet = new Set(questoesExistentes.rows.map((q: any) => q.codigo))

      const questoesParaInserir: [string, string, string, string][] = []
      for (const { inicio, fim, area, disciplina } of areas) {
        for (let num = inicio; num <= fim; num++) {
          const codigo = `Q${num}`
          if (questoesSet.has(codigo)) {
            questoesCriadas.existentes++
          } else {
            questoesParaInserir.push([codigo, `Questão ${num}`, disciplina, area])
          }
        }
      }

      // Batch INSERT de todas as questões novas (1 query em vez de N)
      if (questoesParaInserir.length > 0) {
        try {
          const values = questoesParaInserir.map((_, i) =>
            `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`
          ).join(', ')
          const params = questoesParaInserir.flat()
          await withSavepoint(client, () => client.query(
            `INSERT INTO questoes (codigo, descricao, disciplina, area_conhecimento) VALUES ${values} ON CONFLICT (codigo) DO NOTHING`,
            params
          ))
          questoesCriadas.criadas = questoesParaInserir.length
        } catch (error: unknown) {
          log.error('Erro ao criar questões em batch', error)
        }
      }

      return { resultado, questoesCriadas }
    })

    // Invalidar cache após importação. limparTodosOsCaches() só limpa o cache
    // de ARQUIVO; dashboards leem do memoryCache (Map) e do Redis. Como esta
    // rota cria escolas/polos/turmas/alunos, invalida todos esses prefixos.
    try {
      limparTodosOsCaches()
      invalidateDashboardCache()
      invalidateFiltrosCache()
      for (const p of ['dashboard:*', 'stats:*', 'graficos:*', 'alunos:*', 'turmas:*', 'escolas:*', 'polos:*']) {
        try { await cacheDelPattern(p) } catch {}
      }
      log.info('Cache (arquivo + memoria + Redis) invalidado após importação')
    } catch (cacheError) {
      log.error('Erro ao invalidar cache (não crítico)', cacheError)
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
  } catch (error: unknown) {
    log.error('Erro ao importar cadastros', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})
