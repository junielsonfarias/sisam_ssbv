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

    // Função para normalizar série (remover º, espaços, etc.)
    const normalizarSerie = (serie: string): string => {
      if (!serie) return ''
      // Remover º, °, espaços, e converter para número
      return serie.toString().replace(/[º°\s]/g, '').trim()
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

      // Se ainda não encontrou, retorna configuração padrão para anos finais
      if (!configFinal || !configFinal.disciplinas || configFinal.disciplinas.length === 0) {
        console.warn(`[Importação] AVISO: Sem config para série "${serie}", usando padrão anos finais`)
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
          const colunaItem = linha[`Item${itemNum}`] || linha[`ITEM${itemNum}`] || linha[`item${itemNum}`]
          if (colunaItem !== undefined && colunaItem !== null && colunaItem !== '') {
            const valorItem = colunaItem.toString().trim().toUpperCase()
            itensProducao.push(valorItem === 'X' || valorItem === '1' ? 1 : 0)
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

        // Buscar aluno do cache
        const alunoNomeNorm = alunoNome.toUpperCase().trim()
        const alunoCacheKey = `${alunoNomeNorm}_${escolaId}`
        const alunoId = cacheAlunos.get(alunoCacheKey) || null

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
            if (serieNum >= 1 && serieNum <= 5) {
              // Anos iniciais: LP = 20 questões, MAT = 8 questões
              notaLPCalc = acertosLP > 0 ? (acertosLP / 20) * 10 : 0
              notaMATCalc = acertosMAT > 0 ? (acertosMAT / 8) * 10 : 0
            } else {
              // Anos finais
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

          // Upsert em resultados_consolidados
          await pool.query(`
            INSERT INTO resultados_consolidados (
              aluno_id, escola_id, turma_id, ano_letivo, serie, presenca,
              total_acertos_lp, total_acertos_ch, total_acertos_mat, total_acertos_cn,
              nota_lp, nota_ch, nota_mat, nota_cn, media_aluno,
              nota_producao, nivel_aprendizagem,
              item_producao_1, item_producao_2, item_producao_3, item_producao_4,
              item_producao_5, item_producao_6, item_producao_7, item_producao_8,
              total_questoes_respondidas, total_questoes_esperadas, tipo_avaliacao
            ) VALUES (
              $1, $2, $3, $4, $5, $6,
              $7, $8, $9, $10,
              $11, $12, $13, $14, $15,
              $16, $17,
              $18, $19, $20, $21, $22, $23, $24, $25,
              $26, $27, $28
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
              atualizado_em = CURRENT_TIMESTAMP
          `, [
            alunoId, escolaId, turmaId, anoLetivo, serie, presencaFinal,
            acertosLP, acertosCH, acertosMAT, acertosCN,
            notaLPCalc.toFixed(2), notaCHCalc.toFixed(2), notaMATCalc.toFixed(2), notaCNCalc.toFixed(2),
            mediaAluno.toFixed(2),
            notaProducaoPlanilha || 0, nivelProducao,
            itensProducao[0], itensProducao[1], itensProducao[2], itensProducao[3],
            itensProducao[4], itensProducao[5], itensProducao[6], itensProducao[7],
            questoesRespondidas, totalQuestoesEsperadas, tipoAvaliacao
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
