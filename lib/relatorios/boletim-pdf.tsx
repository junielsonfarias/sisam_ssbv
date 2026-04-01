/**
 * Componente React-PDF para Boletim Individual do Aluno
 * Usado por: GET /api/boletim/pdf
 */

import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

// TIPOS
export interface NotaBimestre {
  nota_final: number | null
  nota_recuperacao: number | null
  faltas: number
}

export interface DisciplinaBoletim {
  nome: string
  abreviacao: string
  notas: Record<number, NotaBimestre>
  media_final: number | null
}

export interface FrequenciaBimestre {
  bimestre: number
  aulas_dadas: number
  faltas: number
  percentual: number | null
}

export interface DadosBoletimPDF {
  aluno: {
    nome: string
    codigo: string
    serie: string
    turma_nome: string
    turma_codigo: string
    escola_nome: string
    ano_letivo: string
    situacao: string
    pcd: boolean
    data_nascimento: string | null
  }
  disciplinas: DisciplinaBoletim[]
  periodos: Array<{ numero: number; nome: string }>
  frequencia: FrequenciaBimestre[]
  frequencia_geral: number | null
  total_faltas: number
  data_geracao: string
}

// ESTILOS
const s = StyleSheet.create({
  page: { padding: 30, paddingBottom: 55, fontSize: 9, fontFamily: 'Helvetica' },
  header: { marginBottom: 10, borderBottomWidth: 2, borderBottomColor: '#3B82F6', paddingBottom: 8 },
  semed: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1F2937', textAlign: 'center', marginBottom: 1 },
  sub: { fontSize: 8, color: '#6B7280', textAlign: 'center', marginBottom: 4 },
  titulo: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#3B82F6', textAlign: 'center', marginTop: 4, marginBottom: 2 },
  card: { marginBottom: 10, padding: 10, backgroundColor: '#F9FAFB', borderRadius: 4, borderWidth: 1, borderColor: '#E5E7EB' },
  row: { flexDirection: 'row', marginBottom: 3 },
  label: { fontSize: 8, color: '#6B7280', width: '18%' },
  valor: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1F2937', width: '32%' },
  secTit: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#3B82F6', marginBottom: 6, marginTop: 8, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingBottom: 3 },
  tabela: { width: '100%', marginTop: 4 },
  tHead: { flexDirection: 'row', backgroundColor: '#3B82F6', paddingVertical: 6, paddingHorizontal: 4 },
  tHeadCell: { color: '#FFFFFF', fontFamily: 'Helvetica-Bold', fontSize: 8, textAlign: 'center' },
  tRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingVertical: 5, paddingHorizontal: 4 },
  tRowAlt: { backgroundColor: '#F9FAFB' },
  tCell: { fontSize: 8, textAlign: 'center' },
  tCellNome: { fontSize: 8, textAlign: 'left' },
  verde: { color: '#16A34A' },
  amarela: { color: '#D97706' },
  vermelha: { color: '#DC2626' },
  freq: { marginTop: 10, padding: 8, backgroundColor: '#F9FAFB', borderRadius: 4, borderWidth: 1, borderColor: '#E5E7EB' },
  fRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  fLabel: { fontSize: 8, color: '#6B7280' },
  fValor: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1F2937' },
  sitBox: { marginTop: 10, padding: 8, borderRadius: 4, borderWidth: 1, flexDirection: 'row', justifyContent: 'center' },
  sitTxt: { fontSize: 11, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  rodape: { position: 'absolute', bottom: 20, left: 30, right: 30, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: '#9CA3AF', borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 6 },
})

// HELPERS
function corNota(nota: number | null) {
  if (nota === null) return {}
  if (nota >= 6) return s.verde
  if (nota >= 4) return s.amarela
  return s.vermelha
}

function fmtNota(nota: number | null): string {
  return nota === null ? '-' : nota.toFixed(1)
}

function fmtData(data: string | null): string {
  if (!data) return '-'
  try { return new Date(data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) }
  catch { return data }
}

function corSituacao(sit: string) {
  switch (sit.toLowerCase()) {
    case 'aprovado': return { bg: '#DCFCE7', brd: '#16A34A', cor: '#16A34A' }
    case 'reprovado': return { bg: '#FEE2E2', brd: '#DC2626', cor: '#DC2626' }
    case 'transferido': return { bg: '#FEF3C7', brd: '#D97706', cor: '#D97706' }
    default: return { bg: '#EFF6FF', brd: '#3B82F6', cor: '#3B82F6' }
  }
}

function calcMedia(notas: Record<number, NotaBimestre>): number | null {
  const vals = Object.values(notas)
    .map(n => n.nota_recuperacao !== null && n.nota_recuperacao > (n.nota_final ?? 0) ? n.nota_recuperacao : n.nota_final)
    .filter((v): v is number => v !== null)
  return vals.length === 0 ? null : vals.reduce((a, v) => a + v, 0) / vals.length
}

/** Nota efetiva de um bimestre (considera recuperação) */
function notaEfetiva(bim: NotaBimestre | undefined): number | null {
  if (!bim) return null
  return bim.nota_recuperacao !== null && bim.nota_recuperacao > (bim.nota_final ?? 0)
    ? bim.nota_recuperacao : bim.nota_final
}

// COMPONENTES
function Cabecalho({ dados }: { dados: DadosBoletimPDF }) {
  return (
    <View style={s.header}>
      <Text style={s.semed}>Secretaria Municipal de Educação</Text>
      <Text style={s.sub}>São Sebastião da Boa Vista - PA</Text>
      <Text style={s.titulo}>Boletim Escolar</Text>
      <Text style={[s.sub, { marginTop: 2 }]}>Ano Letivo {dados.aluno.ano_letivo}</Text>
    </View>
  )
}

