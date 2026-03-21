import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest } from '@/lib/auth'
import pool, { testConnection } from '@/database/connection'

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verificar conexão com banco antes de processar
    const dbTest = await testConnection();
    if (!dbTest.success) {
      console.error('Erro de conexão com banco de dados:', dbTest.error);
      return NextResponse.json(
        { 
          mensagem: 'Erro ao conectar com o banco de dados',
          erro: 'DB_CONNECTION_ERROR',
          detalhes: process.env.NODE_ENV === 'development' ? dbTest.error : undefined
        },
        { status: 503 } // Service Unavailable
      )
    }

    const usuario = await getUsuarioFromRequest(request)

    if (!usuario) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Para usuários tipo escola, buscar se o Gestor Escolar está habilitado
    let gestorEscolarHabilitado = true // admin/tecnico sempre têm acesso
    if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      try {
        const escolaResult = await pool.query(
          'SELECT gestor_escolar_habilitado FROM escolas WHERE id = $1',
          [usuario.escola_id]
        )
        gestorEscolarHabilitado = escolaResult.rows[0]?.gestor_escolar_habilitado ?? false
      } catch {
        gestorEscolarHabilitado = false
      }
    }

    // Para professores, buscar escolas e turmas vinculadas
    let professorEscolas: { escola_id: string; escola_nome: string }[] = []
    if (usuario.tipo_usuario === 'professor') {
      try {
        const profResult = await pool.query(
          `SELECT DISTINCT t.escola_id, e.nome as escola_nome
           FROM professor_turmas pt
           JOIN turmas t ON t.id = pt.turma_id
           JOIN escolas e ON e.id = t.escola_id
           WHERE pt.professor_id = $1 AND pt.ativo = true`,
          [usuario.id]
        )
        professorEscolas = profResult.rows
      } catch {
        professorEscolas = []
      }
    }

    return NextResponse.json({
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        tipo_usuario: usuario.tipo_usuario,
        polo_id: usuario.polo_id,
        escola_id: usuario.escola_id,
        gestor_escolar_habilitado: gestorEscolarHabilitado,
        ...(usuario.tipo_usuario === 'professor' && { professor_escolas: professorEscolas }),
      },
    })
  } catch (error: any) {
    console.error('Erro ao verificar autenticação:', {
      message: error?.message,
      code: error?.code,
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    })
    
    // Verificar se é erro de banco de dados
    if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND' || error?.code === 'ETIMEDOUT') {
      return NextResponse.json(
        { 
          mensagem: 'Erro ao conectar com o banco de dados',
          erro: 'DB_CONNECTION_ERROR',
          detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 503 }
      )
    }
    
    return NextResponse.json(
      { 
        mensagem: 'Erro interno do servidor',
        erro: 'INTERNAL_ERROR',
        detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

