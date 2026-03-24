import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { PG_ERRORS } from '@/lib/constants'
import { DatabaseError } from '@/lib/validation'
import { z } from 'zod'
import { validateRequest, anoLetivoSchema, statusAnoLetivoSchema } from '@/lib/schemas'

// --- Schemas de validação ---

const bimestreSchema = z.object({
  numero: z.number().int().min(1).max(6),
  nome: z.string().max(100).optional(),
  data_inicio: z.string().optional().nullable(),
  data_fim: z.string().optional().nullable(),
  dias_letivos: z.number().int().min(0).optional(),
})

const anoLetivoPostSchema = z.object({
  ano: anoLetivoSchema,
  data_inicio: z.string().optional().nullable(),
  data_fim: z.string().optional().nullable(),
  dias_letivos_total: z.number().int().min(0).optional(),
  observacao: z.string().max(2000).optional().nullable(),
  bimestres: z.array(bimestreSchema).optional(),
})

const anoLetivoPutSchema = z.object({
  id: z.string().uuid().optional(),
  ano: anoLetivoSchema.optional(),
  data_inicio: z.string().optional().nullable(),
  data_fim: z.string().optional().nullable(),
  dias_letivos_total: z.number().int().min(0).optional(),
  observacao: z.string().max(2000).optional().nullable(),
  status: statusAnoLetivoSchema.optional(),
  bimestres: z.array(bimestreSchema).optional(),
}).passthrough()

const anoLetivoPatchSchema = z.object({
  ano: anoLetivoSchema,
})

export const dynamic = 'force-dynamic'

