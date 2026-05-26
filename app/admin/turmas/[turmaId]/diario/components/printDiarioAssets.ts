/**
 * CSS e JS embarcados na janela de impressão do diário.
 * Separado de printDiario.ts para manter o arquivo principal abaixo do
 * limite de 400 linhas do CLAUDE.md.
 */

export const PRINT_DIARIO_CSS = `
  @page { size: A4 landscape; margin: 8mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1f2937; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-size: 10px; }

  /* CADA .page tem altura fixa = A4 landscape menos margens (281x194mm).
     Conteudo dentro de .page-inner e medido por JS para aplicar shrink-to-fit
     antes de imprimir. */
  .page { width: 281mm; height: 194mm; page-break-after: always; overflow: hidden; position: relative; }
  .page:last-child { page-break-after: auto; }
  .page-inner { transform-origin: top left; width: 100%; }

  /* Header compacto (3 linhas) */
  .page-header { border-bottom: 2px solid #4f46e5; padding-bottom: 4px; margin-bottom: 6px; }
  .page-header-row1 { display: flex; justify-content: space-between; font-size: 8px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; }
  .page-header-row2 { display: flex; justify-content: space-between; align-items: baseline; margin-top: 2px; gap: 12px; }
  .page-header-row2 h1 { font-size: 13px; font-weight: 700; color: #111827; white-space: nowrap; }
  .page-header-row2 .info { display: flex; gap: 10px; font-size: 9px; color: #4b5563; flex-wrap: wrap; justify-content: flex-end; }
  .page-header-row2 .info b { color: #111827; font-weight: 600; }
  .page-header-row3 { display: flex; gap: 10px; margin-top: 3px; align-items: center; font-size: 9px; color: #4b5563; }
  .page-header-row3 .pill { background: #eef2ff; color: #4338ca; padding: 1px 8px; border-radius: 10px; font-weight: 600; white-space: nowrap; }
  .page-header-row3 .profs { color: #4b5563; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .page-header-row3 .profs b { color: #111827; }

  /* Tabelas: base + density classes aplicadas via JS (data-density) */
  table { width: 100%; border-collapse: collapse; font-size: 9.5px; table-layout: fixed; }
  th { background: #f3f4f6; color: #4b5563; font-weight: 700; text-align: left; padding: 3px 6px; border-bottom: 1.5px solid #d1d5db; font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.03em; }
  td { padding: 2.5px 6px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  tr:nth-child(even) td { background: #fafafa; }
  th.center, td.center { text-align: center; }
  th.right, td.right { text-align: right; }
  td.num { color: #9ca3af; }
  td.aluno { color: #111827; }
  td.lancado { color: #9ca3af; font-size: 8.5px; }

  /* Density classes — aplicadas via JS conforme N de rows da tabela */
  table[data-density="medium"] { font-size: 9px; }
  table[data-density="medium"] td { padding: 2px 5px; }
  table[data-density="medium"] th { padding: 2.5px 5px; font-size: 8px; }
  table[data-density="high"] { font-size: 8.5px; }
  table[data-density="high"] td { padding: 1.5px 4px; }
  table[data-density="high"] th { padding: 2px 4px; font-size: 7.5px; }
  table[data-density="ultra"] { font-size: 8px; }
  table[data-density="ultra"] td { padding: 1px 3px; }
  table[data-density="ultra"] th { padding: 1.5px 3px; font-size: 7px; }

  /* Conteudo: artigos por aula. white-space: pre-wrap para quebrar texto longo. */
  .aula { border-left: 3px solid #4f46e5; background: #fafafa; padding: 5px 9px; margin-bottom: 4px; page-break-inside: avoid; border-radius: 3px; }
  .aula-hdr { display: flex; gap: 8px; align-items: center; margin-bottom: 2px; font-size: 9px; flex-wrap: wrap; }
  .aula-data { background: #4f46e5; color: white; padding: 1px 6px; border-radius: 3px; font-weight: 600; font-size: 8.5px; }
  .aula-disc { background: #e5e7eb; color: #374151; padding: 1px 6px; border-radius: 3px; font-size: 8.5px; font-weight: 500; }
  .aula-prof { color: #6b7280; font-size: 8.5px; }
  .aula-bloco { font-size: 9px; color: #374151; line-height: 1.3; margin-top: 1px; white-space: pre-wrap; word-break: break-word; }
  .aula-bloco b { color: #4b5563; }

  /* Density classes para conteudo (aulas) */
  .page[data-density="medium"] .aula { padding: 4px 8px; margin-bottom: 3px; }
  .page[data-density="medium"] .aula-bloco { font-size: 8.5px; }
  .page[data-density="high"] .aula { padding: 3px 7px; margin-bottom: 2px; border-left-width: 2px; }
  .page[data-density="high"] .aula-bloco { font-size: 8px; line-height: 1.25; }
  .page[data-density="high"] .aula-hdr { font-size: 8px; margin-bottom: 1px; }

  .sem-dados { background: #fef3c7; color: #92400e; padding: 16px; border-radius: 6px; text-align: center; font-size: 11px; font-weight: 500; }

  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
`

// JS embarcado na janela de print. NAO importa modulos — roda no contexto
// da janela popup que nao tem acesso a este bundle.
// Auto-fit em 2 camadas:
//   1) Density classes (data-density) baseadas em N de rows/aulas
//   2) Shrink-to-fit via transform: scale se a .page-inner exceder a altura
export const PRINT_DIARIO_AUTOFIT_JS = `
  function classificarDensidades() {
    document.querySelectorAll('table').forEach(function(tbl) {
      var rows = tbl.querySelectorAll('tbody tr').length;
      if (rows >= 40) tbl.setAttribute('data-density', 'ultra');
      else if (rows >= 25) tbl.setAttribute('data-density', 'high');
      else if (rows >= 15) tbl.setAttribute('data-density', 'medium');
    });
    document.querySelectorAll('.page').forEach(function(page) {
      var aulas = page.querySelectorAll('.aula').length;
      if (aulas >= 8) page.setAttribute('data-density', 'high');
      else if (aulas >= 5) page.setAttribute('data-density', 'medium');
    });
  }

  function shrinkToFit() {
    // Altura util em px: 194mm * (96 / 25.4) = ~733px
    // Margem de seguranca de 6px para evitar quebra de pagina indesejada
    var ALVO = 727;
    document.querySelectorAll('.page').forEach(function(page) {
      var inner = page.querySelector('.page-inner');
      if (!inner) return;
      inner.style.transform = '';
      inner.style.width = '';
      var h = inner.scrollHeight;
      if (h > ALVO) {
        var scale = Math.max(0.55, ALVO / h);
        inner.style.transform = 'scale(' + scale + ')';
        inner.style.width = (100 / scale) + '%';
      }
    });
  }

  window.onload = function() {
    classificarDensidades();
    requestAnimationFrame(function() {
      shrinkToFit();
      setTimeout(function() { window.print(); }, 50);
    });
  };
`
