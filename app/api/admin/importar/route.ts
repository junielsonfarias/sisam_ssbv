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

    // Detectar nomes das colunas automaticamente
    const primeiraLinha = dados[0] as any
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
    console.log('Colunas encontradas:', {
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
    })

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

    // Processar cada linha
    for (let i = 0; i < dados.length; i++) {
      try {
        const linha = dados[i] as any

        // Extrair valores usando as colunas detectadas
        const escolaCodigo = colEscola ? (linha[colEscola] || '').toString().trim() : null
        const alunoCodigo = colAluno ? (linha[colAluno] || '').toString().trim() : null
        const alunoNome = colNomeAluno ? (linha[colNomeAluno] || '').toString().trim() : null
        const questaoCodigo = colQuestao ? (linha[colQuestao] || '').toString().trim() : null
        const respostaAluno = colResposta ? (linha[colResposta] || '').toString().trim() : null
        
        // Processar acertou
        let acertou: boolean | null = null
        if (colAcertou) {
          const valorAcertou = (linha[colAcertou] || '').toString().toLowerCase().trim()
          if (valorAcertou === 'sim' || valorAcertou === 's' || valorAcertou === 'true' || valorAcertou === '1' || valorAcertou === 'x' || valorAcertou === '✓') {
            acertou = true
          } else if (valorAcertou === 'não' || valorAcertou === 'nao' || valorAcertou === 'n' || valorAcertou === 'false' || valorAcertou === '0') {
            acertou = false
          }
        }
        
        const nota = colNota ? parseFloat((linha[colNota] || '0').toString().replace(',', '.')) || null : null
        
        // Processar data
        let dataProva: Date | null = null
        if (colData && linha[colData]) {
          try {
            const dataStr = linha[colData].toString()
            // Tentar diferentes formatos de data
            if (dataStr.includes('/')) {
              const [dia, mes, ano] = dataStr.split('/')
              dataProva = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia))
            } else {
              dataProva = new Date(dataStr)
            }
            if (isNaN(dataProva.getTime())) {
              dataProva = null
            }
          } catch {
            dataProva = null
          }
        }
        
        const anoLetivo = colAno ? (linha[colAno] || '').toString().trim() : null
        const serie = colSerie ? (linha[colSerie] || '').toString().trim() : null
        const turma = colTurma ? (linha[colTurma] || '').toString().trim() : null
        const disciplina = colDisciplina ? (linha[colDisciplina] || '').toString().trim() : null
        const areaConhecimento = colArea ? (linha[colArea] || '').toString().trim() : null

        // Validar dados mínimos
        if (!escolaCodigo && !alunoCodigo) {
          throw new Error('Linha sem código de escola ou aluno')
        }

        // Buscar escola pelo código ou nome
        let escolaId = null
        if (escolaCodigo) {
          const escolaResult = await pool.query(
            'SELECT id FROM escolas WHERE (codigo = $1 OR nome = $1 OR nome ILIKE $1) AND ativo = true LIMIT 1',
            [escolaCodigo]
          )
          if (escolaResult.rows.length > 0) {
            escolaId = escolaResult.rows[0].id
          } else {
            // Tentar buscar por parte do nome
            const escolaResult2 = await pool.query(
              'SELECT id FROM escolas WHERE (nome ILIKE $1 OR codigo ILIKE $1) AND ativo = true LIMIT 1',
              [`%${escolaCodigo}%`]
            )
            if (escolaResult2.rows.length > 0) {
              escolaId = escolaResult2.rows[0].id
            }
          }
        }

        if (!escolaId) {
          throw new Error(`Escola não encontrada: "${escolaCodigo || 'vazio'}"`)
        }

        // Buscar questão pelo código (opcional)
        let questaoId = null
        if (questaoCodigo) {
          const questaoResult = await pool.query(
            'SELECT id FROM questoes WHERE codigo = $1 LIMIT 1',
            [questaoCodigo]
          )
          if (questaoResult.rows.length > 0) {
            questaoId = questaoResult.rows[0].id
          }
        }

        // Inserir resultado
        await pool.query(
          `INSERT INTO resultados_provas 
           (escola_id, aluno_codigo, aluno_nome, questao_id, questao_codigo, 
            resposta_aluno, acertou, nota, data_prova, ano_letivo, serie, 
            turma, disciplina, area_conhecimento)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            escolaId,
            alunoCodigo || null,
            alunoNome || null,
            questaoId,
            questaoCodigo || null,
            respostaAluno || null,
            acertou,
            nota,
            dataProva,
            anoLetivo || null,
            serie || null,
            turma || null,
            disciplina || null,
            areaConhecimento || null,
          ]
        )

        linhasProcessadas++
      } catch (error: any) {
        linhasComErro++
        const mensagemErro = error.message || 'Erro desconhecido'
        erros.push(`Linha ${i + 2}: ${mensagemErro}`)
        // Limitar quantidade de erros para não sobrecarregar
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
        erros.length > 0 ? erros.slice(0, 50).join('\n') : null, // Limitar a 50 erros
        importacaoId,
      ]
    )

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
      erros: erros.slice(0, 20), // Retornar primeiros 20 erros
    })
  } catch (error: any) {
    console.error('Erro ao importar arquivo:', error)
    return NextResponse.json(
      { mensagem: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
