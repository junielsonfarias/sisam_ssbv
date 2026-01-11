# Sistema de Relatórios PDF - SISAM

## Visão Geral

Este documento define a implementação da funcionalidade de geração de relatórios PDF com análises detalhadas, gráficos e projeções para escolas e polos do SISAM.

---

## 1. Arquitetura Proposta

### 1.1 Fluxo de Geração

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Seleção de    │────▶│   API Route      │────▶│   Geração PDF   │
│   Polo/Escola   │     │   (Server-side)  │     │   (Stream)      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                │
                                ▼
                        ┌──────────────────┐
                        │  Consultas SQL   │
                        │  (Dados + Stats) │
                        └──────────────────┘
```

### 1.2 Tecnologias Recomendadas

| Tecnologia | Versão | Uso | Justificativa |
|------------|--------|-----|---------------|
| **@react-pdf/renderer** | ^3.4.0 | Estrutura do PDF | Componentes React para PDF, tipagem TypeScript, layout flexbox |
| **chart.js** | ^4.4.0 | Gráficos server-side | Compatível com Node.js, mesma API do Recharts |
| **chartjs-node-canvas** | ^4.1.6 | Renderização de gráficos | Gera imagens PNG dos gráficos para inserir no PDF |
| **date-fns** | ^3.3.0 | Formatação de datas | Já compatível com o projeto |

### 1.3 Por que essas tecnologias?

**@react-pdf/renderer** vs outras opções:

| Opção | Prós | Contras |
|-------|------|---------|
| **@react-pdf/renderer** | React nativo, SSR, tipagem, flexbox | Curva de aprendizado |
| pdfkit (já instalado) | Simples, leve | Sem suporte a componentes, verbose |
| Puppeteer | HTML completo | Pesado (+100MB), lento, problemas em serverless |
| jsPDF + html2canvas | Fácil | Qualidade ruim, problemas de fontes |

**Recomendação: @react-pdf/renderer + chartjs-node-canvas**

---

## 2. Estrutura de Arquivos

```
app/
├── api/
│   └── admin/
│       └── relatorios/
│           ├── route.ts              # GET - Lista tipos de relatórios
│           ├── escola/
│           │   └── [id]/
│           │       └── route.ts      # GET - Gera PDF da escola
│           └── polo/
│               └── [id]/
│                   └── route.ts      # GET - Gera PDF do polo
│
components/
├── relatorios/
│   ├── SeletorRelatorio.tsx          # UI de seleção polo/escola
│   ├── PreviewRelatorio.tsx          # Preview antes de gerar
│   └── BotaoDownloadPDF.tsx          # Botão com loading state
│
lib/
├── relatorios/
│   ├── tipos.ts                      # Interfaces TypeScript
│   ├── gerador-pdf.tsx               # Componentes React-PDF
│   ├── gerador-graficos.ts           # Gráficos com chartjs-node-canvas
│   ├── consultas-relatorio.ts        # Queries SQL consolidadas
│   └── calculos-projecoes.ts         # Lógica de projeções e análises
```

---

## 3. Interfaces TypeScript

```typescript
// lib/relatorios/tipos.ts

export type TipoRelatorio = 'escola' | 'polo';

export interface FiltroRelatorio {
  tipo: TipoRelatorio;
  id: string;                    // UUID da escola ou polo
  ano_letivo: string;
  serie?: string;                // Opcional: filtrar por série
  incluir_graficos?: boolean;    // Default: true
  incluir_projecoes?: boolean;   // Default: true
  incluir_detalhamento?: boolean;// Default: true
}

export interface DadosRelatorioEscola {
  // Identificação
  escola: {
    id: string;
    nome: string;
    codigo: string;
    polo_nome: string;
  };

  // Período
  ano_letivo: string;
  data_geracao: string;

  // Estatísticas Gerais
  estatisticas: {
    total_alunos: number;
    total_turmas: number;
    total_avaliacoes: number;
    media_geral: number;
    taxa_participacao: number;
  };

  // Desempenho por Disciplina
  desempenho_disciplinas: Array<{
    disciplina: string;
    disciplina_nome: string;
    media: number;
    total_questoes: number;
    acertos_medio: number;
    percentual_acerto: number;
  }>;

  // Detalhamento por Turma
  turmas: Array<{
    id: string;
    codigo: string;
    nome: string;
    serie: string;
    total_alunos: number;
    media_geral: number;
    medias_disciplinas: Record<string, number>;
    distribuicao_niveis: Array<{
      nivel: string;
      quantidade: number;
      percentual: number;
    }>;
  }>;

  // Análise de Questões
  analise_questoes: Array<{
    questao_id: string;
    numero: number;
    disciplina: string;
    total_respostas: number;
    acertos: number;
    percentual_acerto: number;
    dificuldade_calculada: 'facil' | 'media' | 'dificil';
    distribuicao_respostas: Record<string, number>; // A, B, C, D, E
  }>;

  // Projeções e Análises
  projecoes: {
    tendencia_media: 'crescente' | 'estavel' | 'decrescente';
    areas_atencao: string[];          // Disciplinas com baixo desempenho
    pontos_fortes: string[];          // Disciplinas com alto desempenho
    recomendacoes: string[];          // Sugestões baseadas nos dados
  };

