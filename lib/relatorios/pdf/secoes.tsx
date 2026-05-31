/**
 * Componentes de "seção" reutilizados por páginas e relatórios.
 */
import React from 'react'
import { Text, View } from '@react-pdf/renderer'
import {
  DadosSegmento, DistribuicaoNivel, EscolaComparativo, ProducaoTextual, TurmaRelatorio,
} from '../tipos'
import { styles } from './styles'

export const TabelaTurmas = ({ turmas }: { turmas: TurmaRelatorio[] }) => (
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
)

export const TabelaEscolas = ({ escolas }: { escolas: EscolaComparativo[] }) => (
  <View style={styles.tabela}>
    <View style={styles.tabelaHeader}>
      <Text style={[styles.tabelaHeaderCell, { width: 25 }]}>#</Text>
      <Text style={[styles.tabelaHeaderCell, styles.flex2]}>Escola</Text>
      <Text style={[styles.tabelaHeaderCell, styles.flex1, styles.textCenter]}>Alunos</Text>
      <Text style={[styles.tabelaHeaderCell, styles.flex1, styles.textCenter]}>Turmas</Text>
      <Text style={[styles.tabelaHeaderCell, styles.flex1, styles.textCenter]}>Média</Text>
    </View>
    {escolas.slice(0, 20).map((escola, index) => (
      <View key={escola.id} style={[styles.tabelaRow, index % 2 === 1 ? styles.tabelaRowAlternate : {}]}>
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
)

export const ProducaoTextualSection = ({ producao }: { producao: ProducaoTextual }) => (
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
        <View key={item.codigo} style={[styles.tabelaRow, index % 2 === 1 ? styles.tabelaRowAlternate : {}]}>
          <Text style={[styles.tabelaCell, styles.flex2]}>{item.nome}</Text>
          <Text style={[styles.tabelaCell, styles.flex1, styles.textCenter, styles.fontBold]}>{item.media.toFixed(1)}</Text>
        </View>
      ))}
    </View>
  </View>
)

export const NiveisAprendizagemSection = ({ niveis }: { niveis: DistribuicaoNivel[] }) => (
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
)

export const ComparativoPoloSection = ({ comparativo }: {
  comparativo: {
    media_polo: number
    media_escola: number
    diferenca: number
    posicao_ranking?: number
    total_escolas_polo?: number
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
          { color: comparativo.diferenca >= 0 ? '#10B981' : '#EF4444' },
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
)

export const SegmentoSection = ({ segmento, titulo }: { segmento: DadosSegmento; titulo: string }) => (
  <View style={styles.secao}>
    <Text style={styles.secaoTitulo}>{titulo}</Text>
    <View style={styles.card}>
      <View style={[styles.estatisticaContainer, { marginBottom: 8 }]}>
        <View style={[styles.estatisticaItem, { width: '24%' }]}>
          <Text style={styles.estatisticaValor}>{segmento.estatisticas.total_alunos}</Text>
          <Text style={styles.estatisticaLabel}>Alunos</Text>
        </View>
        <View style={[styles.estatisticaItem, { width: '24%' }]}>
          <Text style={styles.estatisticaValor}>{segmento.estatisticas.total_turmas}</Text>
          <Text style={styles.estatisticaLabel}>Turmas</Text>
        </View>
        <View style={[styles.estatisticaItem, { width: '24%' }]}>
          <Text style={[styles.estatisticaValor, { color: '#10B981' }]}>{segmento.estatisticas.media_geral.toFixed(1)}</Text>
          <Text style={styles.estatisticaLabel}>Média</Text>
        </View>
        <View style={[styles.estatisticaItem, { width: '24%' }]}>
          <Text style={styles.estatisticaValor}>{segmento.estatisticas.taxa_participacao}%</Text>
          <Text style={styles.estatisticaLabel}>Participação</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
        {segmento.desempenho_disciplinas.map((d) => (
          <View key={d.disciplina} style={{ backgroundColor: '#EEF2FF', padding: 6, borderRadius: 4, minWidth: 70 }}>
            <Text style={{ fontSize: 8, color: '#6B7280' }}>{d.disciplina}</Text>
            <Text style={[styles.fontBold, { fontSize: 11, color: '#3B82F6' }]}>{d.media.toFixed(1)}</Text>
          </View>
        ))}
      </View>
    </View>
  </View>
)
