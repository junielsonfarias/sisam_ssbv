/**
 * Componentes React-PDF para geração de relatórios
 * @module lib/relatorios/gerador-pdf
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet
} from '@react-pdf/renderer';
import {
  DadosRelatorioEscola,
  DadosRelatorioPolo,
  TurmaRelatorio,
  GraficosBuffer,
  EscolaComparativo,
  ProducaoTextual,
  DistribuicaoNivel
} from './tipos';

// Estilos do documento
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
    paddingBottom: 10
  },
  headerLeft: {
    flex: 1
  },
  titulo: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#1F2937'
  },
  subtitulo: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4
  },
  dataGeracao: {
    fontSize: 8,
    color: '#6B7280'
  },
  secao: {
    marginTop: 15,
    marginBottom: 10
  },
  secaoTitulo: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#3B82F6',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
    gap: 8
  },
  estatisticaItem: {
    width: '23%',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  estatisticaValor: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
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
    padding: 8
  },
  tabelaHeaderCell: {
    color: '#FFFFFF',
    fontFamily: 'Helvetica-Bold',
    fontSize: 9
  },
  tabelaRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    padding: 6
  },
  tabelaRowAlternate: {
    backgroundColor: '#F9FAFB'
  },
  tabelaCell: {
    fontSize: 9
  },
  grafico: {
    marginVertical: 10,
    alignItems: 'center'
  },
  graficoImagem: {
    width: 480,
    height: 280
  },
  graficoImagemPequeno: {
    width: 400,
    height: 250
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
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 10
  },
  listaItem: {
    flexDirection: 'row',
    marginBottom: 4
  },
  listaBullet: {
    width: 15,
    color: '#3B82F6'
  },
  listaTexto: {
    flex: 1,
    fontSize: 9
  },
  badge: {
    backgroundColor: '#10B981',
    color: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
    fontSize: 8
  },
  badgeAlerta: {
    backgroundColor: '#EF4444'
  },
  badgeAtencao: {
    backgroundColor: '#F59E0B'
  },
  flex1: { flex: 1 },
  flex2: { flex: 2 },
  textCenter: { textAlign: 'center' },
  textRight: { textAlign: 'right' },
  mb10: { marginBottom: 10 },
  mt10: { marginTop: 10 },
  fontBold: { fontFamily: 'Helvetica-Bold' }
});

// Componente de Estatística
const Estatistica = ({ valor, label }: { valor: string | number; label: string }) => (
  <View style={styles.estatisticaItem}>
    <Text style={styles.estatisticaValor}>{valor}</Text>
    <Text style={styles.estatisticaLabel}>{label}</Text>
  </View>
);

// Componente de Tabela de Turmas
const TabelaTurmas = ({ turmas }: { turmas: TurmaRelatorio[] }) => (
  <View style={styles.tabela}>
    <View style={styles.tabelaHeader}>
      <Text style={[styles.tabelaHeaderCell, styles.flex2]}>Turma</Text>
      <Text style={[styles.tabelaHeaderCell, styles.flex1, styles.textCenter]}>Série</Text>
      <Text style={[styles.tabelaHeaderCell, styles.flex1, styles.textCenter]}>Alunos</Text>
      <Text style={[styles.tabelaHeaderCell, styles.flex1, styles.textCenter]}>LP</Text>
      <Text style={[styles.tabelaHeaderCell, styles.flex1, styles.textCenter]}>MAT</Text>
      <Text style={[styles.tabelaHeaderCell, styles.flex1, styles.textCenter]}>CH</Text>
      <Text style={[styles.tabelaHeaderCell, styles.flex1, styles.textCenter]}>CN</Text>
      <Text style={[styles.tabelaHeaderCell, styles.flex1, styles.textCenter]}>Média</Text>
    </View>
    {turmas.slice(0, 15).map((turma, index) => (
      <View
        key={turma.id}
        style={[
          styles.tabelaRow,
          index % 2 === 1 ? styles.tabelaRowAlternate : {}
        ]}
      >
        <Text style={[styles.tabelaCell, styles.flex2]}>{turma.codigo || turma.nome}</Text>
        <Text style={[styles.tabelaCell, styles.flex1, styles.textCenter]}>{turma.serie}</Text>
        <Text style={[styles.tabelaCell, styles.flex1, styles.textCenter]}>{turma.total_alunos}</Text>
        <Text style={[styles.tabelaCell, styles.flex1, styles.textCenter]}>
          {turma.medias_disciplinas.LP?.toFixed(1) || '-'}
        </Text>
        <Text style={[styles.tabelaCell, styles.flex1, styles.textCenter]}>
          {turma.medias_disciplinas.MAT?.toFixed(1) || '-'}
        </Text>
        <Text style={[styles.tabelaCell, styles.flex1, styles.textCenter]}>
          {turma.medias_disciplinas.CH?.toFixed(1) || '-'}
        </Text>
        <Text style={[styles.tabelaCell, styles.flex1, styles.textCenter]}>
          {turma.medias_disciplinas.CN?.toFixed(1) || '-'}
        </Text>
        <Text style={[styles.tabelaCell, styles.flex1, styles.textCenter, styles.fontBold]}>
          {turma.media_geral?.toFixed(1) || '-'}
        </Text>
      </View>
    ))}
  </View>
);

// Componente de Tabela de Escolas (para relatório de polo)
const TabelaEscolas = ({ escolas }: { escolas: EscolaComparativo[] }) => (
  <View style={styles.tabela}>
    <View style={styles.tabelaHeader}>
      <Text style={[styles.tabelaHeaderCell, { width: 25 }]}>#</Text>
      <Text style={[styles.tabelaHeaderCell, styles.flex2]}>Escola</Text>
      <Text style={[styles.tabelaHeaderCell, styles.flex1, styles.textCenter]}>Alunos</Text>
      <Text style={[styles.tabelaHeaderCell, styles.flex1, styles.textCenter]}>Turmas</Text>
      <Text style={[styles.tabelaHeaderCell, styles.flex1, styles.textCenter]}>Média</Text>
    </View>
    {escolas.slice(0, 20).map((escola, index) => (
      <View
        key={escola.id}
        style={[
          styles.tabelaRow,
          index % 2 === 1 ? styles.tabelaRowAlternate : {}
        ]}
      >
        <Text style={[styles.tabelaCell, { width: 25 }]}>{escola.ranking_posicao}º</Text>
        <Text style={[styles.tabelaCell, styles.flex2]}>
          {escola.nome.length > 35 ? escola.nome.substring(0, 35) + '...' : escola.nome}
        </Text>
        <Text style={[styles.tabelaCell, styles.flex1, styles.textCenter]}>{escola.total_alunos}</Text>
        <Text style={[styles.tabelaCell, styles.flex1, styles.textCenter]}>{escola.total_turmas}</Text>
        <Text style={[styles.tabelaCell, styles.flex1, styles.textCenter, styles.fontBold]}>
          {escola.media_geral?.toFixed(1) || '-'}
        </Text>
      </View>
    ))}
  </View>
);

// Componente de Produção Textual (Anos Iniciais)
const ProducaoTextualSection = ({ producao }: { producao: ProducaoTextual }) => (
  <View style={styles.secao}>
    <Text style={styles.secaoTitulo}>Produção Textual</Text>
    <View style={[styles.card, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
      <View>
        <Text style={[styles.fontBold, { fontSize: 12 }]}>Média Geral</Text>
        <Text style={{ fontSize: 8, color: '#6B7280' }}>8 itens avaliados</Text>
      </View>
      <Text style={[styles.estatisticaValor, { fontSize: 24 }]}>{producao.media_geral.toFixed(1)}</Text>
    </View>
    <View style={styles.tabela}>
      <View style={styles.tabelaHeader}>
        <Text style={[styles.tabelaHeaderCell, styles.flex2]}>Item de Avaliação</Text>
        <Text style={[styles.tabelaHeaderCell, styles.flex1, styles.textCenter]}>Média</Text>
      </View>
      {producao.itens.map((item, index) => (
        <View
          key={item.codigo}
          style={[
            styles.tabelaRow,
            index % 2 === 1 ? styles.tabelaRowAlternate : {}
          ]}
        >
          <Text style={[styles.tabelaCell, styles.flex2]}>{item.nome}</Text>
          <Text style={[styles.tabelaCell, styles.flex1, styles.textCenter, styles.fontBold]}>
            {item.media.toFixed(1)}
          </Text>
        </View>
      ))}
    </View>
  </View>
);

// Componente de Distribuição por Níveis de Aprendizagem
const NiveisAprendizagemSection = ({ niveis }: { niveis: DistribuicaoNivel[] }) => (
  <View style={styles.secao}>
    <Text style={styles.secaoTitulo}>Distribuição por Nível de Aprendizagem</Text>
    <View style={[styles.estatisticaContainer, { gap: 6 }]}>
      {niveis.map((nivel) => (
        <View key={nivel.nivel} style={[styles.estatisticaItem, { width: '23%', borderLeftWidth: 3, borderLeftColor: nivel.cor || '#6B7280' }]}>
          <Text style={[styles.estatisticaValor, { color: nivel.cor || '#6B7280' }]}>{nivel.quantidade}</Text>
          <Text style={styles.estatisticaLabel}>{nivel.nivel}</Text>
          <Text style={{ fontSize: 7, color: '#9CA3AF' }}>{nivel.percentual}%</Text>
        </View>
      ))}
    </View>
  </View>
);

// Componente de Comparativo Escola vs Polo
const ComparativoPoloSection = ({ comparativo }: {
  comparativo: {
    media_polo: number;
    media_escola: number;
    diferenca: number;
    posicao_ranking?: number;
    total_escolas_polo?: number;
  }
}) => (
  <View style={styles.secao}>
    <Text style={styles.secaoTitulo}>Comparativo com o Polo</Text>
    <View style={[styles.estatisticaContainer, { gap: 8 }]}>
      <View style={[styles.estatisticaItem, { width: '30%' }]}>
        <Text style={[styles.estatisticaValor]}>{comparativo.media_escola.toFixed(1)}</Text>
        <Text style={styles.estatisticaLabel}>Média da Escola</Text>
      </View>
      <View style={[styles.estatisticaItem, { width: '30%' }]}>
        <Text style={[styles.estatisticaValor, { color: '#6B7280' }]}>{comparativo.media_polo.toFixed(1)}</Text>
        <Text style={styles.estatisticaLabel}>Média do Polo</Text>
      </View>
      <View style={[styles.estatisticaItem, { width: '30%' }]}>
        <Text style={[
          styles.estatisticaValor,
          { color: comparativo.diferenca >= 0 ? '#10B981' : '#EF4444' }
        ]}>
          {comparativo.diferenca >= 0 ? '+' : ''}{comparativo.diferenca.toFixed(1)}
        </Text>
        <Text style={styles.estatisticaLabel}>Diferença</Text>
      </View>
    </View>
    {comparativo.posicao_ranking && comparativo.total_escolas_polo && (
      <View style={[styles.card, { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ fontSize: 9 }}>
          Posição no ranking do polo: <Text style={styles.fontBold}>{comparativo.posicao_ranking}º</Text> de {comparativo.total_escolas_polo} escolas
        </Text>
      </View>
    )}
  </View>
);

// Documento Principal - Relatório de Escola
export const RelatorioEscolaPDF = ({
  dados,
  graficos
}: {
  dados: DadosRelatorioEscola;
  graficos: GraficosBuffer;
}) => (
  <Document>
    {/* Página 1: Resumo Geral */}
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.titulo}>Relatório de Desempenho</Text>
          <Text style={styles.subtitulo}>{dados.escola.nome}</Text>
          <Text style={styles.subtitulo}>
            Polo: {dados.escola.polo_nome} | Ano Letivo: {dados.ano_letivo}
          </Text>
        </View>
        <View>
          <Text style={styles.dataGeracao}>Gerado em: {dados.data_geracao}</Text>
        </View>
      </View>

      {/* Estatísticas Gerais */}
      <View style={styles.secao}>
        <Text style={styles.secaoTitulo}>Visão Geral {dados.serie_filtro ? `- ${dados.serie_filtro}` : ''}</Text>
        <View style={styles.estatisticaContainer}>
          <Estatistica valor={dados.estatisticas.total_alunos} label="Total de Alunos" />
          <Estatistica valor={dados.estatisticas.total_turmas} label="Total de Turmas" />
          <Estatistica valor={dados.estatisticas.media_geral.toFixed(1)} label="Média Geral" />
          <Estatistica valor={`${dados.estatisticas.taxa_participacao}%`} label="Participação" />
        </View>
      </View>

      {/* Comparativo com Polo */}
      {dados.comparativo_polo && (
        <ComparativoPoloSection comparativo={dados.comparativo_polo} />
      )}

      {/* Gráfico de Disciplinas */}
      {graficos.disciplinas.length > 0 && (
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Desempenho por Disciplina</Text>
          <View style={styles.grafico}>
            <Image src={graficos.disciplinas} style={styles.graficoImagem} />
          </View>
        </View>
      )}

      {/* Projeções e Análises */}
      <View style={styles.secao}>
        <Text style={styles.secaoTitulo}>Análise e Recomendações</Text>
        <View style={styles.card}>
          <Text style={[styles.fontBold, styles.mb10]}>Áreas que Necessitam Atenção:</Text>
          {dados.projecoes.areas_atencao.map((area, i) => (
            <View key={i} style={styles.listaItem}>
              <Text style={styles.listaBullet}>•</Text>
              <Text style={styles.listaTexto}>{area}</Text>
            </View>
          ))}

          <Text style={[styles.fontBold, styles.mt10, styles.mb10]}>Pontos Fortes:</Text>
          {dados.projecoes.pontos_fortes.map((ponto, i) => (
            <View key={i} style={styles.listaItem}>
              <Text style={styles.listaBullet}>•</Text>
              <Text style={styles.listaTexto}>{ponto}</Text>
            </View>
          ))}
        </View>
      </View>

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

      {dados.turmas.length > 0 ? (
        <TabelaTurmas turmas={dados.turmas} />
      ) : (
        <View style={styles.card}>
          <Text>Nenhuma turma encontrada para o período selecionado.</Text>
        </View>
      )}

      {/* Produção Textual (Anos Iniciais) */}
      {dados.producao_textual && (
        <ProducaoTextualSection producao={dados.producao_textual} />
      )}

      {/* Distribuição por Níveis de Aprendizagem */}
      {dados.distribuicao_niveis && dados.distribuicao_niveis.length > 0 && (
        <NiveisAprendizagemSection niveis={dados.distribuicao_niveis} />
      )}

      {/* Gráfico Distribuição de Notas */}
      {graficos.distribuicao.length > 0 && (
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Distribuição de Notas</Text>
          <View style={styles.grafico}>
            <Image src={graficos.distribuicao} style={styles.graficoImagemPequeno} />
          </View>
        </View>
      )}

      <View style={styles.rodape}>
        <Text>SISAM - Sistema de Avaliação Municipal</Text>
        <Text>Página 2 de 3</Text>
      </View>
    </Page>

    {/* Página 3: Análise de Questões */}
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Análise de Questões e Competências</Text>
      </View>

      {/* Gráfico de Erros e Acertos */}
      {graficos.questoes.length > 0 && (
        <View style={styles.grafico}>
          <Image src={graficos.questoes} style={styles.graficoImagem} />
        </View>
      )}

      {/* Questões com Menor Desempenho */}
      <View style={styles.secao}>
        <Text style={styles.secaoTitulo}>Questões com Menor Índice de Acerto</Text>
        {dados.analise_questoes
          .filter(q => q.percentual_acerto < 50)
          .slice(0, 8)
          .map((questao, index) => (
            <View key={index} style={[styles.card, { flexDirection: 'row', alignItems: 'center', marginBottom: 5 }]}>
              <View style={styles.flex1}>
                <Text style={styles.fontBold}>Questão {questao.numero}</Text>
                <Text style={{ fontSize: 8, color: '#6B7280' }}>{questao.disciplina}</Text>
              </View>
              <View style={[
                styles.badge,
                questao.percentual_acerto < 30 ? styles.badgeAlerta : styles.badgeAtencao
              ]}>
                <Text>{questao.percentual_acerto.toFixed(0)}% acertos</Text>
              </View>
            </View>
          ))
        }
        {dados.analise_questoes.filter(q => q.percentual_acerto < 50).length === 0 && (
          <View style={styles.card}>
            <Text>Todas as questões apresentam índice de acerto acima de 50%.</Text>
          </View>
        )}
      </View>

      {/* Radar de Competências */}
      {graficos.radar.length > 0 && (
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Competências por Área</Text>
          <View style={styles.grafico}>
            <Image src={graficos.radar} style={styles.graficoImagemPequeno} />
          </View>
        </View>
      )}

      {/* Recomendações */}
      <View style={styles.secao}>
        <Text style={styles.secaoTitulo}>Recomendações Pedagógicas</Text>
        <View style={styles.card}>
          {dados.projecoes.recomendacoes.map((rec, i) => (
            <View key={i} style={styles.listaItem}>
              <Text style={styles.listaBullet}>•</Text>
              <Text style={styles.listaTexto}>{rec}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.rodape}>
        <Text>SISAM - Sistema de Avaliação Municipal</Text>
        <Text>Página 3 de 3</Text>
      </View>
    </Page>
  </Document>
);

// Documento Principal - Relatório de Polo
export const RelatorioPoloPDF = ({
  dados,
  graficos
}: {
  dados: DadosRelatorioPolo;
  graficos: GraficosBuffer;
}) => (
  <Document>
    {/* Página 1: Resumo Geral do Polo */}
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.titulo}>Relatório do Polo</Text>
          <Text style={styles.subtitulo}>{dados.polo.nome}</Text>
          <Text style={styles.subtitulo}>Ano Letivo: {dados.ano_letivo}</Text>
        </View>
        <View>
          <Text style={styles.dataGeracao}>Gerado em: {dados.data_geracao}</Text>
        </View>
      </View>

      {/* Estatísticas Gerais */}
      <View style={styles.secao}>
        <Text style={styles.secaoTitulo}>Visão Geral do Polo {dados.serie_filtro ? `- ${dados.serie_filtro}` : ''}</Text>
        <View style={styles.estatisticaContainer}>
          <Estatistica valor={dados.estatisticas.total_alunos} label="Total de Alunos" />
          <Estatistica valor={dados.escolas.length} label="Total de Escolas" />
          <Estatistica valor={dados.estatisticas.media_geral.toFixed(1)} label="Média Geral" />
          <Estatistica valor={`${dados.estatisticas.taxa_participacao}%`} label="Participação" />
        </View>
      </View>

      {/* Distribuição por Níveis de Aprendizagem */}
      {dados.distribuicao_niveis && dados.distribuicao_niveis.length > 0 && (
        <NiveisAprendizagemSection niveis={dados.distribuicao_niveis} />
      )}

      {/* Gráfico de Disciplinas */}
      {graficos.disciplinas.length > 0 && (
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Desempenho por Disciplina</Text>
          <View style={styles.grafico}>
            <Image src={graficos.disciplinas} style={styles.graficoImagem} />
          </View>
        </View>
      )}

      {/* Análises */}
      <View style={styles.secao}>
        <Text style={styles.secaoTitulo}>Análise do Polo</Text>
        <View style={styles.card}>
          <Text style={[styles.fontBold, styles.mb10]}>Áreas que Necessitam Atenção:</Text>
          {dados.projecoes.areas_atencao.map((area, i) => (
            <View key={i} style={styles.listaItem}>
              <Text style={styles.listaBullet}>•</Text>
              <Text style={styles.listaTexto}>{area}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.rodape}>
        <Text>SISAM - Sistema de Avaliação Municipal</Text>
        <Text>Página 1 de 3</Text>
      </View>
    </Page>

    {/* Página 2: Ranking de Escolas */}
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Ranking de Escolas</Text>
      </View>

      {dados.escolas.length > 0 ? (
        <TabelaEscolas escolas={dados.escolas} />
      ) : (
        <View style={styles.card}>
          <Text>Nenhuma escola encontrada para o período selecionado.</Text>
        </View>
      )}

      {/* Gráfico Comparativo de Escolas */}
      {graficos.comparativoEscolas && graficos.comparativoEscolas.length > 0 && (
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Comparativo Visual</Text>
          <View style={styles.grafico}>
            <Image src={graficos.comparativoEscolas} style={styles.graficoImagem} />
          </View>
        </View>
      )}

      <View style={styles.rodape}>
        <Text>SISAM - Sistema de Avaliação Municipal</Text>
        <Text>Página 2 de 3</Text>
      </View>
    </Page>

    {/* Página 3: Análises e Recomendações */}
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Análises e Recomendações</Text>
      </View>

      {/* Produção Textual (Anos Iniciais) */}
      {dados.producao_textual && (
        <ProducaoTextualSection producao={dados.producao_textual} />
      )}

      {/* Distribuição de Notas */}
      {graficos.distribuicao.length > 0 && (
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Distribuição de Notas no Polo</Text>
          <View style={styles.grafico}>
            <Image src={graficos.distribuicao} style={styles.graficoImagemPequeno} />
          </View>
        </View>
      )}

      {/* Pontos Fortes e Recomendações */}
      <View style={styles.secao}>
        <Text style={styles.secaoTitulo}>Pontos Fortes</Text>
        <View style={styles.card}>
          {dados.projecoes.pontos_fortes.map((ponto, i) => (
            <View key={i} style={styles.listaItem}>
              <Text style={styles.listaBullet}>•</Text>
              <Text style={styles.listaTexto}>{ponto}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.secao}>
        <Text style={styles.secaoTitulo}>Recomendações</Text>
        <View style={styles.card}>
          {dados.projecoes.recomendacoes.map((rec, i) => (
            <View key={i} style={styles.listaItem}>
              <Text style={styles.listaBullet}>•</Text>
              <Text style={styles.listaTexto}>{rec}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Radar de Competências */}
      {graficos.radar.length > 0 && (
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Competências por Área</Text>
          <View style={styles.grafico}>
            <Image src={graficos.radar} style={styles.graficoImagemPequeno} />
          </View>
        </View>
      )}

      <View style={styles.rodape}>
        <Text>SISAM - Sistema de Avaliação Municipal</Text>
        <Text>Página 3 de 3</Text>
      </View>
    </Page>
  </Document>
);
