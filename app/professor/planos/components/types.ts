// Tipos, badges e helper de impressão do planejamento de aulas.
// Extraídos de page.tsx sem mudança de lógica.

export interface Turma {
  turma_id: string
  turma_nome: string
  serie: string
  turno: string
  escola_nome: string
}

export interface Disciplina {
  id: string
  nome: string
}

export interface Plano {
  id: string
  turma_id: string
  disciplina_id: string | null
  periodo: string
  data_inicio: string
  data_fim: string | null
  objetivo: string
  conteudo: string
  metodologia: string | null
  recursos: string | null
  avaliacao: string | null
  observacoes: string | null
  status: 'rascunho' | 'finalizado'
  turma_nome: string
  disciplina_nome: string | null
  criado_em: string
  habilidades_bncc?: string[]
}

export const periodoBadge: Record<string, { label: string; cls: string }> = {
  semanal: { label: 'Semanal', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' },
  mensal: { label: 'Mensal', cls: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' },
  bimestral: { label: 'Bimestral', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' },
}

export const statusBadge: Record<string, { label: string; cls: string }> = {
  rascunho: { label: 'Rascunho', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' },
  finalizado: { label: 'Finalizado', cls: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' },
}

export const imprimirPlano = (plano: Plano) => {
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(`
    <html><head><title>Plano de Aula</title>
    <style>body{font-family:sans-serif;padding:2rem;max-width:800px;margin:0 auto}
    h1{font-size:1.5rem;margin-bottom:.5rem}h2{font-size:1.1rem;color:#555;margin:1.5rem 0 .5rem}
    .info{color:#666;margin-bottom:1rem}.section{margin-bottom:1rem;white-space:pre-wrap}
    .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:.8rem;background:#e5e7eb}
    @media print{body{padding:1rem}}</style></head><body>
    <h1>Plano de Aula</h1>
    <div class="info">
      <strong>Turma:</strong> ${plano.turma_nome} |
      <strong>Disciplina:</strong> ${plano.disciplina_nome || 'N/A'} |
      <span class="badge">${periodoBadge[plano.periodo]?.label || plano.periodo}</span>
    </div>
    <div class="info">
      <strong>Período:</strong> ${new Date(plano.data_inicio + 'T12:00:00').toLocaleDateString('pt-BR')}
      ${plano.data_fim ? ' a ' + new Date(plano.data_fim + 'T12:00:00').toLocaleDateString('pt-BR') : ''}
    </div>
    <h2>Objetivo</h2><div class="section">${plano.objetivo}</div>
    <h2>Conteúdo</h2><div class="section">${plano.conteudo}</div>
    ${plano.metodologia ? '<h2>Metodologia</h2><div class="section">' + plano.metodologia + '</div>' : ''}
    ${plano.recursos ? '<h2>Recursos</h2><div class="section">' + plano.recursos + '</div>' : ''}
    ${plano.avaliacao ? '<h2>Avaliação</h2><div class="section">' + plano.avaliacao + '</div>' : ''}
    ${plano.observacoes ? '<h2>Observações</h2><div class="section">' + plano.observacoes + '</div>' : ''}
    </body></html>
  `)
  w.document.close()
  w.print()
}
