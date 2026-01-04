const XLSX = require('xlsx')
const fs = require('fs')
const path = require('path')

// Script para analisar arquivo Excel e verificar compatibilidade com importação
console.log('========================================')
console.log('ANÁLISE DE COMPATIBILIDADE - IMPORTAÇÃO')
console.log('========================================\n')

// Caminho do arquivo
const arquivoPath = path.join(__dirname, '..', 'docs', '2º ANO E 3º ANO.xlsx')

if (!fs.existsSync(arquivoPath)) {
  console.error(`❌ Arquivo não encontrado: ${arquivoPath}`)
  process.exit(1)
}

console.log(`📄 Arquivo: ${path.basename(arquivoPath)}\n`)

try {
  // Ler arquivo
  const workbook = XLSX.readFile(arquivoPath)
  const primeiraAba = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[primeiraAba]
  
  console.log(`📋 Aba analisada: ${primeiraAba}`)
  if (workbook.SheetNames.length > 1) {
    console.log(`📋 Total de abas: ${workbook.SheetNames.length} (${workbook.SheetNames.join(', ')})`)
  }
  
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
  
  // ========== VERIFICAR COLUNAS OBRIGATÓRIAS ==========
  console.log('════════════════════════════════════════')
  console.log('COLUNAS OBRIGATÓRIAS')
  console.log('════════════════════════════════════════\n')
  
  const encontrarColuna = (nomesPossiveis) => {
    for (const nome of nomesPossiveis) {
      const encontrada = todasColunas.find(
        col => col.toLowerCase().trim() === nome.toLowerCase().trim()
      )
      if (encontrada) return encontrada
    }
    return null
  }
  
  const colPolo = encontrarColuna(['POLO', 'polo', 'Polo'])
  const colEscola = encontrarColuna(['ESCOLA', 'escola', 'Escola'])
  const colTurma = encontrarColuna(['TURMA', 'turma', 'Turma'])
  const colSerie = encontrarColuna(['ANO/SÉRIE', 'ANO/SERIE', 'Série', 'serie', 'Ano', 'ANO'])
  const colAluno = encontrarColuna(['ALUNO', 'aluno', 'Aluno'])
  const colFalta = encontrarColuna(['FALTA', 'falta', 'Falta', 'PRESENCA', 'presenca'])
  
  console.log(`POLO:     ${colPolo ? '✅ ' + colPolo : '❌ NÃO ENCONTRADO'}`)
  console.log(`ESCOLA:   ${colEscola ? '✅ ' + colEscola : '❌ NÃO ENCONTRADO'}`)
  console.log(`TURMA:    ${colTurma ? '✅ ' + colTurma : '⚠️  Não encontrado (opcional)'}`)
  console.log(`ANO/SÉRIE: ${colSerie ? '✅ ' + colSerie : '⚠️  Não encontrado (opcional)'}`)
  console.log(`ALUNO:    ${colAluno ? '✅ ' + colAluno : '❌ NÃO ENCONTRADO'}`)
  console.log(`FALTA:    ${colFalta ? '✅ ' + colFalta : '⚠️  Não encontrado (opcional)'}`)
  
  // ========== VERIFICAR COLUNAS DE QUESTÕES ==========
  console.log('\n════════════════════════════════════════')
  console.log('COLUNAS DE QUESTÕES (Q1-Q60)')
  console.log('════════════════════════════════════════\n')
  
  const colunasQuestoes = todasColunas.filter(col => {
    const colUpper = col.trim().toUpperCase()
    return colUpper.match(/^Q\s*\d+$/) || (colUpper.startsWith('Q') && col.length <= 4 && /^\d+$/.test(colUpper.substring(1).trim()))
  }).sort((a, b) => {
    const numA = parseInt(a.match(/\d+/)?.[0] || '0')
    const numB = parseInt(b.match(/\d+/)?.[0] || '0')
    return numA - numB
  })
  
  console.log(`Total de colunas de questões encontradas: ${colunasQuestoes.length}`)
  
  if (colunasQuestoes.length > 0) {
    console.log(`\nColunas encontradas: ${colunasQuestoes.slice(0, 10).join(', ')}${colunasQuestoes.length > 10 ? '...' : ''}`)
    
    // Verificar sequência
    const numeros = colunasQuestoes.map(col => parseInt(col.match(/\d+/)?.[0] || '0'))
    const esperados = Array.from({ length: 60 }, (_, i) => i + 1)
    const faltantes = esperados.filter(n => !numeros.includes(n))
    
    if (faltantes.length > 0) {
      console.log(`\n⚠️  Questões faltantes: ${faltantes.slice(0, 10).join(', ')}${faltantes.length > 10 ? '...' : ''}`)
    } else if (colunasQuestoes.length === 60) {
      console.log(`\n✅ Todas as 60 questões encontradas!`)
    }
  } else {
    console.log(`\n❌ NENHUMA coluna de questão encontrada!`)
  }
  
  // ========== VERIFICAR COLUNAS DE NOTAS ==========
  console.log('\n════════════════════════════════════════')
  console.log('COLUNAS DE NOTAS E TOTAIS')
  console.log('════════════════════════════════════════\n')
  
  const colunasNotas = todasColunas.filter(col => {
    const colUpper = col.trim().toUpperCase()
    return colUpper.includes('NOTA') || colUpper.includes('TOTAL') || colUpper.includes('MED')
  })
  
  if (colunasNotas.length > 0) {
    console.log(`Colunas encontradas: ${colunasNotas.join(', ')}`)
  } else {
    console.log(`⚠️  Nenhuma coluna de nota/total encontrada`)
  }
  
  // ========== ANÁLISE DE DADOS ==========
  console.log('\n════════════════════════════════════════')
  console.log('ANÁLISE DE DADOS (Primeiras 5 linhas)')
  console.log('════════════════════════════════════════\n')
  
  dados.slice(0, 5).forEach((linha, idx) => {
    const polo = linha[colPolo] || '(vazio)'
    const escola = linha[colEscola] || '(vazio)'
    const aluno = linha[colAluno] || '(vazio)'
    const turma = linha[colTurma] || '(vazio)'
    const serie = linha[colSerie] || '(vazio)'
    
    let questoesComValor = 0
    colunasQuestoes.forEach(col => {
      const valor = linha[col]
      if (valor !== '' && valor !== null && valor !== undefined) {
        questoesComValor++
      }
    })
    
    console.log(`Linha ${idx + 1}:`)
    console.log(`  Polo: ${polo}`)
    console.log(`  Escola: ${escola}`)
    console.log(`  Aluno: ${aluno}`)
    console.log(`  Turma: ${turma}`)
    console.log(`  Série: ${serie}`)
    console.log(`  Questões com valor: ${questoesComValor}/${colunasQuestoes.length}`)
    console.log('')
  })
  
  // ========== COMPATIBILIDADE ==========
  console.log('════════════════════════════════════════')
  console.log('COMPATIBILIDADE COM SISTEMA')
  console.log('════════════════════════════════════════\n')
  
  const compativelImportacaoCompleta = colPolo && colEscola && colAluno && colunasQuestoes.length >= 60
  const compativelImportacaoCadastros = colPolo && colEscola
  const compativelImportacaoResultados = colEscola && colAluno && colunasQuestoes.length >= 60
  
  console.log('📦 Importação Completa:')
  console.log(`   ${compativelImportacaoCompleta ? '✅ COMPATÍVEL' : '❌ NÃO COMPATÍVEL'}`)
  if (!compativelImportacaoCompleta) {
    if (!colPolo) console.log('      - Falta coluna POLO')
    if (!colEscola) console.log('      - Falta coluna ESCOLA')
    if (!colAluno) console.log('      - Falta coluna ALUNO')
    if (colunasQuestoes.length < 60) console.log(`      - Faltam questões (encontradas: ${colunasQuestoes.length}, esperado: 60)`)
  }
  
  console.log('\n📝 Importação de Cadastros:')
  console.log(`   ${compativelImportacaoCadastros ? '✅ COMPATÍVEL' : '❌ NÃO COMPATÍVEL'}`)
  if (!compativelImportacaoCadastros) {
    if (!colPolo) console.log('      - Falta coluna POLO')
    if (!colEscola) console.log('      - Falta coluna ESCOLA')
  }
  
  console.log('\n📊 Importação de Resultados:')
  console.log(`   ${compativelImportacaoResultados ? '✅ COMPATÍVEL' : '❌ NÃO COMPATÍVEL'}`)
  if (!compativelImportacaoResultados) {
    if (!colEscola) console.log('      - Falta coluna ESCOLA')
    if (!colAluno) console.log('      - Falta coluna ALUNO')
    if (colunasQuestoes.length < 60) console.log(`      - Faltam questões (encontradas: ${colunasQuestoes.length}, esperado: 60)`)
  }
  
  // ========== RESUMO ==========
  console.log('\n════════════════════════════════════════')
  console.log('RESUMO')
  console.log('════════════════════════════════════════\n')
  
  console.log(`✅ Total de linhas: ${dados.length}`)
  console.log(`✅ Total de colunas: ${todasColunas.length}`)
  console.log(`✅ Colunas de questões: ${colunasQuestoes.length}/60`)
  console.log(`✅ Estrutura básica: ${colPolo && colEscola && colAluno ? 'OK' : 'INCOMPLETA'}`)
  
  if (compativelImportacaoCompleta) {
    console.log('\n💡 RECOMENDAÇÃO: Use "Importar Dados" (importação completa)')
  } else if (compativelImportacaoCadastros && compativelImportacaoResultados) {
    console.log('\n💡 RECOMENDAÇÃO:')
    console.log('   1. Primeiro: Use "Importar Cadastros"')
    console.log('   2. Depois: Use "Importar Resultados"')
  } else if (compativelImportacaoCadastros) {
    console.log('\n💡 RECOMENDAÇÃO: Use apenas "Importar Cadastros" (estrutura incompleta para resultados)')
  } else {
    console.log('\n⚠️  ATENÇÃO: Arquivo não está totalmente compatível. Verifique as colunas faltantes acima.')
  }
  
  console.log('\n')
  
} catch (error) {
  console.error('\n❌ Erro ao analisar arquivo:', error.message)
  console.error(error.stack)
  process.exit(1)
}

