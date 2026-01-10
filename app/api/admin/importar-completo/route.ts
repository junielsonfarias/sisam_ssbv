import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { normalizarSerie } from '@/lib/normalizar-serie'
import {
  carregarConfigSeries,
  extrairNumeroSerie,
  gerarAreasQuestoes,
  calcularNivelAprendizagem,
  extrairNotaProducao,
  calcularMediaProducao,
} from '@/lib/config-series'
import { ConfiguracaoSerie } from '@/lib/types'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutos máximo (limite do plano Hobby da Vercel)

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
      `INSERT INTO importacoes (usuario_id, nome_arquivo, total_linhas, status, ano_letivo)
       VALUES ($1, $2, $3, 'processando', $4)
       RETURNING id`,
      [usuario.id, arquivo.name, dados.length, anoLetivo]
    )

    const importacaoId = importacaoResult.rows[0].id

    // Processar importação em background
    processarImportacao(importacaoId, dados, anoLetivo, usuario.id).catch((error) => {
      console.error('Erro ao processar importação em background:', error)
      pool.query(
        `UPDATE importacoes SET status = 'erro', concluido_em = CURRENT_TIMESTAMP WHERE id = $1`,
        [importacaoId]
      ).catch(console.error)
    })

    return NextResponse.json({
      mensagem: 'Importação iniciada',
      importacao_id: importacaoId,
      status: 'processando',
    })
  } catch (error: any) {
    console.error('Erro ao iniciar importação:', error)
    return NextResponse.json(
      { mensagem: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

async function processarImportacao(
  importacaoId: string,
  dados: any[],
  anoLetivo: string,
  usuarioId: string
) {
  const startTime = Date.now()
  console.log(`[IMPORTAÇÃO ${importacaoId}] Iniciando processamento de ${dados.length} linhas`)

  try {
    const resultado = {
      polos: { criados: 0, existentes: 0 },
      escolas: { criados: 0, existentes: 0 },
      turmas: { criados: 0, existentes: 0 },
      alunos: { criados: 0, existentes: 0 },
      questoes: { criadas: 0, existentes: 0 },
      resultados: { processados: 0, erros: 0, duplicados: 0, novos: 0 },
    }

    const erros: string[] = []

    // ========== FASE 1: PRÉ-PROCESSAMENTO E EXTRAÇÃO DE DADOS ÚNICOS ==========
    console.log('[FASE 1] Extraindo dados únicos do arquivo...')
    
    const polosUnicos = new Set<string>()
    const escolasUnicas = new Map<string, string>() // escola -> polo
    const turmasUnicas = new Map<string, { escola: string, serie: string }>() // turma -> {escola, serie}
    const alunosUnicos = new Map<string, { escola: string, turma: string, serie: string }>() // aluno -> {escola, turma, serie}
    
    dados.forEach((linha: any) => {
      const polo = (linha['POLO'] || linha['Polo'] || linha['polo'] || '').toString().trim()
      const escola = (linha['ESCOLA'] || linha['Escola'] || linha['escola'] || '').toString().trim()
      const turma = (linha['TURMA'] || linha['Turma'] || linha['turma'] || '').toString().trim()
      const aluno = (linha['ALUNO'] || linha['Aluno'] || linha['aluno'] || '').toString().trim()
      const serie = (linha['ANO/SÉRIE'] || linha['ANO/SERIE'] || linha['Série'] || linha['serie'] || linha['Ano'] || '').toString().trim()
      
      if (polo) polosUnicos.add(polo)
      if (escola && polo) escolasUnicas.set(escola, polo)
      if (turma && escola) turmasUnicas.set(`${turma}_${escola}`, { escola, serie })
      if (aluno && escola) alunosUnicos.set(`${aluno}_${escola}`, { escola, turma, serie })
    })

    console.log(`  → ${polosUnicos.size} polos únicos`)
    console.log(`  → ${escolasUnicas.size} escolas únicas`)
    console.log(`  → ${turmasUnicas.size} turmas únicas`)
    console.log(`  → ${alunosUnicos.size} alunos únicos`)

    // ========== FASE 2: CARREGAR TODOS OS DADOS EXISTENTES DO BANCO ==========
    console.log('[FASE 2] Carregando dados existentes do banco...')
    
    const polosMap = new Map<string, string>()
    const escolasMap = new Map<string, string>()
    const turmasMap = new Map<string, string>()
    const alunosMap = new Map<string, string>()
    const questoesMap = new Map<string, string>()

    // Carregar polos existentes
    const polosDB = await pool.query('SELECT id, nome FROM polos')
    polosDB.rows.forEach((p: any) => {
      polosMap.set(p.nome.toUpperCase().trim(), p.id)
    })
    console.log(`  → ${polosDB.rows.length} polos carregados`)

    // Função para normalizar nome de escola (remove pontos, espaços extras, etc.)
    const normalizarNomeEscola = (nome: string): string => {
      return nome
        .toUpperCase()
        .trim()
        // Remover pontos
        .replace(/\./g, '')
        // Remover múltiplos espaços
        .replace(/\s+/g, ' ')
    }

    // Carregar escolas existentes (usando normalização para evitar duplicatas)
    const escolasDB = await pool.query('SELECT id, nome FROM escolas WHERE ativo = true')
    escolasDB.rows.forEach((e: any) => {
      const nomeNormalizado = normalizarNomeEscola(e.nome)
      // Armazenar tanto o nome original quanto o normalizado
      if (!escolasMap.has(nomeNormalizado)) {
        escolasMap.set(nomeNormalizado, e.id)
      }
    })
    console.log(`  → ${escolasDB.rows.length} escolas carregadas (normalizadas para comparação)`)

    // Carregar turmas existentes do ano letivo
    const turmasDB = await pool.query(
      'SELECT id, codigo, escola_id FROM turmas WHERE ano_letivo = $1',
      [anoLetivo]
    )
    turmasDB.rows.forEach((t: any) => {
      turmasMap.set(`${t.codigo}_${t.escola_id}`, t.id)
    })
    console.log(`  → ${turmasDB.rows.length} turmas carregadas (ano ${anoLetivo})`)

    // Carregar alunos existentes do ano letivo para evitar duplicatas
    const alunosDB = await pool.query(
      'SELECT id, nome, escola_id, turma_id, ano_letivo FROM alunos WHERE ano_letivo = $1 AND ativo = true',
      [anoLetivo]
    )
    alunosDB.rows.forEach((a: any) => {
      const nomeNormalizado = (a.nome || '').toString().toUpperCase().trim()
      // Chave única: nome_escola_turma_ano (turma_id pode ser NULL, usar 'NULL' como string)
      const turmaKey = a.turma_id ? a.turma_id.toString() : 'NULL'
      const alunoKey = `${nomeNormalizado}_${a.escola_id}_${turmaKey}_${a.ano_letivo || ''}`
      alunosMap.set(alunoKey, a.id)
    })
    console.log(`  → ${alunosDB.rows.length} alunos existentes no banco (ano ${anoLetivo}) - serão atualizados se duplicados`)

    // Carregar questões existentes
    const questoesDB = await pool.query('SELECT id, codigo FROM questoes')
    questoesDB.rows.forEach((q: any) => {
      questoesMap.set(q.codigo, q.id)
    })
    console.log(`  → ${questoesDB.rows.length} questões carregadas`)

    // ========== FASE 3: CRIAR POLOS E ESCOLAS EM BATCH ==========
    console.log('[FASE 3] Criando polos e escolas...')
    
    // Criar polos faltantes
    const polosParaCriar = Array.from(polosUnicos).filter(p => !polosMap.has(p.toUpperCase().trim()))
    if (polosParaCriar.length > 0) {
      for (const nomePolo of polosParaCriar) {
        try {
          const result = await pool.query(
            'INSERT INTO polos (nome, codigo) VALUES ($1, $2) RETURNING id',
            [nomePolo, nomePolo.toUpperCase().replace(/\s+/g, '_')]
          )
          polosMap.set(nomePolo.toUpperCase().trim(), result.rows[0].id)
          resultado.polos.criados++
        } catch (error: any) {
          erros.push(`Polo "${nomePolo}": ${error.message}`)
        }
      }
    }
    resultado.polos.existentes = polosUnicos.size - resultado.polos.criados

    // Criar escolas faltantes (usando normalização para evitar duplicatas)
    for (const [nomeEscola, nomePolo] of escolasUnicas) {
      const escolaNorm = normalizarNomeEscola(nomeEscola)
      if (!escolasMap.has(escolaNorm)) {
        const poloId = polosMap.get(nomePolo.toUpperCase().trim())
        if (poloId) {
          try {
            // Verificar novamente no banco com normalização para evitar race condition
            // Usar função SQL para normalização (se disponível) ou comparar diretamente
            const escolaExistente = await pool.query(
              `SELECT id FROM escolas 
               WHERE UPPER(TRIM(REGEXP_REPLACE(REGEXP_REPLACE(nome, '\\.', '', 'g'), '\\s+', ' ', 'g'))) = $1 
               AND ativo = true 
               LIMIT 1`,
              [escolaNorm]
            )
            
            if (escolaExistente.rows.length > 0) {
              // Escola já existe (normalizada), usar a existente
              escolasMap.set(escolaNorm, escolaExistente.rows[0].id)
              resultado.escolas.existentes++
            } else {
              // Criar nova escola
              const codigoEscola = nomeEscola.toUpperCase().trim().replace(/\./g, '').replace(/\s+/g, '_').substring(0, 50)
              const result = await pool.query(
                'INSERT INTO escolas (nome, codigo, polo_id) VALUES ($1, $2, $3) RETURNING id',
                [nomeEscola.trim(), codigoEscola, poloId]
              )
              escolasMap.set(escolaNorm, result.rows[0].id)
              resultado.escolas.criados++
            }
          } catch (error: any) {
            erros.push(`Escola "${nomeEscola}": ${error.message}`)
          }
        }
      } else {
        resultado.escolas.existentes++
      }
    }
    // resultado.escolas.existentes já é contado dentro do loop acima
    console.log(`  → Polos: ${resultado.polos.criados} criados, ${resultado.polos.existentes} existentes`)
    console.log(`  → Escolas: ${resultado.escolas.criados} criadas, ${resultado.escolas.existentes} existentes`)

    // ========== FASE 4: CRIAR QUESTÕES E CARREGAR CONFIGURAÇÕES ==========
    console.log('[FASE 4] Carregando configurações de séries e criando questões...')

    // Carregar configurações de todas as séries
    const configSeries = await carregarConfigSeries()
    console.log(`  → ${configSeries.size} configurações de séries carregadas`)

    // Determinar o máximo de questões necessárias (60 para 8º/9º, 34 para 5º, 28 para 2º/3º)
    const maxQuestoes = 60

    // Criar questões genéricas Q1 a Q60 (serão usadas conforme a série)
    // As áreas serão determinadas dinamicamente baseado na série do aluno
    for (let num = 1; num <= maxQuestoes; num++) {
      const codigo = `Q${num}`
      if (!questoesMap.has(codigo)) {
        try {
          // Determinar área padrão baseada no número (para 8º/9º ano)
          let disciplina = 'Língua Portuguesa'
          let area = 'Língua Portuguesa'

          if (num >= 1 && num <= 20) {
            disciplina = 'Língua Portuguesa'
            area = 'Língua Portuguesa'
          } else if (num >= 21 && num <= 30) {
            disciplina = 'Ciências Humanas'
            area = 'Ciências Humanas'
          } else if (num >= 31 && num <= 50) {
            disciplina = 'Matemática'
            area = 'Matemática'
          } else if (num >= 51 && num <= 60) {
            disciplina = 'Ciências da Natureza'
            area = 'Ciências da Natureza'
          }

          const result = await pool.query(
            'INSERT INTO questoes (codigo, descricao, disciplina, area_conhecimento) VALUES ($1, $2, $3, $4) RETURNING id',
            [codigo, `Questão ${num}`, disciplina, area]
          )
          questoesMap.set(codigo, result.rows[0].id)
          resultado.questoes.criadas++
        } catch (error: any) {
          console.error(`Erro ao criar questão ${codigo}:`, error.message)
        }
      }
    }
    resultado.questoes.existentes = maxQuestoes - resultado.questoes.criadas
    console.log(`  → ${resultado.questoes.criadas} criadas, ${resultado.questoes.existentes} existentes`)

    // Carregar itens de produção
    const itensProducaoMap = new Map<string, string>()
    const itensProducaoDB = await pool.query('SELECT id, codigo FROM itens_producao WHERE ativo = true ORDER BY ordem')
    itensProducaoDB.rows.forEach((item: any) => {
      itensProducaoMap.set(item.codigo, item.id)
    })
    console.log(`  → ${itensProducaoMap.size} itens de produção carregados`)

    // ========== FASE 5: PROCESSAR LINHAS E CRIAR TURMAS/ALUNOS/RESULTADOS EM BATCH ==========
    console.log('[FASE 5] Processando linhas do arquivo...')
    
    let proximoNumeroAluno = 1
    const maxCodigoResult = await pool.query(
      `SELECT codigo FROM alunos 
       WHERE codigo LIKE 'ALU%' 
       AND codigo ~ '^ALU[0-9]+$'
       ORDER BY CAST(SUBSTRING(codigo FROM 4) AS INTEGER) DESC 
       LIMIT 1`
    )
    if (maxCodigoResult.rows.length > 0 && maxCodigoResult.rows[0].codigo) {
      proximoNumeroAluno = parseInt(maxCodigoResult.rows[0].codigo.replace('ALU', '')) + 1
    }

    const totalLinhas = dados.length
    const intervaloAtualizacao = Math.max(50, Math.floor(totalLinhas / 10))
    
    // Arrays para batch inserts
    const turmasParaInserir: any[] = []
    const alunosParaInserir: any[] = []
    const consolidadosParaInserir: any[] = []
    const resultadosParaInserir: any[] = []
    const producaoParaInserir: any[] = [] // Resultados de produção textual

    for (let i = 0; i < dados.length; i++) {
      try {
        const linha = dados[i] as any

        const escolaNome = (linha['ESCOLA'] || linha['Escola'] || linha['escola'] || '').toString().trim()
        const alunoNome = (linha['ALUNO'] || linha['Aluno'] || linha['aluno'] || '').toString().trim()
        const turmaCodigo = (linha['TURMA'] || linha['Turma'] || linha['turma'] || '').toString().trim()
        const serieRaw = (linha['ANO/SÉRIE'] || linha['ANO/SERIE'] || linha['Série'] || linha['serie'] || linha['Ano'] || '').toString().trim()
        const serie = normalizarSerie(serieRaw) || null
        
        // IMPORTANTE: Validar dados antes de processar
        // Se escola ou aluno estiverem vazios, pular linha mas registrar erro e CONTINUAR
        if (!escolaNome || !alunoNome) {
          resultado.resultados.erros++
          const mensagemErro = `Linha ${i + 2}: Escola ou aluno vazio (Escola: "${escolaNome}", Aluno: "${alunoNome}")`
          erros.push(mensagemErro)
          if (erros.length <= 20) {
            console.error(`⚠️ ${mensagemErro}`)
          }
          continue // Pular esta linha mas continuar processando as próximas
        }
        
        // Tratamento da presença/falta
        // IMPORTANTE: Importar TODOS os alunos, presentes E faltantes
        // Coluna pode vir como: FALTA, Falta, Presença, PRESENÇA
        // Valores possíveis: P, F, Presente, Faltou, Ausente, vazio, etc.
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
          // Se tem qualquer valor na coluna FALTA (exceto valores que indicam presente), marca como faltou
          if (valorFalta === 'F' || valorFalta === 'X' || valorFalta === 'FALTOU' || valorFalta === 'AUSENTE' || valorFalta === 'SIM' || valorFalta === '1' || valorFalta === 'S') {
            presenca = 'F'
          } else if (valorFalta === 'P' || valorFalta === 'PRESENTE' || valorFalta === 'NAO' || valorFalta === 'NÃO' || valorFalta === '0' || valorFalta === 'N') {
            presenca = 'P'
          } else {
            // Se tem qualquer outro valor não vazio na coluna FALTA, assume que faltou
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
        
        // Log para debug (apenas primeiras 5 linhas)
        if (i < 5) {
          if (presenca === null) {
            console.log(`[DEBUG] Linha ${i + 2}: Aluno "${alunoNome}" SEM dados de frequência (será marcado como "-")`)
          } else if (presenca === 'F') {
            console.log(`[DEBUG] Linha ${i + 2}: Aluno "${alunoNome}" marcado como FALTANTE (FALTA: "${colunaFalta}", PRESENÇA: "${colunaPresenca}")`)
          }
        }

        const escolaId = escolasMap.get(escolaNome.toUpperCase().trim())
        if (!escolaId) {
          // Escola não encontrada - registrar erro mas continuar processando
          resultado.resultados.erros++
          const mensagemErro = `Linha ${i + 2}: Escola não encontrada: "${escolaNome}"`
          erros.push(mensagemErro)
          if (erros.length <= 20) {
            console.error(`⚠️ ${mensagemErro}`)
          }
          continue // Pular esta linha mas continuar processando as próximas
        }

        // Criar/buscar turma
        let turmaId: string | null = null
        if (turmaCodigo) {
          const turmaKey = `${turmaCodigo}_${escolaId}`
          turmaId = turmasMap.get(turmaKey) || null

          if (!turmaId) {
            // Adicionar à fila de turmas para criar
            turmaId = `TEMP_TURMA_${turmasParaInserir.length}`
            turmasParaInserir.push({
              tempId: turmaId,
              codigo: turmaCodigo,
              nome: turmaCodigo,
              escola_id: escolaId,
              serie: serie || null,
              ano_letivo: anoLetivo,
            })
            turmasMap.set(turmaKey, turmaId)
            resultado.turmas.criados++
          } else {
            resultado.turmas.existentes++
          }
        }

        // Verificar se aluno já existe (mesmo nome, escola, turma e ano letivo)
        const nomeNormalizado = alunoNome.toUpperCase().trim()
        const turmaKey = turmaId && !turmaId.toString().startsWith('TEMP_') ? turmaId.toString() : 'NULL'
        const alunoKey = `${nomeNormalizado}_${escolaId}_${turmaKey}_${anoLetivo}`
        
        let alunoId = alunosMap.get(alunoKey)
        
        if (alunoId) {
          // Aluno já existe - usar ID existente
          // O aluno será atualizado na FASE 7 (mas não precisa adicionar à lista de inserção)
          // Usar ID real diretamente
        } else {
          // Aluno não existe - criar novo (adicionar à lista de inserção)
          const codigoAluno = `ALU${proximoNumeroAluno.toString().padStart(4, '0')}`
          proximoNumeroAluno++
          alunoId = `TEMP_ALUNO_${alunosParaInserir.length}`
          
          alunosParaInserir.push({
            tempId: alunoId,
            codigo: codigoAluno,
            nome: alunoNome,
            escola_id: escolaId,
            turma_id: turmaId,
            serie: serie || null,
            ano_letivo: anoLetivo,
          })
          
          // Mapear para usar depois (será substituído pelo ID real após inserção)
          alunosMap.set(alunoKey, alunoId)
        }
        

        // Extrair notas e acertos
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

        const notaLP = extrairDecimal(linha['NOTA-LP'] || linha['NOTA_LP'] || linha['Nota-LP'] || linha['NOTA LP'])
        const notaCH = extrairDecimal(linha['NOTA-CH'] || linha['NOTA_CH'] || linha['Nota-CH'] || linha['NOTA CH'])
        const notaMAT = extrairDecimal(linha['NOTA-MAT'] || linha['NOTA_MAT'] || linha['Nota-MAT'] || linha['NOTA MAT'])
        const notaCN = extrairDecimal(linha['NOTA-CN'] || linha['NOTA_CN'] || linha['Nota-CN'] || linha['NOTA CN'])
        const mediaAluno = extrairDecimal(linha['MED_ALUNO'] || linha['MED ALUNO'] || linha['Media'] || linha['Média'])

        // Obter configuração da série do aluno
        const numeroSerie = extrairNumeroSerie(serie)
        const configSerieAluno = numeroSerie ? configSeries.get(numeroSerie) : null

        // DEBUG: Log da série e configuração (apenas para os primeiros 3 alunos)
        if (i < 3) {
          console.log(`[IMPORT DEBUG] Série do aluno "${alunoNome}":`)
          console.log(`  - serieRaw: "${serieRaw}"`)
          console.log(`  - serie (normalizada): "${serie}"`)
          console.log(`  - numeroSerie (extraído): "${numeroSerie}"`)
          console.log(`  - configSerieAluno encontrada: ${configSerieAluno ? 'SIM' : 'NÃO'}`)
          console.log(`  - configSeries.keys():`, Array.from(configSeries.keys()))
        }

        // Extrair itens de produção textual (para 2º, 3º e 5º ano)
        let notaProducao: number | null = null
        const itensProducaoNotas: (number | null)[] = []

        if (configSerieAluno?.tem_producao_textual) {
          // Extrair notas dos 8 itens de produção
          for (let itemNum = 1; itemNum <= 8; itemNum++) {
            const notaItem = extrairNotaProducao(linha, itemNum)
            itensProducaoNotas.push(notaItem)
          }

          // DEBUG: Log dos itens extraídos (apenas para os primeiros 3 alunos)
          if (i < 3) {
            console.log(`[IMPORT DEBUG] Aluno: ${nomeAluno}, Serie: ${serie}`)
            console.log(`  - configSerieAluno.tem_producao_textual: ${configSerieAluno.tem_producao_textual}`)
            console.log(`  - Colunas no Excel:`, Object.keys(linha).filter(k => k.toLowerCase().includes('item')))
            console.log(`  - Valores Item1-8:`, {
              Item1: linha['Item1'], Item2: linha['Item2'], Item3: linha['Item3'], Item4: linha['Item4'],
              Item5: linha['Item5'], Item6: linha['Item6'], Item7: linha['Item7'], Item8: linha['Item8']
            })
            console.log(`  - itensProducaoNotas extraídos:`, itensProducaoNotas)
          }

          // Calcular média da produção
          notaProducao = calcularMediaProducao(itensProducaoNotas)

          // Tentar também extrair nota de produção diretamente (se já vier calculada)
          if (notaProducao === null) {
            notaProducao = extrairDecimal(
              linha['PRODUÇÃO'] || linha['Produção'] || linha['PRODUCAO'] ||
              linha['Nota Produção'] || linha['NOTA PRODUÇÃO'] || linha['nota_producao']
            )
          }

          // DEBUG: Log da nota de produção calculada
          if (i < 3) {
            console.log(`  - notaProducao calculada: ${notaProducao}`)
          }
        } else {
          // DEBUG: Log quando não tem produção textual
          if (i < 3) {
            console.log(`[IMPORT DEBUG] Aluno: ${nomeAluno}, Serie: ${serie} - SEM PRODUÇÃO TEXTUAL`)
            console.log(`  - configSerieAluno: ${configSerieAluno ? 'existe' : 'NULL'}`)
            console.log(`  - tem_producao_textual: ${configSerieAluno?.tem_producao_textual}`)
          }
        }

        // Verificar se há dados de resultados (notas)
        const temNotas = notaLP !== null || notaCH !== null || notaMAT !== null || notaCN !== null || mediaAluno !== null || notaProducao !== null
        const temAcertos = totalAcertosLP > 0 || totalAcertosCH > 0 || totalAcertosMAT > 0 || totalAcertosCN > 0
        
        // Determinar presença final
        // Se não houver dados de frequência E não houver resultados, usar "-" (não deve ser contado)
        let presencaFinal: string
        if (presenca === null && !temNotas && !temAcertos) {
          // Não há frequência nem resultados - usar "-"
          presencaFinal = '-'
        } else if (presenca === null) {
          // Não há frequência, mas há resultados - assumir presente para não perder os dados
          presencaFinal = 'P'
        } else {
          // Há dados de frequência - usar o valor
          presencaFinal = presenca
        }
        
        // Se aluno faltou explicitamente, considerar como faltante
        const alunoFaltou = presencaFinal === 'F'
        
        // Se não houver frequência E não houver resultados, não calcular médias (usar null)
        const mediaFinal = (presencaFinal === '-' || (presenca === null && !temNotas && !temAcertos)) 
          ? null 
          : (mediaAluno !== null && mediaAluno !== undefined ? parseFloat(mediaAluno.toString()) : null)
        
        // Se média for 0,00 ou null E aluno não está marcado como "-", considerar como faltante
        if (presencaFinal !== '-' && (mediaFinal === 0 || mediaFinal === null || mediaFinal === undefined) && presencaFinal !== 'F') {
          presencaFinal = 'F'
        }
        
        // Determinar nível de aprendizagem (para séries que usam)
        let nivelAprendizagem: string | null = null
        let nivelAprendizagemId: string | null = null

        if (configSerieAluno?.usa_nivel_aprendizagem && !alunoFaltou && mediaAluno !== null) {
          const nivel = await calcularNivelAprendizagem(mediaAluno, serie || undefined)
          if (nivel) {
            nivelAprendizagem = nivel.nome
            nivelAprendizagemId = nivel.id
          }
        }

        // Determinar tipo de avaliação e total de questões esperadas
        const tipoAvaliacao = configSerieAluno?.tem_producao_textual ? 'anos_iniciais' : 'anos_finais'
        const totalQuestoesEsperadas = configSerieAluno?.total_questoes_objetivas || 60

        // Se presença for "-" (sem dados), não calcular médias e zerar acertos
        const semDados = presencaFinal === '-'
        
        // Adicionar consolidado à fila
        consolidadosParaInserir.push({
          aluno_id: alunoId,
          escola_id: escolaId,
          turma_id: turmaId,
          ano_letivo: anoLetivo,
          serie: serie || null,
          presenca: presencaFinal,
          // Se faltou ou sem dados, zerar acertos e notas
          total_acertos_lp: (alunoFaltou || semDados) ? 0 : totalAcertosLP,
          total_acertos_ch: (alunoFaltou || semDados) ? 0 : totalAcertosCH,
          total_acertos_mat: (alunoFaltou || semDados) ? 0 : totalAcertosMAT,
          total_acertos_cn: (alunoFaltou || semDados) ? 0 : totalAcertosCN,
          nota_lp: (alunoFaltou || semDados) ? null : notaLP,
          nota_ch: (alunoFaltou || semDados) ? null : notaCH,
          nota_mat: (alunoFaltou || semDados) ? null : notaMAT,
          nota_cn: (alunoFaltou || semDados) ? null : notaCN,
          media_aluno: (alunoFaltou || semDados) ? null : mediaFinal,
          // Novos campos para produção textual e nível
          nota_producao: (alunoFaltou || semDados) ? null : notaProducao,
          nivel_aprendizagem: (semDados ? null : nivelAprendizagem),
          nivel_aprendizagem_id: (semDados ? null : nivelAprendizagemId),
          tipo_avaliacao: tipoAvaliacao,
          total_questoes_esperadas: totalQuestoesEsperadas,
          // Itens de produção individuais (usar ?? para preservar valor 0)
          item_producao_1: (alunoFaltou || semDados) ? null : (itensProducaoNotas[0] ?? null),
          item_producao_2: (alunoFaltou || semDados) ? null : (itensProducaoNotas[1] ?? null),
          item_producao_3: (alunoFaltou || semDados) ? null : (itensProducaoNotas[2] ?? null),
          item_producao_4: (alunoFaltou || semDados) ? null : (itensProducaoNotas[3] ?? null),
          item_producao_5: (alunoFaltou || semDados) ? null : (itensProducaoNotas[4] ?? null),
          item_producao_6: (alunoFaltou || semDados) ? null : (itensProducaoNotas[5] ?? null),
          item_producao_7: (alunoFaltou || semDados) ? null : (itensProducaoNotas[6] ?? null),
          item_producao_8: (alunoFaltou || semDados) ? null : (itensProducaoNotas[7] ?? null),
        })

        // Adicionar resultados de produção à fila (se aplicável)
        if (configSerieAluno?.tem_producao_textual && !alunoFaltou) {
          for (let itemNum = 1; itemNum <= 8; itemNum++) {
            const notaItem = itensProducaoNotas[itemNum - 1]
            if (notaItem !== null) {
              const itemCodigo = `ITEM_${itemNum}`
              const itemId = itensProducaoMap.get(itemCodigo)
              if (itemId) {
                producaoParaInserir.push({
                  aluno_id: alunoId,
                  escola_id: escolaId,
                  turma_id: turmaId,
                  item_producao_id: itemId,
                  ano_letivo: anoLetivo,
                  serie: serie || null,
                  nota: notaItem,
                })
              }
            }
          }
        }

        // Processar questões
        let questoesProcessadasAluno = 0
        let questoesVazias = 0
        let questoesComValor = 0

        // Gerar áreas de questões baseado na configuração da série
        const areasAluno = configSerieAluno
          ? gerarAreasQuestoes(configSerieAluno)
          : [
              { inicio: 1, fim: 20, area: 'Língua Portuguesa', disciplina: 'Língua Portuguesa' },
              { inicio: 21, fim: 30, area: 'Ciências Humanas', disciplina: 'Ciências Humanas' },
              { inicio: 31, fim: 50, area: 'Matemática', disciplina: 'Matemática' },
              { inicio: 51, fim: 60, area: 'Ciências da Natureza', disciplina: 'Ciências da Natureza' },
            ]

        // DIAGNÓSTICO: Verificar se as colunas existem no Excel (apenas para primeiro aluno)
        if (i === 0) {
          const colunasDisponiveis = Object.keys(linha)
          const colunasQuestoes = colunasDisponiveis.filter(c => c.startsWith('Q') || c.match(/^Q\s*\d+$/i))
          const qtdEsperada = configSerieAluno?.total_questoes_objetivas || 60
          console.log(`[FASE 5] Diagnóstico - Primeiro aluno (${serie || 'série não identificada'}):`)
          console.log(`  → ${colunasQuestoes.length} colunas de questões encontradas`)
          console.log(`  → ${qtdEsperada} questões esperadas para esta série`)
          console.log(`  → Produção textual: ${configSerieAluno?.tem_producao_textual ? 'Sim' : 'Não'}`)
          if (colunasQuestoes.length < qtdEsperada) {
            console.error(`⚠️ ATENÇÃO: Apenas ${colunasQuestoes.length} colunas de questões encontradas! Esperado: ${qtdEsperada}`)
            console.error(`  → Colunas encontradas: ${colunasQuestoes.slice(0, 10).join(', ')}...`)
          }
        }

        for (const { inicio, fim, area, disciplina } of areasAluno) {
          for (let num = inicio; num <= fim; num++) {
            // Tentar diferentes variações do nome da coluna
            const variacoesColuna = [
              `Q${num}`,           // Q1, Q2, etc.
              `Q ${num}`,          // Q 1, Q 2, etc.
              `q${num}`,           // q1, q2, etc.
              `q ${num}`,          // q 1, q 2, etc.
              `Questão ${num}`,    // Questão 1, etc.
              `Questao ${num}`,    // Questao 1, etc.
            ]
            
            let valorQuestao: any = undefined
            let colunaQuestao = `Q${num}`
            
            // Tentar encontrar a coluna em qualquer uma das variações
            for (const variacao of variacoesColuna) {
              if (linha[variacao] !== undefined) {
                valorQuestao = linha[variacao]
                colunaQuestao = variacao
                break
              }
            }
            
            // Se ainda não encontrou, tentar buscar case-insensitive
            if (valorQuestao === undefined) {
              const todasColunas = Object.keys(linha)
              const colunaEncontrada = todasColunas.find(c => 
                c.replace(/\s+/g, '').toUpperCase() === `Q${num}`.toUpperCase()
              )
              if (colunaEncontrada) {
                valorQuestao = linha[colunaEncontrada]
                colunaQuestao = colunaEncontrada
              }
            }

            if (valorQuestao === undefined || valorQuestao === null || valorQuestao === '') {
              questoesVazias++
              continue
            }
            
            questoesProcessadasAluno++
            questoesComValor++

            const acertou = valorQuestao === '1' || valorQuestao === 1 || valorQuestao === 'X' || valorQuestao === 'x'
            const nota = acertou ? 1 : 0
            const questaoCodigo = `Q${num}`
            const questaoId = questoesMap.get(questaoCodigo) || null

            // IMPORTANTE: Se aluno faltou ou não tem dados, zerar nota e acerto
            // Usar presencaFinal que já considera média 0,00 e ausência de dados
            const presencaFinalQuestao = presencaFinal // Já calculado anteriormente
            const alunoFaltouQuestao = presencaFinalQuestao === 'F'
            const semDadosQuestao = presencaFinalQuestao === '-'
            
            resultadosParaInserir.push({
              escola_id: escolaId,
              aluno_id: alunoId,
              aluno_codigo: null,
              aluno_nome: alunoNome,
              turma_id: turmaId,
              questao_id: questaoId,
              questao_codigo: questaoCodigo,
              resposta_aluno: (alunoFaltouQuestao || semDadosQuestao) ? null : (acertou ? '1' : '0'),
              acertou: (alunoFaltouQuestao || semDadosQuestao) ? false : acertou,
              nota: (alunoFaltouQuestao || semDadosQuestao) ? 0 : nota,
              ano_letivo: anoLetivo,
              serie: serie || null,
              turma: turmaCodigo || null,
              disciplina,
              area_conhecimento: area,
              presenca: presencaFinalQuestao,
            })
          }
        }
        
        // Log diagnóstico apenas para os primeiros 5 alunos
        if (i < 5) {
          console.log(`  → Aluno ${i + 1} "${alunoNome}": ${questoesProcessadasAluno} questões processadas (${questoesComValor} com valor, ${questoesVazias} vazias)`)
        }
        
        // Log de alerta se nenhuma questão foi processada
        if (questoesProcessadasAluno === 0 && i === 0) {
          console.error(`❌ ATENÇÃO: Primeiro aluno não teve nenhuma questão processada!`)
          console.error(`  → Verificando colunas disponíveis no Excel...`)
          const todasColunas = Object.keys(linha)
          const colunasQ = todasColunas.filter(c => c.toUpperCase().startsWith('Q'))
          console.error(`  → Colunas que começam com 'Q': ${colunasQ.slice(0, 20).join(', ')}${colunasQ.length > 20 ? '...' : ''}`)
        }

        resultado.resultados.processados++

        // Verificar status e atualizar progresso
        if ((i + 1) % intervaloAtualizacao === 0 || i === totalLinhas - 1) {
          const statusCheck = await pool.query(
            'SELECT status FROM importacoes WHERE id = $1',
            [importacaoId]
          )

          if (statusCheck.rows.length > 0 && statusCheck.rows[0].status === 'cancelado') {
            await pool.query(
              'UPDATE importacoes SET linhas_processadas = $1, linhas_com_erro = $2, status = \'cancelado\', concluido_em = CURRENT_TIMESTAMP WHERE id = $3',
              [i + 1, resultado.resultados.erros, importacaoId]
            )
            console.log(`[IMPORTAÇÃO ${importacaoId}] Cancelada pelo usuário`)
            return
          }

          await pool.query(
            'UPDATE importacoes SET linhas_processadas = $1, linhas_com_erro = $2 WHERE id = $3',
            [i + 1, resultado.resultados.erros, importacaoId]
          )
          
          const progresso = Math.round(((i + 1) / totalLinhas) * 100)
          console.log(`[FASE 5] Progresso: ${progresso}% (${i + 1}/${totalLinhas} linhas)`)
        }
      } catch (error: any) {
        resultado.resultados.erros++
        const mensagemErro = `Linha ${i + 2}: ${error.message}`
        erros.push(mensagemErro)
        
        // Log detalhado apenas para os primeiros 20 erros
        if (erros.length <= 20) {
          console.error(`❌ ${mensagemErro}`)
        }
        
        // IMPORTANTE: NÃO usar break - continuar processando todas as linhas
        // Mesmo com erro, tentar processar as próximas linhas
        // Limitar apenas a quantidade de erros armazenados
        if (erros.length >= 200) {
          erros.push(`... e mais ${dados.length - i - 1} erros não listados`)
          // Continuar processando, apenas não armazenar mais erros
        }
      }
    }

    console.log(`[FASE 5] Concluído: ${resultado.resultados.processados} linhas processadas`)
    console.log(`  → Resultados para inserir: ${resultadosParaInserir.length} registros no array`)
    
    // DIAGNÓSTICO: Verificar amostra de aluno_id no array
    if (resultadosParaInserir.length > 0) {
      const amostraIds = [...new Set(resultadosParaInserir.slice(0, 10).map(r => r.aluno_id))].slice(0, 5)
      console.log(`  → Amostra de aluno_id no array: ${amostraIds.join(', ')}`)
      
      // Verificar quantos têm IDs temporários
      const comTempId = resultadosParaInserir.filter(r => r.aluno_id && r.aluno_id.startsWith('TEMP_')).length
      console.log(`  → Resultados com ID temporário: ${comTempId} (serão convertidos na FASE 7)`)
      
      // Mostrar amostra de dados
      const amostra = resultadosParaInserir[0]
      console.log(`  → Amostra de dados:`, {
        aluno_id: amostra.aluno_id,
        questao_codigo: amostra.questao_codigo,
        acertou: amostra.acertou,
        ano_letivo: amostra.ano_letivo
      })
    } else {
      console.error(`❌ ERRO CRÍTICO: Array resultadosParaInserir está VAZIO!`)
      console.error(`  → Isso significa que NENHUMA questão foi processada`)
      console.error(`  → Possíveis causas:`)
      console.error(`    1. Colunas Q1-Q60 não existem no Excel`)
      console.error(`    2. Todas as questões estão vazias/null`)
      console.error(`    3. Nomes das colunas estão diferentes (ex: "Q 1" em vez de "Q1")`)
      console.error(`  → SOLUÇÃO: Execute o script de diagnóstico:`)
      console.error(`     node scripts/diagnosticar-excel.js "caminho-do-arquivo.xlsx"`)
    }

    // ========== FASE 6: BATCH INSERT DE TURMAS ==========
    console.log('[FASE 6] Criando turmas em batch...')
    if (turmasParaInserir.length > 0) {
      const tempToRealTurmas = new Map<string, string>()
      for (const turma of turmasParaInserir) {
        try {
          const result = await pool.query(
            'INSERT INTO turmas (codigo, nome, escola_id, serie, ano_letivo) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (escola_id, codigo, ano_letivo) DO UPDATE SET serie = EXCLUDED.serie RETURNING id',
            [turma.codigo, turma.nome, turma.escola_id, turma.serie, turma.ano_letivo]
          )
          tempToRealTurmas.set(turma.tempId, result.rows[0].id)
        } catch (error: any) {
          console.error(`Erro ao criar turma ${turma.codigo}:`, error.message)
        }
      }

      // Atualizar referências temporárias com IDs reais
      alunosParaInserir.forEach(a => {
        if (a.turma_id && a.turma_id.startsWith('TEMP_TURMA_')) {
          a.turma_id = tempToRealTurmas.get(a.turma_id) || null
        }
      })
      consolidadosParaInserir.forEach(c => {
        if (c.turma_id && c.turma_id.startsWith('TEMP_TURMA_')) {
          c.turma_id = tempToRealTurmas.get(c.turma_id) || null
        }
      })
      resultadosParaInserir.forEach(r => {
        if (r.turma_id && r.turma_id.startsWith('TEMP_TURMA_')) {
          r.turma_id = tempToRealTurmas.get(r.turma_id) || null
        }
      })
      console.log(`  → ${turmasParaInserir.length} turmas criadas`)
    }

    // ========== FASE 7: BATCH INSERT DE ALUNOS ==========
    console.log('[FASE 7] Criando alunos em batch...')
    if (alunosParaInserir.length > 0) {
      const tempToRealAlunos = new Map<string, string>()
      let alunosComErro = 0
      const alunosComErroList: string[] = []
      
      for (const aluno of alunosParaInserir) {
        try {
          // Verificar se aluno já existe (mesmo nome, escola, turma e ano letivo)
          const nomeNormalizado = aluno.nome.toUpperCase().trim()
          const checkResult = await pool.query(
            `SELECT id FROM alunos 
             WHERE UPPER(TRIM(nome)) = $1 
             AND escola_id = $2 
             AND (turma_id = $3 OR (turma_id IS NULL AND $3::uuid IS NULL))
             AND (ano_letivo = $4 OR (ano_letivo IS NULL AND $4 IS NULL))
             AND ativo = true
             LIMIT 1`,
            [nomeNormalizado, aluno.escola_id, aluno.turma_id, aluno.ano_letivo]
          )
          
          if (checkResult.rows.length > 0) {
            // Aluno já existe - atualizar e usar ID existente
            const alunoIdExistente = checkResult.rows[0].id
            await pool.query(
              `UPDATE alunos 
               SET turma_id = $1, serie = $2, atualizado_em = CURRENT_TIMESTAMP
               WHERE id = $3`,
              [aluno.turma_id, aluno.serie, alunoIdExistente]
            )
            tempToRealAlunos.set(aluno.tempId, alunoIdExistente)
            resultado.alunos.existentes++
          } else {
            // Aluno não existe - criar novo
            const result = await pool.query(
              'INSERT INTO alunos (codigo, nome, escola_id, turma_id, serie, ano_letivo) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
              [aluno.codigo, aluno.nome, aluno.escola_id, aluno.turma_id, aluno.serie, aluno.ano_letivo]
            )
            if (result.rows.length > 0 && result.rows[0].id) {
              tempToRealAlunos.set(aluno.tempId, result.rows[0].id)
              resultado.alunos.criados++
            } else {
              alunosComErro++
              alunosComErroList.push(`Aluno "${aluno.nome}" (${aluno.codigo}): Não retornou ID`)
              console.error(`⚠️ Aluno "${aluno.nome}" não retornou ID após inserção`)
            }
          }
        } catch (error: any) {
          alunosComErro++
          alunosComErroList.push(`Aluno "${aluno.nome}" (${aluno.codigo}): ${error.message}`)
          console.error(`❌ Erro ao criar/atualizar aluno ${aluno.nome} (${aluno.codigo}):`, error.message)
          erros.push(`Aluno "${aluno.nome}": ${error.message}`)
        }
      }

      // Contagem já feita dentro do loop (resultado.alunos.criados e resultado.alunos.existentes)
      if (alunosComErro > 0) {
        console.error(`⚠️ ATENÇÃO: ${alunosComErro} alunos tiveram erros!`)
        console.error(`   Alunos com erro:`, alunosComErroList.slice(0, 10))
        if (alunosComErroList.length > 10) {
          console.error(`   ... e mais ${alunosComErroList.length - 10} alunos com erro`)
        }
      }

      // Atualizar referências temporárias com IDs reais
      // IMPORTANTE: Alunos existentes já têm IDs reais, não precisam conversão
      let consolidadosSemAluno = 0
      let resultadosSemAluno = 0
      
      consolidadosParaInserir.forEach(c => {
        if (c.aluno_id && c.aluno_id.startsWith('TEMP_ALUNO_')) {
          const realId = tempToRealAlunos.get(c.aluno_id)
          if (realId) {
            c.aluno_id = realId
          } else {
            consolidadosSemAluno++
            console.error(`⚠️ Consolidado sem aluno: tempId ${c.aluno_id} não foi convertido`)
          }
        }
        // Se não começa com TEMP_, já é ID real (aluno existente) - não precisa fazer nada
      })
      
      resultadosParaInserir.forEach(r => {
        if (r.aluno_id && r.aluno_id.startsWith('TEMP_ALUNO_')) {
          const realId = tempToRealAlunos.get(r.aluno_id)
          if (realId) {
            r.aluno_id = realId
          } else {
            resultadosSemAluno++
          }
        }
        // Se não começa com TEMP_, já é ID real (aluno existente) - não precisa fazer nada
      })

      // Atualizar IDs temporários nos resultados de produção textual
      let producaoSemAluno = 0
      producaoParaInserir.forEach(p => {
        if (p.aluno_id && p.aluno_id.startsWith('TEMP_ALUNO_')) {
          const realId = tempToRealAlunos.get(p.aluno_id)
          if (realId) {
            p.aluno_id = realId
          } else {
            producaoSemAluno++
          }
        }
      })
      if (producaoSemAluno > 0) {
        console.error(`⚠️ ${producaoSemAluno} resultados de produção sem aluno válido`)
      }

      if (consolidadosSemAluno > 0) {
        console.error(`⚠️ ${consolidadosSemAluno} consolidados sem aluno válido`)
      }
      if (resultadosSemAluno > 0) {
        console.error(`⚠️ ${resultadosSemAluno} resultados sem aluno válido após conversão de IDs`)
        // DIAGNÓSTICO: Mostrar exemplos de IDs temporários que não foram convertidos
        const exemplosNaoConvertidos = resultadosParaInserir
          .filter(r => r.aluno_id && r.aluno_id.startsWith('TEMP_ALUNO_'))
          .slice(0, 5)
          .map(r => r.aluno_id)
        if (exemplosNaoConvertidos.length > 0) {
          console.error(`  → Exemplos de IDs temporários não convertidos: ${exemplosNaoConvertidos.join(', ')}`)
          console.error(`  → Total de alunos criados no mapa: ${tempToRealAlunos.size}`)
        }
      }
      
      // DIAGNÓSTICO: Verificar quantos resultados têm IDs reais após conversão
      const resultadosComIdReal = resultadosParaInserir.filter(r => r.aluno_id && !r.aluno_id.startsWith('TEMP_')).length
      const resultadosComIdTemporario = resultadosParaInserir.filter(r => r.aluno_id && r.aluno_id.startsWith('TEMP_')).length
      console.log(`  → Após conversão: ${resultadosComIdReal} resultados com ID real, ${resultadosComIdTemporario} ainda com ID temporário`)
      
      console.log(`  → ${resultado.alunos.criados} alunos criados`)
      console.log(`  → ${resultado.alunos.existentes} alunos atualizados (já existiam)`)
      if (alunosComErro > 0) {
        console.log(`  → ${alunosComErro} alunos falharam`)
      }
    }

    // ========== FASE 8: BATCH INSERT DE RESULTADOS CONSOLIDADOS ==========
    console.log('[FASE 8] Criando resultados consolidados em batch...')
    if (consolidadosParaInserir.length > 0) {
      let consolidadosCriados = 0
      let consolidadosComErro = 0
      let consolidadosPulados = 0
      
      for (const consolidado of consolidadosParaInserir) {
        // Pular apenas se ainda tiver ID temporário (aluno não foi criado)
        if (!consolidado.aluno_id || consolidado.aluno_id.startsWith('TEMP_')) {
          consolidadosPulados++
          continue
        }

        try {
          const result = await pool.query(
            `INSERT INTO resultados_consolidados
             (aluno_id, escola_id, turma_id, ano_letivo, serie, presenca,
              total_acertos_lp, total_acertos_ch, total_acertos_mat, total_acertos_cn,
              nota_lp, nota_ch, nota_mat, nota_cn, media_aluno,
              nota_producao, nivel_aprendizagem, nivel_aprendizagem_id,
              tipo_avaliacao, total_questoes_esperadas,
              item_producao_1, item_producao_2, item_producao_3, item_producao_4,
              item_producao_5, item_producao_6, item_producao_7, item_producao_8)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                     $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
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
               nivel_aprendizagem_id = EXCLUDED.nivel_aprendizagem_id,
               tipo_avaliacao = EXCLUDED.tipo_avaliacao,
               total_questoes_esperadas = EXCLUDED.total_questoes_esperadas,
               item_producao_1 = EXCLUDED.item_producao_1,
               item_producao_2 = EXCLUDED.item_producao_2,
               item_producao_3 = EXCLUDED.item_producao_3,
               item_producao_4 = EXCLUDED.item_producao_4,
               item_producao_5 = EXCLUDED.item_producao_5,
               item_producao_6 = EXCLUDED.item_producao_6,
               item_producao_7 = EXCLUDED.item_producao_7,
               item_producao_8 = EXCLUDED.item_producao_8,
               atualizado_em = CURRENT_TIMESTAMP`,
            [
              consolidado.aluno_id,
              consolidado.escola_id,
              consolidado.turma_id,
              consolidado.ano_letivo,
              consolidado.serie,
              consolidado.presenca,
              consolidado.total_acertos_lp,
              consolidado.total_acertos_ch,
              consolidado.total_acertos_mat,
              consolidado.total_acertos_cn,
              consolidado.nota_lp,
              consolidado.nota_ch,
              consolidado.nota_mat,
              consolidado.nota_cn,
              consolidado.media_aluno,
              consolidado.nota_producao,
              consolidado.nivel_aprendizagem,
              consolidado.nivel_aprendizagem_id,
              consolidado.tipo_avaliacao,
              consolidado.total_questoes_esperadas,
              consolidado.item_producao_1,
              consolidado.item_producao_2,
              consolidado.item_producao_3,
              consolidado.item_producao_4,
              consolidado.item_producao_5,
              consolidado.item_producao_6,
              consolidado.item_producao_7,
              consolidado.item_producao_8,
            ]
          )
          consolidadosCriados++
        } catch (error: any) {
          consolidadosComErro++
          console.error(`❌ Erro ao criar consolidado para aluno ${consolidado.aluno_id}:`, error.message)
          erros.push(`Consolidado aluno ${consolidado.aluno_id}: ${error.message}`)
        }
      }
      
      if (consolidadosPulados > 0) {
        console.error(`⚠️ ${consolidadosPulados} consolidados pulados (alunos não criados)`)
      }
      if (consolidadosComErro > 0) {
        console.error(`⚠️ ${consolidadosComErro} consolidados com erro`)
      }
      console.log(`  → ${consolidadosCriados} consolidados criados/atualizados com sucesso`)
    }

    // ========== FASE 8.5: BATCH INSERT DE RESULTADOS DE PRODUÇÃO TEXTUAL ==========
    console.log('[FASE 8.5] Criando resultados de produção textual em batch...')
    if (producaoParaInserir.length > 0) {
      // Converter IDs temporários para IDs reais
      const tempToRealAlunos = new Map<string, string>()
      alunosParaInserir.forEach((a, idx) => {
        // O mapa foi preenchido na fase 7, mas precisamos reconstruir se necessário
      })

      // Atualizar IDs temporários
      producaoParaInserir.forEach(p => {
        if (p.aluno_id && p.aluno_id.startsWith('TEMP_ALUNO_')) {
          // Buscar no array de consolidados que já foi processado
          const consolidadoCorrespondente = consolidadosParaInserir.find(c =>
            c.aluno_id && !c.aluno_id.startsWith('TEMP_')
          )
          // Mantém o ID se já foi convertido anteriormente
        }
      })

      // Filtrar apenas resultados com IDs reais
      const producaoValida = producaoParaInserir.filter(
        p => p.aluno_id && !p.aluno_id.startsWith('TEMP_')
      )

      let producaoCriada = 0
      let producaoComErro = 0

      for (const producao of producaoValida) {
        try {
          await pool.query(
            `INSERT INTO resultados_producao
             (aluno_id, escola_id, turma_id, item_producao_id, ano_letivo, serie, nota)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (aluno_id, item_producao_id, ano_letivo)
             DO UPDATE SET
               nota = EXCLUDED.nota,
               atualizado_em = CURRENT_TIMESTAMP`,
            [
              producao.aluno_id,
              producao.escola_id,
              producao.turma_id,
              producao.item_producao_id,
              producao.ano_letivo,
              producao.serie,
              producao.nota,
            ]
          )
          producaoCriada++
        } catch (error: any) {
          producaoComErro++
          if (producaoComErro <= 5) {
            console.error(`❌ Erro ao criar produção: ${error.message}`)
          }
        }
      }

      console.log(`  → ${producaoCriada} resultados de produção criados/atualizados`)
      if (producaoComErro > 0) {
        console.error(`  → ${producaoComErro} erros`)
      }
    } else {
      console.log('  → Nenhum resultado de produção textual para inserir')
    }

    // ========== FASE 9: BATCH INSERT DE RESULTADOS DE PROVAS ==========
    console.log('[FASE 9] Criando resultados de provas em batch...')
    console.log(`  → Total de resultados no array: ${resultadosParaInserir.length}`)
    
    if (resultadosParaInserir.length > 0) {
      // DIAGNÓSTICO: Verificar quantos têm IDs temporários
      const comIdTemporario = resultadosParaInserir.filter(r => r.aluno_id && r.aluno_id.startsWith('TEMP_')).length
      const semAlunoId = resultadosParaInserir.filter(r => !r.aluno_id).length
      const comIdReal = resultadosParaInserir.filter(r => r.aluno_id && !r.aluno_id.startsWith('TEMP_')).length
      
      console.log(`  → Diagnóstico: ${comIdReal} com ID real, ${comIdTemporario} com ID temporário, ${semAlunoId} sem aluno_id`)
      
      // Filtrar apenas resultados com IDs reais (não temporários)
      const resultadosValidos = resultadosParaInserir.filter(
        r => r.aluno_id && !r.aluno_id.startsWith('TEMP_')
      )
      
      const resultadosInvalidos = resultadosParaInserir.length - resultadosValidos.length
      if (resultadosInvalidos > 0) {
        console.error(`⚠️ ${resultadosInvalidos} resultados descartados (alunos não criados ou IDs temporários não convertidos)`)
        // Mostrar exemplos de IDs temporários para diagnóstico
        const exemplosTemporarios = resultadosParaInserir
          .filter(r => r.aluno_id && r.aluno_id.startsWith('TEMP_'))
          .slice(0, 5)
          .map(r => r.aluno_id)
        if (exemplosTemporarios.length > 0) {
          console.error(`  → Exemplos de IDs temporários: ${exemplosTemporarios.join(', ')}`)
        }
      }

      const BATCH_SIZE = 500
      let batchesComErro = 0
      
      for (let i = 0; i < resultadosValidos.length; i += BATCH_SIZE) {
        const batch = resultadosValidos.slice(i, i + BATCH_SIZE)

        try {
          const valores = batch.map((_, idx) => {
            const base = idx * 16
            return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12}, $${base + 13}, $${base + 14}, $${base + 15}, $${base + 16})`
          }).join(', ')

          const params = batch.flatMap(r => [
            r.escola_id, r.aluno_id, r.aluno_codigo, r.aluno_nome, r.turma_id,
            r.questao_id, r.questao_codigo, r.resposta_aluno, r.acertou, r.nota,
            r.ano_letivo, r.serie, r.turma, r.disciplina, r.area_conhecimento, r.presenca,
          ])

          const insertResult = await pool.query(
            `INSERT INTO resultados_provas 
             (escola_id, aluno_id, aluno_codigo, aluno_nome, turma_id, questao_id, questao_codigo, 
              resposta_aluno, acertou, nota, ano_letivo, serie, turma, disciplina, area_conhecimento, presenca)
             VALUES ${valores}
             ON CONFLICT (aluno_id, questao_codigo, ano_letivo) 
             DO UPDATE SET 
               resposta_aluno = EXCLUDED.resposta_aluno,
               acertou = EXCLUDED.acertou,
               nota = EXCLUDED.nota,
               atualizado_em = CURRENT_TIMESTAMP
             RETURNING id`,
            params
          )

          resultado.resultados.novos += insertResult.rows.length
          resultado.resultados.duplicados += (batch.length - insertResult.rows.length)
          
          if ((i / BATCH_SIZE + 1) % 10 === 0) {
            console.log(`  → Processado ${Math.min(i + BATCH_SIZE, resultadosValidos.length)}/${resultadosValidos.length} resultados`)
          }
        } catch (error: any) {
          batchesComErro++
          console.error(`❌ Erro no batch ${Math.floor(i / BATCH_SIZE) + 1} de resultados:`, error.message)
          erros.push(`Batch resultados ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
          // Tentar inserir individualmente como fallback
          console.log(`  → Tentando inserir ${batch.length} resultados individualmente...`)
          for (const r of batch) {
            try {
              const individualResult = await pool.query(
                `INSERT INTO resultados_provas 
                 (escola_id, aluno_id, aluno_codigo, aluno_nome, turma_id, questao_id, questao_codigo, 
                  resposta_aluno, acertou, nota, ano_letivo, serie, turma, disciplina, area_conhecimento, presenca)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                 ON CONFLICT (aluno_id, questao_codigo, ano_letivo) 
                 DO UPDATE SET 
                   resposta_aluno = EXCLUDED.resposta_aluno,
                   acertou = EXCLUDED.acertou,
                   nota = EXCLUDED.nota,
                   atualizado_em = CURRENT_TIMESTAMP
                 RETURNING id`,
                [
                  r.escola_id, r.aluno_id, r.aluno_codigo, r.aluno_nome, r.turma_id,
                  r.questao_id, r.questao_codigo, r.resposta_aluno, r.acertou, r.nota,
                  r.ano_letivo, r.serie, r.turma, r.disciplina, r.area_conhecimento, r.presenca,
                ]
              )
              if (individualResult.rows.length > 0) {
                resultado.resultados.novos++
              } else {
                resultado.resultados.duplicados++
              }
            } catch (err: any) {
              resultado.resultados.duplicados++
            }
          }
        }
      }
      
      if (batchesComErro > 0) {
        console.error(`⚠️ ${batchesComErro} batches com erro (tentativa de fallback individual)`)
      }
      console.log(`  → ${resultado.resultados.novos} novos, ${resultado.resultados.duplicados} duplicados`)
      console.log(`  → ${resultadosInvalidos} descartados (alunos não criados)`)
    } else {
      console.error(`❌ ATENÇÃO: Nenhum resultado para inserir! Array resultadosParaInserir está vazio.`)
      console.error(`  → Isso pode indicar que as colunas Q1-Q60 não foram encontradas no Excel`)
      console.error(`  → ou que todas as questões estavam vazias/null`)
    }

    // ========== VALIDAÇÃO FINAL ==========
    console.log('[VALIDAÇÃO] Verificando dados importados...')
    const alunosImportados = await pool.query(
      'SELECT COUNT(*) as total FROM alunos WHERE ano_letivo = $1',
      [anoLetivo]
    )
    const consolidadosImportados = await pool.query(
      'SELECT COUNT(*) as total FROM resultados_consolidados WHERE ano_letivo = $1',
      [anoLetivo]
    )
    const resultadosImportados = await pool.query(
      'SELECT COUNT(*) as total FROM resultados_provas WHERE ano_letivo = $1',
      [anoLetivo]
    )
    
    const totalAlunosNoBanco = parseInt(alunosImportados.rows[0].total)
    const totalConsolidadosNoBanco = parseInt(consolidadosImportados.rows[0].total)
    const totalResultadosNoBanco = parseInt(resultadosImportados.rows[0].total)
    
    console.log(`  → Alunos no banco: ${totalAlunosNoBanco}`)
    console.log(`  → Consolidados no banco: ${totalConsolidadosNoBanco}`)
    console.log(`  → Resultados de provas no banco: ${totalResultadosNoBanco}`)
    
    // Verificar se todos os alunos esperados foram importados
    const alunosEsperados = dados.length
    if (totalAlunosNoBanco < alunosEsperados) {
      const faltando = alunosEsperados - totalAlunosNoBanco
      console.error(`⚠️ ATENÇÃO: Faltam ${faltando} alunos! Esperado: ${alunosEsperados}, Importado: ${totalAlunosNoBanco}`)
      erros.push(`FALTAM ${faltando} ALUNOS: Esperado ${alunosEsperados}, mas apenas ${totalAlunosNoBanco} foram importados`)
    } else if (totalAlunosNoBanco > alunosEsperados) {
      console.log(`ℹ️ Mais alunos no banco (${totalAlunosNoBanco}) que no arquivo (${alunosEsperados}) - pode haver alunos de importações anteriores`)
    } else {
      console.log(`✅ Todos os ${alunosEsperados} alunos foram importados com sucesso!`)
    }

    // ========== FINALIZAÇÃO ==========
    const endTime = Date.now()
    const duracao = ((endTime - startTime) / 1000).toFixed(2)
    console.log(`[IMPORTAÇÃO ${importacaoId}] Concluída em ${duracao}s`)
    console.log(`[RESUMO FINAL]`)
    console.log(`  - Alunos: ${resultado.alunos.criados} criados, ${resultado.alunos.existentes} existentes`)
    console.log(`  - Consolidados: ${totalConsolidadosNoBanco} no banco`)
    console.log(`  - Resultados: ${resultado.resultados.novos} novos, ${resultado.resultados.duplicados} duplicados`)
    console.log(`  - Erros: ${resultado.resultados.erros} linhas com erro`)

    await pool.query(
      `UPDATE importacoes
       SET linhas_processadas = $1, linhas_com_erro = $2,
           status = $3, concluido_em = CURRENT_TIMESTAMP,
           erros = $4,
           polos_criados = $5, polos_existentes = $6,
           escolas_criadas = $7, escolas_existentes = $8,
           turmas_criadas = $9, turmas_existentes = $10,
           alunos_criados = $11, alunos_existentes = $12,
           questoes_criadas = $13, questoes_existentes = $14,
           resultados_novos = $15, resultados_duplicados = $16
       WHERE id = $17`,
      [
        resultado.resultados.processados,
        resultado.resultados.erros,
        resultado.resultados.erros === dados.length ? 'erro' : 'concluido',
        erros.length > 0 ? erros.slice(0, 50).join('\n') : null,
        resultado.polos.criados, resultado.polos.existentes,
        resultado.escolas.criados, resultado.escolas.existentes,
        resultado.turmas.criados, resultado.turmas.existentes,
        resultado.alunos.criados, resultado.alunos.existentes,
        resultado.questoes.criadas, resultado.questoes.existentes,
        resultado.resultados.novos, resultado.resultados.duplicados,
        importacaoId,
      ]
    )
  } catch (error: any) {
    console.error('Erro no processamento:', error)
    await pool.query(
      'UPDATE importacoes SET status = \'erro\', erros = $1, concluido_em = CURRENT_TIMESTAMP WHERE id = $2',
      [error.message || 'Erro desconhecido', importacaoId]
    ).catch(console.error)
  }
}


