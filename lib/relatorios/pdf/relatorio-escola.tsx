/**
 * Relatório completo de uma escola (3-6 páginas dependendo de filtros).
 */
import React from 'react'
import { Document, Image, Page, Text, View } from '@react-pdf/renderer'
import { DadosRelatorioEscola, GraficosBuffer } from '../tipos'
import { Estatistica, Rodape } from './atomos'
import { PaginaAnosFinais, PaginaAnosIniciais, PaginaDadosGerais } from './paginas'
import {
  ComparativoPoloSection, NiveisAprendizagemSection, ProducaoTextualSection, TabelaTurmas,
} from './secoes'
import { styles } from './styles'

export const RelatorioEscolaPDF = ({ dados, graficos }: {
  dados: DadosRelatorioEscola
  graficos: GraficosBuffer
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

      <View style={styles.secao}>
        <Text style={styles.secaoTitulo}>Visão Geral {dados.serie_filtro ? `- ${dados.serie_filtro}` : ''}</Text>
        <View style={styles.estatisticaContainer}>
          <Estatistica valor={dados.estatisticas.total_alunos} label="Total de Alunos" />
          <Estatistica valor={dados.estatisticas.total_turmas} label="Total de Turmas" />
          <Estatistica valor={dados.estatisticas.media_geral.toFixed(1)} label="Média Geral" />
          <Estatistica valor={`${dados.estatisticas.taxa_participacao}%`} label="Participação" />
        </View>
      </View>

      {dados.comparativo_polo && <ComparativoPoloSection comparativo={dados.comparativo_polo} />}

      {graficos.disciplinas.length > 0 && (
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Desempenho por Disciplina</Text>
          <View style={styles.grafico}>
            <Image src={graficos.disciplinas} style={styles.graficoImagem} />
          </View>
        </View>
      )}

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

      <Rodape />
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

      {dados.producao_textual && <ProducaoTextualSection producao={dados.producao_textual} />}

      {dados.distribuicao_niveis && dados.distribuicao_niveis.length > 0 && (
        <NiveisAprendizagemSection niveis={dados.distribuicao_niveis} />
      )}

      {graficos.distribuicao.length > 0 && (
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Distribuição de Notas</Text>
          <View style={styles.grafico}>
            <Image src={graficos.distribuicao} style={styles.graficoImagemPequeno} />
          </View>
        </View>
      )}

      <Rodape />
    </Page>

    {/* Página 3: Análise de Questões */}
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Análise de Questões e Competências</Text>
      </View>

      {graficos.questoes.length > 0 && (
        <View style={styles.grafico}>
          <Image src={graficos.questoes} style={styles.graficoImagem} />
        </View>
      )}

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
                questao.percentual_acerto < 30 ? styles.badgeAlerta : styles.badgeAtencao,
              ]}>
                <Text>{questao.percentual_acerto.toFixed(0)}% acertos</Text>
              </View>
            </View>
          ))}
        {dados.analise_questoes.filter(q => q.percentual_acerto < 50).length === 0 && (
          <View style={styles.card}>
            <Text>Todas as questões apresentam índice de acerto acima de 50%.</Text>
          </View>
        )}
      </View>

      {graficos.radar.length > 0 && (
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Competências por Área</Text>
          <View style={styles.grafico}>
            <Image src={graficos.radar} style={styles.graficoImagemPequeno} />
          </View>
        </View>
      )}

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

      <Rodape />
    </Page>

    {/* Páginas 4-6: Dados gerais + segmentos (apenas se não houver filtro de série) */}
    {!dados.serie_filtro && (dados.anos_iniciais || dados.anos_finais) && (
      <PaginaDadosGerais
        nomeEntidade={dados.escola.nome}
        anoLetivo={dados.ano_letivo}
        estatisticas={dados.estatisticas}
        anosIniciais={dados.anos_iniciais}
        anosFinais={dados.anos_finais}
      />
    )}

    {!dados.serie_filtro && dados.anos_iniciais && (
      <PaginaAnosIniciais
        nomeEntidade={dados.escola.nome}
        anoLetivo={dados.ano_letivo}
        segmento={dados.anos_iniciais}
      />
    )}

    {!dados.serie_filtro && dados.anos_finais && (
      <PaginaAnosFinais
        nomeEntidade={dados.escola.nome}
        anoLetivo={dados.ano_letivo}
        segmento={dados.anos_finais}
      />
    )}
  </Document>
)
