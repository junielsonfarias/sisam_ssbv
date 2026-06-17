import { CheckCircle, XCircle } from 'lucide-react'

// Badge de metodo
export function getMetodoBadge(m: string) {
  const config: Record<string, { label: string; classes: string }> = {
    facial: { label: 'Facial', classes: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
    manual: { label: 'Manual', classes: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
    qrcode: { label: 'QR Code', classes: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' }
  }
  const c = config[m] || { label: m, classes: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.classes}`}>
      {c.label}
    </span>
  )
}

// Badge de status
export function getStatusBadge(status: string) {
  if (status === 'ausente') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
        <XCircle className="w-3 h-3" /> Ausente
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
      <CheckCircle className="w-3 h-3" /> Presente
    </span>
  )
}

// Formatar hora — lida com TIME do PostgreSQL ("HH:MM:SS") e datetime ISO
export function formatarHora(hora: string | null) {
  if (!hora) return '-'
  // PostgreSQL TIME retorna "HH:MM:SS" ou "HH:MM:SS.microseconds"
  const timeMatch = hora.match(/^(\d{2}):(\d{2}):(\d{2})/)
  if (timeMatch) {
    return `${timeMatch[1]}:${timeMatch[2]}:${timeMatch[3]}`
  }
  // Tentar parse como datetime ISO
  try {
    const d = new Date(hora)
    if (isNaN(d.getTime())) return hora
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return hora
  }
}

// Formatar confianca (DB armazena 0-1, exibir como 0-100%)
export function formatarConfianca(confianca: number | string | null | undefined) {
  if (confianca === null || confianca === undefined) return null
  const valor = Number(confianca)
  if (isNaN(valor)) return null
  // Se valor <= 1, multiplicar por 100 (DB armazena 0-1)
  const percentual = valor <= 1 ? valor * 100 : valor
  return percentual
}
