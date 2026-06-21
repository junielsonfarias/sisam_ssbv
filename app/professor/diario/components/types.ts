// Tipos e helpers compartilhados do diário de classe do professor.
// Extraídos de page.tsx sem mudança de lógica.

export interface Turma {
  turma_id: string
  turma_nome: string
  serie: string
  turno: string
  escola_nome: string
  tipo_vinculo: string
  disciplina_nome: string | null
}

export interface Disciplina {
  id: string
  nome: string
}

export interface RegistroDiario {
  id: string
  turma_id: string
  disciplina_id: string | null
  data_aula: string
  conteudo: string
  metodologia: string | null
  observacoes: string | null
  turma_nome: string
  disciplina_nome: string | null
  criado_em: string
  habilidades_bncc?: string[]
}

// Normaliza qualquer formato de data (Date, ISO com TZ, ISO sem TZ) para
// YYYY-MM-DD. Evita falso negativo quando backend muda o shape do campo
// (lesson pre-Pt.6: substring assumia ISO puro sem timezone).
export const dataParaISO = (data: string | Date): string => {
  if (data instanceof Date) {
    const y = data.getFullYear()
    const m = String(data.getMonth() + 1).padStart(2, '0')
    const d = String(data.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return data.slice(0, 10)
}
