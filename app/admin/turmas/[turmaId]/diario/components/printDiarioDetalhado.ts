import type { DiarioDetalhadoPayload, DisciplinaDetalhada, MesDetalhado, StatusCelula } from './types'
import { PRINT_DIARIO_CSS, PRINT_DIARIO_AUTOFIT_JS } from './printDiarioAssets'

const DIAS_SEMANA_PT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']

function escapeHtml(text: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }
  return text.replace(/[&<>"']/g, c => map[c])
}

function diaDaSemana(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  return isNaN(d.getTime()) ? '' : DIAS_SEMANA_PT[d.getDay()]
}

function diaDoMes(iso: string): string {
  return iso.slice(8, 10)
}

function corCelula(s: StatusCelula): { bg: string; fg: string; label: string } {
  if (s === 'P')  return { bg: '#dcfce7', fg: '#065f46', label: 'P' }
  if (s === 'F')  return { bg: '#fee2e2', fg: '#991b1b', label: 'F' }
  if (s === 'FJ') return { bg: '#fef3c7', fg: '#92400e', label: 'FJ' }
  return { bg: '#ffffff', fg: '#d1d5db', label: '—' }
}

// CSS adicional especifico do diario detalhado, anexado ao CSS base.
const CSS_EXTRA_DETALHADO = `
  .tbl-detalhado { font-size: 9px; }
  .tbl-detalhado th { padding: 2px 3px; font-size: 7.5px; text-align: center; vertical-align: middle; }
  .tbl-detalhado th.col-nome { text-align: left; padding-left: 6px; }
  .tbl-detalhado th.col-totais { background: #eef2ff; color: #4338ca; }
  .tbl-detalhado td { padding: 2px 3px; text-align: center; font-size: 9px; }
  .tbl-detalhado td.col-num { color: #9ca3af; font-size: 8px; }
  .tbl-detalhado td.col-nome { text-align: left; padding-left: 6px; color: #111827; font-size: 9.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tbl-detalhado td.col-total { background: #f9fafb; font-weight: 600; font-size: 8.5px; padding: 2px 4px; }
  .tbl-detalhado td.col-total.p  { color: #065f46; }
  .tbl-detalhado td.col-total.f  { color: #991b1b; }
  .tbl-detalhado td.col-total.fj { color: #92400e; }
  .tbl-detalhado .celula { display: inline-block; min-width: 14px; padding: 1px 2px; border-radius: 2px; font-weight: 600; font-size: 8.5px; }
  .tbl-detalhado .dia-num { font-weight: 700; color: #111827; font-size: 9px; }
  .tbl-detalhado .dia-sem { color: #6b7280; font-size: 6.5px; text-transform: uppercase; letter-spacing: 0.02em; line-height: 1; }
  .legenda { display: flex; gap: 12px; margin-top: 8px; font-size: 8.5px; color: #6b7280; }
  .legenda .item { display: inline-flex; align-items: center; gap: 4px; }
  .legenda .swatch { display: inline-block; width: 12px; height: 10px; border-radius: 2px; }
`

export function imprimirDiarioDetalhado(payload: DiarioDetalhadoPayload) {
  const { turma, modelo_frequencia, disciplinas } = payload

  const printWindow = window.open('', '_blank', 'width=1100,height=780')
  if (!printWindow) return

  const baseUrl = window.location.origin
  const logoPrefeitura = `${baseUrl}/logo-prefeitura.png`
  const logoSemed = `${baseUrl}/logo-semed.png`
  const logoEscola = turma.escola_logo_url
    ? (turma.escola_logo_url.startsWith('http') ? turma.escola_logo_url : `${baseUrl}${turma.escola_logo_url}`)
    : null

  const tituloTurma = `${escapeHtml(turma.codigo)}${turma.nome ? ' (' + escapeHtml(turma.nome) + ')' : ''}`

  function headerHtml(subtitulo: string): string {
    const escolaSlot = logoEscola
      ? `<img class="logo-img" src="${escapeHtml(logoEscola)}" alt="Logo da escola" onerror="this.style.display='none'"/>`
      : `<div class="escola-nome-tag">${escapeHtml(turma.escola_nome)}</div>`
    return `
      <header class="page-header">
        <div class="page-header-logos">
          <div class="logo-slot left">
            <img class="logo-img" src="${logoPrefeitura}" alt="Prefeitura" onerror="this.style.display='none'"/>
            <div class="logo-cap">Prefeitura Municipal</div>
          </div>
          <div class="logo-slot center">
            <img class="logo-img" src="${logoSemed}" alt="SEMED" onerror="this.style.display='none'"/>
            <div class="logo-cap">SEMED — São Sebastião da Boa Vista</div>
          </div>
          <div class="logo-slot right">
            ${escolaSlot}
            <div class="logo-cap">${escapeHtml(turma.escola_nome)}</div>
          </div>
        </div>
        <div class="page-header-titulo">
          <h1>Diário Detalhado — ${tituloTurma}</h1>
          <div class="info">
            <span><b>Série:</b> ${escapeHtml(turma.serie)}</span>
            <span><b>Turno:</b> ${escapeHtml(turma.turno)}</span>
            <span><b>Ano:</b> ${escapeHtml(turma.ano_letivo)}</span>
            <span class="meta">Gerado em ${new Date().toLocaleDateString('pt-BR')}</span>
          </div>
        </div>
        <div class="page-header-row3">
          <span class="pill">${escapeHtml(subtitulo)}</span>
          <span class="profs"><b>Modelo:</b> ${modelo_frequencia === 'hora_aula' ? 'por hora-aula (anos finais)' : 'diária (anos iniciais)'}</span>
        </div>
      </header>`
  }

  function paginaMes(disc: DisciplinaDetalhada, m: MesDetalhado): string {
    const dias = m.dias_letivos
    if (dias.length === 0 || m.alunos.length === 0) return ''

    const colHeadersDias = dias.map(d => `
      <th class="col-dia">
        <div class="dia-num">${diaDoMes(d)}</div>
        <div class="dia-sem">${diaDaSemana(d)}</div>
      </th>`).join('')

    const rows = m.alunos.map((a, i) => {
      const celulasHtml = dias.map(d => {
        const v = a.celulas[d] ?? null
        const c = corCelula(v)
        return `<td><span class="celula" style="background:${c.bg}; color:${c.fg}">${c.label}</span></td>`
      }).join('')
      return `
        <tr>
          <td class="col-num">${i + 1}</td>
          <td class="col-nome auto-fit-nome" data-nome-completo="${escapeHtml(a.nome)}" title="${escapeHtml(a.nome)}">${escapeHtml(a.nome)}</td>
          ${celulasHtml}
          <td class="col-total p">${a.totais.presencas}</td>
          <td class="col-total f">${a.totais.faltas}</td>
          <td class="col-total fj">${a.totais.justificadas}</td>
        </tr>`
    }).join('')

    const prefixoDisc = disc.nome ? `${disc.nome} · ` : ''
    const subtitulo = `${prefixoDisc}${m.mes_nome} / ${m.ano} · ${m.alunos.length} aluno(s) · ${dias.length} dia(s) letivo(s)`

    return `
      <section class="page"><div class="page-inner">
        ${headerHtml(subtitulo)}
        <table class="tbl-detalhado">
          <colgroup>
            <col style="width:24px"/>
            <col style="width:250px"/>
            ${dias.map(() => '<col/>').join('')}
            <col style="width:28px"/>
            <col style="width:28px"/>
            <col style="width:28px"/>
          </colgroup>
          <thead>
            <tr>
              <th>#</th>
              <th class="col-nome">Aluno</th>
              ${colHeadersDias}
              <th class="col-totais">P</th>
              <th class="col-totais">F</th>
              <th class="col-totais">FJ</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="legenda">
          <span class="item"><span class="swatch" style="background:#dcfce7"></span><b>P</b> Presente</span>
          <span class="item"><span class="swatch" style="background:#fee2e2"></span><b>F</b> Falta</span>
          <span class="item"><span class="swatch" style="background:#fef3c7"></span><b>FJ</b> Falta Justificada</span>
          <span class="item"><span class="swatch" style="background:#ffffff; border:1px solid #d1d5db"></span><b>—</b> Não lançado</span>
        </div>
      </div></section>`
  }

  // Itera por disciplina, e dentro de cada disciplina por mes.
  // Para anos iniciais ha 1 disciplina (id=null) com seus meses.
  // Para anos finais ha N disciplinas, cada uma com seus dias proprios.
  const paginas = disciplinas
    .flatMap(disc => disc.meses.map(m => paginaMes(disc, m)))
    .join('')
  const semDados = paginas.trim().length === 0

  printWindow.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Diário Detalhado — ${tituloTurma}</title>
<style>${PRINT_DIARIO_CSS}
${CSS_EXTRA_DETALHADO}</style>
</head>
<body>
  ${semDados
    ? '<section class="page"><div class="page-inner"><div class="sem-dados">Nenhum dia letivo ou aluno encontrado no escopo. Verifique se ha alunos ativos e dias letivos cadastrados no calendario.</div></div></section>'
    : paginas}
  <script>${PRINT_DIARIO_AUTOFIT_JS}<\/script>
</body>
</html>`)
  printWindow.document.close()
}
