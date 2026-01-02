// Script para testar a lógica de presença/falta

console.log('========================================')
console.log('TESTE DA LÓGICA DE PRESENÇA/FALTA')
console.log('========================================\n')

// Simular diferentes valores que podem vir do Excel
const testesCasos = [
  // Coluna FALTA
  { coluna: 'FALTA', valor: 'F', esperado: 'F' },
  { coluna: 'FALTA', valor: 'f', esperado: 'F' },
  { coluna: 'FALTA', valor: 'X', esperado: 'F' },
  { coluna: 'FALTA', valor: 'x', esperado: 'F' },
  { coluna: 'FALTA', valor: 'Faltou', esperado: 'F' },
  { coluna: 'FALTA', valor: 'AUSENTE', esperado: 'F' },
  { coluna: 'FALTA', valor: 'SIM', esperado: 'F' },
  { coluna: 'FALTA', valor: '1', esperado: 'F' },
  { coluna: 'FALTA', valor: '', esperado: 'P' },
  { coluna: 'FALTA', valor: 'P', esperado: 'P' },
  { coluna: 'FALTA', valor: 'PRESENTE', esperado: 'P' },
  { coluna: 'FALTA', valor: 'NAO', esperado: 'P' },
  { coluna: 'FALTA', valor: 'NÃO', esperado: 'P' },
  { coluna: 'FALTA', valor: '0', esperado: 'P' },
  
  // Coluna PRESENÇA
  { coluna: 'PRESENÇA', valor: 'P', esperado: 'P' },
  { coluna: 'PRESENÇA', valor: 'p', esperado: 'P' },
  { coluna: 'PRESENÇA', valor: 'PRESENTE', esperado: 'P' },
  { coluna: 'PRESENÇA', valor: 'SIM', esperado: 'P' },
  { coluna: 'PRESENÇA', valor: '1', esperado: 'P' },
  { coluna: 'PRESENÇA', valor: 'F', esperado: 'F' },
  { coluna: 'PRESENÇA', valor: 'FALTOU', esperado: 'F' },
  { coluna: 'PRESENÇA', valor: 'AUSENTE', esperado: 'F' },
  { coluna: 'PRESENÇA', valor: 'NAO', esperado: 'F' },
  { coluna: 'PRESENÇA', valor: 'NÃO', esperado: 'F' },
  { coluna: 'PRESENÇA', valor: '0', esperado: 'F' },
  { coluna: 'PRESENÇA', valor: '', esperado: 'P' },
]

function testarPresenca(linha, nomeColuna) {
  let presencaValor = (linha['FALTA'] || linha['Falta'] || linha['falta'] || linha['PRESENÇA'] || linha['Presença'] || linha['presenca'] || '').toString().trim().toUpperCase()
  
  // Normalizar o valor de presença
  let presenca = 'P' // Padrão: Presente
  if (presencaValor) {
    // Se a coluna é "FALTA" e tem valor, o aluno faltou
    if (linha['FALTA'] || linha['Falta'] || linha['falta']) {
      // Se tem valor na coluna FALTA (F, Faltou, X, etc.), marca como faltou
      if (presencaValor === 'F' || presencaValor === 'X' || presencaValor === 'FALTOU' || presencaValor === 'AUSENTE' || presencaValor === 'SIM' || presencaValor === '1') {
        presenca = 'F'
      } else if (presencaValor === 'P' || presencaValor === 'PRESENTE' || presencaValor === 'NAO' || presencaValor === 'NÃO' || presencaValor === '0') {
        presenca = 'P'
      } else if (presencaValor !== '') {
        // Se tem qualquer outro valor na coluna FALTA, assume que faltou
        presenca = 'F'
      }
    } else {
      // Se a coluna é "PRESENÇA"
      if (presencaValor === 'P' || presencaValor === 'PRESENTE' || presencaValor === 'SIM' || presencaValor === '1') {
        presenca = 'P'
      } else if (presencaValor === 'F' || presencaValor === 'FALTOU' || presencaValor === 'AUSENTE' || presencaValor === 'NAO' || presencaValor === 'NÃO' || presencaValor === '0') {
        presenca = 'F'
      }
    }
  }
  
  return presenca
}

let totalTestes = 0
let testesPassaram = 0
let testesFalharam = 0

console.log('Testando diferentes valores:\n')

testesCasos.forEach((teste, index) => {
  totalTestes++
  
  // Simular linha do Excel
  const linha = {}
  if (teste.coluna === 'FALTA') {
    linha['FALTA'] = teste.valor
  } else {
    linha['PRESENÇA'] = teste.valor
  }
  
  const resultado = testarPresenca(linha, teste.coluna)
  const passou = resultado === teste.esperado
  
  if (passou) {
    testesPassaram++
    console.log(`✅ Teste ${index + 1}: ${teste.coluna} = "${teste.valor}" → ${resultado} (esperado: ${teste.esperado})`)
  } else {
    testesFalharam++
    console.log(`❌ Teste ${index + 1}: ${teste.coluna} = "${teste.valor}" → ${resultado} (esperado: ${teste.esperado})`)
  }
})

console.log(`\n========================================`)
console.log(`RESULTADO DOS TESTES:`)
console.log(`========================================`)
console.log(`Total de testes: ${totalTestes}`)
console.log(`✅ Passaram: ${testesPassaram}`)
console.log(`❌ Falharam: ${testesFalharam}`)

if (testesFalharam === 0) {
  console.log(`\n✅ Todos os testes passaram! A lógica está correta.`)
} else {
  console.log(`\n⚠️ Alguns testes falharam. Revise a lógica.`)
}

console.log(`\n========================================`)
console.log(`REGRAS IMPLEMENTADAS:`)
console.log(`========================================`)
console.log(`\nCOLUNA "FALTA":`)
console.log(`  - Vazio, "P", "PRESENTE", "NAO", "NÃO", "0" → Presente (P)`)
console.log(`  - "F", "X", "FALTOU", "AUSENTE", "SIM", "1" → Faltou (F)`)
console.log(`  - Qualquer outro valor → Faltou (F)`)
console.log(`\nCOLUNA "PRESENÇA":`)
console.log(`  - "P", "PRESENTE", "SIM", "1" → Presente (P)`)
console.log(`  - "F", "FALTOU", "AUSENTE", "NAO", "NÃO", "0" → Faltou (F)`)
console.log(`  - Vazio → Presente (P) [padrão]`)

