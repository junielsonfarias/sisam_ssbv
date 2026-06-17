import { test, expect } from '@playwright/test'

/**
 * Valida a reorganização de rotas por módulo (17/06/2026): cada rota antiga
 * `/admin/<pagina>` redireciona para `/admin/<modulo>/<pagina>`, cobrindo a
 * rota base, subrotas dinâmicas e os dashboards renomeados.
 *
 * Seguro: usa apenas `request` (sem seguir redirect) e navegação não
 * autenticada — não depende de credenciais nem altera dados no banco.
 */

// [rota antiga, destino esperado]
const REDIRECTS: Array<[string, string]> = [
  // SISAM
  ['/admin/dashboard', '/admin/sisam/dashboard'],
  ['/admin/dados', '/admin/sisam/dados'],
  ['/admin/graficos', '/admin/sisam/graficos'],
  ['/admin/comparativos', '/admin/sisam/comparativos'],
  ['/admin/comparativos-polos', '/admin/sisam/comparativos-polos'],
  // Gestor (+ dashboard renomeado)
  ['/admin/alunos', '/admin/gestor/alunos'],
  ['/admin/turmas', '/admin/gestor/turmas'],
  ['/admin/notas-escolares', '/admin/gestor/notas-escolares'],
  ['/admin/dashboard-gestor', '/admin/gestor/dashboard'],
  // SEMED (+ dashboard renomeado)
  ['/admin/pnae', '/admin/semed/pnae'],
  ['/admin/ficai', '/admin/semed/ficai'],
  ['/admin/dashboard-semed', '/admin/semed/dashboard'],
  // Transparência
  ['/admin/site-institucional', '/admin/transparencia/site-institucional'],
  ['/admin/ouvidoria', '/admin/transparencia/ouvidoria'],
  // Admin
  ['/admin/usuarios', '/admin/admin/usuarios'],
  ['/admin/seguranca', '/admin/admin/seguranca'],
]

test.describe('Reorganização de rotas por módulo — redirects', () => {
  for (const [origem, destino] of REDIRECTS) {
    test(`${origem} → ${destino}`, async ({ request }) => {
      const res = await request.get(origem, { maxRedirects: 0 })
      // Next responde redirect de configuração como 307 (temporário nesta fase)
      expect([307, 308], `status de ${origem}`).toContain(res.status())
      const location = res.headers()['location'] || ''
      expect(location, `location de ${origem}`).toContain(destino)
    })
  }

  test('subrota dinâmica preserva o caminho (relatorios/escola/:id)', async ({ request }) => {
    const res = await request.get('/admin/relatorios/escola/abc-123', { maxRedirects: 0 })
    expect([307, 308]).toContain(res.status())
    expect(res.headers()['location'] || '').toContain('/admin/sisam/relatorios/escola/abc-123')
  })

  test('rota nova /admin/sisam/* NÃO redireciona (não é 3xx de config)', async ({ request }) => {
    // A rota namespaced é o destino final — não deve haver redirect de config.
    // Sem sessão, o gate de auth roda no cliente (200 do HTML), não um 3xx aqui.
    const res = await request.get('/admin/sisam/dashboard', { maxRedirects: 0 })
    expect(res.status()).toBeLessThan(300)
  })
})

test.describe('Proteção de rota (sem sessão)', () => {
  test('acessar rota de módulo sem login termina em /login', async ({ page }) => {
    await page.goto('/admin/sisam/dashboard')
    // ProtectedRoute (cliente) redireciona para /login quando não autenticado.
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 })
  })

  test('URL antiga sem login também cai em /login (passa pelo redirect)', async ({ page }) => {
    await page.goto('/admin/alunos')
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 })
  })
})
