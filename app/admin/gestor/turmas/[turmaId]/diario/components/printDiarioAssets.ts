/**
 * CSS e JS embarcados na janela de impressão do diário.
 * Separado de printDiario.ts para manter o arquivo principal abaixo do
 * limite de 400 linhas do CLAUDE.md.
 */

export const PRINT_DIARIO_CSS = `
  @page { size: A4 landscape; margin: 8mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1f2937; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-size: 11px; }

  /* CADA .page tem altura fixa = A4 landscape menos margens (281x194mm).
     Conteudo dentro de .page-inner e medido por JS para aplicar fit-to-fill
     (grow ou shrink) antes de imprimir. */
  .page { width: 281mm; height: 194mm; page-break-after: always; overflow: hidden; position: relative; }
  .page:last-child { page-break-after: auto; }
  .page-inner { transform-origin: top left; width: 100%; }

  /* Header com 3 logos (prefeitura | SEMED | escola) + titulo + subtitulo */
  .page-header { border-bottom: 2px solid #4f46e5; padding-bottom: 6px; margin-bottom: 10px; }

  /* Linha 1: as 3 logos lado a lado */
  .page-header-logos { display: grid; grid-template-columns: 1fr 1fr 1fr; align-items: end; gap: 12px; padding-bottom: 6px; }
  .logo-slot { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 2px; }
  .logo-slot.left { align-items: flex-start; text-align: left; }
  .logo-slot.right { align-items: flex-end; text-align: right; }
  .logo-img { max-height: 48px; max-width: 100%; object-fit: contain; }
  .logo-cap { font-size: 8px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em; line-height: 1.2; max-width: 100%; }
  .escola-nome-tag { font-size: 11px; font-weight: 700; color: #4338ca; padding: 12px 10px; background: #eef2ff; border-radius: 4px; max-width: 100%; line-height: 1.1; }

  /* Linha 2: titulo + info da turma */
  .page-header-titulo { display: flex; justify-content: space-between; align-items: baseline; margin-top: 4px; gap: 12px; padding-top: 4px; border-top: 1px solid #e5e7eb; }
  .page-header-titulo h1 { font-size: 16px; font-weight: 700; color: #111827; white-space: nowrap; }
  .page-header-titulo .info { display: flex; gap: 12px; font-size: 11px; color: #4b5563; flex-wrap: wrap; justify-content: flex-end; }
  .page-header-titulo .info b { color: #111827; font-weight: 600; }
  .page-header-titulo .info .meta { color: #9ca3af; font-size: 9px; text-transform: uppercase; }

  /* Linha 3: pill com subtitulo da pagina + professores */
  .page-header-row3 { display: flex; gap: 12px; margin-top: 5px; align-items: center; font-size: 11px; color: #4b5563; }
  .page-header-row3 .pill { background: #eef2ff; color: #4338ca; padding: 2px 10px; border-radius: 10px; font-weight: 600; white-space: nowrap; }
  .page-header-row3 .profs { color: #4b5563; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .page-header-row3 .profs b { color: #111827; }

  /* Tabelas: base confortavel (até ~25 rows cabem com folga em landscape) */
  table { width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed; }
  th { background: #f3f4f6; color: #4b5563; font-weight: 700; text-align: left; padding: 6px 8px; border-bottom: 2px solid #d1d5db; font-size: 10px; text-transform: uppercase; letter-spacing: 0.03em; }
  td { padding: 5px 8px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  tr:nth-child(even) td { background: #fafafa; }
  th.center, td.center { text-align: center; }
  th.right, td.right { text-align: right; }
  td.num { color: #9ca3af; }
  td.aluno { color: #111827; }
  td.lancado { color: #9ca3af; font-size: 10px; }

  /* Density classes — aplicadas via JS apenas quando N de rows e grande.
     Para <= 30 alunos, mantemos o tamanho confortavel (sem density). */
  table[data-density="medium"] { font-size: 10px; }
  table[data-density="medium"] td { padding: 3.5px 6px; }
  table[data-density="medium"] th { padding: 4px 6px; font-size: 9px; }
  table[data-density="high"] { font-size: 9px; }
  table[data-density="high"] td { padding: 2.5px 5px; }
  table[data-density="high"] th { padding: 3px 5px; font-size: 8px; }

  /* Conteudo: artigos por aula. white-space: pre-wrap para quebrar texto longo. */
  .aula { border-left: 3px solid #4f46e5; background: #fafafa; padding: 8px 12px; margin-bottom: 8px; page-break-inside: avoid; border-radius: 4px; }
  .aula-hdr { display: flex; gap: 10px; align-items: center; margin-bottom: 4px; font-size: 11px; flex-wrap: wrap; }
  .aula-data { background: #4f46e5; color: white; padding: 2px 8px; border-radius: 3px; font-weight: 600; font-size: 10px; }
  .aula-disc { background: #e5e7eb; color: #374151; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: 500; }
  .aula-prof { color: #6b7280; font-size: 10px; }
  .aula-bloco { font-size: 11px; color: #374151; line-height: 1.4; margin-top: 2px; white-space: pre-wrap; word-break: break-word; }
  .aula-bloco b { color: #4b5563; }

  /* Density classes para conteudo (aulas) — so para muitas aulas na mesma pagina */
  .page[data-density="medium"] .aula { padding: 6px 10px; margin-bottom: 5px; }
  .page[data-density="medium"] .aula-bloco { font-size: 10px; }
  .page[data-density="high"] .aula { padding: 4px 8px; margin-bottom: 3px; border-left-width: 2px; }
  .page[data-density="high"] .aula-bloco { font-size: 9px; line-height: 1.3; }
  .page[data-density="high"] .aula-hdr { font-size: 9px; margin-bottom: 2px; }

  .sem-dados { background: #fef3c7; color: #92400e; padding: 20px; border-radius: 6px; text-align: center; font-size: 12px; font-weight: 500; }

  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
`