  // Dados para Gráficos
  graficos: {
    evolucao_mensal?: Array<{ mes: string; media: number }>;
    comparativo_disciplinas: Array<{ disciplina: string; escola: number; polo: number; rede: number }>;
    distribuicao_notas: Array<{ faixa: string; quantidade: number }>;
    radar_competencias: Array<{ area: string; valor: number }>;
  };
}

export interface DadosRelatorioPolo extends Omit<DadosRelatorioEscola, 'escola' | 'turmas'> {
  polo: {
    id: string;
    nome: string;
    codigo: string;
  };

  // Escolas do Polo
  escolas: Array<{
    id: string;
    nome: string;
    codigo: string;
    total_alunos: number;
    total_turmas: number;
    media_geral: number;
    ranking_posicao: number;
  }>;

  // Comparativo entre escolas
  comparativo_escolas: Array<{
    escola_nome: string;
    lp: number;
    mat: number;
    ch?: number;
    cn?: number;
    media: number;
  }>;
}
```

---

## 4. Consultas SQL Otimizadas

```typescript
// lib/relatorios/consultas-relatorio.ts

import { pool } from '@/database/connection';

export async function buscarDadosRelatorioEscola(
  escolaId: string,
  anoLetivo: string,
  serie?: string
): Promise<DadosRelatorioEscola> {

  // Query 1: Dados da escola
  const escolaQuery = `
    SELECT
      e.id,
      e.nome,
      e.codigo,
      p.nome as polo_nome
    FROM escolas e
    LEFT JOIN polos p ON e.polo_id = p.id
    WHERE e.id = $1
  `;

  // Query 2: Estatísticas gerais
  const estatisticasQuery = `
    SELECT
      COUNT(DISTINCT rc.aluno_id) as total_alunos,
      COUNT(DISTINCT t.id) as total_turmas,
      COUNT(rc.id) as total_avaliacoes,
      ROUND(AVG(rc.media_aluno)::numeric, 2) as media_geral,
      ROUND(
        (COUNT(CASE WHEN rc.presenca = 'P' THEN 1 END)::decimal /
         NULLIF(COUNT(rc.id), 0) * 100)::numeric, 1
      ) as taxa_participacao
    FROM resultados_consolidados rc
    LEFT JOIN turmas t ON rc.turma_id = t.id
    WHERE rc.escola_id = $1
      AND rc.ano_letivo = $2
      ${serie ? 'AND rc.serie = $3' : ''}
  `;

  // Query 3: Desempenho por disciplina
  const disciplinasQuery = `
    SELECT
      'LP' as disciplina,
      'Língua Portuguesa' as disciplina_nome,
      ROUND(AVG(rc.nota_lp)::numeric, 2) as media,
      SUM(rc.total_acertos_lp) as acertos_total,
      COUNT(rc.id) as total_registros
    FROM resultados_consolidados rc
    WHERE rc.escola_id = $1 AND rc.ano_letivo = $2
      ${serie ? 'AND rc.serie = $3' : ''}

    UNION ALL

    SELECT
      'MAT' as disciplina,
      'Matemática' as disciplina_nome,
      ROUND(AVG(rc.nota_mat)::numeric, 2) as media,
      SUM(rc.total_acertos_mat) as acertos_total,
      COUNT(rc.id) as total_registros
    FROM resultados_consolidados rc
    WHERE rc.escola_id = $1 AND rc.ano_letivo = $2
      ${serie ? 'AND rc.serie = $3' : ''}

    UNION ALL

    SELECT
      'CH' as disciplina,
      'Ciências Humanas' as disciplina_nome,
      ROUND(AVG(rc.nota_ch)::numeric, 2) as media,
      SUM(rc.total_acertos_ch) as acertos_total,
      COUNT(rc.id) as total_registros
    FROM resultados_consolidados rc
    WHERE rc.escola_id = $1 AND rc.ano_letivo = $2
      AND rc.serie IN ('8º Ano', '9º Ano')
      ${serie ? 'AND rc.serie = $3' : ''}

    UNION ALL

    SELECT
      'CN' as disciplina,
      'Ciências da Natureza' as disciplina_nome,
      ROUND(AVG(rc.nota_cn)::numeric, 2) as media,
      SUM(rc.total_acertos_cn) as acertos_total,
      COUNT(rc.id) as total_registros
    FROM resultados_consolidados rc
    WHERE rc.escola_id = $1 AND rc.ano_letivo = $2
      AND rc.serie IN ('8º Ano', '9º Ano')
      ${serie ? 'AND rc.serie = $3' : ''}
  `;

  // Query 4: Detalhamento por turma
  const turmasQuery = `
    SELECT
      t.id,
      t.codigo,
      t.nome,
      t.serie,
      COUNT(DISTINCT rc.aluno_id) as total_alunos,
      ROUND(AVG(rc.media_aluno)::numeric, 2) as media_geral,
      ROUND(AVG(rc.nota_lp)::numeric, 2) as media_lp,
      ROUND(AVG(rc.nota_mat)::numeric, 2) as media_mat,
      ROUND(AVG(rc.nota_ch)::numeric, 2) as media_ch,
      ROUND(AVG(rc.nota_cn)::numeric, 2) as media_cn
    FROM turmas t
    LEFT JOIN resultados_consolidados rc ON t.id = rc.turma_id
      AND rc.ano_letivo = $2
    WHERE t.escola_id = $1
      ${serie ? 'AND t.serie = $3' : ''}
    GROUP BY t.id, t.codigo, t.nome, t.serie
    ORDER BY t.serie, t.codigo
  `;

  // Query 5: Análise de questões (erros e acertos)
  const questoesQuery = `
    SELECT
      q.id as questao_id,
      q.numero_questao as numero,
      q.disciplina,
      COUNT(rp.id) as total_respostas,
      SUM(CASE WHEN rp.acertou = true THEN 1 ELSE 0 END) as acertos,
      ROUND(
        (SUM(CASE WHEN rp.acertou = true THEN 1 ELSE 0 END)::decimal /
         NULLIF(COUNT(rp.id), 0) * 100)::numeric, 1
      ) as percentual_acerto,
      jsonb_object_agg(
        COALESCE(rp.resposta_aluno, 'NULO'),
        COUNT(*)
      ) FILTER (WHERE rp.resposta_aluno IS NOT NULL) as distribuicao_respostas
    FROM questoes q
    LEFT JOIN resultados_prova rp ON q.id = rp.questao_id
      AND rp.escola_id = $1
      AND rp.ano_letivo = $2
    WHERE q.serie_aplicavel = COALESCE($3, q.serie_aplicavel)
    GROUP BY q.id, q.numero_questao, q.disciplina
    ORDER BY q.disciplina, q.numero_questao
  `;

  // Query 6: Distribuição por níveis de aprendizagem
  const niveisQuery = `
    SELECT
      COALESCE(na.nome, 'Não classificado') as nivel,
      na.cor,
      COUNT(rc.id) as quantidade,
      ROUND(
        (COUNT(rc.id)::decimal / NULLIF(SUM(COUNT(rc.id)) OVER (), 0) * 100)::numeric, 1
      ) as percentual
    FROM resultados_consolidados rc
    LEFT JOIN niveis_aprendizagem na ON rc.nivel_aprendizagem_id = na.id
    WHERE rc.escola_id = $1 AND rc.ano_letivo = $2
      ${serie ? 'AND rc.serie = $3' : ''}
    GROUP BY na.nome, na.cor, na.ordem
    ORDER BY na.ordem NULLS LAST
  `;

  // Executar queries em paralelo
  const params = serie ? [escolaId, anoLetivo, serie] : [escolaId, anoLetivo];

  const [
    escolaResult,
    estatisticasResult,
    disciplinasResult,
    turmasResult,
    questoesResult,
    niveisResult
  ] = await Promise.all([
    pool.query(escolaQuery, [escolaId]),
    pool.query(estatisticasQuery, params),
    pool.query(disciplinasQuery, params),
    pool.query(turmasQuery, params),
    pool.query(questoesQuery, params),
    pool.query(niveisQuery, params)
  ]);

  // Processar e retornar dados estruturados
  return processarDadosEscola({
    escola: escolaResult.rows[0],
    estatisticas: estatisticasResult.rows[0],
    disciplinas: disciplinasResult.rows,
    turmas: turmasResult.rows,
    questoes: questoesResult.rows,
    niveis: niveisResult.rows,
    anoLetivo
  });
}
```

---

## 5. Gerador de Gráficos (Server-side)

```typescript
// lib/relatorios/gerador-graficos.ts

