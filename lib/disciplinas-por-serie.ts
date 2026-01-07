/**
 * Utilitário para obter as disciplinas que devem ser exibidas baseadas na série
 * 
 * NOTA: Este arquivo contém apenas funções síncronas que podem ser usadas no cliente.
 * Para funções assíncronas que precisam do banco de dados, use lib/config-series.ts no servidor.
 */

export interface Disciplina {
  codigo: string
  nome: string
  campo_nota: string
  campo_acertos: string
  total_questoes?: number // Opcional para disciplinas sem questões objetivas (ex: Produção Textual)
  tipo?: 'objetiva' | 'textual' | 'nivel' // Tipo de disciplina
}

/**
 * Retorna as disciplinas padrão (6º/7º/8º/9º ano - Anos Finais)
 * Ordem: LP, MAT, CH, CN
 */
function obterDisciplinasPadrao(): Disciplina[] {
  return [
    { codigo: 'LP', nome: 'Língua Portuguesa', campo_nota: 'nota_lp', campo_acertos: 'total_acertos_lp', total_questoes: 20, tipo: 'objetiva' },
    { codigo: 'MAT', nome: 'Matemática', campo_nota: 'nota_mat', campo_acertos: 'total_acertos_mat', total_questoes: 20, tipo: 'objetiva' },
    { codigo: 'CH', nome: 'Ciências Humanas', campo_nota: 'nota_ch', campo_acertos: 'total_acertos_ch', total_questoes: 10, tipo: 'objetiva' },
    { codigo: 'CN', nome: 'Ciências da Natureza', campo_nota: 'nota_cn', campo_acertos: 'total_acertos_cn', total_questoes: 10, tipo: 'objetiva' },
  ]
}

/**
 * Retorna todas as disciplinas (para exibição quando filtro "Todos" está ativo)
 * Ordem: LP, MAT, CH, CN, PROD
 */
export function obterTodasDisciplinas(): Disciplina[] {
  return [
    { codigo: 'LP', nome: 'Língua Portuguesa', campo_nota: 'nota_lp', campo_acertos: 'total_acertos_lp', total_questoes: 20, tipo: 'objetiva' },
    { codigo: 'MAT', nome: 'Matemática', campo_nota: 'nota_mat', campo_acertos: 'total_acertos_mat', total_questoes: 20, tipo: 'objetiva' },
    { codigo: 'CH', nome: 'Ciências Humanas', campo_nota: 'nota_ch', campo_acertos: 'total_acertos_ch', total_questoes: 10, tipo: 'objetiva' },
    { codigo: 'CN', nome: 'Ciências da Natureza', campo_nota: 'nota_cn', campo_acertos: 'total_acertos_cn', total_questoes: 10, tipo: 'objetiva' },
    { codigo: 'PROD', nome: 'Produção Textual', campo_nota: 'nota_producao', campo_acertos: '', tipo: 'textual' },
  ]
}

/**
 * Versão síncrona para uso no frontend (não depende do banco de dados)
 * Retorna as disciplinas que devem ser exibidas baseadas na série
 * Se não houver série, retorna todas as disciplinas (incluindo PROD)
 */
export function obterDisciplinasPorSerieSync(serie: string | null | undefined): Disciplina[] {
  if (!serie) {
    return obterTodasDisciplinas()
  }

  const numeroSerie = serie.match(/(\d+)/)?.[1]
  
  // Séries dos anos iniciais: 2º, 3º e 5º ano
  if (numeroSerie === '2' || numeroSerie === '3') {
    // 2º e 3º ano: LP (20 questões Q1-Q20), MAT (8 questões Q21-Q28), PROD (8 itens), Nível
    return [
      { codigo: 'LP', nome: 'Língua Portuguesa', campo_nota: 'nota_lp', campo_acertos: 'total_acertos_lp', total_questoes: 20, tipo: 'objetiva' },
      { codigo: 'MAT', nome: 'Matemática', campo_nota: 'nota_mat', campo_acertos: 'total_acertos_mat', total_questoes: 8, tipo: 'objetiva' },
      { codigo: 'PROD', nome: 'Produção Textual', campo_nota: 'nota_producao', campo_acertos: '', tipo: 'textual' },
      { codigo: 'NIVEL', nome: 'Nível de Aprendizagem', campo_nota: 'nivel_aprendizagem', campo_acertos: '', tipo: 'nivel' },
    ]
  }

  if (numeroSerie === '5') {
    // 5º ano: LP (14 questões Q1-Q14), MAT (20 questões Q15-Q34), PROD (8 itens), Nível
    return [
      { codigo: 'LP', nome: 'Língua Portuguesa', campo_nota: 'nota_lp', campo_acertos: 'total_acertos_lp', total_questoes: 14, tipo: 'objetiva' },
      { codigo: 'MAT', nome: 'Matemática', campo_nota: 'nota_mat', campo_acertos: 'total_acertos_mat', total_questoes: 20, tipo: 'objetiva' },
      { codigo: 'PROD', nome: 'Produção Textual', campo_nota: 'nota_producao', campo_acertos: '', tipo: 'textual' },
      { codigo: 'NIVEL', nome: 'Nível de Aprendizagem', campo_nota: 'nivel_aprendizagem', campo_acertos: '', tipo: 'nivel' },
    ]
  }

  // Para outras séries (6º, 7º, 8º, 9º ano), retornar todas as disciplinas padrão
  return obterDisciplinasPadrao()
}
