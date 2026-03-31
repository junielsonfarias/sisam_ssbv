/**
 * API Route para dados de relatório de escola (JSON)
 * GET /api/admin/relatorios/escola/[id]/dados
 *
 * Retorna apenas os dados JSON (sem gerar PDF)
 * Muito mais rápido e leve que a rota de PDF
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUsuarioFromRequest, podeAcessarEscola } from '@/lib/auth';
import { buscarDadosRelatorioEscola } from '@/lib/relatorios/consultas-relatorio';
import { DatabaseError } from '@/lib/validation'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const escolaId = params.id;

    // Autenticação
    const usuario = await getUsuarioFromRequest(request);
    if (!usuario) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Temporariamente restrito apenas para administradores
    if (usuario.tipo_usuario !== 'administrador') {
      return NextResponse.json(
        { mensagem: 'Funcionalidade temporariamente disponível apenas para administradores' },
        { status: 403 }
      );
    }

    // Verificar permissão para acessar escola
    const temPermissao = await podeAcessarEscola(usuario, escolaId);
    if (!temPermissao) {
      return NextResponse.json(
        { mensagem: 'Sem permissão para acessar esta escola' },
        { status: 403 }
      );
    }

    // Parâmetros da URL
    const searchParams = request.nextUrl.searchParams;
    const anoLetivo = searchParams.get('ano_letivo') || new Date().getFullYear().toString();
    const serie = searchParams.get('serie') || undefined;
    const avaliacaoId = searchParams.get('avaliacao_id') || undefined;

    // Buscar dados (reutiliza a função existente)
    const dados = await buscarDadosRelatorioEscola(escolaId, anoLetivo, serie, avaliacaoId);

    // Retornar JSON
    return NextResponse.json(dados, {
      headers: {
        'Cache-Control': 'private, max-age=60'
      }
    });

  } catch (error: unknown) {
    console.error('Erro ao buscar dados do relatório:', error);

    return NextResponse.json(
      { mensagem: 'Erro ao buscar dados do relatório' },
      { status: 500 }
    );
  }
}
