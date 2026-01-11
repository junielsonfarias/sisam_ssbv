/**
 * API Route para geração de relatório PDF de escola
 * GET /api/admin/relatorios/escola/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { getUsuarioFromRequest, podeAcessarEscola } from '@/lib/auth';
import { buscarDadosRelatorioEscola } from '@/lib/relatorios/consultas-relatorio';
import { RelatorioEscolaPDF } from '@/lib/relatorios/gerador-pdf';
import { gerarGraficosEscola } from '@/lib/relatorios/gerador-graficos';
import React from 'react';

// Configuração de timeout para Vercel (plano gratuito: máximo 10s)
export const maxDuration = 10;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Autenticação
    const usuario = await getUsuarioFromRequest(request);
    if (!usuario) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const escolaId = params.id;

    // Verificar permissão para acessar escola
    const temPermissao = await podeAcessarEscola(usuario, escolaId);
    if (!temPermissao) {
      return NextResponse.json(
        { error: 'Sem permissão para acessar esta escola' },
        { status: 403 }
      );
    }

    // Parâmetros da URL
    const searchParams = request.nextUrl.searchParams;
    const anoLetivo = searchParams.get('ano_letivo') || new Date().getFullYear().toString();
    const serie = searchParams.get('serie') || undefined;

    // Buscar dados
    const dados = await buscarDadosRelatorioEscola(escolaId, anoLetivo, serie);

    // Gerar gráficos em paralelo
    const graficos = await gerarGraficosEscola(
      dados.desempenho_disciplinas,
      dados.graficos.distribuicao_notas,
      dados.graficos.radar_competencias,
      dados.analise_questoes
    );

    // Gerar PDF - usando any para contornar tipagem do react-pdf
    const documento = React.createElement(RelatorioEscolaPDF, { dados, graficos });
    const pdfBuffer = await renderToBuffer(documento as any);

    // Nome do arquivo
    const codigoEscola = dados.escola.codigo || dados.escola.id.substring(0, 8);
    const nomeArquivo = `relatorio_escola_${codigoEscola}_${anoLetivo}.pdf`;

    // Converter Buffer para Uint8Array para compatibilidade com NextResponse
    const uint8Array = new Uint8Array(pdfBuffer);

    // Retornar PDF
    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error: unknown) {
    console.error('Erro ao gerar relatório de escola:', error);

    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

    return NextResponse.json(
      {
        error: 'Erro ao gerar relatório',
        detalhes: errorMessage
      },
      { status: 500 }
    );
  }
}
