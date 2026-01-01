import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'
export const maxDuration = 900 // 15 minutos máximo

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

    // Carregar escolas existentes
    const escolasDB = await pool.query('SELECT id, nome FROM escolas')
    escolasDB.rows.forEach((e: any) => {
      escolasMap.set(e.nome.toUpperCase().trim(), e.id)
    })
    console.log(`  → ${escolasDB.rows.length} escolas carregadas`)

    // Carregar turmas existentes do ano letivo
    const turmasDB = await pool.query(
      'SELECT id, codigo, escola_id FROM turmas WHERE ano_letivo = $1',
      [anoLetivo]
    )
    turmasDB.rows.forEach((t: any) => {
      turmasMap.set(`${t.codigo}_${t.escola_id}`, t.id)
    })
    console.log(`  → ${turmasDB.rows.length} turmas carregadas (ano ${anoLetivo})`)

    // Carregar alunos existentes do ano letivo (apenas para referência, não para evitar duplicados)
    // IMPORTANTE: Não vamos usar este mapa para evitar duplicados, pois queremos importar TODOS
    const alunosDB = await pool.query(
      'SELECT id, nome, escola_id FROM alunos WHERE ano_letivo = $1',
      [anoLetivo]
    )
    // Não mapear alunos existentes - vamos criar novos para cada linha do Excel
    console.log(`  → ${alunosDB.rows.length} alunos existentes no banco (ano ${anoLetivo}) - serão criados novos mesmo se duplicados`)

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

    // Criar escolas faltantes
    for (const [nomeEscola, nomePolo] of escolasUnicas) {
      const escolaNorm = nomeEscola.toUpperCase().trim()
      if (!escolasMap.has(escolaNorm)) {
        const poloId = polosMap.get(nomePolo.toUpperCase().trim())
        if (poloId) {
          try {
            const result = await pool.query(
              'INSERT INTO escolas (nome, codigo, polo_id) VALUES ($1, $2, $3) RETURNING id',
              [nomeEscola, escolaNorm.replace(/\s+/g, '_').substring(0, 50), poloId]
            )
            escolasMap.set(escolaNorm, result.rows[0].id)
            resultado.escolas.criados++
          } catch (error: any) {
            erros.push(`Escola "${nomeEscola}": ${error.message}`)
          }
        }
      }
    }
    resultado.escolas.existentes = escolasUnicas.size - resultado.escolas.criados
    console.log(`  → Polos: ${resultado.polos.criados} criados, ${resultado.polos.existentes} existentes`)
    console.log(`  → Escolas: ${resultado.escolas.criados} criadas, ${resultado.escolas.existentes} existentes`)

    // ========== FASE 4: CRIAR QUESTÕES ==========
    console.log('[FASE 4] Criando questões...') 
    const areas = [
      { inicio: 1, fim: 20, area: 'Língua Portuguesa', disciplina: 'Língua Portuguesa' },
      { inicio: 21, fim: 30, area: 'Ciências Humanas', disciplina: 'Ciências Humanas' },
      { inicio: 31, fim: 50, area: 'Matemática', disciplina: 'Matemática' },
      { inicio: 51, fim: 60, area: 'Ciências da Natureza', disciplina: 'Ciências da Natureza' },
    ]

    for (const { inicio, fim, area, disciplina } of areas) {
      for (let num = inicio; num <= fim; num++) {
        const codigo = `Q${num}`
        if (!questoesMap.has(codigo)) {
          try {
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
    }
    resultado.questoes.existentes = 60 - resultado.questoes.criadas
    console.log(`  → ${resultado.questoes.criadas} criadas, ${resultado.questoes.existentes} existentes`)

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

    for (let i = 0; i < dados.length; i++) {
      try {
        const linha = dados[i] as any

        const escolaNome = (linha['ESCOLA'] || linha['Escola'] || linha['escola'] || '').toString().trim()
        const alunoNome = (linha['ALUNO'] || linha['Aluno'] || linha['aluno'] || '').toString().trim()
        const turmaCodigo = (linha['TURMA'] || linha['Turma'] || linha['turma'] || '').toString().trim()
        const serie = (linha['ANO/SÉRIE'] || linha['ANO/SERIE'] || linha['Série'] || linha['serie'] || linha['Ano'] || '').toString().trim()
        
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
        let presenca = 'P' // Padrão: Presente
        
        // Verificar se existe coluna FALTA (indica falta)
        const colunaFalta = linha['FALTA'] || linha['Falta'] || linha['falta']
        const colunaPresenca = linha['PRESENÇA'] || linha['Presença'] || linha['presenca']
        
        if (colunaFalta !== undefined && colunaFalta !== null && colunaFalta !== '') {
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
        } else if (colunaPresenca !== undefined && colunaPresenca !== null && colunaPresenca !== '') {
          // Se existe coluna PRESENÇA, verificar o valor
          const valorPresenca = colunaPresenca.toString().trim().toUpperCase()
          if (valorPresenca === 'P' || valorPresenca === 'PRESENTE' || valorPresenca === 'SIM' || valorPresenca === '1' || valorPresenca === 'S') {
            presenca = 'P'
          } else if (valorPresenca === 'F' || valorPresenca === 'FALTOU' || valorPresenca === 'AUSENTE' || valorPresenca === 'NAO' || valorPresenca === 'NÃO' || valorPresenca === '0' || valorPresenca === 'N') {
            presenca = 'F'
          }
        }
        
        // Log para debug (apenas primeiras 5 linhas com falta)
        if (presenca === 'F' && i < 5) {
          console.log(`[DEBUG] Linha ${i + 2}: Aluno "${alunoNome}" marcado como FALTANTE (FALTA: "${colunaFalta}", PRESENÇA: "${colunaPresenca}")`)
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

        // Criar aluno
        // IMPORTANTE: SEMPRE criar um novo aluno para cada linha do Excel
        // Mesmo que já exista um aluno com o mesmo nome na mesma escola, criar um novo
        // Isso garante que todos os 978 alunos sejam importados, mesmo duplicados
        const codigoAluno = `ALU${proximoNumeroAluno.toString().padStart(4, '0')}`
        proximoNumeroAluno++
        const alunoId = `TEMP_ALUNO_${alunosParaInserir.length}`
        
        // Chave única por linha do Excel (incluindo índice)
        const alunoKey = `${alunoNome.toUpperCase().trim()}_${escolaId}_${i}_${alunosParaInserir.length}`
        
        alunosParaInserir.push({
          tempId: alunoId,
          codigo: codigoAluno,
          nome: alunoNome,
          escola_id: escolaId,
          turma_id: turmaId,
          serie: serie || null,
          ano_letivo: anoLetivo,
        })
        
        // Mapear apenas pela chave única desta linha
        alunosMap.set(alunoKey, alunoId)
        resultado.alunos.criados++

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

        const notaLP = extrairDecimal(linha['NOTA-LP'] || linha['NOTA_LP'] || linha['Nota-LP'])
        const notaCH = extrairDecimal(linha['NOTA-CH'] || linha['NOTA_CH'] || linha['Nota-CH'])
        const notaMAT = extrairDecimal(linha['NOTA-MAT'] || linha['NOTA_MAT'] || linha['Nota-MAT'])
        const notaCN = extrairDecimal(linha['NOTA-CN'] || linha['NOTA_CN'] || linha['Nota-CN'])
        const mediaAluno = extrairDecimal(linha['MED_ALUNO'] || linha['MED ALUNO'] || linha['Media'] || linha['Média'])

        // IMPORTANTE: Se aluno faltou, zerar acertos e notas
        // Também considerar média 0,00 como faltante
        let presencaFinal = presenca || 'P'
        const mediaFinal = mediaAluno !== null && mediaAluno !== undefined ? parseFloat(mediaAluno.toString()) : null
        
        // Se média for 0,00 ou null, considerar como faltante
        if (mediaFinal === 0 || mediaFinal === null || mediaFinal === undefined) {
          presencaFinal = 'F'
        }
        
        const alunoFaltou = presencaFinal === 'F'
        
        // Adicionar consolidado à fila
        consolidadosParaInserir.push({
          aluno_id: alunoId,
          escola_id: escolaId,
          turma_id: turmaId,
          ano_letivo: anoLetivo,
          serie: serie || null,
          presenca: presencaFinal,
          // Se faltou, zerar acertos e notas
          total_acertos_lp: alunoFaltou ? 0 : totalAcertosLP,
          total_acertos_ch: alunoFaltou ? 0 : totalAcertosCH,
          total_acertos_mat: alunoFaltou ? 0 : totalAcertosMAT,
          total_acertos_cn: alunoFaltou ? 0 : totalAcertosCN,
          nota_lp: alunoFaltou ? null : notaLP,
          nota_ch: alunoFaltou ? null : notaCH,
          nota_mat: alunoFaltou ? null : notaMAT,
          nota_cn: alunoFaltou ? null : notaCN,
          media_aluno: alunoFaltou ? null : mediaAluno,
        })

        // Processar questões
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

            // IMPORTANTE: Se aluno faltou, zerar nota e acerto
            // Usar presencaFinal que já considera média 0,00
            const presencaFinalQuestao = (mediaFinal === 0 || mediaFinal === null || mediaFinal === undefined) ? 'F' : (presenca || 'P')
            const alunoFaltouQuestao = presencaFinalQuestao === 'F'
            
            resultadosParaInserir.push({
              escola_id: escolaId,
              aluno_id: alunoId,
              aluno_codigo: null,
              aluno_nome: alunoNome,
              turma_id: turmaId,
              questao_id: questaoId,
              questao_codigo: questaoCodigo,
              resposta_aluno: alunoFaltouQuestao ? null : (acertou ? '1' : '0'),
              acertou: alunoFaltouQuestao ? false : acertou,
              nota: alunoFaltouQuestao ? 0 : nota,
              ano_letivo: anoLetivo,
              serie: serie || null,
              turma: turmaCodigo || null,
              disciplina,
              area_conhecimento: area,
              presenca: presencaFinalQuestao,
            })
          }
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
          const result = await pool.query(
            'INSERT INTO alunos (codigo, nome, escola_id, turma_id, serie, ano_letivo) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [aluno.codigo, aluno.nome, aluno.escola_id, aluno.turma_id, aluno.serie, aluno.ano_letivo]
          )
          if (result.rows.length > 0 && result.rows[0].id) {
            tempToRealAlunos.set(aluno.tempId, result.rows[0].id)
          } else {
            alunosComErro++
            alunosComErroList.push(`Aluno "${aluno.nome}" (${aluno.codigo}): Não retornou ID`)
            console.error(`⚠️ Aluno "${aluno.nome}" não retornou ID após inserção`)
          }
        } catch (error: any) {
          alunosComErro++
          alunosComErroList.push(`Aluno "${aluno.nome}" (${aluno.codigo}): ${error.message}`)
          console.error(`❌ Erro ao criar aluno ${aluno.nome} (${aluno.codigo}):`, error.message)
          erros.push(`Aluno "${aluno.nome}": ${error.message}`)
        }
      }

      // Verificar quantos alunos foram criados com sucesso
      const alunosCriadosComSucesso = tempToRealAlunos.size
      const alunosNaoCriados = alunosParaInserir.length - alunosCriadosComSucesso
      
      if (alunosNaoCriados > 0) {
        console.error(`⚠️ ATENÇÃO: ${alunosNaoCriados} alunos não foram criados!`)
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
      
      if (consolidadosSemAluno > 0) {
        console.error(`⚠️ ${consolidadosSemAluno} consolidados sem aluno válido`)
      }
      if (resultadosSemAluno > 0) {
        console.error(`⚠️ ${resultadosSemAluno} resultados sem aluno válido`)
      }
      
      console.log(`  → ${alunosCriadosComSucesso} alunos criados com sucesso`)
      console.log(`  → ${alunosNaoCriados} alunos falharam`)
      resultado.alunos.criados = alunosCriadosComSucesso
      resultado.alunos.existentes = alunosParaInserir.length - alunosCriadosComSucesso - alunosNaoCriados
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
              consolidado.aluno_id,
              consolidado.escola_id,
              consolidado.turma_id,
              consolidado.ano_letivo,
              consolidado.serie,
              // IMPORTANTE: presenca já foi ajustada anteriormente considerando média 0,00
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

    // ========== FASE 9: BATCH INSERT DE RESULTADOS DE PROVAS ==========
    console.log('[FASE 9] Criando resultados de provas em batch...')
    if (resultadosParaInserir.length > 0) {
      // Filtrar apenas resultados com IDs reais (não temporários)
      const resultadosValidos = resultadosParaInserir.filter(
        r => r.aluno_id && !r.aluno_id.startsWith('TEMP_')
      )
      
      const resultadosInvalidos = resultadosParaInserir.length - resultadosValidos.length
      if (resultadosInvalidos > 0) {
        console.error(`⚠️ ${resultadosInvalidos} resultados descartados (alunos não criados)`)
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
             ON CONFLICT (aluno_id, questao_codigo, ano_letivo) DO NOTHING
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
              await pool.query(
                `INSERT INTO resultados_provas 
                 (escola_id, aluno_id, aluno_codigo, aluno_nome, turma_id, questao_id, questao_codigo, 
                  resposta_aluno, acertou, nota, ano_letivo, serie, turma, disciplina, area_conhecimento, presenca)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                 ON CONFLICT (aluno_id, questao_codigo, ano_letivo) DO NOTHING`,
                [
                  r.escola_id, r.aluno_id, r.aluno_codigo, r.aluno_nome, r.turma_id,
                  r.questao_id, r.questao_codigo, r.resposta_aluno, r.acertou, r.nota,
                  r.ano_letivo, r.serie, r.turma, r.disciplina, r.area_conhecimento, r.presenca,
                ]
              )
              resultado.resultados.novos++
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


