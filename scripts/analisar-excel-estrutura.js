const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const arquivoPath = path.join(__dirname, '..', 'sisam 2026.xlsx');

if (!fs.existsSync(arquivoPath)) {
  console.error('❌ Arquivo não encontrado:', arquivoPath);
  process.exit(1);
}

console.log('📊 Analisando arquivo Excel...\n');

const workbook = XLSX.readFile(arquivoPath);
const primeiraAba = workbook.SheetNames[0];
const worksheet = workbook.Sheets[primeiraAba];
const dados = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' });

console.log(`📋 Total de linhas: ${dados.length}`);
console.log(`📄 Aba analisada: ${primeiraAba}\n`);

if (dados.length === 0) {
  console.log('⚠️  Arquivo vazio!');
  process.exit(1);
}

// Primeira linha para ver colunas
const primeiraLinha = dados[0];
const colunas = Object.keys(primeiraLinha);

console.log('📊 COLUNAS ENCONTRADAS:');
console.log('─'.repeat(80));
colunas.forEach((col, index) => {
  console.log(`${index + 1}. ${col}`);
});
console.log('─'.repeat(80));
console.log(`\nTotal de colunas: ${colunas.length}\n`);

// Analisar valores únicos em algumas colunas importantes
console.log('🔍 ANÁLISE DE VALORES ÚNICOS:\n');

const analisarColuna = (nomeColuna) => {
  const valores = new Set();
  dados.forEach(linha => {
    const valor = linha[nomeColuna];
    if (valor && valor.toString().trim()) {
      valores.add(valor.toString().trim());
    }
  });
  return Array.from(valores).slice(0, 20); // Primeiros 20 valores
};

// Tentar encontrar colunas relevantes
const colunasPossiveis = {
  escola: ['Escola', 'escola', 'Código Escola', 'codigo_escola', 'ESCOLA', 'Nome Escola'],
  polo: ['Polo', 'polo', 'POLO', 'Código Polo', 'codigo_polo'],
  turma: ['Turma', 'turma', 'TURMA', 'Classe', 'classe'],
  serie: ['Série', 'serie', 'SERIE', 'Ano', 'ano', 'Ano Escolar'],
  disciplina: ['Disciplina', 'disciplina', 'DISCIPLINA', 'Matéria', 'materia'],
  aluno: ['Aluno', 'aluno', 'ALUNO', 'Código Aluno', 'codigo_aluno', 'Matrícula'],
};

Object.entries(colunasPossiveis).forEach(([tipo, nomes]) => {
  const colunaEncontrada = colunas.find(col => 
    nomes.some(nome => col.toLowerCase().includes(nome.toLowerCase()))
  );
  
  if (colunaEncontrada) {
    const valores = analisarColuna(colunaEncontrada);
    console.log(`📌 ${tipo.toUpperCase()} (coluna: "${colunaEncontrada}"):`);
    console.log(`   Total de valores únicos: ${valores.length}`);
    if (valores.length <= 20) {
      valores.forEach((v, i) => console.log(`   ${i + 1}. ${v}`));
    } else {
      valores.slice(0, 10).forEach((v, i) => console.log(`   ${i + 1}. ${v}`));
      console.log(`   ... e mais ${valores.length - 10} valores`);
    }
    console.log('');
  }
});

// Mostrar amostra das primeiras linhas
console.log('📄 AMOSTRA DAS PRIMEIRAS 3 LINHAS:\n');
dados.slice(0, 3).forEach((linha, index) => {
  console.log(`Linha ${index + 1}:`);
  Object.entries(linha).forEach(([chave, valor]) => {
    if (valor && valor.toString().trim()) {
      console.log(`  ${chave}: ${valor}`);
    }
  });
  console.log('');
});

// Salvar estrutura em JSON
const estrutura = {
  totalLinhas: dados.length,
  colunas: colunas,
  primeiraLinha: primeiraLinha,
  amostra: dados.slice(0, 5)
};

fs.writeFileSync(
  path.join(__dirname, '..', 'estrutura-excel.json'),
  JSON.stringify(estrutura, null, 2),
  'utf8'
);

console.log('✅ Estrutura salva em: estrutura-excel.json');