import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { ChartConfiguration } from 'chart.js';

const width = 600;
const height = 400;

const chartJSNodeCanvas = new ChartJSNodeCanvas({
  width,
  height,
  backgroundColour: 'white'
});

// Cores padrão do SISAM
const CORES = {
  LP: '#3B82F6',      // Azul
  MAT: '#10B981',     // Verde
  CH: '#F59E0B',      // Amarelo
  CN: '#8B5CF6',      // Roxo
  PRODUCAO: '#EC4899', // Rosa
  CINZA: '#6B7280',
  FUNDO: '#F3F4F6'
};

export async function gerarGraficoBarrasDisciplinas(
  dados: Array<{ disciplina: string; media: number }>
): Promise<Buffer> {

  const config: ChartConfiguration = {
    type: 'bar',
    data: {
      labels: dados.map(d => d.disciplina),
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

  return await chartJSNodeCanvas.renderToBuffer(config);
}

export async function gerarGraficoComparativoEscolas(
  dados: Array<{ escola: string; media: number }>
): Promise<Buffer> {

  const config: ChartConfiguration = {
    type: 'bar',
    data: {
      labels: dados.map(d => d.escola.substring(0, 20) + (d.escola.length > 20 ? '...' : '')),
      datasets: [{
        label: 'Média Geral',
        data: dados.map(d => d.media),
        backgroundColor: '#3B82F6',
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y', // Barras horizontais
      responsive: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: 'Comparativo entre Escolas',
          font: { size: 16, weight: 'bold' }
        }
      },
      scales: {
        x: { beginAtZero: true, max: 10 }
      }
    }
  };

  return await chartJSNodeCanvas.renderToBuffer(config);
}

export async function gerarGraficoDistribuicaoNotas(
  dados: Array<{ faixa: string; quantidade: number }>
): Promise<Buffer> {

  const config: ChartConfiguration = {
    type: 'pie',
    data: {
      labels: dados.map(d => d.faixa),
      datasets: [{
        data: dados.map(d => d.quantidade),
        backgroundColor: ['#EF4444', '#F59E0B', '#EAB308', '#84CC16', '#10B981'],
        borderWidth: 2,
        borderColor: '#FFFFFF'
      }]
    },
    options: {
      responsive: false,
      plugins: {
        legend: { position: 'right' },
        title: {
          display: true,
          text: 'Distribuição de Notas',
          font: { size: 16, weight: 'bold' }
        }
      }
    }
  };

  return await chartJSNodeCanvas.renderToBuffer(config);
}

export async function gerarGraficoRadarCompetencias(
  dados: Array<{ area: string; valor: number }>
): Promise<Buffer> {

  const config: ChartConfiguration = {
    type: 'radar',
    data: {
      labels: dados.map(d => d.area),
      datasets: [{
        label: 'Desempenho',
        data: dados.map(d => d.valor),
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: '#3B82F6',
        pointBackgroundColor: '#3B82F6',
        pointRadius: 4
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

  return await chartJSNodeCanvas.renderToBuffer(config);
}

export async function gerarGraficoErrosAcertos(
  dados: Array<{ questao: number; percentual_acerto: number; disciplina: string }>
): Promise<Buffer> {

  const config: ChartConfiguration = {
    type: 'bar',
    data: {
      labels: dados.map(d => `Q${d.questao}`),
      datasets: [
        {
          label: 'Acertos',
          data: dados.map(d => d.percentual_acerto),
          backgroundColor: '#10B981',
          borderRadius: 2
        },
        {
          label: 'Erros',
          data: dados.map(d => 100 - d.percentual_acerto),
          backgroundColor: '#EF4444',
          borderRadius: 2
        }
      ]
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: 'Análise de Questões - Acertos vs Erros',
          font: { size: 16, weight: 'bold' }
        }
      },
      scales: {
        x: { stacked: true },
        y: { stacked: true, max: 100 }
      }
    }
  };

  return await chartJSNodeCanvas.renderToBuffer(config);
}
```

---

## 6. Componentes React-PDF

```tsx
// lib/relatorios/gerador-pdf.tsx

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font
} from '@react-pdf/renderer';
import { DadosRelatorioEscola, DadosRelatorioPolo } from './tipos';

// Registrar fontes (opcional - usar fontes do sistema)
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2' },
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiJ-Ek-_EeA.woff2', fontWeight: 700 }
  ]
});

