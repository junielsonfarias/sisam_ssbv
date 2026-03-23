import { AnaliseQuestao } from '@/lib/relatorios/tipos';

// Função para agrupar questões por disciplina
export function agruparQuestoesPorDisciplina(questoes: AnaliseQuestao[]): Record<string, AnaliseQuestao[]> {
  return questoes.reduce((acc, questao) => {
    const disc = questao.disciplina || 'Geral';
    if (!acc[disc]) {
      acc[disc] = [];
    }
    acc[disc].push(questao);
    return acc;
  }, {} as Record<string, AnaliseQuestao[]>);
}

// Cores para cada disciplina
export const CORES_DISCIPLINAS: Record<string, { bg: string; border: string; text: string }> = {
  'LP': { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-600' },
  'MAT': { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', text: 'text-green-600' },
  'PROD': { bg: 'bg-pink-50 dark:bg-pink-900/20', border: 'border-pink-200 dark:border-pink-800', text: 'text-pink-600' },
  'CH': { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-600' },
  'CN': { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-600' },
  'Geral': { bg: 'bg-gray-50 dark:bg-gray-900/20', border: 'border-gray-200 dark:border-gray-800', text: 'text-gray-600' }
};

export const NOMES_DISCIPLINAS: Record<string, string> = {
  'LP': 'Língua Portuguesa',
  'MAT': 'Matemática',
  'PROD': 'Produção Textual',
  'CH': 'Ciências Humanas',
  'CN': 'Ciências da Natureza',
  'Geral': 'Geral'
};

// Cores padrão para níveis de aprendizagem
export const CORES_NIVEIS: Record<string, string> = {
  'Avançado': '#22C55E',
  'Adequado': '#3B82F6',
  'Básico': '#F59E0B',
  'Insuficiente': '#EF4444'
};
