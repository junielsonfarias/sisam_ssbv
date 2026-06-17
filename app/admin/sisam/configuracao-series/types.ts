export interface Disciplina {
  id?: string
  disciplina: string
  sigla: string
  ordem: number
  questao_inicio: number
  questao_fim: number
  qtd_questoes: number
  valor_questao: number
  nota_maxima: number
}

export interface ConfiguracaoSerie {
  id: string
  serie: string
  nome_serie: string
  tipo_ensino: 'anos_iniciais' | 'anos_finais'
  qtd_questoes_lp: number
  qtd_questoes_mat: number
  qtd_questoes_ch: number
  qtd_questoes_cn: number
  total_questoes_objetivas: number
  tem_producao_textual: boolean
  qtd_itens_producao: number
  avalia_lp: boolean
  avalia_mat: boolean
  avalia_ch: boolean
  avalia_cn: boolean
  usa_nivel_aprendizagem: boolean
  ativo: boolean
  disciplinas?: Disciplina[]
  media_aprovacao?: number
  media_recuperacao?: number
  nota_maxima?: number
  max_dependencias?: number
  formula_nota_final?: string
}

export interface RegrasAprovacao {
  media_aprovacao: number
  media_recuperacao: number
  nota_maxima: number
  max_dependencias: number
  formula_nota_final: string
}

export const DISCIPLINAS_DISPONIVEIS = [
  { nome: 'Língua Portuguesa', sigla: 'LP', cor: 'blue' },
  { nome: 'Matemática', sigla: 'MAT', cor: 'purple' },
  { nome: 'Ciências Humanas', sigla: 'CH', cor: 'green' },
  { nome: 'Ciências da Natureza', sigla: 'CN', cor: 'yellow' },
]

