/**
 * Cálculos e Projeções para Relatórios
 * @module lib/relatorios/calculos-projecoes
 */

import { Projecoes } from './tipos';

interface DadosAnalise {
  disciplinas: Array<{ disciplina: string; media: number }>;
  turmas: Array<{ media_geral: number; serie: string }>;
  questoes: Array<{ percentual_acerto: number; disciplina: string }>;
}

const NOMES_DISCIPLINAS: Record<string, string> = {
  LP: 'Língua Portuguesa',
  MAT: 'Matemática',
  CH: 'Ciências Humanas',
  CN: 'Ciências da Natureza',
  PRODUCAO: 'Produção Textual'
};

function getNomeDisciplina(codigo: string): string {
  return NOMES_DISCIPLINAS[codigo] || codigo;
}

/**
 * Calcula projeções e análises baseadas nos dados
 */
export function calcularProjecoes(dados: DadosAnalise): Projecoes {
  const LIMITE_BAIXO = 5.0;
  const LIMITE_BOM = 7.0;

  const areas_atencao: string[] = [];
  const pontos_fortes: string[] = [];
  const recomendacoes: string[] = [];

  // Identificar áreas de atenção (média < 5)
  dados.disciplinas
    .filter(d => d.media > 0 && d.media < LIMITE_BAIXO)
    .forEach(d => {
      areas_atencao.push(
        `${getNomeDisciplina(d.disciplina)}: média ${d.media.toFixed(1)} - necessita intervenção pedagógica`
      );
    });

  // Identificar pontos fortes (média >= 7)
  dados.disciplinas
    .filter(d => d.media >= LIMITE_BOM)
    .forEach(d => {
      pontos_fortes.push(
        `${getNomeDisciplina(d.disciplina)}: média ${d.media.toFixed(1)} - bom desempenho`
      );
    });

  // Análise de questões com baixo desempenho
  const questoesCriticas = dados.questoes.filter(q => q.percentual_acerto < 30);
  if (questoesCriticas.length > 5) {
    const disciplinasAfetadas = [...new Set(questoesCriticas.map(q => q.disciplina))].filter(Boolean);
    if (disciplinasAfetadas.length > 0) {
      recomendacoes.push(
        `Revisar conteúdos de ${disciplinasAfetadas.map(getNomeDisciplina).join(', ')} - ${questoesCriticas.length} questões com menos de 30% de acerto`
      );
    }
  }

  // Análise de dispersão entre turmas/escolas
  const medias = dados.turmas.map(t => t.media_geral).filter(m => m !== null && m > 0);
  if (medias.length > 1) {
    const maiorMedia = Math.max(...medias);
    const menorMedia = Math.min(...medias);
    const dispersao = maiorMedia - menorMedia;

    if (dispersao > 2) {
      recomendacoes.push(
        `Alta dispersão entre unidades (${dispersao.toFixed(1)} pontos) - considerar nivelamento ou redistribuição de recursos`
      );
    }
  }

  // Análise por disciplina
  const mediaGeral = dados.disciplinas.reduce((acc, d) => acc + d.media, 0) / Math.max(dados.disciplinas.length, 1);

  if (mediaGeral < 5) {
    recomendacoes.push('Implementar reforço escolar intensivo para recuperação de aprendizagem');
  } else if (mediaGeral < 6) {
    recomendacoes.push('Intensificar acompanhamento pedagógico com foco nas disciplinas críticas');
  }

  // Recomendações específicas por disciplina
  dados.disciplinas.forEach(d => {
    if (d.media > 0 && d.media < 4) {
      recomendacoes.push(
        `${getNomeDisciplina(d.disciplina)}: Implementar projeto de intervenção urgente`
      );
    } else if (d.media >= 4 && d.media < 5) {
      recomendacoes.push(
        `${getNomeDisciplina(d.disciplina)}: Reforçar metodologias de ensino`
      );
    }
  });

  // Mensagens padrão se não houver itens
  if (areas_atencao.length === 0) {
    if (dados.disciplinas.length === 0 || dados.disciplinas.every(d => d.media === 0)) {
      areas_atencao.push('Sem dados suficientes para análise');
    } else {
      areas_atencao.push('Nenhuma disciplina em situação crítica');
    }
  }

  if (pontos_fortes.length === 0) {
    if (dados.disciplinas.length === 0 || dados.disciplinas.every(d => d.media === 0)) {
      pontos_fortes.push('Sem dados suficientes para análise');
    } else {
      pontos_fortes.push('Desempenho dentro da média em todas as disciplinas');
    }
  }

  if (recomendacoes.length === 0) {
    recomendacoes.push('Manter acompanhamento pedagógico regular');
    recomendacoes.push('Continuar com as práticas pedagógicas atuais');
  }

  // Calcular tendência baseada na média
  let tendencia: 'crescente' | 'estavel' | 'decrescente' = 'estavel';
  if (mediaGeral >= 7) {
    tendencia = 'crescente';
  } else if (mediaGeral < 5) {
    tendencia = 'decrescente';
  }

  return {
    tendencia_media: tendencia,
    areas_atencao: areas_atencao.slice(0, 5),
    pontos_fortes: pontos_fortes.slice(0, 5),
    recomendacoes: recomendacoes.slice(0, 5)
  };
}

