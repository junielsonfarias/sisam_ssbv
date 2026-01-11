/**
 * API Route para geração de relatório PDF de polo
 * GET /api/admin/relatorios/polo/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { getUsuarioFromRequest, podeAcessarPolo } from '@/lib/auth';
import { buscarDadosRelatorioPolo } from '@/lib/relatorios/consultas-relatorio';
import { RelatorioPoloPDF } from '@/lib/relatorios/gerador-pdf';
import { gerarGraficosPolo } from '@/lib/relatorios/gerador-graficos';
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

    const poloId = params.id;

    // Verificar permissão para acessar polo
    const temPermissao = podeAcessarPolo(usuario, poloId);
    if (!temPermissao) {
      return NextResponse.json(
        { error: 'Sem permissão para acessar este polo' },
        { status: 403 }
      );
    }

    // Parâmetros da URL
    const searchParams = request.nextUrl.searchParams;
    const anoLetivo = searchParams.get('ano_letivo') || new Date().getFullYear().toString();
    const serie = searchParams.get('serie') || undefined;

    // Buscar dados
    const dados = await buscarDadosRelatorioPolo(poloId, anoLetivo, serie);

    // Gerar gráficos em paralelo
    const graficos = await gerarGraficosPolo(
      dados.desempenho_disciplinas,
      dados.graficos.distribuicao_notas,
      dados.graficos.radar_competencias,
      dados.analise_questoes,
      dados.escolas
    );

    // Gerar PDF - usando any para contornar tipagem do react-pdf
    const documento = React.createElement(RelatorioPoloPDF, { dados, graficos });
    const pdfBuffer = await renderToBuffer(documento as any);

    // Nome do arquivo
    const codigoPolo = dados.polo.codigo || dados.polo.id.substring(0, 8);
    const nomeArquivo = `relatorio_polo_${codigoPolo}_${anoLetivo}.pdf`;

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
    console.error('Erro ao gerar relatório de polo:', error);

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
