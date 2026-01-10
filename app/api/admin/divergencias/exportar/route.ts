// SISAM - API de Exportação de Divergências
// GET: Exporta relatório de divergências em JSON (para processamento no frontend)

import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { executarTodasVerificacoes } from '@/lib/divergencias/verificadores'
import { LABELS_NIVEL } from '@/lib/divergencias/tipos'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/divergencias/exportar
 * Exporta relatório de divergências
 *
 * Query params:
 *   - formato: 'json' (padrão) ou 'csv'
 *   - nivel: filtrar por nível
 */
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador'])) {
      return NextResponse.json(
        { mensagem: 'Acesso não autorizado.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const formato = searchParams.get('formato') || 'json'
    const nivelFiltro = searchParams.get('nivel')

    // Executar verificação
    const resultado = await executarTodasVerificacoes()

    // Filtrar por nível se especificado
    let divergencias = resultado.divergencias
    if (nivelFiltro) {
      divergencias = divergencias.filter(d => d.nivel === nivelFiltro)
    }

    if (formato === 'csv') {
      // Gerar CSV
      const linhas: string[] = [
        'Nivel,Tipo,Titulo,Quantidade,Entidade,Nome,Codigo,Escola,Serie,Problema,Sugestao'
      ]

      divergencias.forEach(div => {
        div.detalhes.forEach(det => {
          const linha = [
            LABELS_NIVEL[div.nivel],
            div.tipo,
            div.titulo,
            div.quantidade,
            det.entidade,
            det.nome || '',
            det.codigo || '',
            det.escola || '',
            det.serie || '',
            `"${(det.descricaoProblema || '').replace(/"/g, '""')}"`,
            `"${(det.sugestaoCorrecao || '').replace(/"/g, '""')}"`
          ].join(',')
          linhas.push(linha)
        })
      })

      const csv = linhas.join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="divergencias_${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

    // Formato JSON padrão
    const relatorio = {
      geradoEm: new Date().toISOString(),
      geradoPor: usuario.nome,
      resumo: resultado.resumo,
      divergencias: divergencias.map(div => ({
        nivel: div.nivel,
        nivelLabel: LABELS_NIVEL[div.nivel],
        tipo: div.tipo,
        titulo: div.titulo,
        descricao: div.descricao,
        quantidade: div.quantidade,
        corrigivel: div.corrigivel,
        correcaoAutomatica: div.correcaoAutomatica,
        acaoCorrecao: div.acaoCorrecao,
        detalhes: div.detalhes
      }))
    }

    return NextResponse.json(relatorio, {
      headers: {
        'Content-Disposition': `attachment; filename="divergencias_${new Date().toISOString().split('T')[0]}.json"`
      }
    })

  } catch (error: any) {
    console.error('Erro ao exportar divergências:', error)
    return NextResponse.json(
      { mensagem: 'Erro ao exportar divergências', erro: error.message },
      { status: 500 }
    )
  }
}