// Estilos
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottom: '2px solid #3B82F6',
    paddingBottom: 10
  },
  titulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937'
  },
  subtitulo: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4
  },
  secao: {
    marginTop: 20,
    marginBottom: 10
  },
  secaoTitulo: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 10,
    borderBottom: '1px solid #E5E7EB',
    paddingBottom: 5
  },
  card: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 4,
    marginBottom: 10
  },
  estatisticaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  estatisticaItem: {
    width: '23%',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 4,
    border: '1px solid #E5E7EB'
  },
  estatisticaValor: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3B82F6'
  },
  estatisticaLabel: {
    fontSize: 8,
    color: '#6B7280',
    marginTop: 2
  },
  tabela: {
    width: '100%',
    marginTop: 10
  },
  tabelaHeader: {
    flexDirection: 'row',
    backgroundColor: '#3B82F6',
    padding: 8,
    color: '#FFFFFF',
    fontWeight: 'bold'
  },
  tabelaRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #E5E7EB',
    padding: 8
  },
  tabelaRowAlternate: {
    backgroundColor: '#F9FAFB'
  },
  tabelaCell: {
    flex: 1
  },
  grafico: {
    marginVertical: 15,
    alignItems: 'center'
  },
  graficoImagem: {
    width: 500,
    height: 300
  },
  rodape: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#9CA3AF',
    borderTop: '1px solid #E5E7EB',
    paddingTop: 10
  },
  badge: {
    backgroundColor: '#10B981',
    color: '#FFFFFF',
    padding: '2 6',
    borderRadius: 2,
    fontSize: 8
  },
  badgeAlerta: {
    backgroundColor: '#EF4444'
  },
  badgeAtencao: {
    backgroundColor: '#F59E0B'
  },
  listaItem: {
    flexDirection: 'row',
    marginBottom: 4
  },
  listaBullet: {
    width: 15,
    color: '#3B82F6'
  }
});

// Componentes auxiliares
const Estatistica = ({ valor, label }: { valor: string | number; label: string }) => (
  <View style={styles.estatisticaItem}>
    <Text style={styles.estatisticaValor}>{valor}</Text>
    <Text style={styles.estatisticaLabel}>{label}</Text>
  </View>
);

