/**
 * Gera uma ficha de matrícula formatada para impressão via window.print()
 */

function escapeHtml(text: string | null | undefined): string {
  if (!text) return '-'
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }
  return text.replace(/[&<>"']/g, c => map[c])
}

function formatDate(date: string | null | undefined): string {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('pt-BR')
}

function boolLabel(val: boolean | null | undefined): string {
  return val ? 'Sim' : 'Não'
}

export function imprimirFichaMatricula(aluno: any) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const anoAtual = aluno.ano_letivo || new Date().getFullYear().toString()

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Ficha de Matrícula - ${escapeHtml(aluno.nome)}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; margin: 15mm 18mm; color: #222; font-size: 12px; line-height: 1.4; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 14px; }
        .header h2 { font-size: 14px; margin-bottom: 2px; text-transform: uppercase; }
        .header h1 { font-size: 18px; letter-spacing: 2px; margin-top: 6px; }
        .header p { font-size: 11px; color: #555; }
        .section { margin-bottom: 12px; }
        .section-title {
          background: #f0f0f0; padding: 4px 8px; font-weight: bold; font-size: 12px;
          text-transform: uppercase; border: 1px solid #ccc; border-bottom: none;
        }
        .section-body { border: 1px solid #ccc; padding: 8px; }
        .row { display: flex; flex-wrap: wrap; gap: 0; }
        .field { flex: 1 1 25%; min-width: 140px; padding: 3px 6px; }
        .field-label { font-size: 9px; color: #666; text-transform: uppercase; font-weight: 600; }
        .field-value { font-size: 12px; font-weight: 500; min-height: 16px; border-bottom: 1px dotted #bbb; padding-bottom: 1px; }
        .field-wide { flex: 1 1 50%; }
        .field-full { flex: 1 1 100%; }
        .termo { margin-top: 16px; border: 1px solid #ccc; padding: 10px; font-size: 11px; line-height: 1.5; }
        .termo h3 { font-size: 12px; text-align: center; margin-bottom: 8px; text-transform: uppercase; }
        .termo p { text-align: justify; margin-bottom: 6px; }
        .assinaturas { margin-top: 30px; display: flex; justify-content: space-between; gap: 20px; }
        .assinatura { flex: 1; text-align: center; }
        .assinatura .linha { border-top: 1px solid #333; margin-top: 50px; padding-top: 4px; font-size: 11px; }
        .data-local { margin-top: 20px; font-size: 11px; text-align: right; }
        .codigo { font-size: 10px; color: #888; text-align: right; margin-top: 8px; }
        @media print {
          body { margin: 10mm 15mm; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>SEMED - São Sebastião da Boa Vista</h2>
        <p>Secretaria Municipal de Educação</p>
        <h1>Ficha de Matrícula</h1>
        <p>Ano Letivo: ${escapeHtml(anoAtual)}</p>
      </div>

      <!-- Dados do Aluno -->
      <div class="section">
        <div class="section-title">Dados do Aluno</div>
        <div class="section-body">
          <div class="row">
            <div class="field field-wide">
              <div class="field-label">Nome Completo</div>
              <div class="field-value">${escapeHtml(aluno.nome)}</div>
            </div>
            <div class="field">
              <div class="field-label">Data de Nascimento</div>
              <div class="field-value">${formatDate(aluno.data_nascimento)}</div>
            </div>
            <div class="field">
              <div class="field-label">CPF</div>
              <div class="field-value">${escapeHtml(aluno.cpf)}</div>
            </div>
          </div>
          <div class="row">
            <div class="field">
              <div class="field-label">Código de Matrícula</div>
              <div class="field-value">${escapeHtml(aluno.codigo)}</div>
            </div>
            <div class="field">
              <div class="field-label">Série</div>
              <div class="field-value">${escapeHtml(aluno.serie)}</div>
            </div>
            <div class="field">
              <div class="field-label">Turma</div>
              <div class="field-value">${escapeHtml(aluno.turma_codigo)}</div>
            </div>
            <div class="field">
              <div class="field-label">Turno</div>
              <div class="field-value">${escapeHtml(aluno.turno)}</div>
            </div>
          </div>
          <div class="row">
            <div class="field field-wide">
              <div class="field-label">Escola</div>
              <div class="field-value">${escapeHtml(aluno.escola_nome)}</div>
            </div>
            <div class="field">
              <div class="field-label">Gênero</div>
              <div class="field-value">${escapeHtml(aluno.genero)}</div>
            </div>
            <div class="field">
              <div class="field-label">Raça/Cor</div>
              <div class="field-value">${escapeHtml(aluno.raca_cor)}</div>
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
              <div class="field-label">Certidão de Nascimento</div>
              <div class="field-value">${escapeHtml(aluno.certidao_nascimento)}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Responsável / Família -->
      <div class="section">
        <div class="section-title">Responsável / Família</div>
        <div class="section-body">
          <div class="row">
            <div class="field field-wide">
              <div class="field-label">Nome da Mãe</div>
              <div class="field-value">${escapeHtml(aluno.nome_mae)}</div>
            </div>
            <div class="field field-wide">
              <div class="field-label">Nome do Pai</div>
              <div class="field-value">${escapeHtml(aluno.nome_pai)}</div>
            </div>
          </div>
          <div class="row">
            <div class="field field-wide">
              <div class="field-label">Responsável</div>
              <div class="field-value">${escapeHtml(aluno.responsavel)}</div>
            </div>
            <div class="field">
              <div class="field-label">Telefone</div>
              <div class="field-value">${escapeHtml(aluno.telefone_responsavel)}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Endereço -->
      <div class="section">
        <div class="section-title">Endereço</div>
        <div class="section-body">
          <div class="row">
            <div class="field field-wide">
              <div class="field-label">Endereço</div>
              <div class="field-value">${escapeHtml(aluno.endereco)}</div>
            </div>
            <div class="field">
              <div class="field-label">Bairro</div>
              <div class="field-value">${escapeHtml(aluno.bairro)}</div>
            </div>
          </div>
          <div class="row">
            <div class="field">
              <div class="field-label">Cidade</div>
              <div class="field-value">${escapeHtml(aluno.cidade)}</div>
            </div>
            <div class="field">
              <div class="field-label">CEP</div>
              <div class="field-value">${escapeHtml(aluno.cep)}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Dados Complementares -->
      <div class="section">
        <div class="section-title">Dados Complementares</div>
        <div class="section-body">
          <div class="row">
            <div class="field">
              <div class="field-label">PCD</div>
              <div class="field-value">${boolLabel(aluno.pcd)}</div>
            </div>
            <div class="field">
              <div class="field-label">Tipo de Deficiência</div>
              <div class="field-value">${escapeHtml(aluno.tipo_deficiencia)}</div>
            </div>
            <div class="field">
              <div class="field-label">Bolsa Família</div>
              <div class="field-value">${boolLabel(aluno.bolsa_familia)}</div>
            </div>
            <div class="field">
              <div class="field-label">NIS</div>
              <div class="field-value">${escapeHtml(aluno.nis)}</div>
            </div>
          </div>
          <div class="row">
            <div class="field">
              <div class="field-label">Cartão SUS</div>
              <div class="field-value">${escapeHtml(aluno.sus)}</div>
            </div>
            <div class="field">
              <div class="field-label">Data de Matrícula</div>
              <div class="field-value">${formatDate(aluno.data_matricula)}</div>
            </div>
            <div class="field">
              <div class="field-label">Situação</div>
              <div class="field-value">${escapeHtml(aluno.situacao ? aluno.situacao.charAt(0).toUpperCase() + aluno.situacao.slice(1) : 'Cursando')}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Termo de Compromisso -->
      <div class="termo">
        <h3>Termo de Compromisso</h3>
        <p>
          Declaro, para os devidos fins, que as informações acima prestadas são verdadeiras e que me comprometo
          a acompanhar a vida escolar do(a) aluno(a), comparecer às reuniões escolares quando convocado(a),
          zelar pela assiduidade e pontualidade do(a) estudante, e comunicar à escola qualquer alteração
          nos dados cadastrais.
        </p>
        <p>
          Estou ciente de que a matrícula poderá ser cancelada em caso de informações falsas ou
          descumprimento do regimento escolar.
        </p>
      </div>

      <!-- Data e local -->
      <div class="data-local">
        São Sebastião da Boa Vista - PA, ______ de ________________________ de ${anoAtual}
      </div>

      <!-- Assinaturas -->
      <div class="assinaturas">
        <div class="assinatura">
          <div class="linha">Responsável</div>
        </div>
        <div class="assinatura">
          <div class="linha">Diretor(a) da Escola</div>
        </div>
        <div class="assinatura">
          <div class="linha">Secretário(a) Escolar</div>
        </div>
      </div>

      <div class="codigo">
        ${aluno.id ? 'Ref: ' + escapeHtml(aluno.id.substring(0, 8)) : ''}
      </div>

      <script>window.onload = function() { window.print(); }</script>
    </body>
    </html>
  `)
  printWindow.document.close()
}
