/**
 * Páginas reutilizadas tanto pelo relatório de Escola quanto pelo de Polo:
 * - PaginaDadosGerais: visão consolidada com comparativo entre segmentos
 * - PaginaAnosIniciais: 2º, 3º, 5º Ano + produção textual
 * - PaginaAnosFinais: 6º-9º Ano com CH e CN
 */
import React from 'react'
import { Page, Text, View } from '@react-pdf/renderer'
import { DadosSegmento } from '../tipos'
import { Estatistica, Rodape } from './atomos'
import { NiveisAprendizagemSection, SegmentoSection } from './secoes'
import { styles } from './styles'

export const PaginaDadosGerais = ({
  nomeEntidade, anoLetivo, estatisticas, anosIniciais, anosFinais,
}: {
  nomeEntidade: string
  anoLetivo: string
  estatisticas: { total_alunos: number; total_turmas: number; media_geral: number; taxa_participacao: number }
  anosIniciais?: DadosSegmento
  anosFinais?: DadosSegmento
}) => (
  <Page size="A4" style={styles.page}>
    <View style={styles.header}>
      <Text style={styles.titulo}>Dados Gerais</Text>
      <Text style={styles.subtitulo}>{nomeEntidade} - {anoLetivo}</Text>
    </View>

    <View style={styles.secao}>
      <Text style={styles.secaoTitulo}>Resumo Consolidado</Text>
      <View style={styles.estatisticaContainer}>
        <Estatistica valor={estatisticas.total_alunos} label="Total de Alunos" />
        <Estatistica valor={estatisticas.total_turmas} label="Total de Turmas" />
        <Estatistica valor={estatisticas.media_geral.toFixed(1)} label="Média Geral" />
        <Estatistica valor={`${estatisticas.taxa_participacao}%`} label="Participação" />
      </View>
    </View>

    {(anosIniciais || anosFinais) && (
      <View style={styles.secao}>
        <Text style={styles.secaoTitulo}>Comparativo entre Segmentos</Text>
        <View style={styles.tabela}>
          <View style={styles.tabelaHeader}>
            <Text style={[styles.tabelaHeaderCell, styles.flex2]}>Segmento</Text>
            <Text style={[styles.tabelaHeaderCell, styles.flex1, styles.textCenter]}>Alunos</Text>
            <Text style={[styles.tabelaHeaderCell, styles.flex1, styles.textCenter]}>Turmas</Text>
            <Text style={[styles.tabelaHeaderCell, styles.flex1, styles.textCenter]}>Média LP</Text>
            <Text style={[styles.tabelaHeaderCell, styles.flex1, styles.textCenter]}>Média MAT</Text>
            <Text style={[styles.tabelaHeaderCell, styles.flex1, styles.textCenter]}>Média Geral</Text>
          </View>
          {anosIniciais && (
            <View style={styles.tabelaRow}>
              <Text style={[styles.tabelaCell, styles.flex2, styles.fontBold]}>Anos Iniciais</Text>
              <Text style={[styles.tabelaCell, styles.flex1, styles.textCenter]}>{anosIniciais.estatisticas.total_alunos}</Text>
              <Text style={[styles.tabelaCell, styles.flex1, styles.textCenter]}>{anosIniciais.estatisticas.total_turmas}</Text>
              <Text style={[styles.tabelaCell, styles.flex1, styles.textCenter]}>
                {anosIniciais.desempenho_disciplinas.find(d => d.disciplina === 'LP')?.media.toFixed(1) || '-'}
              </Text>
              <Text style={[styles.tabelaCell, styles.flex1, styles.textCenter]}>
                {anosIniciais.desempenho_disciplinas.find(d => d.disciplina === 'MAT')?.media.toFixed(1) || '-'}
              </Text>
              <Text style={[styles.tabelaCell, styles.flex1, styles.textCenter, styles.fontBold]}>
                {anosIniciais.estatisticas.media_geral.toFixed(1)}
              </Text>
            </View>
          )}
          {anosFinais && (
            <View style={[styles.tabelaRow, styles.tabelaRowAlternate]}>
              <Text style={[styles.tabelaCell, styles.flex2, styles.fontBold]}>Anos Finais</Text>
              <Text style={[styles.tabelaCell, styles.flex1, styles.textCenter]}>{anosFinais.estatisticas.total_alunos}</Text>
              <Text style={[styles.tabelaCell, styles.flex1, styles.textCenter]}>{anosFinais.estatisticas.total_turmas}</Text>
              <Text style={[styles.tabelaCell, styles.flex1, styles.textCenter]}>
                {anosFinais.desempenho_disciplinas.find(d => d.disciplina === 'LP')?.media.toFixed(1) || '-'}
              </Text>
              <Text style={[styles.tabelaCell, styles.flex1, styles.textCenter]}>
                {anosFinais.desempenho_disciplinas.find(d => d.disciplina === 'MAT')?.media.toFixed(1) || '-'}
              </Text>
              <Text style={[styles.tabelaCell, styles.flex1, styles.textCenter, styles.fontBold]}>
                {anosFinais.estatisticas.media_geral.toFixed(1)}
              </Text>
            </View>
          )}
        </View>
      </View>
    )}

    {anosIniciais && <SegmentoSection segmento={anosIniciais} titulo="Anos Iniciais (2º, 3º, 5º Ano)" />}
    {anosFinais && <SegmentoSection segmento={anosFinais} titulo="Anos Finais (6º, 7º, 8º, 9º Ano)" />}

    <Rodape />
  </Page>
)