/**
 * Calcula a distribuição de notas por faixas
 */
export function calcularDistribuicaoNotas(
  notas: number[]
): Array<{ faixa: string; quantidade: number }> {
  const faixas = [
    { min: 0, max: 2, label: '0-2 (Crítico)' },
    { min: 2, max: 4, label: '2-4 (Baixo)' },
    { min: 4, max: 6, label: '4-6 (Regular)' },
    { min: 6, max: 8, label: '6-8 (Bom)' },
    { min: 8, max: 10.1, label: '8-10 (Ótimo)' }
  ];

  return faixas.map(faixa => ({
    faixa: faixa.label,
    quantidade: notas.filter(n => n >= faixa.min && n < faixa.max).length
  }));
}

/**
 * Calcula estatísticas básicas de um conjunto de números
 */
export function calcularEstatisticas(valores: number[]): {
  media: number;
  mediana: number;
  desvio_padrao: number;
  min: number;
  max: number;
} {
  if (valores.length === 0) {
    return { media: 0, mediana: 0, desvio_padrao: 0, min: 0, max: 0 };
  }

  const sorted = [...valores].sort((a, b) => a - b);
  const media = valores.reduce((a, b) => a + b, 0) / valores.length;

  const meio = Math.floor(sorted.length / 2);
  const mediana = sorted.length % 2 === 0
    ? (sorted[meio - 1] + sorted[meio]) / 2
    : sorted[meio];

  const variancia = valores.reduce((acc, val) => acc + Math.pow(val - media, 2), 0) / valores.length;
  const desvio_padrao = Math.sqrt(variancia);

  return {
    media: Math.round(media * 100) / 100,
    mediana: Math.round(mediana * 100) / 100,
    desvio_padrao: Math.round(desvio_padrao * 100) / 100,
    min: Math.min(...valores),
    max: Math.max(...valores)
  };
}

/**
 * Classifica o nível de desempenho baseado na nota
 */
export function classificarNivel(nota: number): {
  nivel: string;
  cor: string;
  descricao: string;
} {
  if (nota >= 8) {
    return {
      nivel: 'Avançado',
      cor: '#10B981',
      descricao: 'Desempenho acima do esperado'
    };
  } else if (nota >= 6) {
    return {
      nivel: 'Adequado',
      cor: '#3B82F6',
      descricao: 'Desempenho dentro do esperado'
    };
  } else if (nota >= 4) {
    return {
      nivel: 'Básico',
      cor: '#F59E0B',
      descricao: 'Desempenho parcialmente adequado'
    };
  } else {
    return {
      nivel: 'Insuficiente',
      cor: '#EF4444',
      descricao: 'Desempenho abaixo do esperado'
    };
  }
}