const TabelaTurmas = ({ turmas }: { turmas: DadosRelatorioEscola['turmas'] }) => (
  <View style={styles.tabela}>
    <View style={styles.tabelaHeader}>
      <Text style={[styles.tabelaCell, { flex: 2 }]}>Turma</Text>
      <Text style={styles.tabelaCell}>Série</Text>
      <Text style={styles.tabelaCell}>Alunos</Text>
      <Text style={styles.tabelaCell}>LP</Text>
      <Text style={styles.tabelaCell}>MAT</Text>
      <Text style={styles.tabelaCell}>CH</Text>
      <Text style={styles.tabelaCell}>CN</Text>
      <Text style={styles.tabelaCell}>Média</Text>
    </View>
    {turmas.map((turma, index) => (
      <View
        key={turma.id}
        style={[
          styles.tabelaRow,
          index % 2 === 1 && styles.tabelaRowAlternate
        ]}
      >
        <Text style={[styles.tabelaCell, { flex: 2 }]}>{turma.codigo}</Text>
        <Text style={styles.tabelaCell}>{turma.serie}</Text>
        <Text style={styles.tabelaCell}>{turma.total_alunos}</Text>
        <Text style={styles.tabelaCell}>{turma.medias_disciplinas.LP?.toFixed(1) || '-'}</Text>
        <Text style={styles.tabelaCell}>{turma.medias_disciplinas.MAT?.toFixed(1) || '-'}</Text>
        <Text style={styles.tabelaCell}>{turma.medias_disciplinas.CH?.toFixed(1) || '-'}</Text>
        <Text style={styles.tabelaCell}>{turma.medias_disciplinas.CN?.toFixed(1) || '-'}</Text>
        <Text style={styles.tabelaCell}>{turma.media_geral?.toFixed(1) || '-'}</Text>
      </View>
    ))}
  </View>
);

// Documento Principal - Relatório de Escola
export const RelatorioEscolaPDF = ({
  dados,
  graficos
}: {
  dados: DadosRelatorioEscola;
  graficos: {
    disciplinas: Buffer;
    distribuicao: Buffer;
    radar: Buffer;
    questoes: Buffer;
  };
}) => (
  <Document>
    {/* Página 1: Resumo Geral */}
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.titulo}>Relatório de Desempenho</Text>
          <Text style={styles.subtitulo}>{dados.escola.nome}</Text>
          <Text style={styles.subtitulo}>Polo: {dados.escola.polo_nome} | Ano Letivo: {dados.ano_letivo}</Text>
        </View>
        <View>
          <Text style={{ fontSize: 8, color: '#6B7280' }}>
            Gerado em: {dados.data_geracao}
          </Text>
        </View>
      </View>

      {/* Estatísticas Gerais */}
      <View style={styles.secao}>
        <Text style={styles.secaoTitulo}>Visão Geral</Text>
        <View style={styles.estatisticaContainer}>
          <Estatistica valor={dados.estatisticas.total_alunos} label="Total de Alunos" />
          <Estatistica valor={dados.estatisticas.total_turmas} label="Total de Turmas" />
          <Estatistica valor={dados.estatisticas.media_geral.toFixed(1)} label="Média Geral" />
          <Estatistica valor={`${dados.estatisticas.taxa_participacao}%`} label="Participação" />
        </View>
      </View>

      {/* Gráfico de Disciplinas */}
      <View style={styles.secao}>
        <Text style={styles.secaoTitulo}>Desempenho por Disciplina</Text>
        <View style={styles.grafico}>
          <Image src={graficos.disciplinas} style={styles.graficoImagem} />
        </View>
      </View>

      {/* Projeções e Análises */}
      <View style={styles.secao}>
        <Text style={styles.secaoTitulo}>Análise e Recomendações</Text>
        <View style={styles.card}>
          <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Áreas que Necessitam Atenção:</Text>
          {dados.projecoes.areas_atencao.map((area, i) => (
            <View key={i} style={styles.listaItem}>
              <Text style={styles.listaBullet}>•</Text>
              <Text>{area}</Text>
            </View>
          ))}

          <Text style={{ fontWeight: 'bold', marginTop: 10, marginBottom: 5 }}>Pontos Fortes:</Text>
          {dados.projecoes.pontos_fortes.map((ponto, i) => (
            <View key={i} style={styles.listaItem}>
              <Text style={styles.listaBullet}>•</Text>
              <Text>{ponto}</Text>
            </View>
          ))}

          <Text style={{ fontWeight: 'bold', marginTop: 10, marginBottom: 5 }}>Recomendações:</Text>
          {dados.projecoes.recomendacoes.map((rec, i) => (
            <View key={i} style={styles.listaItem}>
              <Text style={styles.listaBullet}>•</Text>
              <Text>{rec}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Rodapé */}
      <View style={styles.rodape}>
        <Text>SISAM - Sistema de Avaliação Municipal</Text>
        <Text>Página 1 de 3</Text>
      </View>
    </Page>

    {/* Página 2: Detalhamento por Turmas */}
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Detalhamento por Turmas</Text>
      </View>

      <TabelaTurmas turmas={dados.turmas} />

      {/* Gráfico Distribuição de Notas */}
      <View style={styles.secao}>
        <Text style={styles.secaoTitulo}>Distribuição de Notas</Text>
        <View style={styles.grafico}>
          <Image src={graficos.distribuicao} style={styles.graficoImagem} />
        </View>
      </View>

      <View style={styles.rodape}>
        <Text>SISAM - Sistema de Avaliação Municipal</Text>
        <Text>Página 2 de 3</Text>
      </View>
    </Page>

    {/* Página 3: Análise de Questões */}
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Análise de Questões</Text>
      </View>

      {/* Gráfico de Erros e Acertos */}
      <View style={styles.grafico}>
        <Image src={graficos.questoes} style={styles.graficoImagem} />
      </View>

      {/* Questões com Menor Desempenho */}
      <View style={styles.secao}>
        <Text style={styles.secaoTitulo}>Questões com Menor Índice de Acerto</Text>
        {dados.analise_questoes
          .filter(q => q.percentual_acerto < 50)
          .slice(0, 10)
          .map((questao, index) => (
            <View key={index} style={[styles.card, { flexDirection: 'row', alignItems: 'center' }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: 'bold' }}>Questão {questao.numero}</Text>
                <Text style={{ fontSize: 8, color: '#6B7280' }}>{questao.disciplina}</Text>
              </View>
              <View style={[styles.badge, questao.percentual_acerto < 30 ? styles.badgeAlerta : styles.badgeAtencao]}>
                <Text>{questao.percentual_acerto}% acertos</Text>
              </View>
            </View>
          ))
        }
      </View>

      {/* Radar de Competências */}
      <View style={styles.secao}>
        <Text style={styles.secaoTitulo}>Competências por Área</Text>
        <View style={styles.grafico}>
          <Image src={graficos.radar} style={{ width: 400, height: 300 }} />
        </View>
      </View>

      <View style={styles.rodape}>
        <Text>SISAM - Sistema de Avaliação Municipal</Text>
        <Text>Página 3 de 3</Text>
      </View>
    </Page>
  </Document>
);
```

---

## 7. API Route para Geração

```typescript
// app/api/admin/relatorios/escola/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth';
import { buscarDadosRelatorioEscola } from '@/lib/relatorios/consultas-relatorio';
import { RelatorioEscolaPDF } from '@/lib/relatorios/gerador-pdf';
import {
  gerarGraficoBarrasDisciplinas,
  gerarGraficoDistribuicaoNotas,
  gerarGraficoRadarCompetencias,
  gerarGraficoErrosAcertos
} from '@/lib/relatorios/gerador-graficos';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Autenticação
    const usuario = await getUsuarioFromRequest(request);
    if (!usuario) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar permissão para acessar escola
    const temPermissao = verificarPermissao(usuario, 'escola', params.id);
    if (!temPermissao) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    // Parâmetros da URL
    const searchParams = request.nextUrl.searchParams;
    const anoLetivo = searchParams.get('ano_letivo') || new Date().getFullYear().toString();
    const serie = searchParams.get('serie') || undefined;

    // Buscar dados
    const dados = await buscarDadosRelatorioEscola(params.id, anoLetivo, serie);

    // Gerar gráficos em paralelo
    const [
      graficoDisciplinas,
      graficoDistribuicao,
      graficoRadar,
      graficoQuestoes
    ] = await Promise.all([
      gerarGraficoBarrasDisciplinas(dados.desempenho_disciplinas),
      gerarGraficoDistribuicaoNotas(dados.graficos.distribuicao_notas),
      gerarGraficoRadarCompetencias(dados.graficos.radar_competencias),
      gerarGraficoErrosAcertos(dados.analise_questoes.slice(0, 20))
    ]);

    // Gerar PDF
    const pdfBuffer = await renderToBuffer(
      <RelatorioEscolaPDF
        dados={dados}
        graficos={{
          disciplinas: graficoDisciplinas,
          distribuicao: graficoDistribuicao,
          radar: graficoRadar,
          questoes: graficoQuestoes
        }}
      />
    );

    // Retornar PDF
    const nomeArquivo = `relatorio_${dados.escola.codigo}_${anoLetivo}.pdf`;

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    });

  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar relatório', detalhes: error.message },
      { status: 500 }
    );
  }
}
```

---

## 8. Componente de Seleção (Frontend)

```tsx
// components/relatorios/SeletorRelatorio.tsx

