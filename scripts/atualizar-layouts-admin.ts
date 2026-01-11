/**
 * Script para atualizar páginas admin removendo LayoutDashboard duplicado
 */

import * as fs from 'fs'
import * as path from 'path'

const dirsToProcess = [
  path.join(__dirname, '..', 'app', 'admin'),
  path.join(__dirname, '..', 'app', 'polo'),
  path.join(__dirname, '..', 'app', 'escola'),
  path.join(__dirname, '..', 'app', 'tecnico'),
  path.join(__dirname, '..', 'app', 'perfil'),
]

function processarPagina(filePath: string) {
  const conteudo = fs.readFileSync(filePath, 'utf-8')

  // Verificar se tem LayoutDashboard
  if (!conteudo.includes('LayoutDashboard')) {
    console.log(`[SKIP] ${filePath} - Não tem LayoutDashboard`)
    return
  }

  let novoConteudo = conteudo

  // Remover import do LayoutDashboard
  novoConteudo = novoConteudo.replace(
    /import LayoutDashboard from ['"]@\/components\/layout-dashboard['"]\n?/g,
    ''
  )

  // Remover <LayoutDashboard tipoUsuario="admin"> ou similar
  novoConteudo = novoConteudo.replace(
    /\s*<LayoutDashboard tipoUsuario=\{?['"]?\w+['"]?\}?>\n?/g,
    '\n'
  )

  // Remover </LayoutDashboard>
  novoConteudo = novoConteudo.replace(
    /\s*<\/LayoutDashboard>\n?/g,
    '\n'
  )

  // Limpar linhas vazias duplicadas
  novoConteudo = novoConteudo.replace(/\n{3,}/g, '\n\n')

  if (conteudo !== novoConteudo) {
    fs.writeFileSync(filePath, novoConteudo)
    console.log(`[OK] ${filePath} - Atualizado`)
  } else {
    console.log(`[SKIP] ${filePath} - Sem alterações`)
  }
}

function processarDiretorio(dir: string) {
  const itens = fs.readdirSync(dir)

  for (const item of itens) {
    const itemPath = path.join(dir, item)
    const stat = fs.statSync(itemPath)

    if (stat.isDirectory()) {
      processarDiretorio(itemPath)
    } else if (item === 'page.tsx') {
      processarPagina(itemPath)
    }
  }
}

console.log('='.repeat(60))
console.log('Atualizando páginas para remover LayoutDashboard duplicado')
console.log('='.repeat(60))

for (const dir of dirsToProcess) {
  if (fs.existsSync(dir)) {
    console.log(`\nProcessando: ${dir}`)
    processarDiretorio(dir)
  }
}

console.log('\nConcluído!')
