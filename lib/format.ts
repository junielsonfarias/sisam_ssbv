/**
 * Formatação pt-BR centralizada (camada de exibição).
 *
 * Ponto único para formatar datas e números. Consolida:
 *  - ~10 funções `formatarData` locais duplicadas em páginas (logs-acesso,
 *    notificacoes, seguranca, dispositivos-faciais, divergencias, ...);
 *  - 123 usos inline de `toLocaleDateString('pt-BR')`.
 *
 * Adoção incremental: novos usos importam daqui; os antigos migram aos poucos
 * (`import { formatarData, formatarDataHora } from '@/lib/format'`).
 *
 * Os formatadores numéricos canônicos vivem em `lib/utils-numeros.ts` e são
 * re-exportados aqui para que `@/lib/format` seja a entrada única.
 *
 * @module lib/format
 */

import { formatarNumero, formatarNota, formatarPercentual } from '@/lib/utils-numeros'

/** Fuso horário do projeto (SEMED São Sebastião da Boa Vista / Belém-PA). */
export const TIMEZONE = 'America/Belem'

/** Converte a entrada em Date válido, ou null. */
function paraData(valor: string | number | Date | null | undefined): Date | null {
  if (valor === null || valor === undefined || valor === '') return null
  const d = valor instanceof Date ? valor : new Date(valor)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Formata uma data como `dd/MM/yyyy` (pt-BR).
 *
 * Para strings "date-only" (`YYYY-MM-DD`), monta a saída a partir dos
 * componentes — evitando o bug clássico em que `new Date('2026-06-17')` é
 * interpretado como meia-noite UTC e exibe o dia anterior em fusos negativos
 * (ex.: UTC-3 mostraria 16/06). Para timestamps com hora, usa o fuso do projeto.
 *
 * @param valor Data ISO, timestamp ou Date.
 * @param fallback Texto quando a data é nula/inválida (default '—').
 */
export function formatarData(
  valor: string | number | Date | null | undefined,
  fallback = '—'
): string {
  if (typeof valor === 'string') {
    const m = valor.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (m) return `${m[3]}/${m[2]}/${m[1]}`
  }
  const d = paraData(valor)
  if (!d) return fallback
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: TIMEZONE,
  })
}

/**
 * Formata data + hora como `dd/MM/yyyy HH:mm` (pt-BR, fuso do projeto).
 * Fixar o fuso evita divergência entre render no servidor (UTC) e no
 * navegador do usuário.
 *
 * @param valor Timestamp ISO, epoch ou Date.
 * @param fallback Texto quando nulo/inválido (default '—').
 */
export function formatarDataHora(
  valor: string | number | Date | null | undefined,
  fallback = '—'
): string {
  const d = paraData(valor)
  if (!d) return fallback
  // pt-BR insere vírgula entre data e hora ("17/06/2026, 09:00"); normaliza
  // para "dd/MM/yyyy HH:mm".
  return d
    .toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: TIMEZONE,
    })
    .replace(', ', ' ')
}

// Formatadores numéricos canônicos (re-export — entrada única em @/lib/format).
export { formatarNumero, formatarNota, formatarPercentual }
