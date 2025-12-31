import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

// PDFKit precisa ser importado dinamicamente
const PDFDocument = require('pdfkit')

export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const anoLetivo = searchParams.get('ano_letivo')
    const serie = searchParams.get('serie')
    const alunoId = searchParams.get('aluno_id')

    if (!anoLetivo) {
      return NextResponse.json(
        { mensagem: 'Ano letivo é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar questões
    let queryQuestoes = 'SELECT codigo FROM questoes WHERE ano_letivo = $1 ORDER BY codigo'
    const paramsQuestoes: any[] = [anoLetivo]
    
    if (serie) {
      queryQuestoes = `
        SELECT DISTINCT q.codigo 
        FROM questoes q
        WHERE q.ano_letivo = $1 
          AND EXISTS (
            SELECT 1 FROM questoes_gabaritos g 
            WHERE g.questao_id = q.id AND g.serie = $2
          )
        ORDER BY q.codigo
      `
      paramsQuestoes.push(serie)
    }

    const questoesResult = await pool.query(queryQuestoes, paramsQuestoes)
    const questoes = questoesResult.rows.map((q: any) => q.codigo)

    if (questoes.length === 0) {
      return NextResponse.json(
        { mensagem: 'Nenhuma questão encontrada para os filtros selecionados' },
        { status: 404 }
      )
    }

    // Buscar dados do aluno se fornecido
    let aluno = null
    if (alunoId) {
      const alunoResult = await pool.query(
        'SELECT a.*, e.nome as escola_nome, t.codigo as turma_codigo FROM alunos a LEFT JOIN escolas e ON a.escola_id = e.id LEFT JOIN turmas t ON a.turma_id = t.id WHERE a.id = $1',
        [alunoId]
      )
      aluno = alunoResult.rows[0] || null
    }

    // Gerar PDF
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    })

    // Buffer para armazenar o PDF
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))

    // Cabeçalho
    doc.fontSize(18).font('Helvetica-Bold')
    doc.text('CARTÃO-RESPOSTA', { align: 'center' })
    doc.moveDown(0.5)

    doc.fontSize(11).font('Helvetica')
    doc.text(`Ano Letivo: ${anoLetivo}`, { align: 'center' })
    if (serie) doc.text(`Série: ${serie}`, { align: 'center' })
    doc.moveDown(1)

    // Dados do aluno (se fornecido)
    if (aluno) {
      doc.fontSize(10)
      doc.text(`Nome: ${aluno.nome || ''}`, { continued: false })
      doc.text(`Código: ${aluno.codigo || ''}`, { continued: false })
      if (aluno.escola_nome) doc.text(`Escola: ${aluno.escola_nome}`, { continued: false })
      if (aluno.turma_codigo) doc.text(`Turma: ${aluno.turma_codigo}`, { continued: false })
      doc.moveDown(1)
    } else {
      doc.fontSize(10)
      doc.text('Nome: _________________________________', { continued: false })
      doc.text('Código: _______________________________', { continued: false })
      doc.text('Escola: _______________________________', { continued: false })
      doc.text('Turma: _______________________________', { continued: false })
      doc.moveDown(1)
    }

    // Instruções
    doc.fontSize(9)
    doc.text('INSTRUÇÕES:', { underline: true })
    doc.text('• Use caneta preta ou azul para marcar as respostas')
    doc.text('• Preencha completamente a bolinha correspondente à alternativa escolhida')
    doc.text('• Não marque mais de uma alternativa por questão')
    doc.text('• Em caso de erro, preencha completamente a bolinha correta')
    doc.moveDown(1.5)

    // Grid de questões
    const questoesPorLinha = 5
    const espacamentoHorizontal = 100
    const espacamentoVertical = 25
    const tamanhoBolinha = 7
    const espacamentoBolinhas = 12

    let xInicial = 50
    let yInicial = doc.y
    let questaoIndex = 0

    for (let linha = 0; linha < Math.ceil(questoes.length / questoesPorLinha); linha++) {
      const yAtual = yInicial + (linha * espacamentoVertical * 2.5)

      for (let col = 0; col < questoesPorLinha && questaoIndex < questoes.length; col++) {
        const xAtual = xInicial + (col * espacamentoHorizontal)
        const questao = questoes[questaoIndex]

        // Número da questão
        doc.fontSize(8).font('Helvetica-Bold')
        doc.text(questao, xAtual, yAtual - 5)

        // Bolinhas A, B, C, D, E
        const alternativas = ['A', 'B', 'C', 'D', 'E']
        alternativas.forEach((alt, index) => {
          const yBolinha = yAtual + 10 + (index * espacamentoBolinhas)
          
          // Círculo
          doc.circle(xAtual + 5, yBolinha, tamanhoBolinha / 2)
            .stroke()
          
          // Letra da alternativa
          doc.fontSize(7).font('Helvetica')
          doc.text(alt, xAtual + 18, yBolinha - 3)
        })

        questaoIndex++
      }
    }

    // Rodapé
    doc.moveDown(4)
    doc.fontSize(9)
    doc.text('Data: _______________', { align: 'left' })
    doc.text('Assinatura do Aluno: _________________________________', { align: 'left' })

    doc.end()

    // Aguardar finalização
    await new Promise<void>((resolve) => {
      doc.on('end', resolve)
    })

    const pdfBuffer = Buffer.concat(chunks)

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="cartao-resposta-${anoLetivo}${serie ? `-${serie.replace(/\s+/g, '-')}` : ''}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('Erro ao gerar cartão-resposta:', error)
    return NextResponse.json(
      { mensagem: 'Erro ao gerar cartão-resposta', erro: error.message },
      { status: 500 }
    )
  }
}

