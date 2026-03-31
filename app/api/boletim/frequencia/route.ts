import { NextRequest, NextResponse } from 'next/server'
import pool from '@/database/connection'
import { withRedisCache, cacheKey } from '@/lib/cache'
import { CACHE_TTL } from '@/lib/constants'

export const dynamic = 'force-dynamic'

/**
 * GET /api/boletim/frequencia?codigo=XXX&ano_letivo=2026
 * Retorna dados de frequência detalhada do aluno (público)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const codigo = searchParams.get('codigo')
  const cpf = searchParams.get('cpf')
  const dataNascimento = searchParams.get('data_nascimento')
  const anoLetivo = searchParams.get('ano_letivo') || String(new Date().getFullYear())

  if (!codigo && !cpf) {
    return NextResponse.json({ mensagem: 'Informe o código ou CPF do aluno.' }, { status: 400 })
  }

  try {
    const alunoQueryStr = codigo ? `codigo:${codigo}` : `cpf:${cpf}:${dataNascimento}`
    const redisKey = cacheKey('boletim-freq', alunoQueryStr, anoLetivo)

    const data = await withRedisCache(redisKey, CACHE_TTL.BOLETIM, async () => {
      // Localizar aluno
      let alunoQuery = ''
      let params: any[] = [anoLetivo]

      if (codigo) {
        alunoQuery = `
          SELECT a.id, a.nome, a.codigo, a.turma_id, t.serie, t.codigo AS turma_codigo, e.nome AS escola_nome
          FROM alunos a
          LEFT JOIN turmas t ON t.id = a.turma_id
          LEFT JOIN escolas e ON e.id = a.escola_id
          WHERE a.ano_letivo = $1 AND a.codigo = $2 AND a.ativo = true
          LIMIT 1`
        params.push(codigo)
      } else {
        alunoQuery = `
          SELECT a.id, a.nome, a.codigo, a.turma_id, t.serie, t.codigo AS turma_codigo, e.nome AS escola_nome
          FROM alunos a
          LEFT JOIN turmas t ON t.id = a.turma_id
          LEFT JOIN escolas e ON e.id = a.escola_id
          WHERE a.ano_letivo = $1 AND a.cpf = $2 AND a.data_nascimento = $3 AND a.ativo = true
          LIMIT 1`
        params.push(cpf, dataNascimento)
      }

      const alunoRes = await pool.query(alunoQuery, params)
      if (alunoRes.rows.length === 0) {
        return null // Não cachear 404
      }

      const aluno = alunoRes.rows[0]

      // Buscar frequência bimestral
      const freqBimestral = await pool.query(
        `SELECT fb.bimestre, fb.dias_letivos, fb.presencas, fb.faltas, fb.percentual,
                pl.nome AS periodo_nome
         FROM frequencia_bimestral fb
         LEFT JOIN periodos_letivos pl ON pl.numero = fb.bimestre AND pl.ano_letivo = $2
         WHERE fb.aluno_id = $1 AND fb.ano_letivo = $2
         ORDER BY fb.bimestre`,
        [aluno.id, anoLetivo]
      )

      // Calcular totais
      let totalDias = 0, totalPresencas = 0, totalFaltas = 0
      for (const f of freqBimestral.rows) {
        totalDias += parseInt(f.dias_letivos) || 0
        totalPresencas += parseInt(f.presencas) || 0
        totalFaltas += parseInt(f.faltas) || 0
      }
      const percentualGeral = totalDias > 0 ? Math.round((totalPresencas / totalDias) * 100) : null

      // Buscar últimas frequências diárias (para timeline)
      const freqDiaria = await pool.query(
        `SELECT data, presente, justificativa
         FROM frequencia_diaria
         WHERE aluno_id = $1 AND EXTRACT(YEAR FROM data) = $2
         ORDER BY data DESC
         LIMIT 30`,
        [aluno.id, parseInt(anoLetivo)]
      )

      return {
        aluno: {
          nome: aluno.nome,
          codigo: aluno.codigo,
          serie: aluno.serie,
          turma_codigo: aluno.turma_codigo,
          escola_nome: aluno.escola_nome,
        },
        frequencia_bimestral: freqBimestral.rows,
        totais: {
          dias_letivos: totalDias,
          presencas: totalPresencas,
          faltas: totalFaltas,
          percentual: percentualGeral,
        },
        frequencia_diaria: freqDiaria.rows,
      }
    })

    if (!data) {
      return NextResponse.json({ mensagem: 'Aluno não encontrado.' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('[BOLETIM FREQUENCIA]', error.message)
    return NextResponse.json({ mensagem: 'Erro ao consultar frequência.' }, { status: 500 })
  }
}
