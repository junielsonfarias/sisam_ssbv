import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { buscarTurmaComEscola, buscarAlunosDaTurma } from '@/lib/services/turmas.service'

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

    const turma = await buscarTurmaComEscola(turmaId)

    if (!turma) {
      return NextResponse.json({ mensagem: 'Turma não encontrada' }, { status: 404 })
    }

    // Controle de acesso por polo/escola
    if (usuario.tipo_usuario === 'polo' && usuario.polo_id && turma.polo_id !== usuario.polo_id) {
      return NextResponse.json({ mensagem: 'Turma não encontrada' }, { status: 404 })
    }
    if (usuario.tipo_usuario === 'escola' && usuario.escola_id && turma.escola_id !== usuario.escola_id) {
      return NextResponse.json({ mensagem: 'Turma não encontrada' }, { status: 404 })
    }

    const alunos = await buscarAlunosDaTurma(turmaId)

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
      alunos,
      total: alunos.length,
    })
  } catch (error: unknown) {
    console.error('Erro ao buscar alunos da turma:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
