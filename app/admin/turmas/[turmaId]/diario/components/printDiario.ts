import type { DiarioPayload, Tipo } from './types'

function escapeHtml(text: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }
  return text.replace(/[&<>"']/g, c => map[c])
}

function formatarData(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatarNota(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—'
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (isNaN(n)) return '—'
  return n.toFixed(1).replace('.', ',')
}

function formatarPercentual(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—'
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (isNaN(n)) return '—'
  return `${n.toFixed(1).replace('.', ',')}%`
}

function corPercentualHex(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return '#9ca3af'
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (isNaN(n)) return '#9ca3af'
  if (n >= 75) return '#059669'
  if (n >= 60) return '#d97706'
  return '#dc2626'
}

function corNotaHex(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return '#9ca3af'
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (isNaN(n)) return '#9ca3af'
  if (n >= 7) return '#059669'
  if (n >= 5) return '#d97706'
  return '#dc2626'
}

interface ImprimirDiarioOpts {
  tipo: Tipo
  filtroPeriodoSelecionado: boolean
}

export function imprimirDiario(diario: DiarioPayload, opts: ImprimirDiarioOpts) {
  const { turma, periodo, professores, frequencia, notas, conteudo } = diario
  const { tipo, filtroPeriodoSelecionado } = opts

  const printWindow = window.open('', '_blank', 'width=1000,height=720')
  if (!printWindow) return

  const mostrarFreq = tipo === 'todos' || tipo === 'frequencia'
  const mostrarNotas = tipo === 'todos' || tipo === 'notas'
  const mostrarConteudo = tipo === 'todos' || tipo === 'conteudo'

  const tituloPeriodo = periodo
    ? `${periodo.nome}`
    : 'Consolidado (todos os períodos)'

  const tituloTurma = `${escapeHtml(turma.codigo)}${turma.nome ? ' (' + escapeHtml(turma.nome) + ')' : ''}`

  const professoresHtml = professores.length === 0
    ? '<span style="color:#9ca3af; font-style:italic">Nenhum professor vinculado</span>'
    : professores.map(p => {
        const tag = p.tipo_vinculo === 'disciplina' && p.disciplina_nome
          ? ' — ' + escapeHtml(p.disciplina_nome)
          : ' — polivalente'
        return `<span class="prof-chip">${escapeHtml(p.professor_nome)}${tag}</span>`
      }).join(' ')

  // ============ FREQUÊNCIA ============
  const frequenciaHtml = (() => {
    if (!mostrarFreq || !frequencia || frequencia.length === 0) return ''
    const linhas = frequencia.map((f, i) => {
      const cor = corPercentualHex(f.percentual_frequencia)
      return `
        <tr>
          <td>${i + 1}</td>
          <td>${escapeHtml(f.aluno_nome)}</td>
          ${!filtroPeriodoSelecionado ? `<td style="text-align:center">${f.periodo_numero ? f.periodo_numero + 'º' : '—'}</td>` : ''}
          <td style="text-align:right">${f.dias_letivos ?? '—'}</td>
          <td style="text-align:right">${f.presencas ?? '—'}</td>
          <td style="text-align:right">${f.faltas ?? '—'}</td>
          <td style="text-align:right">${f.faltas_justificadas ?? '—'}</td>
          <td style="text-align:right; color:${cor}; font-weight:600">${formatarPercentual(f.percentual_frequencia)}</td>
          <td style="font-size:10px; color:#6b7280">${escapeHtml(f.registrado_por_nome || '—')}</td>
        </tr>`
    }).join('')

    return `
      <section class="secao">
        <h2>Frequência ${periodo ? '— ' + escapeHtml(periodo.nome) : '(consolidado)'} <span class="contador">${frequencia.length} alunos</span></h2>
        <table>
          <thead>
            <tr>
              <th style="width:30px">#</th>
              <th>Aluno</th>
              ${!filtroPeriodoSelecionado ? '<th style="width:60px; text-align:center">Per.</th>' : ''}
              <th style="width:65px; text-align:right">Dias Let.</th>
              <th style="width:65px; text-align:right">Pres.</th>
              <th style="width:55px; text-align:right">Faltas</th>
              <th style="width:55px; text-align:right">Just.</th>
              <th style="width:60px; text-align:right">%</th>
              <th style="width:130px">Lançado por</th>
            </tr>
          </thead>
          <tbody>${linhas}</tbody>
        </table>
      </section>`
  })()

  // ============ NOTAS ============
  const notasHtml = (() => {
    if (!mostrarNotas || !notas) return ''
    const validas = notas.filter(n => n.nota_id)
    if (validas.length === 0) return ''
    const linhas = validas.map((n, i) => {
      const corN = corNotaHex(n.nota)
      const corFinal = corNotaHex(n.nota_final)
      return `
        <tr>
          <td>${i + 1}</td>
          <td>${escapeHtml(n.aluno_nome)}</td>
          <td>${escapeHtml(n.disciplina_nome || '—')}</td>
          ${!filtroPeriodoSelecionado ? `<td style="text-align:center">${n.periodo_numero ? n.periodo_numero + 'º' : '—'}</td>` : ''}
          <td style="text-align:right; color:${corN}; font-weight:600">${formatarNota(n.nota)}</td>
          <td style="text-align:right; color:#6b7280">${formatarNota(n.nota_recuperacao)}</td>
          <td style="text-align:right; color:${corFinal}; font-weight:700">${formatarNota(n.nota_final)}</td>
          <td style="text-align:right">${n.faltas ?? '—'}</td>
          <td style="font-size:10px; color:#6b7280">${escapeHtml(n.registrado_por_nome || '—')}</td>
        </tr>`
    }).join('')

    return `
      <section class="secao">
        <h2>Notas ${periodo ? '— ' + escapeHtml(periodo.nome) : '(todos os períodos)'} <span class="contador">${validas.length} lançamentos</span></h2>
        <table>
          <thead>
            <tr>
              <th style="width:30px">#</th>
              <th>Aluno</th>
              <th>Disciplina</th>
              ${!filtroPeriodoSelecionado ? '<th style="width:55px; text-align:center">Per.</th>' : ''}
              <th style="width:55px; text-align:right">Nota</th>
              <th style="width:70px; text-align:right">Recup.</th>
              <th style="width:55px; text-align:right">Final</th>
              <th style="width:55px; text-align:right">Faltas</th>
              <th style="width:130px">Lançado por</th>
            </tr>
          </thead>
          <tbody>${linhas}</tbody>
        </table>
      </section>`
  })()

  // ============ CONTEÚDO ============
  const conteudoHtml = (() => {
    if (!mostrarConteudo || !conteudo || conteudo.length === 0) return ''
    const itens = conteudo.map(c => `
      <article class="aula">
        <div class="aula-header">
          <span class="aula-data">${formatarData(c.data_aula)}</span>
          ${c.disciplina_nome ? `<span class="aula-disc">${escapeHtml(c.disciplina_nome)}</span>` : ''}
          <span class="aula-prof">por <strong>${escapeHtml(c.professor_nome)}</strong></span>
        </div>
        ${c.conteudo ? `<div class="aula-bloco"><div class="aula-label">Conteúdo</div><div class="aula-texto">${escapeHtml(c.conteudo)}</div></div>` : ''}
        ${c.metodologia ? `<div class="aula-bloco"><div class="aula-label">Metodologia</div><div class="aula-texto">${escapeHtml(c.metodologia)}</div></div>` : ''}
        ${c.observacoes ? `<div class="aula-bloco"><div class="aula-label">Observações</div><div class="aula-texto">${escapeHtml(c.observacoes)}</div></div>` : ''}
      </article>`).join('')

    return `
      <section class="secao">
        <h2>Conteúdo do diário ${periodo ? '— ' + escapeHtml(periodo.nome) : '(todos os períodos)'} <span class="contador">${conteudo.length} aulas</span></h2>
        ${itens}
      </section>`
  })()

  const semDados = !frequenciaHtml && !notasHtml && !conteudoHtml

  printWindow.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Diário de Classe — ${tituloTurma}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 16mm 12mm; color: #1f2937; font-size: 12px; }
  .doc-header { border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 16px; }
  .doc-header .org { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
  .doc-header h1 { font-size: 18px; font-weight: 700; color: #111827; margin: 2px 0 4px 0; }
  .doc-header .escola { font-size: 13px; color: #374151; }
  .info-grid { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 8px; font-size: 11px; color: #4b5563; }
  .info-grid .label { color: #9ca3af; font-weight: 600; text-transform: uppercase; font-size: 9px; letter-spacing: 0.04em; }
  .info-grid .valor { color: #111827; font-weight: 500; }
  .profs { margin-top: 10px; }
  .profs .label { display: block; color: #9ca3af; font-weight: 600; text-transform: uppercase; font-size: 9px; letter-spacing: 0.04em; margin-bottom: 4px; }
  .prof-chip { display: inline-block; background: #eef2ff; color: #4338ca; padding: 2px 8px; border-radius: 10px; font-size: 11px; margin: 0 4px 4px 0; }
  .secao { margin-top: 18px; page-break-inside: auto; }
  .secao h2 { font-size: 13px; font-weight: 700; color: #1f2937; padding: 6px 0; border-bottom: 1px solid #e5e7eb; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; }
  .secao h2 .contador { font-size: 10px; color: #6b7280; font-weight: 500; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #f9fafb; font-weight: 600; text-align: left; padding: 6px 8px; border-bottom: 2px solid #e5e7eb; color: #4b5563; text-transform: uppercase; font-size: 10px; }
  td { padding: 5px 8px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
  tr:nth-child(even) td { background: #fafafa; }
  tr { page-break-inside: avoid; }
  .aula { background: #fafafa; border-left: 3px solid #4f46e5; padding: 10px 12px; margin-bottom: 10px; page-break-inside: avoid; border-radius: 4px; }
  .aula-header { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 6px; font-size: 11px; }
  .aula-data { background: #4f46e5; color: white; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 10px; }
  .aula-disc { background: #e5e7eb; color: #374151; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 500; }
  .aula-prof { color: #6b7280; font-size: 10px; }
  .aula-bloco { margin-top: 6px; }
  .aula-label { font-size: 9px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 2px; }
  .aula-texto { font-size: 11px; color: #374151; white-space: pre-wrap; line-height: 1.4; }
  .sem-dados { background: #fef3c7; color: #92400e; padding: 16px; border-radius: 6px; text-align: center; font-size: 12px; font-weight: 500; }
  .footer { margin-top: 24px; padding-top: 8px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 9px; color: #9ca3af; }
  @media print {
    body { padding: 10mm 8mm; }
    .secao { page-break-inside: auto; }
  }
</style>
</head>
<body>
  <div class="doc-header">
    <div class="org">SEMED — São Sebastião da Boa Vista</div>
    <h1>Diário de Classe — ${tituloTurma}</h1>
    <div class="escola">${escapeHtml(turma.escola_nome)}</div>
    <div class="info-grid">
      <div><span class="label">Série:</span> <span class="valor">${escapeHtml(turma.serie)}</span></div>
      <div><span class="label">Turno:</span> <span class="valor" style="text-transform:capitalize">${escapeHtml(turma.turno)}</span></div>
      <div><span class="label">Ano Letivo:</span> <span class="valor">${escapeHtml(turma.ano_letivo)}</span></div>
      <div><span class="label">Período:</span> <span class="valor">${escapeHtml(tituloPeriodo)}</span></div>
      ${periodo && periodo.data_inicio && periodo.data_fim
        ? `<div><span class="label">Datas:</span> <span class="valor">${formatarData(periodo.data_inicio)} – ${formatarData(periodo.data_fim)}</span></div>`
        : ''}
    </div>
    <div class="profs">
      <span class="label">Professor(es) vinculado(s)</span>
      ${professoresHtml}
    </div>
  </div>

  ${semDados
    ? '<div class="sem-dados">Nenhum lançamento encontrado para os filtros selecionados.</div>'
    : frequenciaHtml + notasHtml + conteudoHtml}

  <div class="footer">Documento gerado em ${new Date().toLocaleString('pt-BR')} pelo SISAM</div>
  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`)
  printWindow.document.close()
}
