import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { verificarCache, carregarCache, salvarCache, limparCachesExpirados } from '@/lib/cache-dashboard'
import { parseDbInt, parseDbNumber } from '@/lib/utils-numeros'

export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    // Limpar caches expirados
    try {
      limparCachesExpirados()
    } catch (error) {
      // Não crítico
    }

    // Verificar cache
    const cacheOptions = {
      filtros: {},
      tipoUsuario: usuario.tipo_usuario,
      usuarioId: usuario.id,
      poloId: usuario.polo_id || null,
      escolaId: usuario.escola_id || null
    }

    const forcarAtualizacao = request.nextUrl.searchParams.get('atualizar_cache') === 'true'

    if (!forcarAtualizacao && verificarCache(cacheOptions)) {
      const dadosCache = carregarCache<any>(cacheOptions)
      if (dadosCache) {
        console.log('Retornando estatísticas do cache')
        return NextResponse.json({
          ...dadosCache,
          _cache: {
            origem: 'cache',
            carregadoEm: new Date().toISOString()
          }
        })
      }
    }

    // Tratamento individual de cada query para evitar que uma falha quebre todas
    let totalUsuarios = 0
    let totalEscolas = 0
    let totalPolos = 0
    let totalQuestoes = 0
    let totalResultados = 0
    let totalAlunos = 0
    let totalTurmas = 0
    let totalAlunosPresentes = 0
    let totalAlunosFaltantes = 0
    let mediaGeral = 0
    let taxaAprovacao = 0

    try {
      const usuariosResult = await pool.query('SELECT COUNT(*) as total FROM usuarios WHERE ativo = true')
      totalUsuarios = parseDbInt(usuariosResult.rows[0]?.total)
    } catch (error: any) {
      console.error('Erro ao buscar total de usuários:', error.message)
    }

    try {
      const escolasResult = await pool.query('SELECT COUNT(*) as total FROM escolas WHERE ativo = true')
      totalEscolas = parseDbInt(escolasResult.rows[0]?.total)
    } catch (error: any) {
      console.error('Erro ao buscar total de escolas:', error.message)
    }

    try {
      const polosResult = await pool.query('SELECT COUNT(*) as total FROM polos WHERE ativo = true')
      totalPolos = parseDbInt(polosResult.rows[0]?.total)
    } catch (error: any) {
      console.error('Erro ao buscar total de polos:', error.message)
    }

    try {
      const questoesResult = await pool.query('SELECT COUNT(*) as total FROM questoes')
      totalQuestoes = parseDbInt(questoesResult.rows[0]?.total)
    } catch (error: any) {
      console.error('Erro ao buscar total de questões:', error.message)
    }

    try {
      const resultadosResult = await pool.query('SELECT COUNT(*) as total FROM resultados_provas')
      totalResultados = parseDbInt(resultadosResult.rows[0]?.total)
    } catch (error: any) {
      console.error('Erro ao buscar total de resultados:', error.message)
    }

    try {
      const alunosResult = await pool.query('SELECT COUNT(*) as total FROM alunos WHERE ativo = true')
      totalAlunos = parseDbInt(alunosResult.rows[0]?.total)
    } catch (error: any) {
      console.error('Erro ao buscar total de alunos:', error.message)
    }

    try {
      const turmasResult = await pool.query('SELECT COUNT(*) as total FROM turmas WHERE ativo = true')
      totalTurmas = parseDbInt(turmasResult.rows[0]?.total)
    } catch (error: any) {
      console.error('Erro ao buscar total de turmas:', error.message)
    }

    try {
      const presencaResult = await pool.query(`
        SELECT 
          COUNT(CASE WHEN presenca = 'P' OR presenca = 'p' THEN 1 END) as presentes,
          COUNT(CASE WHEN presenca = 'F' OR presenca = 'f' THEN 1 END) as faltantes
        FROM resultados_consolidados_unificada
      `)
      totalAlunosPresentes = parseDbInt(presencaResult.rows[0]?.presentes)
      totalAlunosFaltantes = parseDbInt(presencaResult.rows[0]?.faltantes)
    } catch (error: any) {
      console.error('Erro ao buscar presença:', error.message)
    }

    try {
      // Usa media_aluno já calculada corretamente durante importação (com fórmula 70%/30% para anos iniciais)
      const mediaResult = await pool.query(`
        SELECT
          ROUND(AVG(CAST(media_aluno AS DECIMAL)), 2) as media_geral,
          COUNT(CASE WHEN CAST(media_aluno AS DECIMAL) >= 6.0 THEN 1 END) as aprovados,
          COUNT(*) as total_presentes
        FROM resultados_consolidados_unificada
        WHERE (presenca = 'P' OR presenca = 'p')
          AND media_aluno IS NOT NULL
          AND CAST(media_aluno AS DECIMAL) > 0
      `)
      mediaGeral = parseDbNumber(mediaResult.rows[0]?.media_geral)
      const aprovados = parseDbInt(mediaResult.rows[0]?.aprovados)
      const totalPresentes = parseDbInt(mediaResult.rows[0]?.total_presentes)
      taxaAprovacao = totalPresentes > 0 ? (aprovados / totalPresentes) * 100 : 0
    } catch (error: any) {
      console.error('Erro ao buscar média e aprovação:', error.message)
    }

    // Médias por tipo de ensino (anos iniciais e finais)
    let mediaAnosIniciais = 0
    let mediaAnosFinais = 0
    let totalAnosIniciais = 0
    let totalAnosFinais = 0

    try {
      // Usa media_aluno já calculada corretamente durante importação
      const mediaTipoResult = await pool.query(`
        SELECT
          cs.tipo_ensino,
          ROUND(AVG(CAST(rc.media_aluno AS DECIMAL)), 2) as media,
          COUNT(*) as total
        FROM resultados_consolidados_unificada rc
        JOIN configuracao_series cs ON REGEXP_REPLACE(rc.serie, '[^0-9]', '', 'g') = cs.serie
        WHERE rc.presenca IN ('P', 'p')
          AND rc.media_aluno IS NOT NULL
          AND CAST(rc.media_aluno AS DECIMAL) > 0
        GROUP BY cs.tipo_ensino
      `)

      for (const row of mediaTipoResult.rows) {
        if (row.tipo_ensino === 'anos_iniciais') {
          mediaAnosIniciais = parseDbNumber(row.media)
          totalAnosIniciais = parseDbInt(row.total)
        } else if (row.tipo_ensino === 'anos_finais') {
          mediaAnosFinais = parseDbNumber(row.media)
          totalAnosFinais = parseDbInt(row.total)
        }
      }
    } catch (error: any) {
      console.error('Erro ao buscar médias por tipo de ensino:', error.message)
    }

    const dadosResposta = {
      totalUsuarios,
      totalEscolas,
      totalPolos,
      totalQuestoes,
      totalResultados,
      totalAlunos,
      totalTurmas,
      totalAlunosPresentes,
      totalAlunosFaltantes,
      mediaGeral,
      taxaAprovacao,
      mediaAnosIniciais,
      mediaAnosFinais,
      totalAnosIniciais,
      totalAnosFinais,
    }

    // Salvar no cache (expira em 1 hora)
    try {
      salvarCache(cacheOptions, dadosResposta, 'estatisticas')
    } catch (cacheError) {
      console.error('Erro ao salvar cache (nao critico):', cacheError)
    }

    return NextResponse.json({
      ...dadosResposta,
      _cache: {
        origem: 'banco',
        geradoEm: new Date().toISOString()
      }
    })
  } catch (error: any) {
    console.error('Erro geral ao buscar estatísticas:', error)
    console.error('Stack trace:', error.stack)
    
    // Retornar valores padrão em caso de erro geral
    return NextResponse.json({
      totalUsuarios: 0,
      totalEscolas: 0,
      totalPolos: 0,
      totalQuestoes: 0,
      totalResultados: 0,
      totalAlunos: 0,
      totalTurmas: 0,
      totalAlunosPresentes: 0,
      totalAlunosFaltantes: 0,
      mediaGeral: 0,
      taxaAprovacao: 0,
      erro: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 200 }) // Retornar 200 com valores padrão para não quebrar o frontend
  }
}

