import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import * as XLSX from 'xlsx'
import { limparTodosOsCaches } from '@/lib/cache'
import {
  calcularNivelPorAcertos,
  converterNivelProducao,
  calcularNivelAluno,
  isAnosIniciais,
  extrairNumeroSerie,
} from '@/lib/config-series'

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

    // Carregar configurações de séries e disciplinas do banco de dados
    const configSeriesResult = await pool.query(`
      SELECT cs.id, cs.serie, cs.tipo_ensino, cs.qtd_itens_producao,
             cs.avalia_lp, cs.avalia_mat, cs.avalia_ch, cs.avalia_cn,
             cs.qtd_questoes_lp, cs.qtd_questoes_mat, cs.qtd_questoes_ch, cs.qtd_questoes_cn
      FROM configuracao_series cs
    `)

    // Carregar disciplinas configuradas por série
    const disciplinasResult = await pool.query(`
      SELECT csd.serie_id, csd.disciplina, csd.sigla, csd.ordem,
             csd.questao_inicio, csd.questao_fim, csd.qtd_questoes, csd.valor_questao
      FROM configuracao_series_disciplinas csd
      WHERE csd.ativo = true
      ORDER BY csd.serie_id, csd.ordem
    `)

    // Função para normalizar série (extrair apenas o número)
    const normalizarSerie = (serie: string): string => {
      if (!serie) return ''
      // Extrair apenas dígitos da série (ex: "5º Ano" -> "5", "2º" -> "2")
      const apenasDigitos = serie.toString().replace(/[^\d]/g, '').trim()
      // Se parece com ano letivo (2000-2100), retornar vazio para forçar inferência
      const numero = parseInt(apenasDigitos, 10)
      if (numero >= 2000 && numero <= 2100) {
        console.warn(`[Importação] Valor "${serie}" parece ano letivo, não série escolar. Ignorando.`)
        return '' // Provavelmente é ano letivo, não série
      }
      return apenasDigitos
    }

    // Função para padronizar série para formato consistente (ex: "5º" -> "5º Ano", "2" -> "2º Ano")
    const padronizarSerie = (serie: string): string => {
      const numero = normalizarSerie(serie)
      if (!numero) return ''
      return `${numero}º Ano`
    }

    // Função para inferir série da turma (ex: "2A", "2º A", "T2A" -> "2")
    const inferirSerieDaTurma = (turma: string): string => {
      if (!turma) return ''
      // Padrões comuns: "2A", "2º A", "T2A", "TURMA 2A", "2-A"
      const match = turma.match(/(\d+)/)?.[1]
      return match || ''
    }

    // Função para detectar série baseada na maior questão respondida
    const detectarSeriePorQuestoes = (linha: any): string => {
      let maiorQuestao = 0
      for (let q = 1; q <= 60; q++) {
        const valor = linha[`Q${q}`]
        if (valor !== undefined && valor !== null && valor !== '') {
          maiorQuestao = q
        }
      }

      // Se maior questão é até Q28, provavelmente é 2º ou 3º ano
      if (maiorQuestao > 0 && maiorQuestao <= 28) {
        return '2' // Assumir 2º ano (mesmo mapeamento que 3º)
      }
      // Se maior questão é até Q34, provavelmente é 5º ano
      if (maiorQuestao > 28 && maiorQuestao <= 34) {
        return '5'
      }
      // Se maior questão é até Q60, provavelmente é anos finais
      if (maiorQuestao > 34) {
        return '8' // Assumir 8º ano (mesmo mapeamento que 9º)
      }
      return ''
    }

    // Criar mapa de configuração por série (usando série normalizada como chave)
    const configSeriesMap = new Map<string, any>()
    for (const config of configSeriesResult.rows) {
      const serieNormalizada = normalizarSerie(config.serie)
      const disciplinasDaSerie = disciplinasResult.rows.filter(d => d.serie_id === config.id)

      // Log para debug
      console.log(`[Config] Série ${config.serie} (normalizada: ${serieNormalizada}) - ${disciplinasDaSerie.length} disciplinas`)
      disciplinasDaSerie.forEach(d => {
        console.log(`  - ${d.sigla}: Q${d.questao_inicio}-Q${d.questao_fim}`)
      })

      configSeriesMap.set(serieNormalizada, {
        ...config,
        disciplinas: disciplinasDaSerie
      })
    }

    // Função para obter mapeamento de questões baseado na série
    // Usa a nova tabela configuracao_series_disciplinas que define a ordem exata
    const obterQuestoesMap = (serie: string) => {
      const serieNormalizada = normalizarSerie(serie)
      const config = configSeriesMap.get(serieNormalizada)

      console.log(`[Importação] Buscando config para série "${serie}" (normalizada: "${serieNormalizada}")`)

      // Se não encontrou, tentar extrair apenas números
      let configFinal = config
      if (!configFinal) {
        const serieNum = serie.replace(/[^\d]/g, '')
        console.log(`[Importação] Tentando fallback com número: "${serieNum}"`)
        configFinal = configSeriesMap.get(serieNum)
      }

      // Se ainda não encontrou, usar fallback INTELIGENTE baseado na série
      if (!configFinal || !configFinal.disciplinas || configFinal.disciplinas.length === 0) {
        const serieNum = parseInt(serie.replace(/[^\d]/g, '') || '0')

        // Anos iniciais: 2º e 3º ano (LP: Q1-Q14, MAT: Q15-Q28)
        if (serieNum === 2 || serieNum === 3) {
          console.warn(`[Importação] AVISO: Sem config para série "${serie}", usando padrão ANOS INICIAIS (2º/3º)`)
          return [
            { inicio: 1, fim: 14, area: 'Língua Portuguesa', disciplina: 'Língua Portuguesa', sigla: 'LP', valor_questao: 0.714 },
            { inicio: 15, fim: 28, area: 'Matemática', disciplina: 'Matemática', sigla: 'MAT', valor_questao: 0.714 },
          ]
        }

        // 5º ano (LP: Q1-Q14, MAT: Q15-Q34)
        if (serieNum === 5) {
          console.warn(`[Importação] AVISO: Sem config para série "${serie}", usando padrão ANOS INICIAIS (5º)`)
          return [
            { inicio: 1, fim: 14, area: 'Língua Portuguesa', disciplina: 'Língua Portuguesa', sigla: 'LP', valor_questao: 0.714 },
            { inicio: 15, fim: 34, area: 'Matemática', disciplina: 'Matemática', sigla: 'MAT', valor_questao: 0.5 },
          ]
        }

        // Anos finais: 6º ao 9º (LP, CH, MAT, CN)
        console.warn(`[Importação] AVISO: Sem config para série "${serie}", usando padrão ANOS FINAIS`)
        return [
          { inicio: 1, fim: 20, area: 'Língua Portuguesa', disciplina: 'Língua Portuguesa', sigla: 'LP', valor_questao: 0.5 },
          { inicio: 21, fim: 30, area: 'Ciências Humanas', disciplina: 'Ciências Humanas', sigla: 'CH', valor_questao: 1.0 },
          { inicio: 31, fim: 50, area: 'Matemática', disciplina: 'Matemática', sigla: 'MAT', valor_questao: 0.5 },
          { inicio: 51, fim: 60, area: 'Ciências da Natureza', disciplina: 'Ciências da Natureza', sigla: 'CN', valor_questao: 1.0 },
        ]
      }

      console.log(`[Importação] Usando config: ${configFinal.disciplinas.map((d: any) => `${d.sigla}:Q${d.questao_inicio}-Q${d.questao_fim}`).join(', ')}`)

      // Usar a configuração de disciplinas da série (já ordenada por ordem)
      return configFinal.disciplinas.map((d: any) => ({
        inicio: d.questao_inicio,
        fim: d.questao_fim,
        area: d.disciplina,
        disciplina: d.disciplina,
        sigla: d.sigla,
        valor_questao: parseFloat(d.valor_questao) || 0.5,
        qtd_questoes: d.qtd_questoes
      }))
    }

    // Função para obter configuração da série
    const obterConfigSerie = (serie: string) => {
      const serieNormalizada = normalizarSerie(serie)
      let config = configSeriesMap.get(serieNormalizada)
      if (!config) {
        const serieNum = serie.replace(/[^\d]/g, '')
        config = configSeriesMap.get(serieNum)
      }
      return config
    }

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
      const params: (string | number | boolean | null | undefined)[] = []
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

        // Ler série com múltiplas variações de nome de coluna
        // IMPORTANTE: NÃO incluir 'Ano', 'ANO', 'ano' pois estas colunas geralmente contêm
        // o ano letivo (2025) e não a série do aluno (2º, 3º, etc.)
        let serieOriginal = (
          linha['ANO/SÉRIE'] || linha['ANO/SERIE'] || linha['Série'] || linha['SÉRIE'] ||
          linha['serie'] || linha['Serie'] ||
          linha['ANO_SERIE'] || linha['Ano_Serie'] || linha['SERIE'] ||
          linha['Grade'] || linha['GRADE'] ||
          ''
        ).toString().trim()

        // Se série está vazia, tentar inferir da turma
        if (!serieOriginal || normalizarSerie(serieOriginal) === '') {
          const serieInferida = inferirSerieDaTurma(turmaCodigo)
          if (serieInferida) {
            console.log(`[Importação] Série inferida da turma "${turmaCodigo}": ${serieInferida}`)
            serieOriginal = serieInferida
          }
        }

        // Se ainda está vazia, tentar detectar pela quantidade de questões
        if (!serieOriginal || normalizarSerie(serieOriginal) === '') {
          const serieDetectada = detectarSeriePorQuestoes(linha)
          if (serieDetectada) {
            console.log(`[Importação] Série detectada por questões (aluno "${alunoNome}"): ${serieDetectada}`)
            serieOriginal = serieDetectada
          }
        }

        // Padronizar série para formato consistente (evita duplicações como "5º" vs "5º Ano")
        const serie = padronizarSerie(serieOriginal)

        // Tratamento da presenca/falta (suporta P/F, FALTA, PRESENÇA)
        let presenca: string | null = null

        const colunaPF = linha['P/F'] || linha['p/f']
        const colunaFalta = linha['FALTA'] || linha['Falta'] || linha['falta']
        const colunaPresenca = linha['PRESENÇA'] || linha['Presença'] || linha['presenca']

        const temColunaPF = colunaPF !== undefined && colunaPF !== null && colunaPF !== ''
        const temColunaFalta = colunaFalta !== undefined && colunaFalta !== null && colunaFalta !== ''
        const temColunaPresenca = colunaPresenca !== undefined && colunaPresenca !== null && colunaPresenca !== ''

        if (temColunaPF) {
          const valorPF = colunaPF.toString().trim().toUpperCase()
          if (valorPF === 'P' || valorPF === 'PRESENTE') {
            presenca = 'P'
          } else if (valorPF === 'F' || valorPF === 'FALTA' || valorPF === 'FALTOU') {
            presenca = 'F'
          }
        } else if (temColunaFalta) {
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

        // Ler itens de produção (Item1-Item8)
        const itensProducao: (number | null)[] = []
        for (let itemNum = 1; itemNum <= 8; itemNum++) {
          // Tentar múltiplas variações do nome da coluna
          const variacoes = [
            `Item${itemNum}`, `ITEM${itemNum}`, `item${itemNum}`,
            `Item ${itemNum}`, `ITEM ${itemNum}`, `item ${itemNum}`,
            `Item_${itemNum}`, `ITEM_${itemNum}`, `item_${itemNum}`,
            `I${itemNum}`, `i${itemNum}`
          ]

          let colunaItem = undefined
          for (const variacao of variacoes) {
            if (linha[variacao] !== undefined) {
              colunaItem = linha[variacao]
              break
            }
          }

          if (colunaItem !== undefined && colunaItem !== null && colunaItem !== '') {
            const valorItem = colunaItem.toString().trim().toUpperCase()
            const valorFinal = valorItem === 'X' || valorItem === '1' ? 1 : 0
            itensProducao.push(valorFinal)
          } else {
            itensProducao.push(null)
          }
        }

        // Ler notas pré-calculadas da planilha
        const notaLPPlanilha = parseFloat(linha['NOTA_LP'] || linha['Nota_LP'] || linha['nota_lp'] || '0') || null
        const notaMATRaw = linha['NOTA_MAT'] || linha['Nota_MAT'] || linha['nota_mat']
        const notaMATPlanilha = notaMATRaw ? parseFloat(notaMATRaw) : null
        const notaProducaoPlanilha = parseFloat(linha['PRODUÇÃO'] || linha['Produção'] || linha['producao'] || linha['PRODUCAO'] || '0') || null
        const nivelProducao = (linha['NÍVEL_PROD'] || linha['Nível_Prod'] || linha['nivel_prod'] || linha['NIVEL_PROD'] || '').toString().trim() || null

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

        // Buscar aluno do cache ou criar se não existir
        const alunoNomeNorm = alunoNome.toUpperCase().trim()
        const alunoCacheKey = `${alunoNomeNorm}_${escolaId}`
        let alunoId = cacheAlunos.get(alunoCacheKey) || null

        // Se o aluno não existe, criar automaticamente
        if (!alunoId) {
          try {
            // Usa ON CONFLICT com índice único em UPPER(TRIM(nome)), escola_id, ano_letivo
            const novoAlunoResult = await pool.query(
              `INSERT INTO alunos (nome, escola_id, turma_id, serie, ano_letivo, ativo)
               VALUES ($1, $2, $3, $4, $5, true)
               ON CONFLICT (UPPER(TRIM(nome)), escola_id, ano_letivo)
               DO UPDATE SET turma_id = COALESCE(EXCLUDED.turma_id, alunos.turma_id),
                             serie = COALESCE(EXCLUDED.serie, alunos.serie),
                             atualizado_em = CURRENT_TIMESTAMP
               RETURNING id`,
              [alunoNome, escolaId, turmaId, serie, anoLetivo]
            )
            alunoId = novoAlunoResult.rows[0].id
            // Adicionar ao cache para evitar criar novamente
            if (alunoId) cacheAlunos.set(alunoCacheKey, alunoId)
            console.log(`[Importação] Aluno criado/atualizado: "${alunoNome}" (ID: ${alunoId})`)
          } catch (createError: any) {
            console.error(`[Importação] Erro ao criar aluno "${alunoNome}":`, createError.message)
            // Tentar buscar o aluno existente como fallback
            try {
              const existenteResult = await pool.query(
                `SELECT id FROM alunos
                 WHERE UPPER(TRIM(nome)) = UPPER(TRIM($1))
                   AND escola_id = $2
                   AND ano_letivo = $3`,
                [alunoNome, escolaId, anoLetivo]
              )
              if (existenteResult.rows.length > 0) {
                alunoId = existenteResult.rows[0].id
                if (alunoId) cacheAlunos.set(alunoCacheKey, alunoId)
                console.log(`[Importação] Aluno existente encontrado: "${alunoNome}" (ID: ${alunoId})`)
              }
            } catch (fallbackError) {
              // Ignorar erro do fallback
            }
          }
        }

        // Obter mapeamento de questões baseado na série
        const questoesMapDinamico = obterQuestoesMap(serie)

        // Verificar se ha dados de resultados
        let temResultados = false
        for (const { inicio, fim } of questoesMapDinamico) {
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

        // Contar acertos por disciplina
        let acertosLP = 0, acertosCH = 0, acertosMAT = 0, acertosCN = 0
        let questoesRespondidas = 0

        // Processar cada questao e adicionar ao batch
        for (const { inicio, fim, area, disciplina } of questoesMapDinamico) {
          for (let num = inicio; num <= fim; num++) {
            const colunaQuestao = `Q${num}`
            const valorQuestao = linha[colunaQuestao]

            if (valorQuestao === undefined || valorQuestao === null || valorQuestao === '') {
              continue
            }

            questoesRespondidas++
            const acertou = valorQuestao === '1' || valorQuestao === 1 || valorQuestao === 'X' || valorQuestao === 'x'
            const nota = acertou ? 1 : 0

            // Contar acertos por disciplina
            if (acertou && !alunoFaltou && !semDados) {
              if (disciplina === 'Língua Portuguesa') acertosLP++
              else if (disciplina === 'Ciências Humanas') acertosCH++
              else if (disciplina === 'Matemática') acertosMAT++
              else if (disciplina === 'Ciências da Natureza') acertosCN++
            }

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

        // Atualizar/criar registro em resultados_consolidados se tiver aluno_id
        if (alunoId && !semDados) {
          // Obter configuração da série para cálculos corretos (usando função normalizada)
          const configSerie = obterConfigSerie(serie)
          const serieNum = parseInt(serie.replace(/[^\d]/g, ''))

          // Calcular total de questões esperadas baseado na configuração
          let totalQuestoesEsperadas = 0
          if (configSerie) {
            if (configSerie.avalia_lp) totalQuestoesEsperadas += configSerie.qtd_questoes_lp || 0
            if (configSerie.avalia_mat) totalQuestoesEsperadas += configSerie.qtd_questoes_mat || 0
            if (configSerie.avalia_ch) totalQuestoesEsperadas += configSerie.qtd_questoes_ch || 0
            if (configSerie.avalia_cn) totalQuestoesEsperadas += configSerie.qtd_questoes_cn || 0
          } else {
            // Fallback se não houver configuração
            totalQuestoesEsperadas = serieNum >= 1 && serieNum <= 5 ? 28 : 60
          }

          // Calcular notas baseadas nos acertos usando a configuração da série
          let notaLPCalc = 0, notaCHCalc = 0, notaMATCalc = 0, notaCNCalc = 0

          if (configSerie) {
            // Usar quantidade de questões da configuração para calcular notas
            if (configSerie.avalia_lp && configSerie.qtd_questoes_lp > 0) {
              notaLPCalc = acertosLP > 0 ? (acertosLP / configSerie.qtd_questoes_lp) * 10 : 0
            }
            if (configSerie.avalia_mat && configSerie.qtd_questoes_mat > 0) {
              notaMATCalc = acertosMAT > 0 ? (acertosMAT / configSerie.qtd_questoes_mat) * 10 : 0
            }
            if (configSerie.avalia_ch && configSerie.qtd_questoes_ch > 0) {
              notaCHCalc = acertosCH > 0 ? (acertosCH / configSerie.qtd_questoes_ch) * 10 : 0
            }
            if (configSerie.avalia_cn && configSerie.qtd_questoes_cn > 0) {
              notaCNCalc = acertosCN > 0 ? (acertosCN / configSerie.qtd_questoes_cn) * 10 : 0
            }
          } else {
            // Fallback para cálculo padrão se não houver configuração
            if (serieNum === 2 || serieNum === 3) {
              // 2º e 3º ano: LP = 14 questões, MAT = 14 questões
              notaLPCalc = acertosLP > 0 ? (acertosLP / 14) * 10 : 0
              notaMATCalc = acertosMAT > 0 ? (acertosMAT / 14) * 10 : 0
            } else if (serieNum === 5) {
              // 5º ano: LP = 14 questões, MAT = 20 questões
              notaLPCalc = acertosLP > 0 ? (acertosLP / 14) * 10 : 0
              notaMATCalc = acertosMAT > 0 ? (acertosMAT / 20) * 10 : 0
            } else {
              // Anos finais (6º ao 9º): LP = 20, CH = 10, MAT = 20, CN = 10
              notaLPCalc = acertosLP > 0 ? (acertosLP / 20) * 10 : 0
              notaCHCalc = acertosCH > 0 ? (acertosCH / 10) * 10 : 0
              notaMATCalc = acertosMAT > 0 ? (acertosMAT / 20) * 10 : 0
              notaCNCalc = acertosCN > 0 ? (acertosCN / 10) * 10 : 0
            }
          }

          // Calcular média baseada nas disciplinas avaliadas
          let mediaAluno = 0
          let disciplinasAvaliadas = 0
          let somaNotas = 0

          if (configSerie) {
            // Usar configuração para determinar quais disciplinas entram na média
            if (configSerie.avalia_lp) { somaNotas += notaLPCalc; disciplinasAvaliadas++ }
            if (configSerie.avalia_mat) { somaNotas += notaMATCalc; disciplinasAvaliadas++ }
            if (configSerie.avalia_ch) { somaNotas += notaCHCalc; disciplinasAvaliadas++ }
            if (configSerie.avalia_cn) { somaNotas += notaCNCalc; disciplinasAvaliadas++ }

            if (disciplinasAvaliadas > 0) {
              const mediaObjetiva = somaNotas / disciplinasAvaliadas
              // Se tiver nota de produção e itens de produção, usar 70% objetiva + 30% produção
              if ((configSerie.qtd_itens_producao || 0) > 0 && notaProducaoPlanilha && notaProducaoPlanilha > 0) {
                mediaAluno = (mediaObjetiva * 0.7) + (notaProducaoPlanilha * 0.3)
              } else {
                mediaAluno = mediaObjetiva
              }
            }
          } else {
            // Fallback
            if (serieNum >= 1 && serieNum <= 5) {
              // Anos iniciais: média de LP e MAT
              const mediaObjetiva = (notaLPCalc + notaMATCalc) / 2
              if (notaProducaoPlanilha && notaProducaoPlanilha > 0) {
                mediaAluno = (mediaObjetiva * 0.7) + (notaProducaoPlanilha * 0.3)
              } else {
                mediaAluno = mediaObjetiva
              }
            } else {
              // Anos finais: média das 4 disciplinas
              mediaAluno = (notaLPCalc + notaCHCalc + notaMATCalc + notaCNCalc) / 4
            }
          }

          // Determinar tipo de avaliação
          const tipoAvaliacao = serieNum >= 1 && serieNum <= 5 ? 'anos_iniciais' : 'anos_finais'

          // Calcular níveis por disciplina (apenas para Anos Iniciais: 2º, 3º e 5º)
          let nivelLp: string | null = null
          let nivelMat: string | null = null
          let nivelProd: string | null = null
          let nivelAlunoCalc: string | null = null

          if (isAnosIniciais(serie) && !alunoFaltou && !semDados) {
            // Calcular nível de LP baseado em acertos
            nivelLp = calcularNivelPorAcertos(acertosLP, serie, 'LP')

            // Calcular nível de MAT baseado em acertos
            nivelMat = calcularNivelPorAcertos(acertosMAT, serie, 'MAT')

            // Converter nível de produção textual
            nivelProd = converterNivelProducao(nivelProducao)

            // Calcular nível geral do aluno (média dos 3 níveis)
            nivelAlunoCalc = calcularNivelAluno(nivelLp, nivelMat, nivelProd)
          }

          // Upsert em resultados_consolidados
          await pool.query(`
            INSERT INTO resultados_consolidados (
              aluno_id, escola_id, turma_id, ano_letivo, serie, presenca,
              total_acertos_lp, total_acertos_ch, total_acertos_mat, total_acertos_cn,
              nota_lp, nota_ch, nota_mat, nota_cn, media_aluno,
              nota_producao, nivel_aprendizagem,
              item_producao_1, item_producao_2, item_producao_3, item_producao_4,
              item_producao_5, item_producao_6, item_producao_7, item_producao_8,
              total_questoes_respondidas, total_questoes_esperadas, tipo_avaliacao,
              nivel_lp, nivel_mat, nivel_prod, nivel_aluno
            ) VALUES (
              $1, $2, $3, $4, $5, $6,
              $7, $8, $9, $10,
              $11, $12, $13, $14, $15,
              $16, $17,
              $18, $19, $20, $21, $22, $23, $24, $25,
              $26, $27, $28,
              $29, $30, $31, $32
            )
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
              nota_producao = EXCLUDED.nota_producao,
              nivel_aprendizagem = EXCLUDED.nivel_aprendizagem,
              item_producao_1 = EXCLUDED.item_producao_1,
              item_producao_2 = EXCLUDED.item_producao_2,
              item_producao_3 = EXCLUDED.item_producao_3,
              item_producao_4 = EXCLUDED.item_producao_4,
              item_producao_5 = EXCLUDED.item_producao_5,
              item_producao_6 = EXCLUDED.item_producao_6,
              item_producao_7 = EXCLUDED.item_producao_7,
              item_producao_8 = EXCLUDED.item_producao_8,
              total_questoes_respondidas = EXCLUDED.total_questoes_respondidas,
              total_questoes_esperadas = EXCLUDED.total_questoes_esperadas,
              tipo_avaliacao = EXCLUDED.tipo_avaliacao,
              nivel_lp = EXCLUDED.nivel_lp,
              nivel_mat = EXCLUDED.nivel_mat,
              nivel_prod = EXCLUDED.nivel_prod,
              nivel_aluno = EXCLUDED.nivel_aluno,
              atualizado_em = CURRENT_TIMESTAMP
          `, [
            alunoId, escolaId, turmaId, anoLetivo, serie, presencaFinal,
            acertosLP, acertosCH, acertosMAT, acertosCN,
            notaLPCalc.toFixed(2), notaCHCalc.toFixed(2), notaMATCalc.toFixed(2), notaCNCalc.toFixed(2),
            mediaAluno.toFixed(2),
            notaProducaoPlanilha || 0, nivelProducao,
            (alunoFaltou || semDados) ? null : (itensProducao[0] ?? null),
            (alunoFaltou || semDados) ? null : (itensProducao[1] ?? null),
            (alunoFaltou || semDados) ? null : (itensProducao[2] ?? null),
            (alunoFaltou || semDados) ? null : (itensProducao[3] ?? null),
            (alunoFaltou || semDados) ? null : (itensProducao[4] ?? null),
            (alunoFaltou || semDados) ? null : (itensProducao[5] ?? null),
            (alunoFaltou || semDados) ? null : (itensProducao[6] ?? null),
            (alunoFaltou || semDados) ? null : (itensProducao[7] ?? null),
            questoesRespondidas, totalQuestoesEsperadas, tipoAvaliacao,
            nivelLp, nivelMat, nivelProd, nivelAlunoCalc
          ])
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

    // Invalidar cache do dashboard após importação bem-sucedida
    try {
      limparTodosOsCaches()
      console.log('[Importação] Cache do dashboard invalidado após importação')
    } catch (cacheError) {
      console.error('[Importação] Erro ao invalidar cache (não crítico):', cacheError)
    }

    return NextResponse.json({
      mensagem: 'Resultados importados com sucesso',
      ano_letivo: anoLetivo,
      total_linhas: dados.length,
      linhas_processadas: linhasProcessadas,
      linhas_com_erro: linhasComErro,
      total_questoes_importadas: totalQuestoesImportadas,
      erros: erros.slice(0, 20),
      cache_invalidado: true,
    })
  } catch (error: any) {
    console.error('Erro ao importar resultados:', error)
    return NextResponse.json(
      { mensagem: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
