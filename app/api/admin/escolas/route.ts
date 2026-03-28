import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { PG_ERRORS } from '@/lib/constants'
import { DatabaseError } from '@/lib/validation'
import {
  parseSearchParams, parseBoolParam,
  createWhereBuilder, addCondition, addRawCondition, addAccessControl,
  buildConditionsString,
} from '@/lib/api-helpers'
import { z } from 'zod'
import { validateRequest, uuidSchema, nomeSchema } from '@/lib/schemas'
import { excluirEscola } from '@/lib/services/escolas.service'
import { withRedisCache, cacheKey, cacheDelPattern } from '@/lib/cache'

// Desabilitar cache para garantir dados sempre atualizados
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const GET = withAuth(['administrador', 'tecnico', 'polo', 'escola'], async (request, usuario) => {
  const searchParams = request.nextUrl.searchParams
  const { polo_id, id: escolaId, serie, ano_letivo } = parseSearchParams(
    searchParams, ['polo_id', 'id', 'serie', 'ano_letivo']
  )
  const comEstatisticas = parseBoolParam(searchParams, 'com_estatisticas')

  // Se não precisa de estatísticas, usar query simples (com cache Redis)
  if (!comEstatisticas) {
    const redisKey = cacheKey('escolas', ano_letivo || '', usuario.tipo_usuario, polo_id || '', escolaId || '')
    const rows = await withRedisCache(redisKey, 120, async () => {
      const where = createWhereBuilder()
      addRawCondition(where, 'e.ativo = true')
      addAccessControl(where, usuario, { escolaIdField: 'e.id', poloIdField: 'e.polo_id' })
      addCondition(where, 'e.polo_id', polo_id)
      addCondition(where, 'e.id', escolaId)

      if (ano_letivo && ano_letivo.trim() !== '') {
        addRawCondition(where, `EXISTS (
          SELECT 1 FROM turmas t
          WHERE t.escola_id = e.id AND t.ano_letivo = $${where.paramIndex} AND t.ativo = true
        )`, [ano_letivo.trim()])
      }

      const result = await pool.query(
        `SELECT e.*, p.nome as polo_nome
         FROM escolas e LEFT JOIN polos p ON e.polo_id = p.id
         WHERE ${buildConditionsString(where)}
         ORDER BY e.nome`,
        where.params
      )
      return result.rows
    })
    return NextResponse.json(rows)
  }

  // Query com estatísticas (médias por disciplina)
  const where = createWhereBuilder()
  addRawCondition(where, 'e.ativo = true')
  addAccessControl(where, usuario, { escolaIdField: 'e.id', poloIdField: 'e.polo_id' })
  addCondition(where, 'e.polo_id', polo_id)
  addCondition(where, 'e.id', escolaId)

  if (serie && serie.trim() !== '') {
    const numSerie = serie.match(/(\d+)/)?.[1] || serie.trim()
    addRawCondition(where, `REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') = $${where.paramIndex}`, [numSerie])
  }

  if (ano_letivo && ano_letivo.trim() !== '') {
    addRawCondition(where, `rc.ano_letivo = $${where.paramIndex}`, [ano_letivo.trim()])
  }

  const whereClause = `WHERE ${buildConditionsString(where)}`

  // Parâmetro extra da série para o LEFT JOIN de turmas
  let turmasJoinSerie = ''
  if (serie && serie.trim() !== '') {
    const numSerie = serie.match(/(\d+)/)?.[1] || serie.trim()
    where.params.push(numSerie)
    turmasJoinSerie = `AND REGEXP_REPLACE(t.serie, '[^0-9]', '', 'g') = $${where.paramIndex}`
    where.paramIndex++
  }

  // Detectar se é filtro de anos iniciais (2, 3, 5) ou finais (6, 7, 8, 9)
  const serieNumero = serie ? serie.replace(/[^0-9]/g, '') : ''
  const isAnosIniciais = ['2', '3', '5'].includes(serieNumero)
  const isAnosFinais = ['6', '7', '8', '9'].includes(serieNumero)

  // Query com cálculo de médias correto
  // Anos iniciais (2, 3, 5): média = (LP + MAT + PROD) / 3
  // Anos finais (6, 7, 8, 9): média = (LP + CH + MAT + CN) / 4
  const query = `
    SELECT
      e.id,
      e.nome,
      e.codigo,
      p.nome as polo_nome,
      COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN rc.aluno_id END) as total_alunos,
      COUNT(DISTINCT t.id) as total_turmas,
      -- Média CORRIGIDA: divisor FIXO para consistência com outras APIs
      -- Anos iniciais (2, 3, 5): média = (LP + MAT + PROD) / 3.0
      -- Anos finais (6, 7, 8, 9): média = (LP + CH + MAT + CN) / 4.0
      ROUND(AVG(CASE
        WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN
          CASE
            -- Anos iniciais (2, 3, 5): média de LP, MAT e PROD com divisor fixo 3
            WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
              (
                COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) +
                COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) +
                COALESCE(CAST(rc.nota_producao AS DECIMAL), 0)
              ) / 3.0
            -- Anos finais (6, 7, 8, 9): média de LP, CH, MAT, CN com divisor fixo 4
            ELSE
              (
                COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) +
                COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) +
                COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) +
                COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)
              ) / 4.0
          END
        ELSE NULL
      END), 2) as media_geral,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as media_lp,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as media_mat,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0) THEN CAST(rc.nota_producao AS DECIMAL) ELSE NULL END), 2) as media_prod,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0) THEN CAST(rc.nota_ch AS DECIMAL) ELSE NULL END), 2) as media_ch,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0) THEN CAST(rc.nota_cn AS DECIMAL) ELSE NULL END), 2) as media_cn,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) as presentes,
      COUNT(CASE WHEN (rc.presenca = 'F' OR rc.presenca = 'f') THEN 1 END) as faltantes
    FROM escolas e
    LEFT JOIN polos p ON e.polo_id = p.id
    LEFT JOIN turmas t ON t.escola_id = e.id AND t.ativo = true ${turmasJoinSerie}
    LEFT JOIN resultados_consolidados_unificada rc ON rc.escola_id = e.id
      AND (rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f')
    ${whereClause}
    GROUP BY e.id, e.nome, e.codigo, p.nome
    HAVING COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN rc.aluno_id END) > 0
    ORDER BY media_geral DESC NULLS LAST, e.nome
  `

  const result = await pool.query(query, where.params)

  // Converter campos numéricos para garantir consistência
  // Quando filtro de série está ativo, ocultar disciplinas não aplicáveis
  const escolas = result.rows.map(row => ({
    id: row.id,
    nome: row.nome,
    codigo: row.codigo,
    polo_nome: row.polo_nome,
    total_alunos: parseInt(row.total_alunos) || 0,
    total_turmas: parseInt(row.total_turmas) || 0,
    media_geral: parseFloat(row.media_geral) || null,
    media_lp: parseFloat(row.media_lp) || null,
    media_mat: parseFloat(row.media_mat) || null,
    // PROD: mostrar apenas para anos iniciais (2, 3, 5)
    media_prod: isAnosFinais ? null : parseFloat(row.media_prod) || null,
    // CH/CN: mostrar apenas para anos finais (6, 7, 8, 9)
    media_ch: isAnosIniciais ? null : parseFloat(row.media_ch) || null,
    media_cn: isAnosIniciais ? null : parseFloat(row.media_cn) || null,
    presentes: parseInt(row.presentes) || 0,
    faltantes: parseInt(row.faltantes) || 0
  }))

  return NextResponse.json(escolas)
})

