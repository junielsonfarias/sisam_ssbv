import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest } from '@/lib/auth'
import pool from '@/database/connection'
import { z } from 'zod'
import { validateRequest } from '@/lib/schemas'

const fotoPostSchema = z.object({
  foto_url: z.string().max(1000).optional().nullable(),
  foto_base64: z.string().max(800000).optional().nullable(),
})

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

    const validationResult = await validateRequest(request, fotoPostSchema)
    if (!validationResult.success) return validationResult.response
    const { foto_url, foto_base64 } = validationResult.data

    let urlFinal = foto_url

    // Se recebeu base64, salvar como data URL
    // Em produção, você deve fazer upload para Supabase Storage ou S3
    if (foto_base64) {
      // Validar se é uma imagem com formato permitido (whitelist)
      const mimeMatch = foto_base64.match(/^data:image\/(jpeg|jpg|png|webp);base64,/)
      if (!mimeMatch) {
        return NextResponse.json(
          { mensagem: 'Formato não permitido. Use PNG, JPG ou WebP.' },
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
  } catch (error: unknown) {
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
  } catch (error: unknown) {
    console.error('Erro ao remover foto:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
