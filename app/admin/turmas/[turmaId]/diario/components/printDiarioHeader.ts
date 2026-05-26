/**
 * Header HTML compartilhado entre printDiario (resumido) e printDiarioDetalhado.
 *
 * Layout fixo (3 linhas):
 *   1) Logos: prefeitura (esq), SEMED (centro), escola (dir, se cadastrada)
 *   2) Titulo (Diario de Classe / Diario Detalhado) + info da turma
 *   3) Pill com subtitulo da pagina + rodape customizado (professores ou modelo)
 *
 * O CSS correspondente esta em PRINT_DIARIO_CSS (printDiarioAssets.ts).
 */

import type { TurmaInfo } from './types'

function escapeHtml(text: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }
  return text.replace(/[&<>"']/g, c => map[c])
}

interface HeaderOpts {
  turma: TurmaInfo
  /** Ex: "Diário de Classe" ou "Diário Detalhado" */
  tituloPrefix: string
  /** Texto do pill da row3 (ex: "Frequência — 1º bimestre") */
  subtitulo: string
  /**
   * HTML do rodape direito da row3 (ja escapado).
   * Ex: '<b>Prof.:</b> Joao — polivalente'
   *  ou '<b>Modelo:</b> por hora-aula (anos finais)'
   */
  rodapeHtml: string
}

/**
 * Resolve a URL absoluta da logo da escola. Como o popup (window.open('', ...))
 * nao tem base URL propria, caminhos relativos nao resolveriam — precisam ser
 * prefixados com window.location.origin.
 */
export function resolverLogoEscola(escola_logo_url: string | null): string | null {
  if (!escola_logo_url) return null
  if (escola_logo_url.startsWith('http')) return escola_logo_url
  return `${window.location.origin}${escola_logo_url}`
}

export function montarHeaderHtml(opts: HeaderOpts): string {
  const { turma, tituloPrefix, subtitulo, rodapeHtml } = opts
  const baseUrl = window.location.origin
  const logoPrefeitura = `${baseUrl}/logo-prefeitura.png`
  const logoSemed = `${baseUrl}/logo-semed.png`
  const logoEscola = resolverLogoEscola(turma.escola_logo_url)
  const tituloTurma = `${escapeHtml(turma.codigo)}${turma.nome ? ' (' + escapeHtml(turma.nome) + ')' : ''}`

  const escolaSlot = logoEscola
    ? `<img class="logo-img" src="${escapeHtml(logoEscola)}" alt="Logo da escola" onerror="this.style.display='none'"/>`
    : `<div class="escola-nome-tag">${escapeHtml(turma.escola_nome)}</div>`

  return `
    <header class="page-header">
      <div class="page-header-logos">
        <div class="logo-slot left">
          <img class="logo-img" src="${logoPrefeitura}" alt="Prefeitura Municipal" onerror="this.style.display='none'"/>
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
        <h1>${escapeHtml(tituloPrefix)} — ${tituloTurma}</h1>
        <div class="info">
          <span><b>Série:</b> ${escapeHtml(turma.serie)}</span>
          <span><b>Turno:</b> ${escapeHtml(turma.turno)}</span>
          <span><b>Ano:</b> ${escapeHtml(turma.ano_letivo)}</span>
          <span class="meta">Gerado em ${new Date().toLocaleDateString('pt-BR')}</span>
        </div>
      </div>
      <div class="page-header-row3">
        <span class="pill">${escapeHtml(subtitulo)}</span>
        <span class="profs">${rodapeHtml}</span>
      </div>
    </header>`
}
