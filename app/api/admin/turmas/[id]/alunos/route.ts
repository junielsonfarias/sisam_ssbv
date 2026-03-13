import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'polo', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const turmaId = params.id

    // Buscar dados da turma com verificação de acesso
    const whereConditions = ['t.id = $1']
    const queryParams: string[] = [turmaId]
    let paramIndex = 2

    if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
      whereConditions.push(`e.polo_id = $${paramIndex}`)
      queryParams.push(usuario.polo_id as string)
      paramIndex++
    } else if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      whereConditions.push(`e.id = $${paramIndex}`)
      queryParams.push(usuario.escola_id as string)
      paramIndex++
    }

    const turmaResult = await pool.query(
      `SELECT t.id, t.codigo, t.nome, t.serie, t.ano_letivo, t.escola_id,
              e.nome as escola_nome, p.nome as polo_nome
       FROM turmas t
       INNER JOIN escolas e ON t.escola_id = e.id
       LEFT JOIN polos p ON e.polo_id = p.id
       WHERE ${whereConditions.join(' AND ')}`,
      queryParams
    )

    if (turmaResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Turma não encontrada' }, { status: 404 })
    }

    const turma = turmaResult.rows[0]

    // Buscar alunos da turma (incluindo transferidos/inativos)
    const alunosResult = await pool.query(
      `SELECT a.id, a.codigo, a.nome, a.serie, a.ano_letivo, a.ativo,
              a.data_nascimento, a.pcd, a.situacao, a.data_matricula,
              (SELECT hs.data FROM historico_situacao hs
               WHERE hs.aluno_id = a.id AND hs.situacao = 'transferido'
               ORDER BY hs.data DESC, hs.criado_em DESC LIMIT 1
              ) as data_transferencia
       FROM alunos a
       WHERE a.turma_id = $1
       ORDER BY
         CASE WHEN a.situacao IN ('transferido', 'abandono') THEN 1 ELSE 0 END,
         a.nome`,
      [turmaId]
    )

    return NextResponse.json({
      turma: {
        id: turma.id,
        codigo: turma.codigo,
        nome: turma.nome,
        serie: turma.serie,
        ano_letivo: turma.ano_letivo,
        escola_id: turma.escola_id,
        escola_nome: turma.escola_nome,
        polo_nome: turma.polo_nome,
      },
      alunos: alunosResult.rows,
      total: alunosResult.rows.length,
    })
  } catch (error: any) {
    console.error('Erro ao buscar alunos da turma:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
