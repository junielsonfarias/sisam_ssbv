/**
 * Gerador de Gráficos para Relatórios PDF
 * Utiliza QuickChart.io para compatibilidade com serverless (Vercel)
 * @module lib/relatorios/gerador-graficos
 *
 * Este módulo gera gráficos como imagens PNG usando a API QuickChart.io,
 * que é compatível com ambientes serverless como Vercel.
 *
 * Características:
 * - Timeout de 15 segundos por requisição
 * - Retry automático em caso de falha (até 2 tentativas)
 * - Retorna buffer vazio em caso de erro (não bloqueia geração do PDF)
 *
 * @example
 * ```typescript
 * const buffer = await gerarGraficoBarrasDisciplinas(disciplinas);
 * // buffer contém PNG da imagem ou buffer vazio se falhou
 * ```
 */

import { DesempenhoDisciplina, AnaliseQuestao, EscolaComparativo } from './tipos';

// Configurações
const QUICKCHART_TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

// Cores padrão do SISAM
const CORES = {
  LP: '#3B82F6',      // Azul
  MAT: '#10B981',     // Verde
  CH: '#F59E0B',      // Amarelo
  CN: '#8B5CF6',      // Roxo
  PRODUCAO: '#EC4899', // Rosa
  CINZA: '#6B7280',
  PRIMARIA: '#3B82F6',
  SUCESSO: '#10B981',
  ALERTA: '#F59E0B',
  ERRO: '#EF4444'
};

const QUICKCHART_URL = 'https://quickchart.io/chart';

interface ChartConfig {
  type: string;
  data: {
    labels: string[];
    datasets: Array<{
      label?: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string | string[];
      borderWidth?: number;
      borderRadius?: number;
      fill?: boolean;
      pointBackgroundColor?: string;
      pointRadius?: number;
    }>;
  };
  options?: Record<string, unknown>;
}

/**
 * Aguarda um tempo especificado
 * @param ms - Milissegundos para aguardar
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Tenta fazer uma requisição ao QuickChart com timeout
 * @param config - Configuração do gráfico
 * @param width - Largura em pixels
 * @param height - Altura em pixels
 * @returns Buffer com a imagem ou null se falhou
 */
async function tentarGerarGrafico(
  config: ChartConfig,
  width: number,
  height: number
): Promise<Buffer | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), QUICKCHART_TIMEOUT_MS);

  try {
    const response = await fetch(QUICKCHART_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chart: config,
        width,
        height,
        format: 'png',
        backgroundColor: 'white'
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Gera gráfico via QuickChart.io com retry automático
 *
 * @param config - Configuração do Chart.js
 * @param width - Largura da imagem em pixels (default: 600)
 * @param height - Altura da imagem em pixels (default: 400)
 * @returns Buffer PNG da imagem ou buffer vazio se falhou após retries
 *
 * @example
 * ```typescript
 * const config = { type: 'bar', data: {...} };
 * const buffer = await gerarGraficoQuickChart(config, 600, 400);
 * ```
 */
async function gerarGraficoQuickChart(
  config: ChartConfig,
  width = 600,
  height = 400
): Promise<Buffer> {
  let lastError: Error | null = null;

  for (let tentativa = 1; tentativa <= MAX_RETRIES; tentativa++) {
    try {
      const resultado = await tentarGerarGrafico(config, width, height);
      if (resultado) {
        return resultado;
      }
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Log do erro
      if (lastError.name === 'AbortError') {
        console.warn(`Timeout ao gerar gráfico (tentativa ${tentativa}/${MAX_RETRIES})`);
      } else {
        console.warn(`Erro ao gerar gráfico (tentativa ${tentativa}/${MAX_RETRIES}):`, lastError.message);
      }

      // Aguardar antes de tentar novamente (exceto na última tentativa)
      if (tentativa < MAX_RETRIES) {
        await delay(RETRY_DELAY_MS * tentativa);
      }
    }
  }

  // Após todas as tentativas, retornar buffer vazio
  console.error('Falha ao gerar gráfico após todas as tentativas:', lastError?.message);
  return Buffer.alloc(0);
}

/**
 * Gera gráfico de barras do desempenho por disciplina
 */
export async function gerarGraficoBarrasDisciplinas(
  dados: DesempenhoDisciplina[]
): Promise<Buffer> {
  // Retorna buffer vazio se não há dados
  if (!dados || dados.length === 0) {
    return Buffer.alloc(0);
  }

  const config: ChartConfig = {
    type: 'bar',
    data: {
      labels: dados.map(d => d.disciplina_nome),
      datasets: [{
        label: 'Média',
        data: dados.map(d => d.media),
        backgroundColor: dados.map(d => CORES[d.disciplina as keyof typeof CORES] || CORES.CINZA),
        borderRadius: 4
      }]
    },
    options: {
      responsive: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: 'Desempenho por Disciplina',
          font: { size: 16, weight: 'bold' }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 10,
          title: { display: true, text: 'Nota' }
        }
      }
    }
  };

  return gerarGraficoQuickChart(config);
}

/**
 * Gera gráfico de comparativo entre escolas (barras horizontais)
 */
export async function gerarGraficoComparativoEscolas(
  dados: EscolaComparativo[]
): Promise<Buffer> {
  // Retorna buffer vazio se não há dados
  if (!dados || dados.length === 0) {
    return Buffer.alloc(0);
  }

  // Limitar a 15 escolas para legibilidade
  const dadosLimitados = dados.slice(0, 15);

  const config: ChartConfig = {
    type: 'horizontalBar',
    data: {
      labels: dadosLimitados.map(d =>
        d.nome.length > 25 ? d.nome.substring(0, 25) + '...' : d.nome
      ),
      datasets: [{
        label: 'Média Geral',
        data: dadosLimitados.map(d => d.media_geral),
        backgroundColor: CORES.PRIMARIA,
        borderRadius: 4
      }]
    },
    options: {
      responsive: false,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: 'Ranking de Escolas por Média',
          font: { size: 16, weight: 'bold' }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          max: 10,
          title: { display: true, text: 'Média' }
        }
      }
    }
  };

  return gerarGraficoQuickChart(config, 600, Math.max(300, dadosLimitados.length * 30));
}

