import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { verificarCache, carregarCache, salvarCache, limparCachesExpirados } from '@/lib/cache-dashboard'

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
      totalUsuarios = parseInt(usuariosResult.rows[0]?.total || '0', 10) || 0
    } catch (error: any) {
      console.error('Erro ao buscar total de usuários:', error.message)
    }

    try {
      const escolasResult = await pool.query('SELECT COUNT(*) as total FROM escolas WHERE ativo = true')
      totalEscolas = parseInt(escolasResult.rows[0]?.total || '0', 10) || 0
    } catch (error: any) {
      console.error('Erro ao buscar total de escolas:', error.message)
    }

    try {
      const polosResult = await pool.query('SELECT COUNT(*) as total FROM polos WHERE ativo = true')
      totalPolos = parseInt(polosResult.rows[0]?.total || '0', 10) || 0
    } catch (error: any) {
      console.error('Erro ao buscar total de polos:', error.message)
    }

    try {
      const questoesResult = await pool.query('SELECT COUNT(*) as total FROM questoes')
      totalQuestoes = parseInt(questoesResult.rows[0]?.total || '0', 10) || 0
    } catch (error: any) {
      console.error('Erro ao buscar total de questões:', error.message)
    }

    try {
      const resultadosResult = await pool.query('SELECT COUNT(*) as total FROM resultados_provas')
      totalResultados = parseInt(resultadosResult.rows[0]?.total || '0', 10) || 0
    } catch (error: any) {
      console.error('Erro ao buscar total de resultados:', error.message)
    }

    try {
      const alunosResult = await pool.query('SELECT COUNT(*) as total FROM alunos WHERE ativo = true')
      totalAlunos = parseInt(alunosResult.rows[0]?.total || '0', 10) || 0
    } catch (error: any) {
      console.error('Erro ao buscar total de alunos:', error.message)
    }

    try {
      const turmasResult = await pool.query('SELECT COUNT(*) as total FROM turmas WHERE ativo = true')
      totalTurmas = parseInt(turmasResult.rows[0]?.total || '0', 10) || 0
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
      totalAlunosPresentes = parseInt(presencaResult.rows[0]?.presentes || '0', 10) || 0
      totalAlunosFaltantes = parseInt(presencaResult.rows[0]?.faltantes || '0', 10) || 0
    } catch (error: any) {
      console.error('Erro ao buscar presença:', error.message)
    }

    try {
      const mediaResult = await pool.query(`
        SELECT
          ROUND(AVG(CASE WHEN (presenca = 'P' OR presenca = 'p') AND (media_aluno IS NOT NULL AND CAST(media_aluno AS DECIMAL) > 0) THEN CAST(media_aluno AS DECIMAL) ELSE NULL END), 2) as media_geral,
          COUNT(CASE WHEN (presenca = 'P' OR presenca = 'p') AND (media_aluno IS NOT NULL AND CAST(media_aluno AS DECIMAL) >= 6.0) THEN 1 END) as aprovados,
          COUNT(CASE WHEN (presenca = 'P' OR presenca = 'p') AND (media_aluno IS NOT NULL AND CAST(media_aluno AS DECIMAL) > 0) THEN 1 END) as total_presentes
        FROM resultados_consolidados_unificada
      `)
      mediaGeral = parseFloat(mediaResult.rows[0]?.media_geral || '0') || 0
      const aprovados = parseInt(mediaResult.rows[0]?.aprovados || '0', 10) || 0
      const totalPresentes = parseInt(mediaResult.rows[0]?.total_presentes || '0', 10) || 0
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
      const mediaTipoResult = await pool.query(`
        SELECT
          cs.tipo_ensino,
          ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno > 0 THEN rc.media_aluno ELSE NULL END), 2) as media,
          COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno > 0 THEN 1 END) as total
        FROM resultados_consolidados rc
        JOIN configuracao_series cs ON rc.serie = cs.serie
        WHERE rc.presenca IN ('P', 'p')
        GROUP BY cs.tipo_ensino
      `)

      for (const row of mediaTipoResult.rows) {
        if (row.tipo_ensino === 'anos_iniciais') {
          mediaAnosIniciais = parseFloat(row.media || '0') || 0
          totalAnosIniciais = parseInt(row.total || '0', 10) || 0
        } else if (row.tipo_ensino === 'anos_finais') {
          mediaAnosFinais = parseFloat(row.media || '0') || 0
          totalAnosFinais = parseInt(row.total || '0', 10) || 0
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

