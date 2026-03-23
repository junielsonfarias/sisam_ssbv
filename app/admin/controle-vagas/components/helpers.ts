export const getCorOcupacao = (pct: number) => {
  if (pct >= 100) return 'bg-red-500'
  if (pct >= 85) return 'bg-orange-500'
  if (pct >= 60) return 'bg-yellow-500'
  return 'bg-emerald-500'
}

export const getCorTextoOcupacao = (pct: number) => {
  if (pct >= 100) return 'text-red-600 dark:text-red-400'
  if (pct >= 85) return 'text-orange-600 dark:text-orange-400'
  return 'text-emerald-600 dark:text-emerald-400'
}

export const formatarDiasEspera = (dias: number) => {
  if (dias === 0) return 'Hoje'
  if (dias === 1) return '1 dia'
  if (dias < 30) return `${Math.floor(dias)} dias`
  if (dias < 60) return '1 mês'
  return `${Math.floor(dias / 30)} meses`
}
