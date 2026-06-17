export interface Dispositivo {
  id: string
  nome: string
  escola_id: string
  escola_nome: string
  localizacao: string | null
  status: 'ativo' | 'inativo' | 'bloqueado'
  api_key?: string
  ultimo_ping: string | null
  criado_em: string
}

export interface Escola {
  id: string
  nome: string
}

export interface Estatisticas {
  total_hoje: number
  scans_por_hora: { hora: number; total: number }[]
  ultimos_7_dias: { data: string; total: number }[]
  taxa_sucesso: number
  total_erros_semana: number
  logs_recentes: { evento: string; detalhes: string; criado_em: string }[]
}

export interface QrCodeData {
  qr_data: string
  dispositivo: { id: string; nome: string; escola_nome: string }
  aviso: string
}

export interface ResumoFrequencia {
  presenca: { total_presentes: number }
}

export interface FormData {
  nome: string
  escola_id: string
  localizacao: string
  status: 'ativo' | 'inativo' | 'bloqueado'
}

// ==================== Helper Functions ====================

export function isOnline(ultimoPing: string | null): boolean {
  if (!ultimoPing) return false
  const agora = new Date()
  const ping = new Date(ultimoPing)
  const diffMs = agora.getTime() - ping.getTime()
  return diffMs < 5 * 60 * 1000
}

export function tempoRelativo(data: string | null): string {
  if (!data) return 'Nunca'
  const agora = new Date()
  const alvo = new Date(data)
  const diffMs = agora.getTime() - alvo.getTime()

  if (diffMs < 0) return 'agora'

  const segundos = Math.floor(diffMs / 1000)
  const minutos = Math.floor(segundos / 60)
  const horas = Math.floor(minutos / 60)
  const dias = Math.floor(horas / 24)

  if (segundos < 60) return 'agora'
  if (minutos < 60) return `ha ${minutos} min`
  if (horas < 24) return `ha ${horas}h`
  if (dias === 1) return 'ha 1 dia'
  return `ha ${dias} dias`
}

export function formatarData(dataISO: string | null): string {
  if (!dataISO) return 'Nunca'
  const data = new Date(dataISO)
  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function isOfflineLongo(ultimoPing: string | null): boolean {
  if (!ultimoPing) return true
  const agora = new Date()
  const ping = new Date(ultimoPing)
  const diffMs = agora.getTime() - ping.getTime()
  return diffMs > 60 * 60 * 1000
}

export function getStatusBadge(status: string): string {
  const badges: Record<string, string> = {
    ativo: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
    inativo: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200',
    bloqueado: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
  }
  return badges[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    ativo: 'Ativo',
    inativo: 'Inativo',
    bloqueado: 'Bloqueado',
  }
  return labels[status] || status
}
