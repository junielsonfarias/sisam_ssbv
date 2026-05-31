/**
 * Componentes atômicos reutilizados em todas as páginas.
 */
import React from 'react'
import { Text, View } from '@react-pdf/renderer'
import { styles } from './styles'

export const Estatistica = ({ valor, label }: { valor: string | number; label: string }) => (
  <View style={styles.estatisticaItem}>
    <Text style={styles.estatisticaValor}>{valor}</Text>
    <Text style={styles.estatisticaLabel}>{label}</Text>
  </View>
)

export const Rodape = () => (
  <View style={styles.rodape}>
    <Text>SISAM - Sistema de Avaliação Municipal</Text>
    <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} fixed />
  </View>
)
