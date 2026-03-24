import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { situacaoAlunoSchema, uuidSchema } from '@/lib/schemas'
import { z } from 'zod'
import pool from '@/database/connection'
import { alterarSituacao } from '@/lib/services/alunos.service'

export const dynamic = 'force-dynamic'

const SITUACOES_VALIDAS = ['cursando', 'transferido', 'abandono', 'aprovado', 'reprovado', 'remanejado']

const situacaoPostSchema = z.object({
  situacao: situacaoAlunoSchema,
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve ser AAAA-MM-DD').optional().nullable(),
  observacao: z.string().max(500, 'Observação deve ter no máximo 500 caracteres').optional().nullable(),
  tipo_transferencia: z.enum(['dentro_municipio', 'fora_municipio']).optional().nullable(),
  escola_destino_id: uuidSchema.optional().nullable(),
  escola_destino_nome: z.string().max(255).optional().nullable(),
  escola_origem_id: uuidSchema.optional().nullable(),
  escola_origem_nome: z.string().max(255).optional().nullable(),
})

// GET - Buscar situação atual e histórico do aluno
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'polo', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const alunoId = params.id

    // Buscar aluno com situação atual
    const alunoResult = await pool.query(
      `SELECT a.id, a.nome, a.codigo, a.situacao, a.escola_id, a.turma_id, a.serie, a.ano_letivo,
              e.nome as escola_nome, t.codigo as turma_codigo
       FROM alunos a
       INNER JOIN escolas e ON a.escola_id = e.id
       LEFT JOIN turmas t ON a.turma_id = t.id
       WHERE a.id = $1`,
      [alunoId]
    )

    if (alunoResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Aluno não encontrado' }, { status: 404 })
    }

    // Buscar histórico de situações com dados de transferência
    const historicoResult = await pool.query(
      `SELECT hs.id, hs.situacao, hs.situacao_anterior, hs.data, hs.observacao, hs.criado_em,
              hs.tipo_transferencia, hs.tipo_movimentacao,
              hs.escola_destino_id, hs.escola_destino_nome,
              hs.escola_origem_id, hs.escola_origem_nome,
              u.nome as registrado_por_nome,
              ed.nome as escola_destino_ref_nome,
              eo.nome as escola_origem_ref_nome
       FROM historico_situacao hs
       LEFT JOIN usuarios u ON hs.registrado_por = u.id
       LEFT JOIN escolas ed ON hs.escola_destino_id = ed.id
       LEFT JOIN escolas eo ON hs.escola_origem_id = eo.id
       WHERE hs.aluno_id = $1
       ORDER BY hs.data DESC, hs.criado_em DESC`,
      [alunoId]
    )

    return NextResponse.json({
      aluno: alunoResult.rows[0],
      historico: historicoResult.rows,
    })
  } catch (error: unknown) {
    console.error('Erro ao buscar situação do aluno:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

// POST - Alterar situação do aluno
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const alunoId = params.id

    let body: z.infer<typeof situacaoPostSchema>
    try {
      const raw = await request.json()
      const parsed = situacaoPostSchema.safeParse(raw)
      if (!parsed.success) {
        const erros = parsed.error.errors.map(e => ({ campo: e.path.join('.'), mensagem: e.message }))
        return NextResponse.json({ mensagem: 'Dados inválidos', erros }, { status: 400 })
      }
      body = parsed.data
    } catch {
      return NextResponse.json({ mensagem: 'Erro ao processar dados' }, { status: 400 })
    }

    const { situacao, data, observacao, tipo_transferencia, escola_destino_id,
            escola_destino_nome, escola_origem_id, escola_origem_nome } = body

    // Validações específicas para transferência
    if (situacao === 'transferido') {
      if (!tipo_transferencia || !['dentro_municipio', 'fora_municipio'].includes(tipo_transferencia)) {
        return NextResponse.json(
          { mensagem: 'Tipo de transferência é obrigatório (dentro_municipio ou fora_municipio)' },
          { status: 400 }
        )
      }
      if (tipo_transferencia === 'dentro_municipio' && !escola_destino_id) {
        return NextResponse.json(
          { mensagem: 'Escola destino é obrigatória para transferência dentro do município' },
          { status: 400 }
        )
      }
      // Verificar se escola destino existe e não é a mesma
      if (tipo_transferencia === 'dentro_municipio' && escola_destino_id) {
        const escolaCheck = await pool.query('SELECT id FROM escolas WHERE id = $1 AND ativo = true', [escola_destino_id])
        if (escolaCheck.rows.length === 0) {
          return NextResponse.json({ mensagem: 'Escola destino não encontrada' }, { status: 404 })
        }
        const alunoCheck = await pool.query('SELECT escola_id FROM alunos WHERE id = $1', [alunoId])
        if (alunoCheck.rows[0]?.escola_id === escola_destino_id) {
          return NextResponse.json({ mensagem: 'Aluno já está nesta escola' }, { status: 400 })
        }
      }
    }

    // Validar data (se fornecida, deve ser formato válido e não futura)
    if (data) {
      const dataObj = new Date(data + 'T12:00:00')
      if (isNaN(dataObj.getTime())) {
        return NextResponse.json({ mensagem: 'Data inválida' }, { status: 400 })
      }
      const hoje = new Date()
      hoje.setHours(23, 59, 59, 999)
      if (dataObj > hoje) {
        return NextResponse.json({ mensagem: 'A data não pode ser futura' }, { status: 400 })
      }
    }

    const resultado = await alterarSituacao(alunoId, {
      situacao, data, observacao, tipo_transferencia,
      escola_destino_id, escola_destino_nome, escola_origem_id, escola_origem_nome,
    }, usuario.id)

    console.log(`[AUDIT] Situação alterada | aluno:${alunoId} | ${resultado.situacao_anterior} → ${resultado.situacao_nova} | por ${usuario.email} (${usuario.tipo_usuario})${tipo_transferencia ? ` | transferência:${tipo_transferencia}` : ''}`)

    return NextResponse.json({
      mensagem: resultado.mensagem,
      situacao_anterior: resultado.situacao_anterior,
      situacao_nova: resultado.situacao_nova,
    })
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'Aluno não encontrado') {
        return NextResponse.json({ mensagem: error.message }, { status: 404 })
      }
      if (error.message === 'O aluno já possui esta situação') {
        return NextResponse.json({ mensagem: error.message }, { status: 400 })
      }
    }
    console.error('Erro ao alterar situação do aluno:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
