import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { resolverAvaliacaoId } from '@/lib/avaliacoes'
import { processarImportacao } from '@/lib/services/importacao.service'
import { lerPlanilha } from '@/lib/excel-reader'
import { validarArquivoUpload } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutos maximo (limite do plano Hobby da Vercel)

export const POST = withAuth(['administrador', 'tecnico'], async (request: NextRequest, usuario) => {
  const formData = await request.formData()
  const arquivo = formData.get('arquivo') as File
  const anoLetivo = (formData.get('ano_letivo') as string) || new Date().getFullYear().toString()
  const avaliacaoIdParam = formData.get('avaliacao_id') as string | null

  if (!arquivo) {
    return NextResponse.json(
      { mensagem: 'Arquivo não fornecido' },
      { status: 400 }
    )
  }

  const erroUpload = validarArquivoUpload(arquivo)
  if (erroUpload) {
    return NextResponse.json({ mensagem: erroUpload }, { status: 400 })
  }

  const avaliacaoId = await resolverAvaliacaoId(avaliacaoIdParam, anoLetivo)

  const arrayBuffer = await arquivo.arrayBuffer()
  const dados = await lerPlanilha(arrayBuffer)

  if (!dados || dados.length === 0) {
    return NextResponse.json(
      { mensagem: 'Arquivo vazio ou inválido' },
      { status: 400 }
    )
  }

  // Criar registro de importacao
  const importacaoResult = await pool.query(
    `INSERT INTO importacoes (usuario_id, nome_arquivo, total_linhas, status, ano_letivo, avaliacao_id)
     VALUES ($1, $2, $3, 'processando', $4, $5)
     RETURNING id`,
    [usuario.id, arquivo.name, dados.length, anoLetivo, avaliacaoId]
  )

  const importacaoId = importacaoResult.rows[0].id

  // Processar importacao em background
  processarImportacao(importacaoId, dados, anoLetivo, usuario.id, avaliacaoId).catch((error) => {
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
})
