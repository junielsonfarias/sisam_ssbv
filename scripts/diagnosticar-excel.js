const XLSX = require('xlsx')
const fs = require('fs')
const path = require('path')

// Script para diagnosticar estrutura do arquivo Excel
console.log('========================================')
console.log('DIAGNÓSTICO DO ARQUIVO EXCEL')
console.log('========================================\n')

// Solicitar caminho do arquivo
const args = process.argv.slice(2)
if (args.length === 0) {
  console.error('❌ Erro: Forneça o caminho do arquivo Excel')
  console.log('\nUso: node scripts/diagnosticar-excel.js <caminho-do-arquivo>')
  console.log('Exemplo: node scripts/diagnosticar-excel.js "C:\\Users\\...\\sisam_2025.xlsx"')
  process.exit(1)
}

const arquivoPath = args[0]

if (!fs.existsSync(arquivoPath)) {
  console.error(`❌ Arquivo não encontrado: ${arquivoPath}`)
  process.exit(1)
}

console.log(`📄 Arquivo: ${arquivoPath}\n`)

try {
  // Ler arquivo
  const workbook = XLSX.readFile(arquivoPath)
  const primeiraAba = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[primeiraAba]
  
  console.log(`📋 Aba: ${primeiraAba}`)
  
  // Ler dados
  const dados = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' })
  
  console.log(`📊 Total de linhas: ${dados.length}\n`)
  
  if (dados.length === 0) {
    console.error('❌ Arquivo vazio!')
    process.exit(1)
  }
  
  // Analisar primeira linha
  const primeiraLinha = dados[0]
  const todasColunas = Object.keys(primeiraLinha)
  
  console.log(`🔍 Total de colunas: ${todasColunas.length}\n`)
  
  // Identificar colunas de questões
  const colunasQuestoes = todasColunas.filter(col => {
    const colUpper = col.trim().toUpperCase()
    return colUpper.match(/^Q\s*\d+$/) || colUpper.startsWith('Q') && col.length <= 4
  })
  
  console.log(`📝 Colunas de questões encontradas: ${colunasQuestoes.length}`)
  
  if (colunasQuestoes.length > 0) {
    console.log(`\n   Primeiras 20 colunas de questões:`)
    colunasQuestoes.slice(0, 20).forEach((col, idx) => {
      const valor = primeiraLinha[col]
      const preview = valor === '' || valor === null || valor === undefined ? '(vazio)' : valor
      console.log(`   ${idx + 1}. "${col}" = ${preview}`)
    })
    
    if (colunasQuestoes.length > 20) {
      console.log(`   ... e mais ${colunasQuestoes.length - 20} colunas`)
    }
  } else {
    console.log(`\n❌ NENHUMA coluna de questão encontrada!`)
    console.log(`\n   Primeiras 30 colunas disponíveis:`)
    todasColunas.slice(0, 30).forEach((col, idx) => {
      console.log(`   ${idx + 1}. "${col}"`)
    })
  }
  
  // Verificar padrões específicos
  console.log(`\n🔎 Verificando padrões específicos:`)
  
  const padroesQ = [
    { nome: 'Q1, Q2, Q3...', exemplo: 'Q1', match: todasColunas.find(c => c === 'Q1') },
    { nome: 'Q 1, Q 2, Q 3...', exemplo: 'Q 1', match: todasColunas.find(c => c === 'Q 1') },
    { nome: 'q1, q2, q3...', exemplo: 'q1', match: todasColunas.find(c => c === 'q1') },
    { nome: 'Questão 1, Questão 2...', exemplo: 'Questão 1', match: todasColunas.find(c => c === 'Questão 1') },
    { nome: 'Questao 1, Questao 2...', exemplo: 'Questao 1', match: todasColunas.find(c => c === 'Questao 1') },
  ]
  
  padroesQ.forEach(padrao => {
    const status = padrao.match ? '✅ ENCONTRADO' : '❌ NÃO encontrado'
    console.log(`   ${status}: ${padrao.nome} (ex: "${padrao.exemplo}")`)
    if (padrao.match) {
      console.log(`      → Coluna real: "${padrao.match}"`)
    }
  })
  
  // Contar questões com valores
  console.log(`\n📈 Análise de valores (primeira linha):`)
  let questoesComValor = 0
  let questoesVazias = 0
  
  colunasQuestoes.forEach(col => {
    const valor = primeiraLinha[col]
    if (valor === '' || valor === null || valor === undefined) {
      questoesVazias++
    } else {
      questoesComValor++
    }
  })
  
  console.log(`   Questões com valor: ${questoesComValor}`)
  console.log(`   Questões vazias: ${questoesVazias}`)
  
  // Analisar 5 primeiras linhas
  console.log(`\n📊 Análise de 5 primeiras linhas:`)
  dados.slice(0, 5).forEach((linha, idx) => {
    const alunoNome = linha['ALUNO'] || linha['Aluno'] || linha['aluno'] || '(sem nome)'
    let questoesLinha = 0
    colunasQuestoes.forEach(col => {
      const valor = linha[col]
      if (valor !== '' && valor !== null && valor !== undefined) {
        questoesLinha++
      }
    })
    console.log(`   Linha ${idx + 1} (${alunoNome}): ${questoesLinha} questões com valor`)
  })
  
  console.log('\n========================================')
  console.log('CONCLUSÃO:')
  console.log('========================================')
  
  if (colunasQuestoes.length === 0) {
    console.log('❌ PROBLEMA: Nenhuma coluna de questão foi encontrada')
    console.log('   Solução: Verifique se as colunas estão nomeadas corretamente (Q1, Q2, etc.)')
  } else if (colunasQuestoes.length < 60) {
    console.log(`⚠️  AVISO: Apenas ${colunasQuestoes.length} colunas de questões encontradas (esperado: 60)`)
  } else if (questoesComValor === 0) {
    console.log('⚠️  AVISO: Colunas encontradas, mas todas estão vazias na primeira linha')
  } else {
    console.log('✅ Estrutura do arquivo parece correta')
    console.log(`   - ${colunasQuestoes.length} colunas de questões`)
    console.log(`   - ${questoesComValor} questões com valores na primeira linha`)
  }
  
  console.log('\n')
  
} catch (error) {
  console.error('\n❌ Erro ao ler arquivo:', error.message)
  process.exit(1)
}

