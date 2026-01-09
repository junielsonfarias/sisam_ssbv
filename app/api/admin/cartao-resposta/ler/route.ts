import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import sharp from 'sharp'
import Jimp from 'jimp'

interface CoordenadasQuestao {
  questao: string
  x: number
  y: number
  alternativas: Array<{ letra: string; y: number }>
}

export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const formData = await request.formData()
    const imagem = formData.get('imagem') as File
    const anoLetivo = formData.get('ano_letivo') as string
    const alunoId = formData.get('aluno_id') as string

    if (!imagem || !anoLetivo) {
      return NextResponse.json(
        { mensagem: 'Imagem e ano letivo são obrigatórios' },
        { status: 400 }
      )
    }

    // Converter imagem para buffer
    const arrayBuffer = await imagem.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Processar imagem com Sharp
    const imagemProcessada = await sharp(buffer)
      .greyscale()
      .normalize()
      .threshold(128) // Binarizar (preto e branco)
      .toBuffer()

    // Carregar com Jimp para análise de pixels
    const jimpImage = await Jimp.read(imagemProcessada)
    const width = jimpImage.getWidth()
    const height = jimpImage.getHeight()

    // Buscar questões do banco
    const questoesResult = await pool.query(
      'SELECT codigo FROM questoes WHERE ano_letivo = $1 ORDER BY codigo',
      [anoLetivo]
    )

    if (questoesResult.rows.length === 0) {
      return NextResponse.json(
        { mensagem: 'Nenhuma questão encontrada para o ano letivo informado' },
        { status: 404 }
      )
    }

    // Coordenadas aproximadas (ajustar conforme o template do PDF)
    // Estas coordenadas devem ser calibradas baseadas no PDF gerado
    const questoes: CoordenadasQuestao[] = []
    const questoesPorLinha = 5
    const espacamentoHorizontal = 100
    const espacamentoVertical = 62.5 // 25 * 2.5
    const xInicial = 50
    const yInicial = 200 // Ajustar conforme o cabeçalho do PDF
    const tamanhoBolinha = 7
    const espacamentoBolinhas = 12

    let questaoIndex = 0
    for (let linha = 0; linha < Math.ceil(questoesResult.rows.length / questoesPorLinha); linha++) {
      const yAtual = yInicial + (linha * espacamentoVertical)

      for (let col = 0; col < questoesPorLinha && questaoIndex < questoesResult.rows.length; col++) {
        const xAtual = xInicial + (col * espacamentoHorizontal)
        const questao = questoesResult.rows[questaoIndex].codigo

        const alternativas = ['A', 'B', 'C', 'D', 'E'].map((letra, index) => ({
          letra,
          y: yAtual + 10 + (index * espacamentoBolinhas)
        }))

        questoes.push({
          questao,
          x: xAtual + 5,
          y: yAtual,
          alternativas
        })

        questaoIndex++
      }
    }

    // Detectar marcações
    const respostas: Record<string, string> = {}
    const confianca: Record<string, number> = {}

    for (const questao of questoes) {
      let alternativaMarcada: string | null = null
      let maiorIntensidade = 0

      for (const alt of questao.alternativas) {
        // Analisar região da bolinha (área de 10x10 pixels ao redor do centro)
        let pixelsPretos = 0
        let totalPixels = 0

        for (let dx = -5; dx <= 5; dx++) {
          for (let dy = -5; dy <= 5; dy++) {
            const x = Math.round(questao.x + dx)
            const y = Math.round(alt.y + dy)

            if (x >= 0 && x < width && y >= 0 && y < height) {
              const pixel = Jimp.intToRGBA(jimpImage.getPixelColor(x, y))
              const intensidade = pixel.r // Já está em greyscale
              totalPixels++

              // Considerar preto se intensidade < 128
              if (intensidade < 128) {
                pixelsPretos++
              }
            }
          }
        }

        const percentualPreto = (pixelsPretos / totalPixels) * 100

        // Se mais de 60% da área está preta, consideramos marcado
        if (percentualPreto > 60 && percentualPreto > maiorIntensidade) {
          maiorIntensidade = percentualPreto
          alternativaMarcada = alt.letra
        }
      }

      if (alternativaMarcada) {
        respostas[questao.questao] = alternativaMarcada
        confianca[questao.questao] = maiorIntensidade
      }
    }

    // Salvar resultados no banco (se aluno fornecido)
    if (alunoId && Object.keys(respostas).length > 0) {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')

        // Buscar dados do aluno
        const alunoResult = await client.query(
          'SELECT a.*, e.id as escola_id, t.id as turma_id FROM alunos a LEFT JOIN escolas e ON a.escola_id = e.id LEFT JOIN turmas t ON a.turma_id = t.id WHERE a.id = $1',
          [alunoId]
        )

        if (alunoResult.rows.length > 0) {
          const aluno = alunoResult.rows[0]

          for (const [questaoCodigo, alternativa] of Object.entries(respostas)) {
            // Buscar questão
            const questaoResult = await client.query(
              'SELECT id FROM questoes WHERE codigo = $1 AND ano_letivo = $2',
              [questaoCodigo, anoLetivo]
            )

            if (questaoResult.rows.length > 0) {
              const questaoId = questaoResult.rows[0].id

              // Verificar se acertou (buscar gabarito)
              let acertou = false
              const gabaritoResult = await client.query(
                `SELECT gabarito FROM questoes_gabaritos 
                 WHERE questao_id = $1 AND serie = $2
                 UNION ALL
                 SELECT gabarito FROM questoes WHERE id = $1 AND gabarito IS NOT NULL
                 LIMIT 1`,
                [questaoId, aluno.serie || '']
              )

              if (gabaritoResult.rows.length > 0) {
                acertou = gabaritoResult.rows[0].gabarito === alternativa
              }

              // Inserir/atualizar resultado
              await client.query(
                `INSERT INTO resultados_provas 
                 (escola_id, aluno_id, turma_id, questao_id, questao_codigo, 
                  resposta_aluno, alternativa_marcada, acertou, nota, ano_letivo, serie)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                 ON CONFLICT DO NOTHING`,
                [
                  aluno.escola_id,
                  alunoId,
                  aluno.turma_id,
                  questaoId,
                  questaoCodigo,
                  alternativa,
                  alternativa,
                  acertou,
                  acertou ? 1 : 0,
                  anoLetivo,
                  aluno.serie || null
                ]
              )
            }
          }
        }

        await client.query('COMMIT')
      } catch (error: any) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    }

    return NextResponse.json({
      mensagem: 'Cartão-resposta processado com sucesso',
      total_questoes: questoes.length,
      respostas_detectadas: Object.keys(respostas).length,
      respostas,
      confianca,
      aluno_salvo: !!alunoId
    })
  } catch (error: any) {
    console.error('Erro ao processar cartão-resposta:', error)
    return NextResponse.json(
      { mensagem: 'Erro ao processar cartão-resposta', erro: error.message },
      { status: 500 }
    )
  }
}

