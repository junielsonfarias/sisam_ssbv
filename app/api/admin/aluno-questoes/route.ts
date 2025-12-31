import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const alunoId = searchParams.get('aluno_id')
    const anoLetivo = searchParams.get('ano_letivo')

    if (!alunoId) {
      return NextResponse.json({ mensagem: 'ID do aluno é obrigatório' }, { status: 400 })
    }

    // Buscar informações do aluno
    const alunoResult = await pool.query(
      `SELECT a.id, a.nome, a.codigo, a.serie, a.ano_letivo,
              e.nome as escola_nome, e.id as escola_id,
              t.codigo as turma_codigo, t.id as turma_id
       FROM alunos a
       LEFT JOIN escolas e ON a.escola_id = e.id
       LEFT JOIN turmas t ON a.turma_id = t.id
       WHERE a.id = $1`,
      [alunoId]
    )

    if (alunoResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Aluno não encontrado' }, { status: 404 })
    }

    const aluno = alunoResult.rows[0]

    // Buscar todas as questões do aluno
    let query = `
      SELECT 
        rp.questao_codigo,
        rp.acertou,
        rp.resposta_aluno,
        rp.area_conhecimento,
        rp.disciplina,
        rp.ano_letivo,
        q.descricao as questao_descricao,
        q.gabarito
      FROM resultados_provas rp
      LEFT JOIN questoes q ON rp.questao_id = q.id OR rp.questao_codigo = q.codigo
      WHERE rp.aluno_id = $1
    `

    const params: any[] = [alunoId]

    if (anoLetivo) {
      query += ' AND rp.ano_letivo = $2'
      params.push(anoLetivo)
    }

    query += ' ORDER BY rp.questao_codigo'

    const questoesResult = await pool.query(query, params)

    // Organizar questões por área
    const questoesPorArea: Record<string, any[]> = {
      'Língua Portuguesa': [],
      'Ciências Humanas': [],
      'Matemática': [],
      'Ciências da Natureza': [],
    }

    questoesResult.rows.forEach((questao) => {
      const area = questao.area_conhecimento || questao.disciplina || 'Outras'
      
      // Mapear áreas
      let areaNormalizada = 'Outras'
      if (area.includes('Português') || area.includes('LP') || area.includes('Língua Portuguesa')) {
        areaNormalizada = 'Língua Portuguesa'
      } else if (area.includes('Humanas') || area.includes('CH') || area.includes('Ciências Humanas')) {
        areaNormalizada = 'Ciências Humanas'
      } else if (area.includes('Matemática') || area.includes('MAT') || area.includes('Matematica')) {
        areaNormalizada = 'Matemática'
      } else if (area.includes('Natureza') || area.includes('CN') || area.includes('Ciências da Natureza')) {
        areaNormalizada = 'Ciências da Natureza'
      }

      // Determinar faixa de questões por área baseado no código
      const questaoNum = parseInt(questao.questao_codigo?.replace('Q', '') || '0')
      if (questaoNum >= 1 && questaoNum <= 20) {
        areaNormalizada = 'Língua Portuguesa'
      } else if (questaoNum >= 21 && questaoNum <= 30) {
        areaNormalizada = 'Ciências Humanas'
      } else if (questaoNum >= 31 && questaoNum <= 50) {
        areaNormalizada = 'Matemática'
      } else if (questaoNum >= 51 && questaoNum <= 60) {
        areaNormalizada = 'Ciências da Natureza'
      }

      if (!questoesPorArea[areaNormalizada]) {
        questoesPorArea[areaNormalizada] = []
      }

      questoesPorArea[areaNormalizada].push({
        codigo: questao.questao_codigo,
        acertou: questao.acertou,
        resposta_aluno: questao.resposta_aluno,
        descricao: questao.questao_descricao,
        gabarito: questao.gabarito,
        numero: questaoNum,
      })
    })

    // Ordenar questões por número dentro de cada área
    Object.keys(questoesPorArea).forEach((area) => {
      questoesPorArea[area].sort((a, b) => a.numero - b.numero)
    })

    // Calcular estatísticas
    const totalQuestoes = questoesResult.rows.length
    const totalAcertos = questoesResult.rows.filter((q) => q.acertou).length
    const totalErros = totalQuestoes - totalAcertos

    const estatisticasPorArea: Record<string, { total: number; acertos: number; erros: number }> = {}
    Object.keys(questoesPorArea).forEach((area) => {
      const questoes = questoesPorArea[area]
      estatisticasPorArea[area] = {
        total: questoes.length,
        acertos: questoes.filter((q) => q.acertou).length,
        erros: questoes.filter((q) => !q.acertou).length,
      }
    })

    return NextResponse.json({
      aluno: {
        id: aluno.id,
        nome: aluno.nome,
        codigo: aluno.codigo,
        serie: aluno.serie,
        ano_letivo: aluno.ano_letivo,
        escola_nome: aluno.escola_nome,
        turma_codigo: aluno.turma_codigo,
      },
      questoes: questoesPorArea,
      estatisticas: {
        total: totalQuestoes,
        acertos: totalAcertos,
        erros: totalErros,
        por_area: estatisticasPorArea,
      },
    })
  } catch (error: any) {
    console.error('Erro ao buscar questões do aluno:', error)
    return NextResponse.json(
      { mensagem: 'Erro ao buscar questões do aluno', erro: error.message },
      { status: 500 }
    )
  }
}