// JS embarcado na janela de print. NAO importa modulos — roda no contexto
// da janela popup que nao tem acesso a este bundle.
// Auto-fit em 2 camadas:
//   1) Density classes (data-density) baseadas em N de rows/aulas
//   2) Shrink-to-fit via transform: scale se a .page-inner exceder a altura
export const PRINT_DIARIO_AUTOFIT_JS = `
  // Abrevia APENAS as celulas .auto-fit-nome cujo conteudo nao coube no
  // espaco real disponivel (scrollWidth > clientWidth). Prioridade do
  // usuario: nome COMPLETO sempre que possivel.
  //
  // Sequencia de tentativas para cada celula que estourou:
  //   T1: "Primeiro N. M. Ultimo" (iniciais dos meios, preposicoes removidas)
  //   T2: "P. N. M. Ultimo" (inicial do primeiro tambem)
  //   T3: textOverflow:ellipsis nativo do CSS (visual)
  //
  // O nome completo permanece em data-nome-completo + title (tooltip),
  // entao o usuario sempre pode ver o nome integral passando o mouse.
  function abreviarNomesQueEstouram() {
    var PREP = { 'de':1,'da':1,'do':1,'dos':1,'das':1,'e':1 };
    var celulas = document.querySelectorAll('.auto-fit-nome');
    celulas.forEach(function(td) {
      var completo = td.getAttribute('data-nome-completo') || '';
      if (!completo) return;
      // Estado inicial: nome completo
      td.textContent = completo;
      if (td.scrollWidth <= td.clientWidth) return; // coube

      var partes = completo.trim().split(/\\s+/);
      if (partes.length < 3) {
        // Nao da pra abreviar significativamente — confia no ellipsis CSS
        return;
      }
      var primeiro = partes[0];
      var ultimo = partes[partes.length - 1];
      var meio = partes.slice(1, -1)
        .filter(function(p) { return !PREP[p.toLowerCase()]; })
        .map(function(p) { return p.charAt(0).toUpperCase() + '.'; })
        .join(' ');

      // T1: Primeiro M. M. Ultimo
      td.textContent = meio ? (primeiro + ' ' + meio + ' ' + ultimo) : (primeiro + ' ' + ultimo);
      if (td.scrollWidth <= td.clientWidth) return;

      // T2: P. M. M. Ultimo
      var inicial = primeiro.charAt(0) + '.';
      td.textContent = meio ? (inicial + ' ' + meio + ' ' + ultimo) : (inicial + ' ' + ultimo);
      // Se ainda nao couber, o ellipsis CSS faz o trabalho final.
    });
  }

  // Thresholds escolhidos para que ate ~30 alunos caibam com o tamanho
  // confortavel padrao (sem density class). Acima disso, density medium/high
  // entra para garantir que continue cabendo em 1 pagina.
  function classificarDensidades() {
    document.querySelectorAll('table').forEach(function(tbl) {
      var rows = tbl.querySelectorAll('tbody tr').length;
      if (rows >= 38) tbl.setAttribute('data-density', 'high');
      else if (rows >= 30) tbl.setAttribute('data-density', 'medium');
    });
    document.querySelectorAll('.page').forEach(function(page) {
      var aulas = page.querySelectorAll('.aula').length;
      if (aulas >= 10) page.setAttribute('data-density', 'high');
      else if (aulas >= 7) page.setAttribute('data-density', 'medium');
    });
  }

  // Fit-to-fill em DOIS sentidos:
  //  - Se h > ALVO: shrink (scale < 1) para caber
  //  - Se h < ALVO * GROW_THRESHOLD: grow (scale > 1) para preencher o espaço
  //    e nao deixar a pagina com 60% em branco quando ha poucos itens
  // Cap de scale entre 0.55 (shrink maximo) e 1.4 (grow maximo).
  function fitToFill() {
    var ALVO = 727; // ~194mm @ 96dpi
    var GROW_THRESHOLD = 0.85; // so amplia se conteudo usa < 85% da altura
    document.querySelectorAll('.page').forEach(function(page) {
      var inner = page.querySelector('.page-inner');
      if (!inner) return;
      inner.style.transform = '';
      inner.style.width = '';
      var h = inner.scrollHeight;
      if (h <= 0) return;
      var ratio = ALVO / h;
      var scale = 1;
      if (h > ALVO) {
        scale = Math.max(0.55, ratio);              // shrink
      } else if (h < ALVO * GROW_THRESHOLD) {
        scale = Math.min(1.4, ratio);               // grow
      }
      if (scale !== 1) {
        inner.style.transform = 'scale(' + scale + ')';
        inner.style.width = (100 / scale) + '%';
      }
    });
  }

  // Espera todas as imagens carregarem antes de medir/imprimir. Se uma
  // imagem falhar (onerror), conta como "carregada" para nao bloquear.
  function aguardarImagens() {
    var imgs = Array.prototype.slice.call(document.images);
    if (imgs.length === 0) return Promise.resolve();
    return Promise.all(imgs.map(function(img) {
      if (img.complete) return Promise.resolve();
      return new Promise(function(resolve) {
        img.addEventListener('load', resolve);
        img.addEventListener('error', resolve);
      });
    }));
  }

  window.onload = function() {
    classificarDensidades();
    aguardarImagens().then(function() {
      requestAnimationFrame(function() {
        // Ordem importa:
        //  1) abreviar nomes que estouram (depois de density aplicada,
        //     antes de fit-to-fill porque o transform: scale distorce
        //     scrollWidth/clientWidth)
        //  2) fit-to-fill (grow/shrink) da pagina inteira
        //  3) imprimir
        abreviarNomesQueEstouram();
        fitToFill();
        setTimeout(function() { window.print(); }, 50);
      });
    });
  };
`
