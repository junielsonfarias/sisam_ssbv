import { TurmaDetalhe, escapeHtml, calcularIdade } from './types'

export function imprimirRelacaoAlunos(
  detalhesTurma: TurmaDetalhe,
  formatSerie: (serie: string) => string,
) {
  const { turma, alunos } = detalhesTurma
  const isMulti = turma.multiserie || turma.multietapa
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Relação de Alunos - ${escapeHtml(turma.codigo)}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        .info { font-size: 13px; color: #555; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
        th { background: #f3f4f6; font-weight: 600; }
        tr:nth-child(even) { background: #f9fafb; }
        .pcd { background: #dbeafe; color: #1e40af; padding: 1px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; }
        .inativo { opacity: 0.6; }
        .inativo td { color: #888; }
        .inativo .nome { text-decoration: line-through; }
        .data-saida { color: #dc2626; font-size: 10px; display: block; }
        .total { margin-top: 12px; font-size: 13px; font-weight: 600; }
        .resumo { margin-top: 4px; font-size: 12px; color: #666; }
        @media print { body { margin: 10mm; } }
      </style>
    </head>
    <body>
      <h1>Relação de Alunos - Turma ${escapeHtml(turma.codigo)}${turma.nome ? ' (' + escapeHtml(turma.nome) + ')' : ''}</h1>
      <div class="info">
        <p>Escola: ${escapeHtml(turma.escola_nome)} | Série: ${escapeHtml(formatSerie(turma.serie))} | Ano Letivo: ${escapeHtml(turma.ano_letivo)}${turma.multiserie ? ' | <strong>Multisseriada</strong>' : ''}${turma.multietapa ? ' | <strong>Multietapa</strong>' : ''}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width:35px">Ord.</th>
            <th>Nome do Aluno</th>
            ${isMulti ? '<th style="width:80px; text-align:center">Série</th>' : ''}
            <th style="width:55px; text-align:center">Idade</th>
            <th style="width:80px; text-align:center">Matrícula</th>
            <th style="width:90px; text-align:center">Situação</th>
            <th style="width:50px; text-align:center">PCD</th>
          </tr>
        </thead>
        <tbody>
          ${alunos.map((a, i) => {
            const idade = a.data_nascimento ? calcularIdade(a.data_nascimento) : null
            const sit = a.situacao ? a.situacao.charAt(0).toUpperCase() + a.situacao.slice(1) : 'Cursando'
            const isInativo = ['transferido', 'abandono'].includes(a.situacao || '')
            const dataMatricula = a.data_matricula ? new Date(a.data_matricula).toLocaleDateString('pt-BR') : '-'
            const dataTransf = a.data_transferencia ? new Date(a.data_transferencia).toLocaleDateString('pt-BR') : ''
            return `
            <tr class="${isInativo ? 'inativo' : ''}">
              <td>${i + 1}</td>
              <td><span class="${isInativo ? 'nome' : ''}">${escapeHtml(a.nome)}</span>${isInativo && dataTransf ? '<span class="data-saida">' + escapeHtml(sit) + ' em ' + dataTransf + '</span>' : ''}</td>
              ${isMulti ? '<td style="text-align:center">' + (a.serie ? escapeHtml(formatSerie(a.serie)) : '-') + '</td>' : ''}
              <td style="text-align:center">${idade !== null ? idade : '-'}</td>
              <td style="text-align:center">${dataMatricula}</td>
              <td style="text-align:center">${escapeHtml(sit)}</td>
              <td style="text-align:center">${a.pcd ? '<span class="pcd">PCD</span>' : '-'}</td>
            </tr>`
          }).join('')}
        </tbody>
      </table>
      ${(() => {
        const ativos = alunos.filter(a => !['transferido', 'abandono'].includes(a.situacao || '')).length
        const inativos = alunos.length - ativos
        return `
          <p class="total">Total de alunos ativos: ${ativos}</p>
          ${inativos > 0 ? '<p class="resumo">Transferidos/Saídas: ' + inativos + ' aluno(s)</p>' : ''}
          <p class="resumo">PCD: ${alunos.filter(a => a.pcd).length} aluno(s)</p>
        `
      })()}
      <script>window.onload = function() { window.print(); }</script>
    </body>
    </html>
  `)
  printWindow.document.close()
}