function InfoAluno({ dados }: { dados: DadosBoletimPDF }) {
  const { aluno } = dados
  return (
    <View style={s.card}>
      <View style={s.row}>
        <Text style={s.label}>Nome:</Text>
        <Text style={[s.valor, { width: '82%' }]}>{aluno.nome}</Text>
      </View>
      <View style={s.row}>
        <Text style={s.label}>Código:</Text>
        <Text style={s.valor}>{aluno.codigo}</Text>
        <Text style={s.label}>Nascimento:</Text>
        <Text style={s.valor}>{fmtData(aluno.data_nascimento)}</Text>
      </View>
      <View style={s.row}>
        <Text style={s.label}>Escola:</Text>
        <Text style={[s.valor, { width: '82%' }]}>{aluno.escola_nome}</Text>
      </View>
      <View style={s.row}>
        <Text style={s.label}>Turma:</Text>
        <Text style={s.valor}>{aluno.turma_nome} ({aluno.turma_codigo})</Text>
        <Text style={s.label}>Série:</Text>
        <Text style={s.valor}>{aluno.serie}</Text>
      </View>
      {aluno.pcd && (
        <View style={s.row}>
          <Text style={[s.label, { color: '#3B82F6' }]}>PcD:</Text>
          <Text style={[s.valor, { color: '#3B82F6' }]}>Sim</Text>
        </View>
      )}
    </View>
  )
}

function TabelaNotas({ dados }: { dados: DadosBoletimPDF }) {
  const { disciplinas, periodos } = dados
  const colDisc = '28%'
  const colW = `${Math.floor(72 / (periodos.length + 1))}%`

  return (
    <View>
      <Text style={s.secTit}>Notas por Disciplina</Text>
      <View style={s.tabela}>
        <View style={s.tHead}>
          <Text style={[s.tHeadCell, { width: colDisc, textAlign: 'left' }]}>Disciplina</Text>
          {periodos.map(p => (
            <Text key={p.numero} style={[s.tHeadCell, { width: colW }]}>
              {p.nome.length > 10 ? `${p.numero}° Bim` : p.nome}
            </Text>
          ))}
          <Text style={[s.tHeadCell, { width: colW }]}>Média</Text>
        </View>
        {disciplinas.map((disc, i) => {
          const media = disc.media_final ?? calcMedia(disc.notas)
          return (
            <View key={disc.abreviacao} style={[s.tRow, i % 2 === 1 ? s.tRowAlt : {}]}>
              <Text style={[s.tCellNome, { width: colDisc }]}>{disc.nome}</Text>
              {periodos.map(p => {
                const nota = notaEfetiva(disc.notas[p.numero])
                const temRec = disc.notas[p.numero]?.nota_recuperacao != null
                return (
                  <Text key={p.numero} style={[s.tCell, { width: colW }, corNota(nota)]}>
                    {fmtNota(nota)}{temRec ? '*' : ''}
                  </Text>
                )
              })}
              <Text style={[s.tCell, { width: colW, fontFamily: 'Helvetica-Bold' }, corNota(media)]}>
                {fmtNota(media)}
              </Text>
            </View>
          )
        })}
      </View>
      <Text style={{ fontSize: 7, color: '#9CA3AF', marginTop: 3 }}>
        * Nota de recuperação (maior nota considerada)
      </Text>
    </View>
  )
}

function Frequencia({ dados }: { dados: DadosBoletimPDF }) {
  const { frequencia, frequencia_geral, total_faltas } = dados
  return (
    <View style={s.freq}>
      <Text style={[s.secTit, { marginTop: 0 }]}>Frequência</Text>
      {frequencia.length > 0 ? (
        <>
          {frequencia.map(f => (
            <View key={f.bimestre} style={s.fRow}>
              <Text style={s.fLabel}>{f.bimestre}° Bimestre:</Text>
              <Text style={s.fValor}>
                {f.percentual !== null ? `${f.percentual.toFixed(1)}%` : '-'}
                {f.aulas_dadas > 0 ? ` (${f.faltas} falta${f.faltas !== 1 ? 's' : ''} em ${f.aulas_dadas} aulas)` : ''}
              </Text>
            </View>
          ))}
          <View style={[s.fRow, { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 4, marginTop: 2 }]}>
            <Text style={[s.fLabel, { fontFamily: 'Helvetica-Bold' }]}>Frequência Geral:</Text>
            <Text style={s.fValor}>
              {frequencia_geral !== null ? `${frequencia_geral.toFixed(1)}%` : '-'} | Total de faltas: {total_faltas}
            </Text>
          </View>
        </>
      ) : (
        <Text style={s.fLabel}>Sem dados de frequência registrados</Text>
      )}
    </View>
  )
}

function Situacao({ situacao }: { situacao: string }) {
  const c = corSituacao(situacao)
  const txt = situacao.charAt(0).toUpperCase() + situacao.slice(1).toLowerCase()
  return (
    <View style={[s.sitBox, { backgroundColor: c.bg, borderColor: c.brd }]}>
      <Text style={[s.sitTxt, { color: c.cor }]}>Situação: {txt}</Text>
    </View>
  )
}

// DOCUMENTO PRINCIPAL
export function BoletimPDF({ dados }: { dados: DadosBoletimPDF }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Cabecalho dados={dados} />
        <InfoAluno dados={dados} />
        <TabelaNotas dados={dados} />
        <Frequencia dados={dados} />
        <Situacao situacao={dados.aluno.situacao} />
        <View style={s.rodape} fixed>
          <Text>SEMED - São Sebastião da Boa Vista</Text>
          <Text>Gerado em {dados.data_geracao}</Text>
          <Text>SISAM - Sistema de Acompanhamento Escolar</Text>
        </View>
      </Page>
    </Document>
  )
}
