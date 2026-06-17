/**
 * Gera um relatório individual SISAM formatado para impressão via window.print()
 */

function escapeHtml(text: string | null | undefined): string {
  if (!text) return '-'
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }
  return text.replace(/[&<>"']/g, c => map[c])
}

interface ResultadoSISAM {
  ano_letivo: string
  serie: string
  nota_lp: number | null
  nota_mat: number | null
  nota_ch: number | null
  nota_cn: number | null
  nota_producao: number | null
  media_aluno: number | null
  presenca: string | null
  nivel_aprendizagem: string | null
  escola_nome: string | null
}

function isAnosIniciais(serie: string): boolean {
  const num = serie?.replace(/[^0-9]/g, '')
  return ['1', '2', '3', '4', '5'].includes(num)
}

function getNivelLabel(nivel: string | null): string {
  if (!nivel) return '-'
  const labels: Record<string, string> = {
    N1: 'Nível 1 — Abaixo do Básico',
    N2: 'Nível 2 — Básico',
    N3: 'Nível 3 — Adequado',
    N4: 'Nível 4 — Avançado',
  }
  return labels[nivel.toUpperCase()] || nivel
}

function getNivelCor(nivel: string | null): string {
  if (!nivel) return '#666'
  const cores: Record<string, string> = { N1: '#dc2626', N2: '#ea580c', N3: '#2563eb', N4: '#059669' }
  return cores[nivel.toUpperCase()] || '#666'
}

function formatNota(nota: number | null): string {
  if (nota === null || nota === undefined) return '-'
  return parseFloat(String(nota)).toFixed(2)
}

export async function imprimirRelatorioSISAM(aluno: any) {
  // Buscar resultados SISAM do aluno
  const res = await fetch(`/api/admin/alunos/${aluno.id}/resultados-sisam`)
  if (!res.ok) {
    alert('Erro ao carregar resultados SISAM')
    return
  }

  const resultados: ResultadoSISAM[] = await res.json()

  if (!resultados || resultados.length === 0) {
    alert('Nenhum resultado SISAM encontrado para este aluno.')
    return
  }

  const anoAtual = aluno.ano_letivo || new Date().getFullYear().toString()
  const dataHoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  // Agrupar resultados por ano
  const porAno: Record<string, ResultadoSISAM[]> = {}
  for (const r of resultados) {
    if (!porAno[r.ano_letivo]) porAno[r.ano_letivo] = []
    porAno[r.ano_letivo].push(r)
  }
  const anos = Object.keys(porAno).sort()

  // Gerar tabelas por ano
  let tabelasAnosHtml = ''
  for (const ano of anos) {
    const regs = porAno[ano]
    const primeiro = regs[0]
    const iniciais = isAnosIniciais(primeiro.serie)

    tabelasAnosHtml += `
      <div class="section">
        <div class="section-title">Ano Letivo ${escapeHtml(ano)} — ${escapeHtml(primeiro.serie)} — ${escapeHtml(primeiro.escola_nome)}</div>
        <div class="section-body" style="padding: 0;">
          <table class="notas-table">
            <thead>
              <tr>
                <th style="text-align: left;">Disciplina</th>
                <th>Nota</th>
              </tr>
            </thead>
            <tbody>
    `

    for (const r of regs) {
      if (r.nota_lp !== null) {
        tabelasAnosHtml += `<tr><td style="text-align: left;">Língua Portuguesa</td><td>${formatNota(r.nota_lp)}</td></tr>`
      }
      if (r.nota_mat !== null) {
        tabelasAnosHtml += `<tr><td style="text-align: left;">Matemática</td><td>${formatNota(r.nota_mat)}</td></tr>`
      }
      if (!iniciais && r.nota_ch !== null) {
        tabelasAnosHtml += `<tr><td style="text-align: left;">Ciências Humanas</td><td>${formatNota(r.nota_ch)}</td></tr>`
      }
      if (!iniciais && r.nota_cn !== null) {
        tabelasAnosHtml += `<tr><td style="text-align: left;">Ciências da Natureza</td><td>${formatNota(r.nota_cn)}</td></tr>`
      }
      if (iniciais && r.nota_producao !== null) {
        tabelasAnosHtml += `<tr><td style="text-align: left;">Produção Textual</td><td>${formatNota(r.nota_producao)}</td></tr>`
      }

      // Média geral
      tabelasAnosHtml += `
        <tr class="media-row">
          <td style="text-align: left; font-weight: bold;">Média Geral</td>
          <td style="font-weight: bold; font-size: 13px;">${formatNota(r.media_aluno)}</td>
        </tr>
      `

      // Nível de aprendizagem
      if (r.nivel_aprendizagem) {
        tabelasAnosHtml += `
          <tr>
            <td style="text-align: left;">Nível de Aprendizagem</td>
            <td><span class="nivel-badge" style="color: ${getNivelCor(r.nivel_aprendizagem)}; font-weight: bold;">${escapeHtml(getNivelLabel(r.nivel_aprendizagem))}</span></td>
          </tr>
        `
      }

      // Presença
      tabelasAnosHtml += `
        <tr>
          <td style="text-align: left;">Presença</td>
          <td>${r.presenca === 'P' ? '<span style="color: #059669; font-weight: bold;">Presente</span>' : r.presenca === 'F' ? '<span style="color: #dc2626; font-weight: bold;">Faltou</span>' : '-'}</td>
        </tr>
      `
    }

    tabelasAnosHtml += `
            </tbody>
          </table>
        </div>
      </div>
    `
  }

  // Seção de evolução (comparação entre anos)
  let evolucaoHtml = ''
  if (anos.length > 1) {
    evolucaoHtml = `
      <div class="section">
        <div class="section-title">Evolução entre Avaliações</div>
        <div class="section-body" style="padding: 0;">
          <table class="notas-table">
            <thead>
              <tr>
                <th style="text-align: left;">Indicador</th>
                ${anos.map(a => `<th>${escapeHtml(a)}</th>`).join('')}
                <th>Variação</th>
              </tr>
            </thead>
            <tbody>
    `

    const primeiro = porAno[anos[0]][0]
    const ultimo = porAno[anos[anos.length - 1]][0]

    const indicadores = [
      { label: 'Língua Portuguesa', campo: 'nota_lp' as const },
      { label: 'Matemática', campo: 'nota_mat' as const },
      { label: 'Média Geral', campo: 'media_aluno' as const },
    ]

    for (const ind of indicadores) {
      const valores = anos.map(a => {
        const r = porAno[a][0]
        return r[ind.campo]
      })
      const primeiroVal = valores[0]
      const ultimoVal = valores[valores.length - 1]
      let variacao = '-'
      let variacaoCor = '#666'
      if (primeiroVal !== null && ultimoVal !== null) {
        const diff = parseFloat(String(ultimoVal)) - parseFloat(String(primeiroVal))
        variacao = (diff > 0 ? '+' : '') + diff.toFixed(2)
        variacaoCor = diff > 0 ? '#059669' : diff < 0 ? '#dc2626' : '#666'
      }

      evolucaoHtml += `
        <tr>
          <td style="text-align: left; font-weight: 500;">${ind.label}</td>
          ${valores.map(v => `<td>${formatNota(v)}</td>`).join('')}
          <td style="color: ${variacaoCor}; font-weight: bold;">${variacao}</td>
        </tr>
      `
    }

    evolucaoHtml += `
            </tbody>
          </table>
        </div>
      </div>
    `
  }

  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Relatório SISAM - ${escapeHtml(aluno.nome)}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; margin: 15mm 18mm; color: #222; font-size: 11px; line-height: 1.4; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 14px; }
        .header h2 { font-size: 14px; margin-bottom: 2px; text-transform: uppercase; }
        .header h1 { font-size: 16px; letter-spacing: 2px; margin-top: 6px; color: #1e3a5f; }
        .header p { font-size: 11px; color: #555; }
        .section { margin-bottom: 12px; }
        .section-title {
          background: #f0f0f0; padding: 4px 8px; font-weight: bold; font-size: 11px;
          text-transform: uppercase; border: 1px solid #ccc; border-bottom: none;
        }
        .section-body { border: 1px solid #ccc; padding: 8px; }
        .row { display: flex; flex-wrap: wrap; gap: 0; }
        .field { flex: 1 1 25%; min-width: 120px; padding: 3px 6px; }
        .field-label { font-size: 9px; color: #666; text-transform: uppercase; font-weight: 600; }
        .field-value { font-size: 11px; font-weight: 500; min-height: 14px; border-bottom: 1px dotted #bbb; padding-bottom: 1px; }
        .field-wide { flex: 1 1 50%; }
        .notas-table { width: 100%; border-collapse: collapse; font-size: 11px; }
        .notas-table th { background: #f5f5f5; padding: 4px 6px; border: 1px solid #ddd; text-align: center; font-size: 9px; text-transform: uppercase; }
        .notas-table td { padding: 4px 6px; border: 1px solid #ddd; text-align: center; }
        .media-row td { background: #f9fafb; border-top: 2px solid #ccc; }
        .nivel-badge { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 10px; }
        .assinaturas { margin-top: 30px; display: flex; justify-content: space-between; gap: 20px; }
        .assinatura { flex: 1; text-align: center; }
        .assinatura .linha { border-top: 1px solid #333; margin-top: 50px; padding-top: 4px; font-size: 10px; }
        .data-local { margin-top: 20px; font-size: 11px; text-align: right; }
        .footer-note { margin-top: 12px; font-size: 9px; color: #888; text-align: center; border-top: 1px solid #ddd; padding-top: 6px; }
        @media print {
          body { margin: 10mm 15mm; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>SEMED — São Sebastião da Boa Vista</h2>
        <p>Secretaria Municipal de Educação</p>
        <h1>Relatório Individual — Avaliação SISAM</h1>
      </div>

      <!-- Identificação do Aluno -->
      <div class="section">
        <div class="section-title">Identificação do Aluno</div>
        <div class="section-body">
          <div class="row">
            <div class="field field-wide">
              <div class="field-label">Nome Completo</div>
              <div class="field-value">${escapeHtml(aluno.nome)}</div>
            </div>
            <div class="field">
              <div class="field-label">Código</div>
              <div class="field-value">${escapeHtml(aluno.codigo)}</div>
            </div>
          </div>
          <div class="row">
            <div class="field field-wide">
              <div class="field-label">Escola</div>
              <div class="field-value">${escapeHtml(aluno.escola_nome)}</div>
            </div>
            <div class="field">
              <div class="field-label">Série</div>
              <div class="field-value">${escapeHtml(aluno.serie)}</div>
            </div>
            <div class="field">
              <div class="field-label">Ano Letivo</div>
              <div class="field-value">${escapeHtml(anoAtual)}</div>
            </div>
          </div>
        </div>
      </div>

      ${tabelasAnosHtml}
      ${evolucaoHtml}

      <!-- Data e local -->
      <div class="data-local">
        São Sebastião da Boa Vista — PA, ${dataHoje}
      </div>

      <!-- Assinaturas -->
      <div class="assinaturas">
        <div class="assinatura">
          <div class="linha">Coordenador(a) Pedagógico(a)</div>
        </div>
        <div class="assinatura">
          <div class="linha">Secretário(a) de Educação</div>
        </div>
      </div>

      <div class="footer-note">
        Documento gerado pelo sistema Educatec — SEMED SSBV | ${dataHoje}
      </div>

      <script>window.onload = function() { window.print(); }</script>
    </body>
    </html>
  `)
  printWindow.document.close()
}
