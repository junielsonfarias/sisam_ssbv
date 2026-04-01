/**
 * Componente React-PDF para Relatório da Turma (Professor)
 * Usado por: GET /api/professor/relatorio
 */

import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

// TIPOS
export interface AlunoTurmaRelatorio {
  nome: string
  codigo: string
  notas: Record<string, number | null>
  total_faltas: number
  frequencia_percentual: number | null
}

export interface DadosRelatorioTurma {
  escola_nome: string
  turma_nome: string
  turma_codigo: string
  serie: string
  professor_nome: string
  ano_letivo: string
  bimestre: string
  disciplinas: Array<{ nome: string; abreviacao: string }>
  alunos: AlunoTurmaRelatorio[]
  data_geracao: string
}

// ESTILOS
const s = StyleSheet.create({
  page: { padding: 30, paddingBottom: 55, fontSize: 9, fontFamily: 'Helvetica' },
  header: { marginBottom: 12, borderBottomWidth: 2, borderBottomColor: '#3B82F6', paddingBottom: 8 },
  headerSemed: { fontSize: 8, color: '#6B7280', marginBottom: 2, textAlign: 'center' },
  titulo: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#1F2937', textAlign: 'center', marginBottom: 6 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  infoLabel: { fontSize: 8, color: '#6B7280' },
  infoValor: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1F2937' },
  tabela: { width: '100%', marginTop: 10 },
  tHead: { flexDirection: 'row', backgroundColor: '#3B82F6', paddingVertical: 6, paddingHorizontal: 4 },
  tHeadCell: { color: '#FFFFFF', fontFamily: 'Helvetica-Bold', fontSize: 7, textAlign: 'center' },
  tRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingVertical: 4, paddingHorizontal: 4 },
  tRowAlt: { backgroundColor: '#F9FAFB' },
  tCell: { fontSize: 8, textAlign: 'center' },
  tCellNome: { fontSize: 8, textAlign: 'left' },
  verde: { color: '#16A34A' },
  amarela: { color: '#D97706' },
  vermelha: { color: '#DC2626' },
  resumo: { marginTop: 12, padding: 10, backgroundColor: '#F9FAFB', borderRadius: 4, borderWidth: 1, borderColor: '#E5E7EB' },
  resumoTit: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#3B82F6', marginBottom: 6 },
  resumoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  resumoLabel: { fontSize: 8, color: '#6B7280' },
  resumoValor: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1F2937' },
  rodape: { position: 'absolute', bottom: 20, left: 30, right: 30, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: '#9CA3AF', borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 6 },
})

// HELPERS
function estiloNota(nota: number | null) {
  if (nota === null) return {}
  if (nota >= 6) return s.verde
  if (nota >= 4) return s.amarela
  return s.vermelha
}

function fmtNota(nota: number | null): string {
  return nota === null ? '-' : nota.toFixed(1)
}

function mediaDisciplina(alunos: AlunoTurmaRelatorio[], disc: string): number | null {
  const notas = alunos.map(a => a.notas[disc]).filter((n): n is number => n !== null)
  if (notas.length === 0) return null
  return notas.reduce((acc, n) => acc + n, 0) / notas.length
}

// COMPONENTES
function Cabecalho({ dados }: { dados: DadosRelatorioTurma }) {
  return (
    <View style={s.header}>
      <Text style={s.headerSemed}>SEMED - Secretaria Municipal de Educação de São Sebastião da Boa Vista</Text>
      <Text style={s.titulo}>Relatório da Turma - {dados.bimestre}</Text>
      <View style={s.infoRow}>
        <View>
          <Text style={s.infoLabel}>Escola</Text>
          <Text style={s.infoValor}>{dados.escola_nome}</Text>
        </View>
        <View>
          <Text style={s.infoLabel}>Turma</Text>
          <Text style={s.infoValor}>{dados.turma_nome} ({dados.turma_codigo})</Text>
        </View>
        <View>
          <Text style={s.infoLabel}>Série</Text>
          <Text style={s.infoValor}>{dados.serie}</Text>
        </View>
      </View>
      <View style={s.infoRow}>
        <View>
          <Text style={s.infoLabel}>Professor(a)</Text>
          <Text style={s.infoValor}>{dados.professor_nome}</Text>
        </View>
        <View>
          <Text style={s.infoLabel}>Ano Letivo</Text>
          <Text style={s.infoValor}>{dados.ano_letivo}</Text>
        </View>
        <View>
          <Text style={s.infoLabel}>Total de Alunos</Text>
          <Text style={s.infoValor}>{dados.alunos.length}</Text>
        </View>
      </View>
    </View>
  )
}

