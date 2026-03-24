import { NextResponse } from 'next/server'
import pool from '@/database/connection'
import { withAuth } from '@/lib/auth/with-auth'
import { z } from 'zod'
import { validateRequest } from '@/lib/schemas'

export const dynamic = 'force-dynamic'

/**
 * GET /api/editor/noticias
 * Busca as notícias do site (seção 'news' do site_config)
 */
export const GET = withAuth(['administrador', 'tecnico', 'editor'], async (request, usuario) => {
  const result = await pool.query(
    `SELECT conteudo FROM site_config WHERE secao = 'news'`
  )

  if (result.rows.length === 0) {
    return NextResponse.json({ noticias: [], titulo: 'Notícias', descricao: '' })
  }

  const conteudo = result.rows[0].conteudo || {}
  return NextResponse.json({
    titulo: conteudo.titulo || 'Notícias',
    descricao: conteudo.descricao || '',
    noticias: conteudo.itens || [],
  })
})

/**
 * PUT /api/editor/noticias
 * Atualiza as notícias do site
 * Body: { titulo?, descricao?, noticias: [{titulo, resumo, conteudo, data, imagem_url?, link?}] }
 */
const editorNoticiaPutSchema = z.object({
  titulo: z.string().max(255).optional().nullable(),
  descricao: z.string().max(1000).optional().nullable(),
  noticias: z.array(z.object({
    titulo: z.string().min(1, 'Cada notícia deve ter um título').max(255),
    resumo: z.string().max(1000).optional().nullable(),
    conteudo: z.string().max(10000).optional().nullable(),
    data: z.string().optional().nullable(),
    imagem_url: z.string().max(500).optional().nullable(),
    link: z.string().max(500).optional().nullable(),
  })).min(1, 'Campo "noticias" é obrigatório (array)'),
})

export const PUT = withAuth(['administrador', 'tecnico', 'editor'], async (request, usuario) => {
  const result = await validateRequest(request, editorNoticiaPutSchema)
  if (!result.success) return result.response
  const { titulo, descricao, noticias } = result.data

  const conteudo = {
    titulo: titulo || 'Notícias e Eventos',
    descricao: descricao || 'Fique por dentro das últimas novidades da educação municipal.',
    itens: noticias.map((n: any) => ({
      titulo: n.titulo?.trim(),
      resumo: n.resumo?.trim() || '',
      conteudo: n.conteudo?.trim() || '',
      data: n.data || new Date().toISOString().split('T')[0],
      imagem_url: n.imagem_url || null,
      link: n.link || null,
    })),
  }

  // UPSERT na seção news
  await pool.query(
    `INSERT INTO site_config (secao, conteudo, atualizado_por, atualizado_em)
     VALUES ('news', $1, $2, NOW())
     ON CONFLICT (secao) DO UPDATE SET
       conteudo = EXCLUDED.conteudo,
       atualizado_por = EXCLUDED.atualizado_por,
       atualizado_em = NOW()`,
    [JSON.stringify(conteudo), usuario.id]
  )

  console.log(`[AUDIT] Notícias atualizadas por ${usuario.email} (${usuario.tipo_usuario}): ${noticias.length} item(s)`)

  return NextResponse.json({
    mensagem: `${noticias.length} notícia(s) salva(s) com sucesso`,
    total: noticias.length,
  })
})
