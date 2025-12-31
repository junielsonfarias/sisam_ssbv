const fs = require('fs');
const path = require('path');

// Função para encontrar arquivos recursivamente
function findFiles(dir, pattern, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      findFiles(filePath, pattern, fileList);
    } else if (file === pattern) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

// Encontrar todas as rotas API
const appApiPath = path.join(__dirname, '..', 'app', 'api');
const routeFiles = findFiles(appApiPath, 'route.ts').map(file => 
  path.relative(path.join(__dirname, '..'), file).replace(/\\/g, '/')
);

console.log(`📝 Encontradas ${routeFiles.length} rotas API para atualizar...\n`);

let updated = 0;
let skipped = 0;

routeFiles.forEach(filePath => {
  const fullPath = path.join(__dirname, '..', filePath);
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Verificar se já tem export const dynamic
  if (content.includes('export const dynamic')) {
    console.log(`⏭️  ${filePath} - já tem dynamic config`);
    skipped++;
    return;
  }
  
  // Encontrar a primeira linha de import ou export
  const lines = content.split('\n');
  let insertIndex = 0;
  
  // Encontrar onde inserir (após os imports)
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('export')) {
      insertIndex = i;
      break;
    }
  }
  
  // Se não encontrou export, inserir no início
  if (insertIndex === 0 && !lines[0].includes('export')) {
    insertIndex = lines.findIndex(line => line.trim().startsWith('export'));
    if (insertIndex === -1) insertIndex = lines.length;
  }
  
  // Inserir a configuração dinâmica
  const dynamicConfig = "export const dynamic = 'force-dynamic';\n";
  
  // Verificar se precisa de linha em branco antes
  if (insertIndex > 0 && lines[insertIndex - 1].trim() !== '') {
    lines.splice(insertIndex, 0, '', dynamicConfig.trim());
  } else {
    lines.splice(insertIndex, 0, dynamicConfig.trim());
  }
  
  content = lines.join('\n');
  fs.writeFileSync(fullPath, content, 'utf8');
  
  console.log(`✅ ${filePath} - adicionado dynamic = 'force-dynamic'`);
  updated++;
});

console.log(`\n📊 Resumo:`);
console.log(`   ✅ Atualizadas: ${updated}`);
console.log(`   ⏭️  Ignoradas: ${skipped}`);
console.log(`   📁 Total: ${routeFiles.length}`);