'use client';

import { useState } from 'react';
import { FileText, Download, Building2, MapPin, Loader2 } from 'lucide-react';

interface Props {
  polos: Array<{ id: string; nome: string }>;
  escolas: Array<{ id: string; nome: string; polo_id: string }>;
  anoLetivo: string;
}

export function SeletorRelatorio({ polos, escolas, anoLetivo }: Props) {
  const [tipo, setTipo] = useState<'escola' | 'polo'>('escola');
  const [poloSelecionado, setPoloSelecionado] = useState<string>('');
  const [escolaSelecionada, setEscolaSelecionada] = useState<string>('');
  const [serie, setSerie] = useState<string>('');
  const [gerando, setGerando] = useState(false);

  const escolasFiltradas = poloSelecionado
    ? escolas.filter(e => e.polo_id === poloSelecionado)
    : escolas;

  const handleGerarRelatorio = async () => {
    const id = tipo === 'escola' ? escolaSelecionada : poloSelecionado;
    if (!id) return;

    setGerando(true);

    try {
      const params = new URLSearchParams({
        ano_letivo: anoLetivo,
        ...(serie && { serie })
      });

      const response = await fetch(
        `/api/admin/relatorios/${tipo}/${id}?${params}`,
        { method: 'GET' }
      );

      if (!response.ok) throw new Error('Erro ao gerar relatório');

      // Download do PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_${tipo}_${anoLetivo}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao gerar relatório. Tente novamente.');
    } finally {
      setGerando(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <FileText className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold">Gerar Relatório PDF</h2>
      </div>

      {/* Tipo de Relatório */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de Relatório
        </label>
        <div className="flex gap-4">
          <button
            onClick={() => setTipo('escola')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${
              tipo === 'escola'
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Por Escola
          </button>
          <button
            onClick={() => setTipo('polo')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${
              tipo === 'polo'
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <MapPin className="w-4 h-4" />
            Por Polo
          </button>
        </div>
      </div>

      {/* Seleção de Polo */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Polo
        </label>
        <select
          value={poloSelecionado}
          onChange={(e) => {
            setPoloSelecionado(e.target.value);
            setEscolaSelecionada('');
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Selecione um polo</option>
          {polos.map(polo => (
            <option key={polo.id} value={polo.id}>{polo.nome}</option>
          ))}
        </select>
      </div>

      {/* Seleção de Escola (apenas se tipo = escola) */}
      {tipo === 'escola' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Escola
          </label>
          <select
            value={escolaSelecionada}
            onChange={(e) => setEscolaSelecionada(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={!poloSelecionado}
          >
            <option value="">Selecione uma escola</option>
            {escolasFiltradas.map(escola => (
              <option key={escola.id} value={escola.id}>{escola.nome}</option>
            ))}
          </select>
        </div>
      )}

      {/* Filtro por Série (opcional) */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Série (opcional)
        </label>
        <select
          value={serie}
          onChange={(e) => setSerie(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Todas as séries</option>
          <option value="2º Ano">2º Ano</option>
          <option value="3º Ano">3º Ano</option>
          <option value="5º Ano">5º Ano</option>
          <option value="8º Ano">8º Ano</option>
          <option value="9º Ano">9º Ano</option>
        </select>
      </div>

      {/* Botão Gerar */}
      <button
        onClick={handleGerarRelatorio}
        disabled={gerando || (tipo === 'escola' ? !escolaSelecionada : !poloSelecionado)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {gerando ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Gerando Relatório...
          </>
        ) : (
          <>
            <Download className="w-5 h-5" />
            Gerar Relatório PDF
          </>
        )}
      </button>
    </div>
  );
}
```

---

## 9. Lógica de Projeções e Análises

```typescript
// lib/relatorios/calculos-projecoes.ts

interface DadosAnalise {
  disciplinas: Array<{ disciplina: string; media: number }>;
  turmas: Array<{ media_geral: number; serie: string }>;
  questoes: Array<{ percentual_acerto: number; disciplina: string }>;
}

export function calcularProjecoes(dados: DadosAnalise) {
  const LIMITE_BAIXO = 5.0;
  const LIMITE_BOM = 7.0;

  // Identificar áreas de atenção (média < 5)
  const areas_atencao = dados.disciplinas
    .filter(d => d.media < LIMITE_BAIXO)
    .map(d => `${getNomeDisciplina(d.disciplina)}: média ${d.media.toFixed(1)} - necessita intervenção pedagógica urgente`);

  // Identificar pontos fortes (média >= 7)
  const pontos_fortes = dados.disciplinas
    .filter(d => d.media >= LIMITE_BOM)
    .map(d => `${getNomeDisciplina(d.disciplina)}: média ${d.media.toFixed(1)} - bom desempenho`);

  // Gerar recomendações baseadas nos dados
  const recomendacoes: string[] = [];

  // Análise de questões com baixo desempenho
  const questoesCriticas = dados.questoes.filter(q => q.percentual_acerto < 30);
  if (questoesCriticas.length > 5) {
    const disciplinasAfetadas = [...new Set(questoesCriticas.map(q => q.disciplina))];
    recomendacoes.push(
      `Revisar conteúdos de ${disciplinasAfetadas.map(getNomeDisciplina).join(', ')} - ${questoesCriticas.length} questões com menos de 30% de acerto`
    );
  }

  // Análise de dispersão entre turmas
  const medias = dados.turmas.map(t => t.media_geral).filter(m => m !== null);
  if (medias.length > 1) {
    const maiorMedia = Math.max(...medias);
    const menorMedia = Math.min(...medias);
    const dispersao = maiorMedia - menorMedia;

    if (dispersao > 2) {
      recomendacoes.push(
        `Alta dispersão entre turmas (${dispersao.toFixed(1)} pontos) - considerar nivelamento ou redistribuição de recursos`
      );
    }
  }

  // Calcular tendência (se houver dados históricos)
  const tendencia = calcularTendencia(dados);

  // Se não houver áreas de atenção específicas
  if (areas_atencao.length === 0) {
    areas_atencao.push('Nenhuma disciplina em situação crítica');
  }

  if (pontos_fortes.length === 0) {
    pontos_fortes.push('Desempenho dentro da média em todas as disciplinas');
  }

  if (recomendacoes.length === 0) {
    recomendacoes.push('Manter acompanhamento pedagógico regular');
    recomendacoes.push('Continuar com práticas que estão funcionando');
  }

  return {
    tendencia_media: tendencia,
    areas_atencao,
    pontos_fortes,
    recomendacoes
  };
}

function getNomeDisciplina(codigo: string): string {
  const nomes: Record<string, string> = {
    LP: 'Língua Portuguesa',
    MAT: 'Matemática',
    CH: 'Ciências Humanas',
    CN: 'Ciências da Natureza',
    PRODUCAO: 'Produção Textual'
  };
  return nomes[codigo] || codigo;
}

function calcularTendencia(dados: DadosAnalise): 'crescente' | 'estavel' | 'decrescente' {
  // Implementar análise de tendência com dados históricos
  // Por enquanto, retorna estável
  return 'estavel';
}

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
```

---

## 10. Instalação e Dependências

### 10.1 Instalar Pacotes

```bash
npm install @react-pdf/renderer chart.js chartjs-node-canvas canvas
```

### 10.2 Configuração do Canvas (para chartjs-node-canvas)

No Windows/Linux, pode ser necessário instalar dependências do sistema para o pacote `canvas`:

**Windows:**
```bash
npm install --global windows-build-tools
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
```

**macOS:**
```bash
brew install pkg-config cairo pango libpng jpeg giflib librsvg
```

### 10.3 Alternativa sem Canvas (Recomendada para Vercel)

Se houver problemas com `canvas` em ambiente serverless, usar **QuickChart.io** como alternativa:

```typescript
// lib/relatorios/gerador-graficos-quickchart.ts

export async function gerarGraficoViaQuickChart(config: object): Promise<Buffer> {
  const response = await fetch('https://quickchart.io/chart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chart: config,
      width: 600,
      height: 400,
      format: 'png',
      backgroundColor: 'white'
    })
  });

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
```

---

## 11. Estrutura de Página

```tsx
// app/admin/relatorios/page.tsx

import { SeletorRelatorio } from '@/components/relatorios/SeletorRelatorio';
import { pool } from '@/database/connection';
import { getUsuarioFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function RelatoriosPage() {
  const usuario = await getUsuarioFromCookies();
  if (!usuario) redirect('/login');

  // Buscar polos e escolas baseado nas permissões do usuário
  let polosQuery = 'SELECT id, nome FROM polos WHERE ativo = true ORDER BY nome';
  let escolasQuery = 'SELECT id, nome, polo_id FROM escolas WHERE ativo = true ORDER BY nome';

  if (usuario.tipo_usuario === 'polo') {
    polosQuery = `SELECT id, nome FROM polos WHERE id = '${usuario.polo_id}' AND ativo = true`;
    escolasQuery = `SELECT id, nome, polo_id FROM escolas WHERE polo_id = '${usuario.polo_id}' AND ativo = true ORDER BY nome`;
  } else if (usuario.tipo_usuario === 'escola') {
    escolasQuery = `SELECT id, nome, polo_id FROM escolas WHERE id = '${usuario.escola_id}' AND ativo = true`;
    polosQuery = `SELECT p.id, p.nome FROM polos p JOIN escolas e ON e.polo_id = p.id WHERE e.id = '${usuario.escola_id}'`;
  }

  const [polosResult, escolasResult] = await Promise.all([
    pool.query(polosQuery),
    pool.query(escolasQuery)
  ]);

  const anoLetivo = new Date().getFullYear().toString();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Relatórios</h1>
      <SeletorRelatorio
        polos={polosResult.rows}
        escolas={escolasResult.rows}
        anoLetivo={anoLetivo}
      />
    </div>
  );
}
```

---

## 12. Checklist de Implementação

### Fase 1: Estrutura Base
- [ ] Criar estrutura de pastas conforme seção 2
- [ ] Definir interfaces TypeScript (tipos.ts)
- [ ] Instalar dependências

### Fase 2: Backend
- [ ] Implementar consultas SQL (consultas-relatorio.ts)
- [ ] Implementar gerador de gráficos (gerador-graficos.ts)
- [ ] Implementar lógica de projeções (calculos-projecoes.ts)
- [ ] Criar API routes para escola e polo

### Fase 3: PDF
- [ ] Implementar componentes React-PDF (gerador-pdf.tsx)
- [ ] Testar renderização de gráficos no PDF
- [ ] Ajustar estilos e layout

### Fase 4: Frontend
- [ ] Criar componente SeletorRelatorio
- [ ] Integrar na página /admin/relatorios
- [ ] Adicionar link no menu lateral

### Fase 5: Testes e Ajustes
- [ ] Testar com diferentes volumes de dados
- [ ] Otimizar performance das queries
- [ ] Testar em ambiente Vercel
- [ ] Documentar uso para usuários

---

## 13. Considerações de Performance

1. **Cache de Consultas**: Usar cache em memória para dados que não mudam frequentemente
2. **Streaming de PDF**: Para relatórios grandes, considerar streaming ao invés de buffer completo
3. **Geração Assíncrona**: Para relatórios muito grandes, implementar fila com notificação
4. **Limite de Dados**: Paginar análise de questões se houver muitas

---

## 14. Segurança

1. **Validação de Permissões**: Sempre verificar se o usuário tem acesso à escola/polo solicitado
2. **Rate Limiting**: Limitar quantidade de relatórios gerados por minuto
3. **Sanitização**: Validar todos os parâmetros de entrada com Zod
4. **Logs**: Registrar geração de relatórios para auditoria

---

## Referências

- [@react-pdf/renderer](https://react-pdf.org/)
- [Chart.js](https://www.chartjs.org/)
- [chartjs-node-canvas](https://github.com/SeanSobey/ChartjsNodeCanvas)
- [QuickChart.io](https://quickchart.io/) (alternativa serverless)