/**
 * Gera gráfico de pizza da distribuição de notas
 */
export async function gerarGraficoDistribuicaoNotas(
  dados: Array<{ faixa: string; quantidade: number }>
): Promise<Buffer> {
  // Retorna buffer vazio se não há dados ou todas as quantidades são zero
  if (!dados || dados.length === 0 || dados.every(d => d.quantidade === 0)) {
    return Buffer.alloc(0);
  }

  const cores = ['#EF4444', '#F59E0B', '#EAB308', '#84CC16', '#10B981'];

  const config: ChartConfig = {
    type: 'doughnut',
    data: {
      labels: dados.map(d => d.faixa),
      datasets: [{
        data: dados.map(d => d.quantidade),
        backgroundColor: cores,
        borderWidth: 2
      }]
    },
    options: {
      responsive: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { font: { size: 11 } }
        },
        title: {
          display: true,
          text: 'Distribuição de Notas',
          font: { size: 16, weight: 'bold' }
        }
      }
    }
  };

  return gerarGraficoQuickChart(config);
}

/**
 * Gera gráfico radar de competências
 */
export async function gerarGraficoRadarCompetencias(
  dados: Array<{ area: string; valor: number }>
): Promise<Buffer> {
  // Retorna buffer vazio se não há dados suficientes (mínimo 3 pontos para radar)
  if (!dados || dados.length < 3) {
    return Buffer.alloc(0);
  }

  const config: ChartConfig = {
    type: 'radar',
    data: {
      labels: dados.map(d => d.area),
      datasets: [{
        label: 'Desempenho',
        data: dados.map(d => d.valor),
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: CORES.PRIMARIA,
        pointBackgroundColor: CORES.PRIMARIA,
        pointRadius: 4,
        fill: true
      }]
    },
    options: {
      responsive: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: 'Competências por Área',
          font: { size: 16, weight: 'bold' }
        }
      },
      scales: {
        r: {
          beginAtZero: true,
          max: 10,
          ticks: { stepSize: 2 }
        }
      }
    }
  };

  return gerarGraficoQuickChart(config, 500, 400);
}

/**
 * Gera gráfico de análise de questões (acertos vs erros)
 */
export async function gerarGraficoErrosAcertos(
  dados: AnaliseQuestao[]
): Promise<Buffer> {
  // Retorna buffer vazio se não há dados
  if (!dados || dados.length === 0) {
    return Buffer.alloc(0);
  }

  // Limitar a 20 questões para legibilidade
  const dadosLimitados = dados.slice(0, 20);

  const config: ChartConfig = {
    type: 'bar',
    data: {
      labels: dadosLimitados.map(d => `Q${d.numero}`),
      datasets: [
        {
          label: 'Acertos (%)',
          data: dadosLimitados.map(d => d.percentual_acerto),
          backgroundColor: CORES.SUCESSO,
          borderRadius: 2
        }
      ]
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: 'Taxa de Acerto por Questão',
          font: { size: 16, weight: 'bold' }
        },
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          title: { display: true, text: '% Acerto' }
        }
      }
    }
  };

  return gerarGraficoQuickChart(config, 700, 350);
}

/**
 * Gera todos os gráficos necessários para um relatório de escola
 */
export async function gerarGraficosEscola(
  desempenho: DesempenhoDisciplina[],
  distribuicao: Array<{ faixa: string; quantidade: number }>,
  radar: Array<{ area: string; valor: number }>,
  questoes: AnaliseQuestao[]
): Promise<{
  disciplinas: Buffer;
  distribuicao: Buffer;
  radar: Buffer;
  questoes: Buffer;
}> {
  const [disciplinas, distribuicaoImg, radarImg, questoesImg] = await Promise.all([
    gerarGraficoBarrasDisciplinas(desempenho),
    gerarGraficoDistribuicaoNotas(distribuicao),
    gerarGraficoRadarCompetencias(radar),
    gerarGraficoErrosAcertos(questoes)
  ]);

  return {
    disciplinas,
    distribuicao: distribuicaoImg,
    radar: radarImg,
    questoes: questoesImg
  };
}

/**
 * Gera todos os gráficos necessários para um relatório de polo
 */
export async function gerarGraficosPolo(
  desempenho: DesempenhoDisciplina[],
  distribuicao: Array<{ faixa: string; quantidade: number }>,
  radar: Array<{ area: string; valor: number }>,
  questoes: AnaliseQuestao[],
  escolas: EscolaComparativo[]
): Promise<{
  disciplinas: Buffer;
  distribuicao: Buffer;
  radar: Buffer;
  questoes: Buffer;
  comparativoEscolas: Buffer;
}> {
  const [disciplinas, distribuicaoImg, radarImg, questoesImg, comparativoEscolas] = await Promise.all([
    gerarGraficoBarrasDisciplinas(desempenho),
    gerarGraficoDistribuicaoNotas(distribuicao),
    gerarGraficoRadarCompetencias(radar),
    gerarGraficoErrosAcertos(questoes),
    gerarGraficoComparativoEscolas(escolas)
  ]);

  return {
    disciplinas,
    distribuicao: distribuicaoImg,
    radar: radarImg,
    questoes: questoesImg,
    comparativoEscolas
  };
}
