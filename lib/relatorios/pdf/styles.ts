/**
 * Estilos do StyleSheet do @react-pdf/renderer.
 * Compartilhados por todos os componentes/páginas/relatórios.
 */
import { StyleSheet } from '@react-pdf/renderer'

export const styles = StyleSheet.create({
  page: {
    padding: 30,
    paddingBottom: 50,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
    paddingBottom: 8,
  },
  headerLeft: { flex: 1 },
  titulo: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#1F2937',
  },
  subtitulo: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 3,
  },
  dataGeracao: {
    fontSize: 8,
    color: '#6B7280',
  },
  secao: {
    marginTop: 10,
    marginBottom: 8,
  },
  secaoTitulo: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#3B82F6',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 4,
  },
  card: {
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 4,
    marginBottom: 8,
  },
  estatisticaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  estatisticaItem: {
    width: '23%',
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  estatisticaValor: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#3B82F6',
  },
  estatisticaLabel: {
    fontSize: 7,
    color: '#6B7280',
    marginTop: 2,
  },
  tabela: {
    width: '100%',
    marginTop: 10,
  },
  tabelaHeader: {
    flexDirection: 'row',
    backgroundColor: '#3B82F6',
    padding: 8,
  },
  tabelaHeaderCell: {
    color: '#FFFFFF',
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
  },
  tabelaRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    padding: 6,
  },
  tabelaRowAlternate: {
    backgroundColor: '#F9FAFB',
  },
  tabelaCell: {
    fontSize: 9,
  },
  grafico: {
    marginVertical: 8,
    alignItems: 'center',
  },
  graficoImagem: {
    width: 500,
    height: 260,
  },
  graficoImagemPequeno: {
    width: 420,
    height: 230,
  },
  rodape: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#9CA3AF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
  },
  listaItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  listaBullet: {
    width: 15,
    color: '#3B82F6',
  },
  listaTexto: {
    flex: 1,
    fontSize: 9,
  },
  badge: {
    backgroundColor: '#10B981',
    color: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
    fontSize: 8,
  },
  badgeAlerta: {
    backgroundColor: '#EF4444',
  },
  badgeAtencao: {
    backgroundColor: '#F59E0B',
  },
  flex1: { flex: 1 },
  flex2: { flex: 2 },
  textCenter: { textAlign: 'center' },
  textRight: { textAlign: 'right' },
  mb10: { marginBottom: 10 },
  mt10: { marginTop: 10 },
  fontBold: { fontFamily: 'Helvetica-Bold' },
})