// Listar anos letivos
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola', 'polo'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const result = await pool.query(`
      SELECT al.*,
             (SELECT COUNT(*) FROM turmas t WHERE t.ano_letivo = al.ano AND t.ativo = true) as total_turmas,
             (SELECT COUNT(*) FROM alunos a WHERE a.ano_letivo = al.ano AND a.ativo = true) as total_alunos,
             (SELECT COUNT(*) FROM periodos_letivos pl WHERE pl.ano_letivo = al.ano AND pl.ativo = true) as total_periodos
      FROM anos_letivos al
      ORDER BY al.ano DESC
    `)

    return NextResponse.json(result.rows.map(r => ({
      ...r,
      total_turmas: parseInt(r.total_turmas) || 0,
      total_alunos: parseInt(r.total_alunos) || 0,
      total_periodos: parseInt(r.total_periodos) || 0,
    })))
  } catch (error: unknown) {
    console.error('Erro ao listar anos letivos:', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
}

// Criar ano letivo com bimestres
export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const result = await validateRequest(request, anoLetivoPostSchema)
    if (!result.success) return result.response
    const { ano, data_inicio, data_fim, dias_letivos_total, observacao, bimestres } = result.data

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Validar datas
      if (data_inicio && data_fim && data_fim < data_inicio) {
        return NextResponse.json({ mensagem: 'Data de fim deve ser posterior à data de início' }, { status: 400 })
      }

      // Criar ano letivo
      const anoResult = await client.query(
        `INSERT INTO anos_letivos (ano, data_inicio, data_fim, dias_letivos_total, observacao)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [ano, data_inicio || null, data_fim || null, dias_letivos_total || 200, observacao || null]
      )

      // Criar bimestres se fornecidos
      if (Array.isArray(bimestres) && bimestres.length > 0) {
        // Validar datas dos bimestres: data_fim >= data_inicio e sem sobreposição
        const bimsComData = bimestres.filter((b) => b.data_inicio && b.data_fim) as Array<typeof bimestres[number] & { data_inicio: string; data_fim: string }>
        for (const bim of bimsComData) {
          if (bim.data_fim < bim.data_inicio) {
            await client.query('ROLLBACK')
            return NextResponse.json({ mensagem: `Bimestre ${bim.numero}: data de fim anterior à data de início` }, { status: 400 })
          }
        }
        // Verificar sobreposição entre períodos
        const ordenados = [...bimsComData].sort((a, b) => a.data_inicio.localeCompare(b.data_inicio))
        for (let i = 0; i < ordenados.length - 1; i++) {
          if (ordenados[i].data_fim > ordenados[i + 1].data_inicio) {
            await client.query('ROLLBACK')
            return NextResponse.json({
              mensagem: `Período ${ordenados[i].numero} (até ${ordenados[i].data_fim}) sobrepõe com período ${ordenados[i + 1].numero} (início ${ordenados[i + 1].data_inicio})`
            }, { status: 400 })
          }
        }

        for (const bim of bimestres) {
          await client.query(
            `INSERT INTO periodos_letivos (nome, tipo, numero, ano_letivo, data_inicio, data_fim, dias_letivos, ativo)
             VALUES ($1, 'bimestre', $2, $3, $4, $5, $6, true)
             ON CONFLICT (tipo, numero, ano_letivo) DO UPDATE SET
               nome = EXCLUDED.nome, data_inicio = EXCLUDED.data_inicio,
               data_fim = EXCLUDED.data_fim, dias_letivos = EXCLUDED.dias_letivos,
               atualizado_em = CURRENT_TIMESTAMP`,
            [bim.nome || `${bim.numero}º Bimestre`, bim.numero, ano, bim.data_inicio || null, bim.data_fim || null, bim.dias_letivos || 50]
          )
        }
      } else {
        // Criar 4 bimestres padrão
        const nomes = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre']
        for (let i = 0; i < 4; i++) {
          await client.query(
            `INSERT INTO periodos_letivos (nome, tipo, numero, ano_letivo, ativo)
             VALUES ($1, 'bimestre', $2, $3, true)
             ON CONFLICT (tipo, numero, ano_letivo) DO NOTHING`,
            [nomes[i], i + 1, ano]
          )
        }
      }

      await client.query('COMMIT')
      return NextResponse.json({ mensagem: 'Ano letivo criado com sucesso', ano: anoResult.rows[0] || { ano } }, { status: 201 })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (error: unknown) {
    if ((error as DatabaseError)?.code === PG_ERRORS.UNIQUE_VIOLATION) {
      return NextResponse.json({ mensagem: 'Ano letivo já existe' }, { status: 409 })
    }
    console.error('Erro ao criar ano letivo:', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
}

// Atualizar ano letivo (dados, status, bimestres)
export async function PUT(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const putResult = await validateRequest(request, anoLetivoPutSchema)
    if (!putResult.success) return putResult.response
    const { id, ano, data_inicio, data_fim, dias_letivos_total, observacao, status, bimestres } = putResult.data

    if (!id && !ano) {
      return NextResponse.json({ mensagem: 'id ou ano é obrigatório' }, { status: 400 })
    }

    if (data_inicio && data_fim && data_fim < data_inicio) {
      return NextResponse.json({ mensagem: 'Data de fim deve ser posterior à data de início' }, { status: 400 })
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Validação: não permitir finalizar se há alunos ainda cursando
      if (status === 'finalizado') {
        const anoRef = ano || (id ? (await client.query('SELECT ano FROM anos_letivos WHERE id = $1', [id])).rows[0]?.ano : null)
        if (anoRef) {
          const cursandoResult = await client.query(
            `SELECT COUNT(*) as total FROM alunos WHERE ano_letivo = $1 AND ativo = true AND (situacao IS NULL OR situacao = 'cursando')`,
            [anoRef]
          )
          const totalCursando = parseInt(cursandoResult.rows[0]?.total) || 0
          if (totalCursando > 0) {
            await client.query('ROLLBACK')
            return NextResponse.json({
              mensagem: `Não é possível finalizar: ${totalCursando} aluno(s) ainda com situação 'cursando'`,
              total_cursando: totalCursando
            }, { status: 422 })
          }
        }
      }

      // Ações de status
      if (status === 'ativo') {
        // Só pode ter 1 ano ativo por vez
        await client.query(`UPDATE anos_letivos SET status = 'planejamento' WHERE status = 'ativo'`)
      }

      // Atualizar ano letivo
      const sets: string[] = []
      const params: any[] = []
      let idx = 1

      if (data_inicio !== undefined) { sets.push(`data_inicio = $${idx}`); params.push(data_inicio); idx++ }
      if (data_fim !== undefined) { sets.push(`data_fim = $${idx}`); params.push(data_fim); idx++ }
      if (dias_letivos_total !== undefined) { sets.push(`dias_letivos_total = $${idx}`); params.push(dias_letivos_total); idx++ }
      if (observacao !== undefined) { sets.push(`observacao = $${idx}`); params.push(observacao); idx++ }
      if (status !== undefined) { sets.push(`status = $${idx}`); params.push(status); idx++ }

      if (sets.length > 0) {
        const whereField = id ? 'id' : 'ano'
        const whereValue = id || ano
        params.push(whereValue)
        await client.query(
          `UPDATE anos_letivos SET ${sets.join(', ')}, atualizado_em = CURRENT_TIMESTAMP WHERE ${whereField} = $${idx}`,
          params
        )
      }

      // Atualizar bimestres se fornecidos
      if (Array.isArray(bimestres) && bimestres.length > 0) {
        let anoRef = ano
        if (!anoRef && id) {
          const anoQuery = await client.query('SELECT ano FROM anos_letivos WHERE id = $1', [id])
          anoRef = anoQuery.rows[0]?.ano
        }
        if (!anoRef) {
          await client.query('ROLLBACK')
          return NextResponse.json({ mensagem: 'Não foi possível identificar o ano letivo' }, { status: 400 })
        }
        // Validar datas dos bimestres antes de atualizar
        const bimsComData = bimestres.filter((b) => b.data_inicio && b.data_fim) as Array<typeof bimestres[number] & { data_inicio: string; data_fim: string }>
        for (const bim of bimsComData) {
          if (bim.data_fim < bim.data_inicio) {
            await client.query('ROLLBACK')
            return NextResponse.json({ mensagem: `Bimestre ${bim.numero}: data de fim anterior à data de início` }, { status: 400 })
          }
        }
        const ordenados = [...bimsComData].sort((a, b) => a.data_inicio.localeCompare(b.data_inicio))
        for (let i = 0; i < ordenados.length - 1; i++) {
          if (ordenados[i].data_fim > ordenados[i + 1].data_inicio) {
            await client.query('ROLLBACK')
            return NextResponse.json({
              mensagem: `Período ${ordenados[i].numero} sobrepõe com período ${ordenados[i + 1].numero}`
            }, { status: 400 })
          }
        }

        for (const bim of bimestres) {
          await client.query(
            `UPDATE periodos_letivos
             SET nome = $1, data_inicio = $2, data_fim = $3, dias_letivos = $4
             WHERE tipo = 'bimestre' AND numero = $5 AND ano_letivo = $6`,
            [bim.nome || `${bim.numero}º Bimestre`, bim.data_inicio || null, bim.data_fim || null, bim.dias_letivos || 50, bim.numero, anoRef]
          )
        }
      }

      await client.query('COMMIT')
      return NextResponse.json({ mensagem: 'Ano letivo atualizado' })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (error: unknown) {
    console.error('Erro ao atualizar ano letivo:', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
}

// Buscar bimestres de um ano
export async function PATCH(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola', 'polo'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const patchResult = await validateRequest(request, anoLetivoPatchSchema)
    if (!patchResult.success) return patchResult.response
    const { ano } = patchResult.data

    const result = await pool.query(
      `SELECT id, nome, tipo, numero, ano_letivo, data_inicio, data_fim, dias_letivos, ativo
       FROM periodos_letivos
       WHERE ano_letivo = $1 AND tipo = 'bimestre'
       ORDER BY numero`,
      [ano]
    )

    return NextResponse.json(result.rows)
  } catch (error: unknown) {
    console.error('Erro ao buscar bimestres:', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
}
