import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest } from '@/lib/auth'
import pool from '@/database/connection'
import { z } from 'zod'
import { validateRequest } from '@/lib/schemas'
import path from 'path'
import fs from 'fs/promises'
import sharp from 'sharp'

const fotoPostSchema = z.object({
  foto_url: z.string().max(1000).optional().nullable(),
  foto_base64: z.string().max(800000).optional().nullable(),
})

export const dynamic = 'force-dynamic'

/** Diretório onde as fotos são salvas */
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'fotos')

/**
 * Garante que o diretório de uploads existe
 */
async function garantirDiretorio(): Promise<void> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true })
}

/**
 * Decodifica base64 e salva como arquivo .webp usando sharp
 * @returns URL pública do arquivo salvo
 */
async function salvarFotoComoArquivo(base64Data: string, usuarioId: string): Promise<string> {
  await garantirDiretorio()

  // Extrair dados binários do base64 (remover prefixo data:image/...)
  const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, '')
  const buffer = Buffer.from(base64Content, 'base64')

  const nomeArquivo = `${usuarioId}.webp`
  const caminhoArquivo = path.join(UPLOAD_DIR, nomeArquivo)

  // Converter para WebP otimizado com sharp
  await sharp(buffer)
    .resize(256, 256, { fit: 'cover', position: 'centre' })
    .webp({ quality: 80 })
    .toFile(caminhoArquivo)

  return `/uploads/fotos/${nomeArquivo}`
}

/**
 * Remove arquivo de foto do disco
 */
async function removerArquivoFoto(usuarioId: string): Promise<void> {
  const extensoes = ['webp', 'jpg', 'jpeg', 'png']
  for (const ext of extensoes) {
    const caminho = path.join(UPLOAD_DIR, `${usuarioId}.${ext}`)
    try {
      await fs.unlink(caminho)
    } catch {
      // Arquivo não existe, ok
    }
  }
}

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

    // Se recebeu base64, salvar como arquivo .webp no disco
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

      // Remover foto anterior (se existir com extensão diferente)
      await removerArquivoFoto(usuario.id)

      // Salvar como arquivo .webp e obter URL pública
      urlFinal = await salvarFotoComoArquivo(foto_base64, usuario.id)
    }

    if (!urlFinal) {
      return NextResponse.json(
        { mensagem: 'URL ou imagem base64 é obrigatória' },
        { status: 400 }
      )
    }

    // Atualizar foto no banco (apenas a URL, nunca base64)
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

    // Buscar URL atual para verificar se é arquivo local
    const result = await pool.query(
      'SELECT foto_url FROM usuarios WHERE id = $1',
      [usuario.id]
    )
    const fotoAtual = result.rows[0]?.foto_url

    // Se era arquivo local, deletar do disco
    if (fotoAtual && fotoAtual.startsWith('/uploads/fotos/')) {
      await removerArquivoFoto(usuario.id)
    }

    // Remover foto do banco
    await pool.query(
      `UPDATE usuarios
       SET foto_url = NULL, atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [usuario.id]
    )

    return new NextResponse(null, { status: 204 })
  } catch (error: unknown) {
    console.error('Erro ao remover foto:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
