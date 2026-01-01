import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

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

    // Tratamento individual de cada query para evitar que uma falha quebre todas
    let totalUsuarios = 0
    let totalEscolas = 0
    let totalPolos = 0
    let totalQuestoes = 0
    let totalResultados = 0

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

    return NextResponse.json({
      totalUsuarios,
      totalEscolas,
      totalPolos,
      totalQuestoes,
      totalResultados,
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
      erro: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 200 }) // Retornar 200 com valores padrão para não quebrar o frontend
  }
}

