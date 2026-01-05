import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

// POST - Upload de foto de perfil (recebe base64 ou URL)
export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { foto_url, foto_base64 } = body

    let urlFinal = foto_url

    // Se recebeu base64, salvar como data URL
    // Em produção, você deve fazer upload para Supabase Storage ou S3
    if (foto_base64) {
      // Validar se é uma imagem válida
      if (!foto_base64.startsWith('data:image/')) {
        return NextResponse.json(
          { mensagem: 'Formato de imagem inválido' },
          { status: 400 }
        )
      }

      // Limitar tamanho (máximo ~500KB em base64)
      if (foto_base64.length > 700000) {
        return NextResponse.json(
          { mensagem: 'Imagem muito grande. Máximo permitido: 500KB' },
          { status: 400 }
        )
      }

      urlFinal = foto_base64
    }

    if (!urlFinal) {
      return NextResponse.json(
        { mensagem: 'URL ou imagem base64 é obrigatória' },
        { status: 400 }
      )
    }

    // Atualizar foto no banco
    await pool.query(
      `UPDATE usuarios
       SET foto_url = $1, atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [urlFinal, usuario.id]
    )

    return NextResponse.json({
      mensagem: 'Foto atualizada com sucesso',
      foto_url: urlFinal
    })
  } catch (error: any) {
    console.error('Erro ao atualizar foto:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Remover foto de perfil
export async function DELETE(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Remover foto
    await pool.query(
      `UPDATE usuarios
       SET foto_url = NULL, atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [usuario.id]
    )

    return NextResponse.json({
      mensagem: 'Foto removida com sucesso'
    })
  } catch (error: any) {
    console.error('Erro ao remover foto:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
