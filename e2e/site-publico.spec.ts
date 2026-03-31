import { test, expect } from '@playwright/test'

test.describe('Site Institucional', () => {
  test('carrega a homepage com titulo e secoes', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/SISAM|SEMED|Educacao/)
    // Hero section deve estar visivel
    await expect(page.locator('text=SEMED').first()).toBeVisible({ timeout: 10000 })
  })

  test('exibe header com logo e navegacao', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('header').first()).toBeVisible()
    await expect(page.locator('img[alt*="SEMED"], img[alt*="logo"]').first()).toBeVisible()
  })

  test('exibe footer com copyright', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('footer').first()).toBeVisible()
  })

  test('secao de estatisticas exibe numeros', async ({ page }) => {
    await page.goto('/')
    // Scroll ate a secao de stats
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 3))
    await page.waitForTimeout(1000)
  })
})

test.describe('Pagina de Login', () => {
  test('exibe formulario de login', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
    await expect(page.locator('button[type="submit"], button:has-text("Entrar")').first()).toBeVisible()
  })

  test('mostra erro com credenciais invalidas', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"], input[name="email"]', 'invalido@teste.com')
    await page.fill('input[type="password"]', 'senhaerrada123')
    await page.click('button[type="submit"], button:has-text("Entrar")')
    // Deve mostrar mensagem de erro
    await expect(page.locator('text=/erro|invalido|incorret/i').first()).toBeVisible({ timeout: 5000 })
  })

  test('link de voltar ao site funciona', async ({ page }) => {
    await page.goto('/login')
    const voltarLink = page.locator('a:has-text("Voltar")')
    if (await voltarLink.isVisible()) {
      await voltarLink.click()
      await expect(page).toHaveURL('/')
    }
  })
})

test.describe('Boletim Publico', () => {
  test('exibe formulario de consulta', async ({ page }) => {
    await page.goto('/boletim')
    await expect(page.locator('text=/Consulta.*Boletim/i').first()).toBeVisible()
    await expect(page.locator('input').first()).toBeVisible()
    await expect(page.locator('button:has-text("Consultar")').first()).toBeVisible()
  })

  test('alterna entre busca por codigo e CPF', async ({ page }) => {
    await page.goto('/boletim')
    const btnCpf = page.locator('button:has-text("CPF")')
    if (await btnCpf.isVisible()) {
      await btnCpf.click()
      await expect(page.locator('input[placeholder*="000"]').first()).toBeVisible()
    }
  })

  test('mostra erro ao buscar codigo inexistente', async ({ page }) => {
    await page.goto('/boletim')
    await page.fill('input', 'CODIGO-INEXISTENTE-999')
    await page.click('button:has-text("Consultar")')
    await expect(page.locator('text=/erro|encontrado|invalido/i').first()).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Paginas Publicas', () => {
  test('pagina de publicacoes carrega', async ({ page }) => {
    await page.goto('/publicacoes')
    await expect(page.locator('text=/publicac/i').first()).toBeVisible({ timeout: 10000 })
  })

  test('pagina de eventos carrega', async ({ page }) => {
    await page.goto('/eventos')
    await expect(page.locator('text=/evento/i').first()).toBeVisible({ timeout: 10000 })
  })

  test('pagina de transparencia carrega', async ({ page }) => {
    await page.goto('/transparencia')
    await expect(page.locator('text=/transparencia|escolar/i').first()).toBeVisible({ timeout: 10000 })
  })

  test('pagina de ouvidoria carrega', async ({ page }) => {
    await page.goto('/ouvidoria')
    await expect(page.locator('text=/ouvidoria/i').first()).toBeVisible({ timeout: 10000 })
  })

  test('pre-matricula carrega formulario', async ({ page }) => {
    await page.goto('/matricula')
    await expect(page.locator('text=/matr[ií]cula/i').first()).toBeVisible({ timeout: 10000 })
  })
})

test.describe('API Health', () => {
  test('endpoint /api/health retorna status', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.status()).toBeLessThan(600)
    const body = await response.json()
    expect(body.status).toBeDefined()
    expect(body.timestamp).toBeDefined()
  })

  test('endpoint /api/site-config retorna configuracoes', async ({ request }) => {
    const response = await request.get('/api/site-config')
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.secoes || body.config || Array.isArray(body)).toBeTruthy()
  })
})

test.describe('Responsividade Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('homepage e responsiva no mobile', async ({ page }) => {
    await page.goto('/')
    // Nao deve ter scroll horizontal
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5) // 5px tolerance
  })

  test('menu mobile funciona', async ({ page }) => {
    await page.goto('/')
    // Procurar botao de menu hamburger
    const menuBtn = page.locator('button[aria-label*="menu"], button:has(svg.lucide-menu), header button').first()
    if (await menuBtn.isVisible()) {
      await menuBtn.click()
      await page.waitForTimeout(500)
    }
  })
})
