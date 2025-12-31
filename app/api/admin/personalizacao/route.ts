import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic';

// GET - Buscar configurações de personalização
export async function GET(request: NextRequest) {
  try {
    // Permitir acesso público para leitura (necessário para página de login)
    // Não precisa de autenticação para ler personalização
    let result
    try {
      result = await pool.query(
        'SELECT * FROM personalizacao WHERE tipo = $1',
        ['principal']
      )
    } catch (dbError: any) {
      console.error('Erro ao consultar personalização no banco:', dbError)
      // Retornar valores padrão em caso de erro
      return NextResponse.json({
        login_titulo: 'SISAM',
        login_subtitulo: 'Sistema de Análise de Provas',
        login_imagem_url: null,
        login_cor_primaria: '#4f46e5',
        login_cor_secundaria: '#818cf8',
        rodape_texto: '© 2026 SISAM - Todos os direitos reservados',
        rodape_link: null,
        rodape_link_texto: null,
        rodape_ativo: true,
      })
    }

    if (result.rows.length === 0) {
      // Retornar valores padrão se não existir configuração
      return NextResponse.json({
        login_titulo: 'SISAM',
        login_subtitulo: 'Sistema de Análise de Provas',
        login_imagem_url: null,
        login_cor_primaria: '#4f46e5',
        login_cor_secundaria: '#818cf8',
        rodape_texto: '© 2026 SISAM - Todos os direitos reservados',
        rodape_link: null,
        rodape_link_texto: null,
        rodape_ativo: true,
      })
    }

    return NextResponse.json(result.rows[0])
  } catch (error: any) {
    console.error('Erro ao buscar personalização:', error)
    // Retornar valores padrão em caso de erro
    return NextResponse.json({
      login_titulo: 'SISAM',
      login_subtitulo: 'Sistema de Análise de Provas',
      login_imagem_url: null,
      login_cor_primaria: '#4f46e5',
      login_cor_secundaria: '#818cf8',
      rodape_texto: '© 2026 SISAM - Todos os direitos reservados',
      rodape_link: null,
      rodape_link_texto: null,
      rodape_ativo: true,
    })
  }
}

// PUT - Atualizar configurações de personalização
export async function PUT(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    const {
      login_titulo,
      login_subtitulo,
      login_imagem_url,
      login_cor_primaria,
      login_cor_secundaria,
      rodape_texto,
      rodape_link,
      rodape_link_texto,
      rodape_ativo,
    } = await request.json()

    // Verificar se já existe configuração
    const existe = await pool.query(
      'SELECT id FROM personalizacao WHERE tipo = $1',
      ['principal']
    )

    if (existe.rows.length > 0) {
      // Atualizar
      const result = await pool.query(
        `UPDATE personalizacao SET
          login_titulo = $1,
          login_subtitulo = $2,
          login_imagem_url = $3,
          login_cor_primaria = $4,
          login_cor_secundaria = $5,
          rodape_texto = $6,
          rodape_link = $7,
          rodape_link_texto = $8,
          rodape_ativo = $9,
          atualizado_em = CURRENT_TIMESTAMP
        WHERE tipo = 'principal'
        RETURNING *`,
        [
          login_titulo || null,
          login_subtitulo || null,
          login_imagem_url || null,
          login_cor_primaria || null,
          login_cor_secundaria || null,
          rodape_texto || null,
          rodape_link || null,
          rodape_link_texto || null,
          rodape_ativo !== undefined ? rodape_ativo : true,
        ]
      )

      return NextResponse.json(result.rows[0])
    } else {
      // Criar nova
      const result = await pool.query(
        `INSERT INTO personalizacao (
          tipo, login_titulo, login_subtitulo, login_imagem_url,
          login_cor_primaria, login_cor_secundaria,
          rodape_texto, rodape_link, rodape_link_texto, rodape_ativo
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          'principal',
          login_titulo || null,
          login_subtitulo || null,
          login_imagem_url || null,
          login_cor_primaria || null,
          login_cor_secundaria || null,
          rodape_texto || null,
          rodape_link || null,
          rodape_link_texto || null,
          rodape_ativo !== undefined ? rodape_ativo : true,
        ]
      )

      return NextResponse.json(result.rows[0], { status: 201 })
    }
  } catch (error) {
    console.error('Erro ao atualizar personalização:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

