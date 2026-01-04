const XLSX = require('xlsx')
const fs = require('fs')
const path = require('path')

// Script para analisar TODOS os arquivos Excel na pasta docs
console.log('========================================')
console.log('ANÁLISE COMPLETA - ARQUIVOS EXCEL')
console.log('========================================\n')

const docsPath = path.join(__dirname, '..', 'docs')
const arquivosExcel = [
  '2º ANO E 3º ANO.xlsx',
  '5º ano.xlsx'
]

function analisarArquivo(nomeArquivo) {
  const arquivoPath = path.join(docsPath, nomeArquivo)
  
  if (!fs.existsSync(arquivoPath)) {
    console.error(`❌ Arquivo não encontrado: ${nomeArquivo}`)
    return null
  }

  console.log('════════════════════════════════════════')
  console.log(`📄 ARQUIVO: ${nomeArquivo}`)
  console.log('════════════════════════════════════════\n')

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
      return null
    }
    
    // Analisar primeira linha
    const primeiraLinha = dados[0]
    const todasColunas = Object.keys(primeiraLinha)
    
    console.log(`🔍 Total de colunas: ${todasColunas.length}\n`)
    
    // ========== VERIFICAR COLUNAS OBRIGATÓRIAS ==========
    console.log('COLUNAS OBRIGATÓRIAS:')
    console.log('────────────────────────────────────────\n')
    
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
    const colSerie = encontrarColuna(['ANO/SÉRIE', 'ANO/SERIE', 'Série', 'serie', 'Ano', 'ANO', 'SÉRIE'])
    const colAluno = encontrarColuna(['ALUNO', 'aluno', 'Aluno'])
    const colFalta = encontrarColuna(['FALTA', 'falta', 'Falta', 'PRESENCA', 'presenca', 'Presença'])
    
    console.log(`POLO:     ${colPolo ? '✅ ' + colPolo : '❌ NÃO ENCONTRADO'}`)
    console.log(`ESCOLA:   ${colEscola ? '✅ ' + colEscola : '❌ NÃO ENCONTRADO'}`)
    console.log(`TURMA:    ${colTurma ? '✅ ' + colTurma : '⚠️  Não encontrado (opcional)'}`)
    console.log(`ANO/SÉRIE: ${colSerie ? '✅ ' + colSerie : '⚠️  Não encontrado (opcional)'}`)
    console.log(`ALUNO:    ${colAluno ? '✅ ' + colAluno : '❌ NÃO ENCONTRADO'}`)
    console.log(`FALTA:    ${colFalta ? '✅ ' + colFalta : '⚠️  Não encontrado (opcional)'}`)
    
    // ========== VERIFICAR COLUNAS DE QUESTÕES ==========
    console.log('\nCOLUNAS DE QUESTÕES:')
    console.log('────────────────────────────────────────\n')
    
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
      console.log(`\nColunas encontradas: ${colunasQuestoes.slice(0, 15).join(', ')}${colunasQuestoes.length > 15 ? '...' : ''}`)
      if (colunasQuestoes.length > 15) {
        console.log(`Últimas colunas: ...${colunasQuestoes.slice(-5).join(', ')}`)
      }
      
      // Verificar sequência
      const numeros = colunasQuestoes.map(col => parseInt(col.match(/\d+/)?.[0] || '0'))
      const primeiraQ = numeros[0] || 0
      const ultimaQ = numeros[numeros.length - 1] || 0
      const esperados = Array.from({ length: ultimaQ - primeiraQ + 1 }, (_, i) => primeiraQ + i)
      const faltantes = esperados.filter(n => !numeros.includes(n))
      
      if (faltantes.length > 0 && faltantes.length < 10) {
        console.log(`\n⚠️  Questões faltantes na sequência: ${faltantes.join(', ')}`)
      } else if (colunasQuestoes.length === 28) {
        console.log(`\n✅ 28 questões encontradas (esperado para 2º/3º ano)`)
      } else if (colunasQuestoes.length === 34) {
        console.log(`\n✅ 34 questões encontradas (esperado para 5º ano)`)
      } else if (colunasQuestoes.length === 60) {
        console.log(`\n✅ 60 questões encontradas (esperado para 8º/9º ano)`)
      } else {
        console.log(`\n⚠️  Quantidade de questões: ${colunasQuestoes.length} (verificar se está correto para a série)`)
      }
    } else {
      console.log(`\n❌ NENHUMA coluna de questão encontrada!`)
    }
    
    // ========== VERIFICAR COLUNAS DE NOTAS ==========
    console.log('\nCOLUNAS DE NOTAS E TOTAIS:')
    console.log('────────────────────────────────────────\n')
    
    const colunasNotas = todasColunas.filter(col => {
      const colUpper = col.trim().toUpperCase()
      return colUpper.includes('NOTA') || colUpper.includes('TOTAL') || colUpper.includes('MED') || colUpper.includes('ACERTO')
    })
    
    if (colunasNotas.length > 0) {
      console.log(`Colunas encontradas: ${colunasNotas.join(', ')}`)
    } else {
      console.log(`⚠️  Nenhuma coluna de nota/total encontrada`)
    }
    
    // ========== ANÁLISE DE DADOS ==========
    console.log('\nANÁLISE DE DADOS (Primeiras 3 linhas):')
    console.log('────────────────────────────────────────\n')
    
    dados.slice(0, 3).forEach((linha, idx) => {
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
      console.log(`  Aluno: ${aluno.substring(0, 40)}${aluno.length > 40 ? '...' : ''}`)
      console.log(`  Turma: ${turma}`)
      console.log(`  Série: ${serie}`)
      console.log(`  Questões com valor: ${questoesComValor}/${colunasQuestoes.length}`)
      console.log('')
    })
    
    // ========== COMPATIBILIDADE ==========
    console.log('COMPATIBILIDADE COM SISTEMA:')
    console.log('────────────────────────────────────────\n')
    
    const compativelImportacaoCompleta = colPolo && colEscola && colAluno && colunasQuestoes.length > 0
    const compativelImportacaoCadastros = colPolo && colEscola
    const compativelImportacaoResultados = colEscola && colAluno && colunasQuestoes.length > 0
    
    console.log('📦 Importação Completa:')
    console.log(`   ${compativelImportacaoCompleta ? '✅ COMPATÍVEL' : '❌ NÃO COMPATÍVEL'}`)
    if (!compativelImportacaoCompleta) {
      if (!colPolo) console.log('      - Falta coluna POLO')
      if (!colEscola) console.log('      - Falta coluna ESCOLA')
      if (!colAluno) console.log('      - Falta coluna ALUNO')
      if (colunasQuestoes.length === 0) console.log('      - Nenhuma questão encontrada')
    }
    
    console.log('\n📝 Importação de Cadastros:')
    console.log(`   ${compativelImportacaoCadastros ? '✅ COMPATÍVEL' : '❌ NÃO COMPATÍVEL'}`)
    
    console.log('\n📊 Importação de Resultados:')
    console.log(`   ${compativelImportacaoResultados ? '✅ COMPATÍVEL' : '❌ NÃO COMPATÍVEL'}`)
    
    // ========== RESUMO ==========
    console.log('\nRESUMO:')
    console.log('────────────────────────────────────────\n')
    
    console.log(`✅ Total de linhas: ${dados.length}`)
    console.log(`✅ Total de colunas: ${todasColunas.length}`)
    console.log(`✅ Colunas de questões: ${colunasQuestoes.length}`)
    console.log(`✅ Estrutura básica: ${colPolo && colEscola && colAluno ? 'OK' : 'INCOMPLETA'}`)
    
    let recomendacao = ''
    if (compativelImportacaoCompleta) {
      recomendacao = '💡 RECOMENDAÇÃO: Use "Importar Dados" (importação completa)'
    } else if (compativelImportacaoCadastros) {
      recomendacao = '💡 RECOMENDAÇÃO: Use "Importar Cadastros" (estrutura incompleta para resultados)'
    } else {
      recomendacao = '⚠️  ATENÇÃO: Arquivo não está totalmente compatível. Verifique as colunas faltantes.'
    }
    
    console.log(`\n${recomendacao}\n`)
    
    return {
      nomeArquivo,
      totalLinhas: dados.length,
      totalColunas: todasColunas.length,
      colunasQuestoes: colunasQuestoes.length,
      compativelCompleta: compativelImportacaoCompleta,
      compativelCadastros: compativelImportacaoCadastros,
      compativelResultados: compativelImportacaoResultados,
      temPolo: !!colPolo,
      temEscola: !!colEscola,
      temAluno: !!colAluno,
      temTurma: !!colTurma,
      temSerie: !!colSerie,
      temFalta: !!colFalta
    }
    
  } catch (error) {
    console.error('\n❌ Erro ao analisar arquivo:', error.message)
    return null
  }
}

// Analisar todos os arquivos
const resultados = []
arquivosExcel.forEach(arquivo => {
  const resultado = analisarArquivo(arquivo)
  if (resultado) {
    resultados.push(resultado)
  }
  console.log('\n')
})

// Resumo final
console.log('════════════════════════════════════════')
console.log('RESUMO FINAL - TODOS OS ARQUIVOS')
console.log('════════════════════════════════════════\n')

if (resultados.length === 0) {
  console.log('❌ Nenhum arquivo foi analisado com sucesso')
} else {
  console.log(`✅ ${resultados.length} arquivo(s) analisado(s) com sucesso\n`)
  
  resultados.forEach(r => {
    console.log(`📄 ${r.nomeArquivo}:`)
    console.log(`   - ${r.totalLinhas} alunos`)
    console.log(`   - ${r.colunasQuestoes} questões`)
    console.log(`   - Importação Completa: ${r.compativelCompleta ? '✅' : '❌'}`)
    console.log(`   - Importação Cadastros: ${r.compativelCadastros ? '✅' : '❌'}`)
    console.log('')
  })
}

console.log('')