const escolaPostSchema = z.object({
  nome: nomeSchema,
  polo_id: uuidSchema,
}).passthrough()

export const POST = withAuth(['administrador', 'tecnico'], async (request, usuario) => {
  try {
    const validacao = await validateRequest(request, escolaPostSchema)
    if (!validacao.success) return validacao.response
    const body = validacao.data as Record<string, string | number | boolean | null | undefined>

    // All allowed fields for INSERT (base + INEP)
    const allowedFields = [
      'nome', 'codigo', 'polo_id', 'endereco', 'telefone', 'email', 'gestor_escolar_habilitado',
      // INEP - Identificação
      'codigo_inep', 'situacao_funcionamento', 'dependencia_administrativa',
      'categoria_escola', 'localizacao', 'localizacao_diferenciada',
      'tipo_atendimento_escolarizacao', 'etapas_ensino', 'modalidade_ensino',
      // INEP - Infraestrutura
      'agua_potavel', 'energia_eletrica', 'esgoto_sanitario', 'coleta_lixo',
      'internet', 'banda_larga', 'quadra_esportiva', 'biblioteca',
      'laboratorio_informatica', 'laboratorio_ciencias',
      'acessibilidade_deficiente', 'alimentacao_escolar',
      // INEP - Localização
      'latitude', 'longitude', 'cep', 'bairro', 'municipio', 'uf',
      'distrito', 'complemento',
      // INEP - Outros
      'telefone_ddd', 'telefone_numero', 'cnpj_mantenedora', 'data_criacao'
    ]

    const columns: string[] = []
    const placeholders: string[] = []
    const values: (string | number | boolean | null | undefined)[] = []
    let paramIndex = 1

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        columns.push(field)
        placeholders.push(`$${paramIndex}`)
        values.push(body[field] ?? null)
        paramIndex++
      }
    }

    const result = await pool.query(
      `INSERT INTO escolas (${columns.join(', ')})
       VALUES (${placeholders.join(', ')})
       RETURNING *`,
      values
    )

    // Invalidar caches de escolas e transparencia
    await cacheDelPattern('escolas:*')
    await cacheDelPattern('transparencia:*')
    await cacheDelPattern('site-config:*')

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: unknown) {
    if ((error as DatabaseError).code === PG_ERRORS.UNIQUE_VIOLATION) {
      return NextResponse.json(
        { mensagem: 'Código já cadastrado' },
        { status: 400 }
      )
    }
    console.error('Erro ao criar escola:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})

export const DELETE = withAuth(['administrador', 'tecnico'], async (request, usuario) => {
  try {
    const { searchParams } = new URL(request.url)
    const escolaId = searchParams.get('id')

    if (!escolaId) {
      return NextResponse.json(
        { mensagem: 'ID da escola é obrigatório' },
        { status: 400 }
      )
    }

    const resultado = await excluirEscola(escolaId)

    if (!resultado.sucesso) {
      return NextResponse.json(
        {
          mensagem: 'Não é possível excluir a escola pois possui vínculos',
          vinculos: resultado.vinculos,
        },
        { status: 400 }
      )
    }

    console.log(`[AUDIT] ${resultado.mensagem} (${escolaId}) por ${usuario.email} (${usuario.tipo_usuario})`)

    // Invalidar caches de escolas e transparencia
    await cacheDelPattern('escolas:*')
    await cacheDelPattern('transparencia:*')
    await cacheDelPattern('site-config:*')

    return NextResponse.json({ mensagem: 'Escola excluída com sucesso' }, { status: 200 })
  } catch (error: unknown) {
    console.error('Erro ao excluir escola:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})
