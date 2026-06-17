/**
 * Gera o Histórico Escolar completo formatado para impressão via window.print()
 */

function escapeHtml(text: string | null | undefined): string {
  if (!text) return '-'
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }
  return text.replace(/[&<>"']/g, c => map[c])
}

function formatDate(date: string | null | undefined): string {
  if (!date) return '-'
  // Se já está formatado (dd/mm/aaaa), retornar diretamente
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) return date
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('pt-BR')
}

interface BimestreNota {
  nota: number | null
  recuperacao: number | null
  final: number | null
  faltas: number
}

interface DisciplinaNotas {
  disciplina: string
  abreviacao: string
  ordem: number
  bimestres: Record<number, BimestreNota>
  media: number | null
  total_faltas: number
}

interface HistoricoData {
  aluno: any
  historico_situacao: any[]
  notas_por_ano: Record<string, Record<string, DisciplinaNotas>>
  resultados_sisam: any[]
}

export async function imprimirHistoricoEscolar(alunoId: string) {
  // Buscar dados do histórico
  const res = await fetch(`/api/admin/alunos/${alunoId}/historico`)
  if (!res.ok) {
    alert('Erro ao carregar histórico escolar')
    return
  }

  const dados: HistoricoData = await res.json()
  const { aluno, notas_por_ano, historico_situacao, resultados_sisam } = dados

  const anoAtual = aluno.ano_letivo || new Date().getFullYear().toString()

  // Gerar seções de notas por ano
  const anosComNotas = Object.keys(notas_por_ano).sort()

  let tabelasNotasHtml = ''
  if (anosComNotas.length > 0) {
    for (const ano of anosComNotas) {
      const disciplinas = Object.values(notas_por_ano[ano]).sort((a, b) => a.ordem - b.ordem)
      tabelasNotasHtml += `
        <div class="section">
          <div class="section-title">Notas - Ano Letivo ${escapeHtml(ano)}</div>
          <div class="section-body" style="padding: 0;">
            <table class="notas-table">
              <thead>
                <tr>
                  <th style="text-align: left;">Disciplina</th>
                  <th>1&ordm; Bim</th>
                  <th>2&ordm; Bim</th>
                  <th>3&ordm; Bim</th>
                  <th>4&ordm; Bim</th>
                  <th>Media</th>
                  <th>Faltas</th>
                </tr>
              </thead>
              <tbody>
                ${disciplinas.map(d => {
                  const b1 = d.bimestres[1]
                  const b2 = d.bimestres[2]
                  const b3 = d.bimestres[3]
                  const b4 = d.bimestres[4]
                  return `<tr>
                    <td style="text-align: left; font-weight: 500;">${escapeHtml(d.disciplina)}</td>
                    <td>${b1 ? (b1.final ?? b1.nota ?? '-') : '-'}</td>
                    <td>${b2 ? (b2.final ?? b2.nota ?? '-') : '-'}</td>
                    <td>${b3 ? (b3.final ?? b3.nota ?? '-') : '-'}</td>
                    <td>${b4 ? (b4.final ?? b4.nota ?? '-') : '-'}</td>
                    <td style="font-weight: bold;">${d.media ?? '-'}</td>
                    <td>${d.total_faltas}</td>
                  </tr>`
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `
    }
  }

  // Tabela simplificada de histórico (situação por ano)
  let tabelaHistoricoHtml = ''
  if (historico_situacao.length > 0) {
    tabelaHistoricoHtml = `
      <div class="section">
        <div class="section-title">Historico de Situacao</div>
        <div class="section-body" style="padding: 0;">
          <table class="notas-table">
            <thead>
              <tr>
                <th style="text-align: left;">Data</th>
                <th>Situacao</th>
                <th style="text-align: left;">Observacao</th>
              </tr>
            </thead>
            <tbody>
              ${historico_situacao.map(h => `
                <tr>
                  <td style="text-align: left;">${formatDate(h.data)}</td>
                  <td>${escapeHtml(h.situacao)}</td>
                  <td style="text-align: left;">${escapeHtml(h.observacao) || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `
  }

  // Resultados SISAM
  let tabelaSisamHtml = ''
  if (resultados_sisam.length > 0) {
    tabelaSisamHtml = `
      <div class="section">
        <div class="section-title">Avaliacao SISAM</div>
        <div class="section-body" style="padding: 0;">
          <table class="notas-table">
            <thead>
              <tr>
                <th>Ano</th>
                <th>Serie</th>
                <th>Media</th>
                <th>Presenca</th>
              </tr>
            </thead>
            <tbody>
              ${resultados_sisam.map(r => `
                <tr>
                  <td>${escapeHtml(r.ano_letivo)}</td>
                  <td>${escapeHtml(r.serie)}</td>
                  <td>${r.media_aluno ?? '-'}</td>
                  <td>${r.presenca ? r.presenca + '%' : '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `
  }

  // Se não houver notas detalhadas, mostrar tabela simplificada
  let tabelaSimplificadaHtml = ''
  if (anosComNotas.length === 0) {
    tabelaSimplificadaHtml = `
      <div class="section">
        <div class="section-title">Vida Escolar</div>
        <div class="section-body">
          <table class="notas-table">
            <thead>
              <tr>
                <th>Ano</th>
                <th>Serie</th>
                <th style="text-align: left;">Escola</th>
                <th>Situacao</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${escapeHtml(aluno.ano_letivo)}</td>
                <td>${escapeHtml(aluno.serie)}</td>
                <td style="text-align: left;">${escapeHtml(aluno.escola_nome)}</td>
                <td>${escapeHtml(aluno.situacao)}</td>
              </tr>
            </tbody>
          </table>
          <p style="margin-top: 8px; font-size: 10px; color: #888;">
            Notas detalhadas nao disponiveis para os anos anteriores.
          </p>
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
      <title>Historico Escolar - ${escapeHtml(aluno.nome)}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; margin: 15mm 18mm; color: #222; font-size: 11px; line-height: 1.4; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 14px; }
        .header h2 { font-size: 14px; margin-bottom: 2px; text-transform: uppercase; }
        .header h1 { font-size: 18px; letter-spacing: 2px; margin-top: 6px; }
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
        .field-full { flex: 1 1 100%; }
        .notas-table { width: 100%; border-collapse: collapse; font-size: 10px; }
        .notas-table th { background: #f5f5f5; padding: 4px 6px; border: 1px solid #ddd; text-align: center; font-size: 9px; text-transform: uppercase; }
        .notas-table td { padding: 3px 6px; border: 1px solid #ddd; text-align: center; }
        .assinaturas { margin-top: 30px; display: flex; justify-content: space-between; gap: 20px; }
        .assinatura { flex: 1; text-align: center; }
        .assinatura .linha { border-top: 1px solid #333; margin-top: 50px; padding-top: 4px; font-size: 10px; }
        .data-local { margin-top: 20px; font-size: 11px; text-align: right; }
        @media print {
          body { margin: 10mm 15mm; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>SEMED - Sao Sebastiao da Boa Vista</h2>
        <p>Secretaria Municipal de Educacao</p>
        <h1>Historico Escolar</h1>
        ${aluno.escola_nome ? `<p>${escapeHtml(aluno.escola_nome)}</p>` : ''}
      </div>

      <!-- Dados do Aluno -->
      <div class="section">
        <div class="section-title">Identificacao do Aluno</div>
        <div class="section-body">
          <div class="row">
            <div class="field field-wide">
              <div class="field-label">Nome Completo</div>
              <div class="field-value">${escapeHtml(aluno.nome)}</div>
            </div>
            <div class="field">
              <div class="field-label">Data de Nascimento</div>
              <div class="field-value">${escapeHtml(aluno.data_nascimento)}</div>
            </div>
            <div class="field">
              <div class="field-label">CPF</div>
              <div class="field-value">${escapeHtml(aluno.cpf)}</div>
            </div>
          </div>
          <div class="row">
            <div class="field">
              <div class="field-label">Naturalidade</div>
              <div class="field-value">${escapeHtml(aluno.naturalidade)}</div>
            </div>
            <div class="field">
              <div class="field-label">Nacionalidade</div>
              <div class="field-value">${escapeHtml(aluno.nacionalidade)}</div>
            </div>
            <div class="field">
              <div class="field-label">RG</div>
              <div class="field-value">${escapeHtml(aluno.rg)}</div>
            </div>
            <div class="field">
              <div class="field-label">Sexo</div>
              <div class="field-value">${escapeHtml(aluno.sexo)}</div>
            </div>
          </div>
          <div class="row">
            <div class="field field-wide">
              <div class="field-label">Mae</div>
              <div class="field-value">${escapeHtml(aluno.nome_mae)}</div>
            </div>
            <div class="field field-wide">
              <div class="field-label">Pai</div>
              <div class="field-value">${escapeHtml(aluno.nome_pai)}</div>
            </div>
          </div>
          <div class="row">
            <div class="field">
              <div class="field-label">Codigo</div>
              <div class="field-value">${escapeHtml(aluno.codigo)}</div>
            </div>
            <div class="field">
              <div class="field-label">Serie Atual</div>
              <div class="field-value">${escapeHtml(aluno.serie)}</div>
            </div>
            <div class="field">
              <div class="field-label">Ano Letivo</div>
              <div class="field-value">${escapeHtml(aluno.ano_letivo)}</div>
            </div>
            <div class="field">
              <div class="field-label">Situacao</div>
              <div class="field-value">${escapeHtml(aluno.situacao)}</div>
            </div>
          </div>
        </div>
      </div>

      ${tabelasNotasHtml}
      ${tabelaSimplificadaHtml}
      ${tabelaHistoricoHtml}
      ${tabelaSisamHtml}

      <!-- Data e local -->
      <div class="data-local">
        Sao Sebastiao da Boa Vista - PA, ______ de ________________________ de ${anoAtual}
      </div>

      <!-- Assinaturas -->
      <div class="assinaturas">
        <div class="assinatura">
          <div class="linha">Secretario(a) Escolar</div>
        </div>
        <div class="assinatura">
          <div class="linha">Diretor(a) da Escola</div>
        </div>
      </div>

      <script>window.onload = function() { window.print(); }</script>
    </body>
    </html>
  `)
  printWindow.document.close()
}
