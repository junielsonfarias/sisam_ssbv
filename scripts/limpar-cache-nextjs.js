const fs = require('fs');
const path = require('path');

console.log('🧹 Limpando cache do Next.js...\n');

const diretoriosParaLimpar = [
  '.next',
  'node_modules/.cache',
];

let limpos = 0;
let erros = 0;

diretoriosParaLimpar.forEach(dir => {
  const caminho = path.join(process.cwd(), dir);
  
  if (fs.existsSync(caminho)) {
    try {
      console.log(`🗑️  Removendo: ${dir}...`);
      fs.rmSync(caminho, { recursive: true, force: true });
      console.log(`   ✅ ${dir} removido`);
      limpos++;
    } catch (error) {
      console.error(`   ❌ Erro ao remover ${dir}:`, error.message);
      erros++;
    }
  } else {
    console.log(`   ⏭️  ${dir} não existe, pulando...`);
  }
});

console.log(`\n📊 Resumo:`);
console.log(`   ✅ Diretórios limpos: ${limpos}`);
console.log(`   ❌ Erros: ${erros}`);

if (limpos > 0) {
  console.log(`\n✅ Cache limpo! Reinicie o servidor com: npm run dev\n`);
} else {
  console.log(`\n⚠️  Nenhum cache encontrado para limpar.\n`);
}


