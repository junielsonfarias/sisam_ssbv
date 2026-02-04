/**
 * API Route para dados de relatório de polo (JSON)
 * GET /api/admin/relatorios/polo/[id]/dados
 *
 * Retorna apenas os dados JSON (sem gerar PDF)
 * Muito mais rápido e leve que a rota de PDF
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUsuarioFromRequest, podeAcessarPolo } from '@/lib/auth';
import { buscarDadosRelatorioPolo } from '@/lib/relatorios/consultas-relatorio';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const poloId = params.id;

    // Autenticação
    const usuario = await getUsuarioFromRequest(request);
    if (!usuario) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Temporariamente restrito apenas para administradores
    if (usuario.tipo_usuario !== 'administrador') {
      return NextResponse.json(
        { error: 'Funcionalidade temporariamente disponível apenas para administradores' },
        { status: 403 }
      );
    }

    // Verificar permissão para acessar polo (síncrono)
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

    // Buscar dados (reutiliza a função existente)
    const dados = await buscarDadosRelatorioPolo(poloId, anoLetivo, serie);

    // Retornar JSON
    return NextResponse.json(dados, {
      headers: {
        'Cache-Control': 'private, max-age=60'
      }
    });

  } catch (error: unknown) {
    console.error('Erro ao buscar dados do relatório do polo:');
    console.error('- Tipo do erro:', error?.constructor?.name);
    console.error('- Mensagem:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('- Stack:', error.stack);
    }

    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

    return NextResponse.json(
      {
        error: 'Erro ao buscar dados do relatório do polo',
        detalhes: errorMessage
      },
      { status: 500 }
    );
  }
}
