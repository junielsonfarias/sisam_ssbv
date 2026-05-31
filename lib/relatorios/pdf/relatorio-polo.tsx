/**
 * Relatório completo de um polo (3-6 páginas dependendo de filtros).
 */
import React from 'react'
import { Document, Image, Page, Text, View } from '@react-pdf/renderer'
import { DadosRelatorioPolo, GraficosBuffer } from '../tipos'
import { Estatistica, Rodape } from './atomos'
import { PaginaAnosFinais, PaginaAnosIniciais, PaginaDadosGerais } from './paginas'
import { NiveisAprendizagemSection, ProducaoTextualSection, TabelaEscolas } from './secoes'
import { styles } from './styles'

export const RelatorioPoloPDF = ({ dados, graficos }: {
  dados: DadosRelatorioPolo
  graficos: GraficosBuffer
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

      <View style={styles.secao}>
        <Text style={styles.secaoTitulo}>Visão Geral do Polo {dados.serie_filtro ? `- ${dados.serie_filtro}` : ''}</Text>
        <View style={styles.estatisticaContainer}>
          <Estatistica valor={dados.estatisticas.total_alunos} label="Total de Alunos" />
          <Estatistica valor={dados.escolas.length} label="Total de Escolas" />
          <Estatistica valor={dados.estatisticas.media_geral.toFixed(1)} label="Média Geral" />
          <Estatistica valor={`${dados.estatisticas.taxa_participacao}%`} label="Participação" />
        </View>
      </View>

      {dados.distribuicao_niveis && dados.distribuicao_niveis.length > 0 && (
        <NiveisAprendizagemSection niveis={dados.distribuicao_niveis} />
      )}

      {graficos.disciplinas.length > 0 && (
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Desempenho por Disciplina</Text>
          <View style={styles.grafico}>
            <Image src={graficos.disciplinas} style={styles.graficoImagem} />
          </View>
        </View>
      )}

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

      <Rodape />
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

      {graficos.comparativoEscolas && graficos.comparativoEscolas.length > 0 && (
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Comparativo Visual</Text>
          <View style={styles.grafico}>
            <Image src={graficos.comparativoEscolas} style={styles.graficoImagem} />
          </View>
        </View>
      )}

      <Rodape />
    </Page>

    {/* Página 3: Análises e Recomendações */}
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Análises e Recomendações</Text>
      </View>

      {dados.producao_textual && <ProducaoTextualSection producao={dados.producao_textual} />}

      {graficos.distribuicao.length > 0 && (
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Distribuição de Notas no Polo</Text>
          <View style={styles.grafico}>
            <Image src={graficos.distribuicao} style={styles.graficoImagemPequeno} />
          </View>
        </View>
      )}

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

      {graficos.radar.length > 0 && (
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Competências por Área</Text>
          <View style={styles.grafico}>
            <Image src={graficos.radar} style={styles.graficoImagemPequeno} />
          </View>
        </View>
      )}

      <Rodape />
    </Page>

    {/* Páginas 4-6: Dados gerais + segmentos (apenas se não houver filtro de série) */}
    {!dados.serie_filtro && (dados.anos_iniciais || dados.anos_finais) && (
      <PaginaDadosGerais
        nomeEntidade={dados.polo.nome}
        anoLetivo={dados.ano_letivo}
        estatisticas={dados.estatisticas}
        anosIniciais={dados.anos_iniciais}
        anosFinais={dados.anos_finais}
      />
    )}

    {!dados.serie_filtro && dados.anos_iniciais && (
      <PaginaAnosIniciais
        nomeEntidade={dados.polo.nome}
        anoLetivo={dados.ano_letivo}
        segmento={dados.anos_iniciais}
      />
    )}

    {!dados.serie_filtro && dados.anos_finais && (
      <PaginaAnosFinais
        nomeEntidade={dados.polo.nome}
        anoLetivo={dados.ano_letivo}
        segmento={dados.anos_finais}
      />
    )}
  </Document>
)
