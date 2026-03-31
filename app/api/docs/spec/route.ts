import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export const dynamic = 'force-dynamic'

/**
 * GET /api/docs/spec
 * Serve o arquivo OpenAPI YAML
 */
export async function GET() {
  try {
    const specPath = join(process.cwd(), 'docs', 'openapi.yaml')
    const spec = readFileSync(specPath, 'utf-8')
    return new NextResponse(spec, {
      headers: {
        'Content-Type': 'text/yaml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch {
    return NextResponse.json(
      { mensagem: 'Especificacao OpenAPI nao encontrada' },
      { status: 404 }
    )
  }
}