// Configuração padrão de disciplinas por série (hardcoded)
export const DISCIPLINAS_PADRAO_POR_SERIE: Record<string, Disciplina[]> = {
  '1': [
    { disciplina: 'Língua Portuguesa', sigla: 'LP', ordem: 1, questao_inicio: 1, questao_fim: 10, qtd_questoes: 10, valor_questao: 1.00, nota_maxima: 10 },
    { disciplina: 'Matemática', sigla: 'MAT', ordem: 2, questao_inicio: 11, questao_fim: 20, qtd_questoes: 10, valor_questao: 1.00, nota_maxima: 10 }
  ],
  '2': [
    { disciplina: 'Língua Portuguesa', sigla: 'LP', ordem: 1, questao_inicio: 1, questao_fim: 14, qtd_questoes: 14, valor_questao: 0.71, nota_maxima: 10 },
    { disciplina: 'Matemática', sigla: 'MAT', ordem: 2, questao_inicio: 15, questao_fim: 28, qtd_questoes: 14, valor_questao: 0.71, nota_maxima: 10 }
  ],
  '3': [
    { disciplina: 'Língua Portuguesa', sigla: 'LP', ordem: 1, questao_inicio: 1, questao_fim: 14, qtd_questoes: 14, valor_questao: 0.71, nota_maxima: 10 },
    { disciplina: 'Matemática', sigla: 'MAT', ordem: 2, questao_inicio: 15, questao_fim: 28, qtd_questoes: 14, valor_questao: 0.71, nota_maxima: 10 }
  ],
  '4': [
    { disciplina: 'Língua Portuguesa', sigla: 'LP', ordem: 1, questao_inicio: 1, questao_fim: 14, qtd_questoes: 14, valor_questao: 0.71, nota_maxima: 10 },
    { disciplina: 'Matemática', sigla: 'MAT', ordem: 2, questao_inicio: 15, questao_fim: 28, qtd_questoes: 14, valor_questao: 0.71, nota_maxima: 10 }
  ],
  '5': [
    { disciplina: 'Língua Portuguesa', sigla: 'LP', ordem: 1, questao_inicio: 1, questao_fim: 14, qtd_questoes: 14, valor_questao: 0.71, nota_maxima: 10 },
    { disciplina: 'Matemática', sigla: 'MAT', ordem: 2, questao_inicio: 15, questao_fim: 34, qtd_questoes: 20, valor_questao: 0.50, nota_maxima: 10 }
  ],
  '6': [
    { disciplina: 'Língua Portuguesa', sigla: 'LP', ordem: 1, questao_inicio: 1, questao_fim: 20, qtd_questoes: 20, valor_questao: 0.50, nota_maxima: 10 },
    { disciplina: 'Ciências Humanas', sigla: 'CH', ordem: 2, questao_inicio: 21, questao_fim: 30, qtd_questoes: 10, valor_questao: 1.00, nota_maxima: 10 },
    { disciplina: 'Matemática', sigla: 'MAT', ordem: 3, questao_inicio: 31, questao_fim: 50, qtd_questoes: 20, valor_questao: 0.50, nota_maxima: 10 },
    { disciplina: 'Ciências da Natureza', sigla: 'CN', ordem: 4, questao_inicio: 51, questao_fim: 60, qtd_questoes: 10, valor_questao: 1.00, nota_maxima: 10 }
  ],
  '7': [
    { disciplina: 'Língua Portuguesa', sigla: 'LP', ordem: 1, questao_inicio: 1, questao_fim: 20, qtd_questoes: 20, valor_questao: 0.50, nota_maxima: 10 },
    { disciplina: 'Ciências Humanas', sigla: 'CH', ordem: 2, questao_inicio: 21, questao_fim: 30, qtd_questoes: 10, valor_questao: 1.00, nota_maxima: 10 },
    { disciplina: 'Matemática', sigla: 'MAT', ordem: 3, questao_inicio: 31, questao_fim: 50, qtd_questoes: 20, valor_questao: 0.50, nota_maxima: 10 },
    { disciplina: 'Ciências da Natureza', sigla: 'CN', ordem: 4, questao_inicio: 51, questao_fim: 60, qtd_questoes: 10, valor_questao: 1.00, nota_maxima: 10 }
  ],
  '8': [
    { disciplina: 'Língua Portuguesa', sigla: 'LP', ordem: 1, questao_inicio: 1, questao_fim: 20, qtd_questoes: 20, valor_questao: 0.50, nota_maxima: 10 },
    { disciplina: 'Ciências Humanas', sigla: 'CH', ordem: 2, questao_inicio: 21, questao_fim: 30, qtd_questoes: 10, valor_questao: 1.00, nota_maxima: 10 },
    { disciplina: 'Matemática', sigla: 'MAT', ordem: 3, questao_inicio: 31, questao_fim: 50, qtd_questoes: 20, valor_questao: 0.50, nota_maxima: 10 },
    { disciplina: 'Ciências da Natureza', sigla: 'CN', ordem: 4, questao_inicio: 51, questao_fim: 60, qtd_questoes: 10, valor_questao: 1.00, nota_maxima: 10 }
  ],
  '9': [
    { disciplina: 'Língua Portuguesa', sigla: 'LP', ordem: 1, questao_inicio: 1, questao_fim: 20, qtd_questoes: 20, valor_questao: 0.50, nota_maxima: 10 },
    { disciplina: 'Ciências Humanas', sigla: 'CH', ordem: 2, questao_inicio: 21, questao_fim: 30, qtd_questoes: 10, valor_questao: 1.00, nota_maxima: 10 },
    { disciplina: 'Matemática', sigla: 'MAT', ordem: 3, questao_inicio: 31, questao_fim: 50, qtd_questoes: 20, valor_questao: 0.50, nota_maxima: 10 },
    { disciplina: 'Ciências da Natureza', sigla: 'CN', ordem: 4, questao_inicio: 51, questao_fim: 60, qtd_questoes: 10, valor_questao: 1.00, nota_maxima: 10 }
  ]
}

export const getTipoEnsinoColor = (tipo: string) => {
  return tipo === 'anos_iniciais'
    ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 border-green-200'
    : 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border-blue-200'
}

export const getDisciplinaColor = (sigla: string) => {
  const cores: Record<string, string> = {
    'LP': 'bg-blue-100 border-blue-300 text-blue-800',
    'MAT': 'bg-purple-100 border-purple-300 text-purple-800',
    'CH': 'bg-green-100 border-green-300 text-green-800',
    'CN': 'bg-yellow-100 border-yellow-300 text-yellow-800',
  }
  return cores[sigla] || 'bg-gray-100 border-gray-300 text-gray-800'
}
