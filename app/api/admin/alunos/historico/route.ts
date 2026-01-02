import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'polo', 'escola'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const alunoId = searchParams.get('aluno_id')
    const alunoNome = searchParams.get('aluno_nome')
    const alunoCodigo = searchParams.get('aluno_codigo')

    if (!alunoId && !alunoNome && !alunoCodigo) {
      return NextResponse.json(
        { mensagem: 'É necessário informar aluno_id, aluno_nome ou aluno_codigo' },
        { status: 400 }
      )
    }

    let query = `
      SELECT 
        a.id,
        a.codigo,
        a.nome,
        a.escola_id,
        a.turma_id,
        a.serie,
        a.ano_letivo,
        a.ativo,
        a.criado_em,
        a.atualizado_em,
        e.nome as escola_nome,
        e.polo_id,
        p.nome as polo_nome,
        t.codigo as turma_codigo,
        t.nome as turma_nome,
        t.serie as turma_serie,
        t.ano_letivo as turma_ano_letivo,
        rc.presenca as resultado_presenca,
        rc.total_acertos_lp,
        rc.total_acertos_ch,
        rc.total_acertos_mat,
        rc.total_acertos_cn,
        rc.nota_lp,
        rc.nota_ch,
        rc.nota_mat,
        rc.nota_cn,
        rc.media_aluno,
        rc.criado_em as resultado_criado_em,
        rc.atualizado_em as resultado_atualizado_em
      FROM alunos a
      INNER JOIN escolas e ON a.escola_id = e.id
      LEFT JOIN polos p ON e.polo_id = p.id
      LEFT JOIN turmas t ON a.turma_id = t.id
      LEFT JOIN resultados_consolidados_unificada rc ON a.id = rc.aluno_id AND a.ano_letivo = rc.ano_letivo
      WHERE 1=1
    `

    const params: any[] = []
    let paramIndex = 1

    // Aplicar restrições de acesso
    if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
      query += ` AND e.polo_id = $${paramIndex}`
      params.push(usuario.polo_id)
      paramIndex++
    } else if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      query += ` AND e.id = $${paramIndex}`
      params.push(usuario.escola_id)
      paramIndex++
    }

    // Aplicar filtros de busca
    if (alunoId) {
      query += ` AND a.id = $${paramIndex}`
      params.push(alunoId)
      paramIndex++
    } else if (alunoNome) {
      // Busca exata por nome, normalizando espaços
      query += ` AND TRIM(a.nome) ILIKE TRIM($${paramIndex})`
      params.push(alunoNome)
      paramIndex++
    } else if (alunoCodigo) {
      query += ` AND a.codigo = $${paramIndex}`
      params.push(alunoCodigo)
      paramIndex++
    }

    query += ' ORDER BY a.ano_letivo DESC, a.serie, a.criado_em DESC'

    const result = await pool.query(query, params)

    // Agrupar por aluno (caso haja múltiplos registros do mesmo aluno)
    const alunosAgrupados = new Map()
    
    result.rows.forEach((row: any) => {
      const key = row.nome.toUpperCase().trim()
      if (!alunosAgrupados.has(key)) {
        alunosAgrupados.set(key, {
          nome: row.nome,
          codigo: row.codigo,
          registros: []
        })
      }
      alunosAgrupados.get(key).registros.push(row)
    })

    // Converter para array
    const historico = Array.from(alunosAgrupados.values())

    return NextResponse.json(historico)
  } catch (error: any) {
    console.error('Erro ao buscar histórico do aluno:', error)
    console.error('Stack trace:', error?.stack)
    return NextResponse.json(
      { 
        mensagem: 'Erro interno do servidor',
        erro: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    )
  }
}

