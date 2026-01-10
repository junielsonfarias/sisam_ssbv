// SISAM - API de Divergências
// GET: Lista divergências | POST: Executa verificação completa

import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { executarTodasVerificacoes, verificarDivergenciasCriticas } from '@/lib/divergencias/verificadores'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/divergencias
 * Lista todas as divergências encontradas
 * Query params:
 *   - nivel: filtrar por nível (critico, importante, aviso, informativo)
 *   - tipo: filtrar por tipo específico
 *   - apenas_criticos: true para retornar apenas contagem de críticos (para alerta login)
 */
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador'])) {
      return NextResponse.json(
        { mensagem: 'Acesso não autorizado. Apenas administradores podem acessar.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const apenasCriticos = searchParams.get('apenas_criticos') === 'true'
    const nivel = searchParams.get('nivel')
    const tipo = searchParams.get('tipo')

    // Se apenas criticos, retorna só a contagem (para alerta de login)
    if (apenasCriticos) {
      const totalCriticos = await verificarDivergenciasCriticas()
      return NextResponse.json({
        criticos: totalCriticos
      })
    }

    // Executar verificação completa
    const resultado = await executarTodasVerificacoes()

    // Filtrar se necessário
    let divergenciasFiltradas = resultado.divergencias

    if (nivel) {
      divergenciasFiltradas = divergenciasFiltradas.filter(d => d.nivel === nivel)
    }

    if (tipo) {
      divergenciasFiltradas = divergenciasFiltradas.filter(d => d.tipo === tipo)
    }

    return NextResponse.json({
      resumo: resultado.resumo,
      divergencias: divergenciasFiltradas,
      dataVerificacao: resultado.dataVerificacao
    })

  } catch (error: any) {
    console.error('Erro ao buscar divergências:', error)
    return NextResponse.json(
      { mensagem: 'Erro ao buscar divergências', erro: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/divergencias
 * Executa uma nova verificação completa
 */
export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador'])) {
      return NextResponse.json(
        { mensagem: 'Acesso não autorizado. Apenas administradores podem executar verificações.' },
        { status: 403 }
      )
    }

    // Executar verificação completa
    const resultado = await executarTodasVerificacoes()

    return NextResponse.json({
      mensagem: 'Verificação concluída',
      resumo: resultado.resumo,
      divergencias: resultado.divergencias,
      dataVerificacao: resultado.dataVerificacao
    })

  } catch (error: any) {
    console.error('Erro ao executar verificação:', error)
    return NextResponse.json(
      { mensagem: 'Erro ao executar verificação', erro: error.message },
      { status: 500 }
    )
  }
}
