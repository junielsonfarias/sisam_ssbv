import type {
  DiarioPayload, Tipo, FrequenciaLinha, NotaLinha, ConteudoLinha,
} from './types'
import { PRINT_DIARIO_CSS, PRINT_DIARIO_AUTOFIT_JS } from './printDiarioAssets'
import { montarHeaderHtml } from './printDiarioHeader'

const MESES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

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

// Agrupa por chave preservando ordem de insercao (Map).
function agrupar<T, K extends string | number>(itens: T[], chave: (t: T) => K): Map<K, T[]> {
  const out = new Map<K, T[]>()
  for (const it of itens) {
    const k = chave(it)
    if (!out.has(k)) out.set(k, [])
    out.get(k)!.push(it)
  }
  return out
}

interface ImprimirDiarioOpts {
  tipo: Tipo
  filtroPeriodoSelecionado: boolean
}

export function imprimirDiario(diario: DiarioPayload, opts: ImprimirDiarioOpts): boolean {
  const { turma, periodo, professores, frequencia, notas, conteudo } = diario
  const { tipo, filtroPeriodoSelecionado } = opts

  const printWindow = window.open('', '_blank', 'width=1100,height=780')
  if (!printWindow) return false

  const mostrarFreq = tipo === 'todos' || tipo === 'frequencia'
  const mostrarNotas = tipo === 'todos' || tipo === 'notas'
  const mostrarConteudo = tipo === 'todos' || tipo === 'conteudo'

  const tituloTurma = `${escapeHtml(turma.codigo)}${turma.nome ? ' (' + escapeHtml(turma.nome) + ')' : ''}`

  const professoresStr = professores.length === 0
    ? 'Nenhum professor vinculado'
    : professores.map(p => {
        const tag = p.tipo_vinculo === 'disciplina' && p.disciplina_nome
          ? ' — ' + p.disciplina_nome
          : ' — polivalente'
        return p.professor_nome + tag
      }).join(' · ')

  function headerHtml(subtitulo: string): string {
    return montarHeaderHtml({
      turma,
      tituloPrefix: 'Diário de Classe',
      subtitulo,
      rodapeHtml: `<b>Prof.:</b> ${escapeHtml(professoresStr)}`,
    })
  }

  // ============================================================================
  // FREQUENCIA: tabela compacta, agrupada por periodo quando consolidado
  // ============================================================================
  function tabelaFrequencia(linhas: FrequenciaLinha[], incluirColPeriodo: boolean): string {
    const rows = linhas.map((f, i) => {
      const cor = corPercentualHex(f.percentual_frequencia)
      return `
        <tr>
          <td class="num">${i + 1}</td>
          <td class="aluno auto-fit-nome" data-nome-completo="${escapeHtml(f.aluno_nome)}" title="${escapeHtml(f.aluno_nome)}">${escapeHtml(f.aluno_nome)}</td>
          ${incluirColPeriodo ? `<td class="center">${f.periodo_numero ? f.periodo_numero + 'º' : '—'}</td>` : ''}
          <td class="right">${f.dias_letivos ?? '—'}</td>
          <td class="right">${f.presencas ?? '—'}</td>
          <td class="right">${f.faltas ?? '—'}</td>
          <td class="right">${f.faltas_justificadas ?? '—'}</td>
          <td class="right" style="color:${cor}; font-weight:600">${formatarPercentual(f.percentual_frequencia)}</td>
          <td class="lancado auto-fit-nome" data-nome-completo="${escapeHtml(f.registrado_por_nome || '')}" title="${escapeHtml(f.registrado_por_nome || '')}">${escapeHtml(f.registrado_por_nome || '—')}</td>
        </tr>`
    }).join('')

    return `
      <table class="tbl-freq">
        <colgroup>
          <col style="width:32px"/>
          <col/>
          ${incluirColPeriodo ? '<col style="width:32px"/>' : ''}
          <col style="width:56px"/>
          <col style="width:56px"/>
          <col style="width:52px"/>
          <col style="width:52px"/>
          <col style="width:56px"/>
          <col style="width:130px"/>
        </colgroup>
        <thead>
          <tr>
            <th>#</th>
            <th>Aluno</th>
            ${incluirColPeriodo ? '<th class="center">Per.</th>' : ''}
            <th class="right">Dias Let.</th>
            <th class="right">Pres.</th>
            <th class="right">Faltas</th>
            <th class="right">Just.</th>
            <th class="right">%</th>
            <th>Lançado por</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`
  }

  function paginasFrequencia(): string {
    if (!mostrarFreq || !frequencia || frequencia.length === 0) return ''

    if (filtroPeriodoSelecionado) {
      const subtitulo = `Frequência — ${periodo?.nome ?? 'período selecionado'} · ${frequencia.length} aluno(s)`
      return `
        <section class="page"><div class="page-inner">
          ${headerHtml(subtitulo)}
          ${tabelaFrequencia(frequencia, false)}
        </div></section>`
    }

    // Consolidado: agrupa por periodo_numero (ou "sem periodo")
    const grupos = agrupar(frequencia, f => f.periodo_numero ?? -1)
    const ordenados = Array.from(grupos.entries()).sort(([a], [b]) => Number(a) - Number(b))

    return ordenados.map(([per, linhas]) => {
      const nomePeriodo = per === -1
        ? 'Sem período'
        : (linhas[0]?.periodo_nome || `${per}º período`)
      const subtitulo = `Frequência — ${nomePeriodo} · ${linhas.length} aluno(s)`
      return `
        <section class="page"><div class="page-inner">
          ${headerHtml(subtitulo)}
          ${tabelaFrequencia(linhas, false)}
        </div></section>`
    }).join('')
  }

  // ============================================================================
  // NOTAS: tabela compacta, agrupada por periodo
  // ============================================================================
  function tabelaNotas(linhas: NotaLinha[], incluirColPeriodo: boolean): string {
    const rows = linhas.map((n, i) => {
      const corN = corNotaHex(n.nota)
      const corFinal = corNotaHex(n.nota_final)
      return `
        <tr>
          <td class="num">${i + 1}</td>
          <td class="aluno auto-fit-nome" data-nome-completo="${escapeHtml(n.aluno_nome)}" title="${escapeHtml(n.aluno_nome)}">${escapeHtml(n.aluno_nome)}</td>
          <td>${escapeHtml(n.disciplina_nome || '—')}</td>
          ${incluirColPeriodo ? `<td class="center">${n.periodo_numero ? n.periodo_numero + 'º' : '—'}</td>` : ''}
          <td class="right" style="color:${corN}; font-weight:600">${formatarNota(n.nota)}</td>
          <td class="right" style="color:#6b7280">${formatarNota(n.nota_recuperacao)}</td>
          <td class="right" style="color:${corFinal}; font-weight:700">${formatarNota(n.nota_final)}</td>
          <td class="right">${n.faltas ?? '—'}</td>
          <td class="lancado auto-fit-nome" data-nome-completo="${escapeHtml(n.registrado_por_nome || '')}" title="${escapeHtml(n.registrado_por_nome || '')}">${escapeHtml(n.registrado_por_nome || '—')}</td>
        </tr>`
    }).join('')

    return `
      <table class="tbl-notas">
        <colgroup>
          <col style="width:32px"/>
          <col style="width:34%"/>
          <col/>
          ${incluirColPeriodo ? '<col style="width:32px"/>' : ''}
          <col style="width:50px"/>
          <col style="width:60px"/>
          <col style="width:50px"/>
          <col style="width:50px"/>
          <col style="width:130px"/>
        </colgroup>
        <thead>
          <tr>
            <th>#</th>
            <th>Aluno</th>
            <th>Disciplina</th>
            ${incluirColPeriodo ? '<th class="center">Per.</th>' : ''}
            <th class="right">Nota</th>
            <th class="right">Recup.</th>
            <th class="right">Final</th>
            <th class="right">Faltas</th>
            <th>Lançado por</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`
  }

  function paginasNotas(): string {
    if (!mostrarNotas || !notas) return ''
    const validas = notas.filter(n => n.nota_id)
    if (validas.length === 0) return ''

    if (filtroPeriodoSelecionado) {
      const subtitulo = `Notas — ${periodo?.nome ?? 'período selecionado'} · ${validas.length} lançamento(s)`
      return `
        <section class="page"><div class="page-inner">
          ${headerHtml(subtitulo)}
          ${tabelaNotas(validas, false)}
        </div></section>`
    }

    const grupos = agrupar(validas, n => n.periodo_numero ?? -1)
    const ordenados = Array.from(grupos.entries()).sort(([a], [b]) => Number(a) - Number(b))

    return ordenados.map(([per, linhas]) => {
      const nomePeriodo = per === -1
        ? 'Sem período'
        : (linhas[0]?.periodo_nome || `${per}º período`)
      const subtitulo = `Notas — ${nomePeriodo} · ${linhas.length} lançamento(s)`
      return `
        <section class="page"><div class="page-inner">
          ${headerHtml(subtitulo)}
          ${tabelaNotas(linhas, false)}
        </div></section>`
    }).join('')
  }

  // ============================================================================
  // CONTEUDO: lista de aulas, agrupado por mes civil quando consolidado
  // ============================================================================
  function listaConteudo(linhas: ConteudoLinha[]): string {
    return linhas.map(c => `
      <article class="aula">
        <div class="aula-hdr">
          <span class="aula-data">${formatarData(c.data_aula)}</span>
          ${c.disciplina_nome ? `<span class="aula-disc">${escapeHtml(c.disciplina_nome)}</span>` : ''}
          <span class="aula-prof">por <b>${escapeHtml(c.professor_nome)}</b></span>
        </div>
        ${c.conteudo ? `<div class="aula-bloco"><b>Conteúdo:</b> ${escapeHtml(c.conteudo)}</div>` : ''}
        ${c.metodologia ? `<div class="aula-bloco"><b>Metodologia:</b> ${escapeHtml(c.metodologia)}</div>` : ''}
        ${c.observacoes ? `<div class="aula-bloco"><b>Obs.:</b> ${escapeHtml(c.observacoes)}</div>` : ''}
      </article>`).join('')
  }

  function paginasConteudo(): string {
    if (!mostrarConteudo || !conteudo || conteudo.length === 0) return ''

    if (filtroPeriodoSelecionado) {
      const subtitulo = `Conteúdo — ${periodo?.nome ?? 'período selecionado'} · ${conteudo.length} aula(s)`
      return `
        <section class="page"><div class="page-inner">
          ${headerHtml(subtitulo)}
          ${listaConteudo(conteudo)}
        </div></section>`
    }

    // Agrupa por mes civil (YYYY-MM) usando data_aula
    const grupos = agrupar(conteudo, c => c.data_aula.slice(0, 7)) // "2026-02"
    const ordenados = Array.from(grupos.entries()).sort(([a], [b]) => a.localeCompare(b))

    return ordenados.map(([anoMes, aulas]) => {
      const [ano, mes] = anoMes.split('-')
      const nomeMes = MESES_PT[parseInt(mes, 10) - 1]
      const subtitulo = `Conteúdo — ${nomeMes} / ${ano} · ${aulas.length} aula(s)`
      return `
        <section class="page"><div class="page-inner">
          ${headerHtml(subtitulo)}
          ${listaConteudo(aulas)}
        </div></section>`
    }).join('')
  }

  // ============================================================================
  // MONTAGEM FINAL
  // ============================================================================
  const paginas = paginasFrequencia() + paginasNotas() + paginasConteudo()
  const semDados = paginas.trim().length === 0

  printWindow.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Diário — ${tituloTurma}</title>
<style>${PRINT_DIARIO_CSS}</style>
</head>
<body>
  ${semDados
    ? '<section class="page"><div class="page-inner"><div class="sem-dados">Nenhum lançamento encontrado para os filtros selecionados.</div></div></section>'
    : paginas}
  <script>${PRINT_DIARIO_AUTOFIT_JS}<\/script>
</body>
</html>`)

  printWindow.document.close()
  return true
}