export const PaginaAnosIniciais = ({ nomeEntidade, anoLetivo, segmento }: {
  nomeEntidade: string
  anoLetivo: string
  segmento: DadosSegmento
}) => (
  <Page size="A4" style={styles.page}>
    <View style={styles.header}>
      <Text style={styles.titulo}>Anos Iniciais</Text>
      <Text style={styles.subtitulo}>{nomeEntidade} - {anoLetivo}</Text>
      <Text style={{ fontSize: 9, color: '#6B7280', marginTop: 2 }}>Séries: 2º Ano, 3º Ano, 5º Ano</Text>
    </View>

    <View style={styles.secao}>
      <Text style={styles.secaoTitulo}>Visão Geral - Anos Iniciais</Text>
      <View style={styles.estatisticaContainer}>
        <Estatistica valor={segmento.estatisticas.total_alunos} label="Total de Alunos" />
        <Estatistica valor={segmento.estatisticas.total_turmas} label="Total de Turmas" />
        <Estatistica valor={segmento.estatisticas.media_geral.toFixed(1)} label="Média Geral" />
        <Estatistica valor={`${segmento.estatisticas.taxa_participacao}%`} label="Participação" />
      </View>
    </View>

    <View style={styles.secao}>
      <Text style={styles.secaoTitulo}>Desempenho por Disciplina</Text>
      <View style={[styles.estatisticaContainer, { gap: 8 }]}>
        {segmento.desempenho_disciplinas.map((d) => (
          <View key={d.disciplina} style={[styles.estatisticaItem, { width: '30%' }]}>
            <Text style={styles.estatisticaValor}>{d.media.toFixed(1)}</Text>
            <Text style={styles.estatisticaLabel}>{d.disciplina_nome}</Text>
          </View>
        ))}
      </View>
    </View>

    {segmento.producao_textual && (
      <View style={styles.secao}>
        <Text style={styles.secaoTitulo}>Produção Textual</Text>
        <View style={[styles.card, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <View>
            <Text style={[styles.fontBold, { fontSize: 12 }]}>Média de Produção Textual</Text>
            <Text style={{ fontSize: 8, color: '#6B7280' }}>Avaliação de escrita</Text>
          </View>
          <Text style={[styles.estatisticaValor, { fontSize: 24 }]}>{segmento.producao_textual.media_geral.toFixed(1)}</Text>
        </View>
      </View>
    )}

    {segmento.distribuicao_niveis && segmento.distribuicao_niveis.length > 0 && (
      <NiveisAprendizagemSection niveis={segmento.distribuicao_niveis} />
    )}

    {segmento.turmas.length > 0 && (
      <View style={styles.secao}>
        <Text style={styles.secaoTitulo}>Detalhamento por Turma</Text>
        <View style={styles.tabela}>
          <View style={styles.tabelaHeader}>
            <Text style={[styles.tabelaHeaderCell, styles.flex2]}>Turma</Text>
            <Text style={[styles.tabelaHeaderCell, styles.flex1, styles.textCenter]}>Série</Text>
            <Text style={[styles.tabelaHeaderCell, styles.flex1, styles.textCenter]}>Alunos</Text>
            <Text style={[styles.tabelaHeaderCell, styles.flex1, styles.textCenter]}>LP</Text>
            <Text style={[styles.tabelaHeaderCell, styles.flex1, styles.textCenter]}>MAT</Text>
            <Text style={[styles.tabelaHeaderCell, styles.flex1, styles.textCenter]}>Média</Text>
          </View>
          {segmento.turmas.slice(0, 12).map((turma, index) => (
            <View key={turma.id} style={[styles.tabelaRow, index % 2 === 1 ? styles.tabelaRowAlternate : {}]}>
              <Text style={[styles.tabelaCell, styles.flex2]}>{turma.codigo || turma.nome}</Text>
              <Text style={[styles.tabelaCell, styles.flex1, styles.textCenter]}>{turma.serie}</Text>
              <Text style={[styles.tabelaCell, styles.flex1, styles.textCenter]}>{turma.total_alunos}</Text>
              <Text style={[styles.tabelaCell, styles.flex1, styles.textCenter]}>{turma.medias_disciplinas.LP?.toFixed(1) || '-'}</Text>
              <Text style={[styles.tabelaCell, styles.flex1, styles.textCenter]}>{turma.medias_disciplinas.MAT?.toFixed(1) || '-'}</Text>
              <Text style={[styles.tabelaCell, styles.flex1, styles.textCenter, styles.fontBold]}>{turma.media_geral?.toFixed(1) || '-'}</Text>
            </View>
          ))}
        </View>
      </View>
    )}

    <Rodape />
  </Page>
)

export const PaginaAnosFinais = ({ nomeEntidade, anoLetivo, segmento }: {
  nomeEntidade: string
  anoLetivo: string
  segmento: DadosSegmento
}) => (
  <Page size="A4" style={styles.page}>
    <View style={styles.header}>
      <Text style={styles.titulo}>Anos Finais</Text>
      <Text style={styles.subtitulo}>{nomeEntidade} - {anoLetivo}</Text>
      <Text style={{ fontSize: 9, color: '#6B7280', marginTop: 2 }}>Séries: 6º Ano, 7º Ano, 8º Ano, 9º Ano</Text>
    </View>

    <View style={styles.secao}>
      <Text style={styles.secaoTitulo}>Visão Geral - Anos Finais</Text>
      <View style={styles.estatisticaContainer}>
        <Estatistica valor={segmento.estatisticas.total_alunos} label="Total de Alunos" />
        <Estatistica valor={segmento.estatisticas.total_turmas} label="Total de Turmas" />
        <Estatistica valor={segmento.estatisticas.media_geral.toFixed(1)} label="Média Geral" />
        <Estatistica valor={`${segmento.estatisticas.taxa_participacao}%`} label="Participação" />
      </View>
    </View>

    <View style={styles.secao}>
      <Text style={styles.secaoTitulo}>Desempenho por Disciplina</Text>
      <View style={[styles.estatisticaContainer, { gap: 6 }]}>
        {segmento.desempenho_disciplinas.map((d) => (
          <View key={d.disciplina} style={[styles.estatisticaItem, { width: '23%' }]}>
            <Text style={styles.estatisticaValor}>{d.media.toFixed(1)}</Text>
            <Text style={styles.estatisticaLabel}>{d.disciplina_nome}</Text>
          </View>
        ))}
      </View>
    </View>

    {segmento.distribuicao_niveis && segmento.distribuicao_niveis.length > 0 && (
      <NiveisAprendizagemSection niveis={segmento.distribuicao_niveis} />
    )}

    {segmento.turmas.length > 0 && (
      <View style={styles.secao}>
        <Text style={styles.secaoTitulo}>Detalhamento por Turma</Text>
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
          {segmento.turmas.slice(0, 10).map((turma, index) => (
            <View key={turma.id} style={[styles.tabelaRow, index % 2 === 1 ? styles.tabelaRowAlternate : {}]}>
              <Text style={[styles.tabelaCell, styles.flex2]}>{turma.codigo || turma.nome}</Text>
              <Text style={[styles.tabelaCell, styles.flex1, styles.textCenter]}>{turma.serie}</Text>
              <Text style={[styles.tabelaCell, styles.flex1, styles.textCenter]}>{turma.total_alunos}</Text>
              <Text style={[styles.tabelaCell, styles.flex1, styles.textCenter]}>{turma.medias_disciplinas.LP?.toFixed(1) || '-'}</Text>
              <Text style={[styles.tabelaCell, styles.flex1, styles.textCenter]}>{turma.medias_disciplinas.MAT?.toFixed(1) || '-'}</Text>
              <Text style={[styles.tabelaCell, styles.flex1, styles.textCenter]}>{turma.medias_disciplinas.CH?.toFixed(1) || '-'}</Text>
              <Text style={[styles.tabelaCell, styles.flex1, styles.textCenter]}>{turma.medias_disciplinas.CN?.toFixed(1) || '-'}</Text>
              <Text style={[styles.tabelaCell, styles.flex1, styles.textCenter, styles.fontBold]}>{turma.media_geral?.toFixed(1) || '-'}</Text>
            </View>
          ))}
        </View>
      </View>
    )}

    <Rodape />
  </Page>
)