function TabelaNotas({ dados }: { dados: DadosRelatorioTurma }) {
  const { disciplinas, alunos } = dados
  const colNome = '30%'
  const colNum = '5%'
  const colW = `${Math.floor(65 / (disciplinas.length + 2))}%`

  return (
    <View style={s.tabela}>
      <View style={s.tHead}>
        <Text style={[s.tHeadCell, { width: colNum }]}>#</Text>
        <Text style={[s.tHeadCell, { width: colNome, textAlign: 'left' }]}>Aluno</Text>
        {disciplinas.map(d => (
          <Text key={d.abreviacao} style={[s.tHeadCell, { width: colW }]}>{d.abreviacao}</Text>
        ))}
        <Text style={[s.tHeadCell, { width: colW }]}>Faltas</Text>
        <Text style={[s.tHeadCell, { width: colW }]}>Freq%</Text>
      </View>
      {alunos.map((al, i) => (
        <View key={al.codigo || `al-${i}`} style={[s.tRow, i % 2 === 1 ? s.tRowAlt : {}]}>
          <Text style={[s.tCell, { width: colNum }]}>{i + 1}</Text>
          <Text style={[s.tCellNome, { width: colNome }]}>{al.nome}</Text>
          {disciplinas.map(d => (
            <Text key={d.abreviacao} style={[s.tCell, { width: colW }, estiloNota(al.notas[d.abreviacao])]}>
              {fmtNota(al.notas[d.abreviacao])}
            </Text>
          ))}
          <Text style={[s.tCell, { width: colW }]}>{al.total_faltas}</Text>
          <Text style={[s.tCell, { width: colW }]}>
            {al.frequencia_percentual !== null ? `${al.frequencia_percentual.toFixed(0)}%` : '-'}
          </Text>
        </View>
      ))}
      {/* Linha de médias */}
      <View style={[s.tRow, { backgroundColor: '#EFF6FF', borderTopWidth: 2, borderTopColor: '#3B82F6' }]}>
        <Text style={[s.tCell, { width: colNum }]}></Text>
        <Text style={[s.tCellNome, { width: colNome, fontFamily: 'Helvetica-Bold' }]}>Média da Turma</Text>
        {disciplinas.map(d => {
          const m = mediaDisciplina(alunos, d.abreviacao)
          return (
            <Text key={d.abreviacao} style={[s.tCell, { width: colW, fontFamily: 'Helvetica-Bold' }, estiloNota(m)]}>
              {fmtNota(m)}
            </Text>
          )
        })}
        <Text style={[s.tCell, { width: colW, fontFamily: 'Helvetica-Bold' }]}>
          {alunos.reduce((acc, a) => acc + a.total_faltas, 0)}
        </Text>
        <Text style={[s.tCell, { width: colW }]}></Text>
      </View>
    </View>
  )
}

function ResumoTurma({ dados }: { dados: DadosRelatorioTurma }) {
  const { alunos, disciplinas } = dados
  const total = alunos.length
  const mediasDisc = disciplinas.map(d => ({ nome: d.nome, media: mediaDisciplina(alunos, d.abreviacao) }))
  const freqs = alunos.map(a => a.frequencia_percentual).filter((f): f is number => f !== null)
  const freqMedia = freqs.length > 0 ? freqs.reduce((acc, f) => acc + f, 0) / freqs.length : null
  const comDificuldade = alunos.filter(a =>
    disciplinas.some(d => { const n = a.notas[d.abreviacao]; return n !== null && n < 6 })
  ).length

  return (
    <View style={s.resumo}>
      <Text style={s.resumoTit}>Resumo da Turma</Text>
      <View style={s.resumoRow}>
        <Text style={s.resumoLabel}>Total de alunos:</Text>
        <Text style={s.resumoValor}>{total}</Text>
      </View>
      {mediasDisc.map(m => (
        <View key={m.nome} style={s.resumoRow}>
          <Text style={s.resumoLabel}>Média em {m.nome}:</Text>
          <Text style={s.resumoValor}>{fmtNota(m.media)}</Text>
        </View>
      ))}
      <View style={s.resumoRow}>
        <Text style={s.resumoLabel}>Frequência média:</Text>
        <Text style={s.resumoValor}>{freqMedia !== null ? `${freqMedia.toFixed(1)}%` : 'Sem dados'}</Text>
      </View>
      <View style={s.resumoRow}>
        <Text style={s.resumoLabel}>Alunos com nota abaixo da média (6.0):</Text>
        <Text style={[s.resumoValor, comDificuldade > 0 ? s.vermelha : {}]}>
          {comDificuldade} ({total > 0 ? ((comDificuldade / total) * 100).toFixed(0) : 0}%)
        </Text>
      </View>
    </View>
  )
}

// DOCUMENTO PRINCIPAL
export function RelatorioTurmaPDF({ dados }: { dados: DadosRelatorioTurma }) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <Cabecalho dados={dados} />
        <TabelaNotas dados={dados} />
        <ResumoTurma dados={dados} />
        <View style={s.rodape} fixed>
          <Text>SEMED - São Sebastião da Boa Vista</Text>
          <Text>Gerado em {dados.data_geracao}</Text>
          <Text>SISAM - Sistema de Acompanhamento Escolar</Text>
        </View>
      </Page>
    </Document>
  )
}
