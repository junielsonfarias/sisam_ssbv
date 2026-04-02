/**
 * Gerador de Manuais em PDF — SISAM Gestor Escolar
 *
 * Usa PDFKit para gerar PDFs formatados com mockups das telas.
 * Executar: node docs/manuais/gerar-pdfs.js
 */

const PDFDocument = require('pdfkit')
const fs = require('fs')
const path = require('path')

const OUTPUT_DIR = path.join(__dirname, 'pdf')
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true })

// ============================================================================
// CORES E CONSTANTES
// ============================================================================
const CORES = {
  primaria: '#4f46e5',     // indigo-600
  primariaDark: '#3730a3',
  verde: '#16a34a',
  amarelo: '#d97706',
  vermelho: '#dc2626',
  cinzaEscuro: '#1e293b',
  cinzaMedio: '#475569',
  cinzaClaro: '#94a3b8',
  cinzaBg: '#f1f5f9',
  branco: '#ffffff',
  preto: '#0f172a',
}

const MARGEM = 50
const LARGURA = 595.28 - MARGEM * 2  // A4

// ============================================================================
// HELPERS
// ============================================================================

function criarDoc(nomeArquivo) {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 60, left: 50, right: 50 },
    bufferPages: true,
    info: {
      Title: nomeArquivo.replace('.pdf', ''),
      Author: 'SISAM — SEMED São Sebastião da Boa Vista',
      Subject: 'Manual do Gestor Escolar',
    }
  })
  const stream = fs.createWriteStream(path.join(OUTPUT_DIR, nomeArquivo))
  doc.pipe(stream)
  return { doc, stream }
}

function titulo(doc, texto, opts = {}) {
  verificarEspaco(doc, 60)
  doc.moveDown(0.5)
  doc.fontSize(opts.tamanho || 22).fillColor(CORES.primaria).font('Helvetica-Bold')
  doc.text(texto, { align: 'left' })
  doc.moveDown(0.3)
  // Linha decorativa
  doc.save()
  doc.moveTo(MARGEM, doc.y).lineTo(MARGEM + LARGURA, doc.y)
    .strokeColor(CORES.primaria).lineWidth(2).stroke()
  doc.restore()
  doc.moveDown(0.5)
}

function subtitulo(doc, texto) {
  verificarEspaco(doc, 40)
  doc.moveDown(0.4)
  doc.fontSize(14).fillColor(CORES.cinzaEscuro).font('Helvetica-Bold')
  doc.text(texto)
  doc.moveDown(0.3)
}

function paragrafo(doc, texto) {
  doc.fontSize(10).fillColor(CORES.cinzaMedio).font('Helvetica')
  doc.text(texto, { lineGap: 3 })
  doc.moveDown(0.3)
}

function itemLista(doc, texto, nivel = 0) {
  const indent = MARGEM + (nivel * 15)
  const marcador = nivel === 0 ? '•' : '◦'
  doc.fontSize(10).fillColor(CORES.cinzaMedio).font('Helvetica')
  doc.text(`${marcador}  ${texto}`, indent, doc.y, { width: LARGURA - (nivel * 15) })
  doc.moveDown(0.1)
}

function negrito(doc, label, valor) {
  doc.fontSize(10).font('Helvetica-Bold').fillColor(CORES.cinzaEscuro)
  doc.text(label, { continued: true })
  doc.font('Helvetica').fillColor(CORES.cinzaMedio)
  doc.text(` ${valor}`)
  doc.moveDown(0.1)
}

function destaque(doc, texto, cor = CORES.primaria) {
  verificarEspaco(doc, 45)
  const y = doc.y
  doc.save()
  doc.roundedRect(MARGEM, y, LARGURA, 35, 5).fillColor(cor).fillOpacity(0.08).fill()
  doc.roundedRect(MARGEM, y, LARGURA, 35, 5).strokeColor(cor).strokeOpacity(0.3).lineWidth(1).stroke()
  doc.restore()
  doc.fillOpacity(1)
  doc.fontSize(9.5).fillColor(cor).font('Helvetica-Bold')
  doc.text(texto, MARGEM + 12, y + 11, { width: LARGURA - 24 })
  doc.y = y + 40
  doc.moveDown(0.2)
}

function verificarEspaco(doc, espaco = 80) {
  if (doc.y + espaco > 780) {
    doc.addPage()
  }
}

function passo(doc, numero, texto) {
  verificarEspaco(doc, 30)
  doc.fontSize(10).font('Helvetica-Bold').fillColor(CORES.primaria)
  doc.text(`Passo ${numero}: `, { continued: true })
  doc.font('Helvetica').fillColor(CORES.cinzaMedio)
  doc.text(texto)
  doc.moveDown(0.2)
}

function tabela(doc, headers, rows) {
  verificarEspaco(doc, 30 + rows.length * 22)
  const colW = LARGURA / headers.length
  let y = doc.y

  // Header
  doc.save()
  doc.rect(MARGEM, y, LARGURA, 22).fillColor(CORES.primaria).fill()
  doc.restore()
  headers.forEach((h, i) => {
    doc.fontSize(9).font('Helvetica-Bold').fillColor(CORES.branco)
    doc.text(h, MARGEM + i * colW + 6, y + 6, { width: colW - 12 })
  })
  y += 22

  // Rows
  rows.forEach((row, ri) => {
    const bgColor = ri % 2 === 0 ? CORES.cinzaBg : CORES.branco
    doc.save()
    doc.rect(MARGEM, y, LARGURA, 20).fillColor(bgColor).fill()
    doc.rect(MARGEM, y, LARGURA, 20).strokeColor('#e2e8f0').lineWidth(0.5).stroke()
    doc.restore()
    row.forEach((cell, ci) => {
      doc.fontSize(8.5).font('Helvetica').fillColor(CORES.cinzaEscuro)
      doc.text(String(cell), MARGEM + ci * colW + 6, y + 5, { width: colW - 12 })
    })
    y += 20
  })
  doc.y = y + 5
  doc.moveDown(0.3)
}

function rodape(doc) {
  const pages = doc.bufferedPageRange()
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i)
    doc.fontSize(8).fillColor(CORES.cinzaClaro).font('Helvetica')
    doc.text(
      `SISAM — Manual do Gestor Escolar | Pagina ${i + 1} de ${pages.count}`,
      MARGEM, 780, { width: LARGURA, align: 'center' }
    )
  }
}

// ============================================================================
// MOCKUPS DE TELAS
// ============================================================================

function mockupBase(doc, titulo, largura, altura) {
  verificarEspaco(doc, altura + 20)
  const x = MARGEM
  const y = doc.y

  // Janela
  doc.save()
  doc.roundedRect(x, y, largura, altura, 8).fillColor('#1e293b').fill()
  // Barra de titulo
  doc.roundedRect(x, y, largura, 28, 8).fillColor('#0f172a').fill()
  doc.rect(x, y + 20, largura, 8).fillColor('#0f172a').fill()
  // Bolinhas
  doc.circle(x + 14, y + 14, 4).fillColor('#ef4444').fill()
  doc.circle(x + 26, y + 14, 4).fillColor('#eab308').fill()
  doc.circle(x + 38, y + 14, 4).fillColor('#22c55e').fill()
  // Titulo
  doc.fontSize(8).fillColor('#94a3b8').font('Helvetica')
  doc.text(titulo, x + 50, y + 9, { width: largura - 60 })
  doc.restore()

  return { x, y: y + 28, w: largura, contentH: altura - 28 }
}

function mockupLogin(doc) {
  const { x, y, w } = mockupBase(doc, 'SISAM — Login', LARGURA, 220)
  const cx = x + w / 2

  doc.save()
  // Logo area
  doc.fontSize(14).fillColor(CORES.primaria).font('Helvetica-Bold')
  doc.text('SISAM', cx - 30, y + 15, { width: 60, align: 'center' })
  doc.fontSize(7).fillColor('#64748b').font('Helvetica')
  doc.text('Sistema de Gestao Escolar', cx - 70, y + 32, { width: 140, align: 'center' })

  // Campo email
  doc.roundedRect(cx - 90, y + 55, 180, 26, 4).fillColor('#334155').fill()
  doc.fontSize(8).fillColor('#94a3b8').text('Email', cx - 82, y + 63)

  // Campo senha
  doc.roundedRect(cx - 90, y + 90, 180, 26, 4).fillColor('#334155').fill()
  doc.fontSize(8).fillColor('#94a3b8').text('Senha', cx - 82, y + 98)

  // Botao
  doc.roundedRect(cx - 90, y + 130, 180, 32, 6).fillColor(CORES.primaria).fill()
  doc.fontSize(10).fillColor(CORES.branco).font('Helvetica-Bold')
  doc.text('Entrar', cx - 20, y + 140)

  // Link professor
  doc.fontSize(7).fillColor(CORES.primaria).font('Helvetica')
  doc.text('Sou professor — Criar minha conta', cx - 70, y + 172, { width: 140, align: 'center' })

  doc.restore()
  doc.y = y + 200
  doc.moveDown(0.5)
}

function mockupModulos(doc) {
  const { x, y, w } = mockupBase(doc, 'SISAM — Selecao de Modulos', LARGURA, 180)

  doc.save()
  doc.fontSize(10).fillColor(CORES.branco).font('Helvetica-Bold')
  doc.text('Ola, Maria! Selecione o modulo:', x + 20, y + 15)

  // Card SISAM
  const c1x = x + 15, c1y = y + 40
  doc.roundedRect(c1x, c1y, (w - 45) / 2, 100, 6).fillColor('#1e3a5f').fill()
  doc.roundedRect(c1x, c1y, (w - 45) / 2, 100, 6).strokeColor(CORES.primaria).lineWidth(1).stroke()
  doc.fontSize(11).fillColor(CORES.branco).font('Helvetica-Bold')
  doc.text('SISAM', c1x + 12, c1y + 12)
  doc.fontSize(7).fillColor('#94a3b8').font('Helvetica')
  doc.text('Painel de Dados e Graficos', c1x + 12, c1y + 32)
  doc.text('Resultados e Comparativos', c1x + 12, c1y + 44)
  doc.roundedRect(c1x + 12, c1y + 70, 80, 20, 4).fillColor(CORES.primaria).fill()
  doc.fontSize(8).fillColor(CORES.branco).font('Helvetica-Bold')
  doc.text('Acessar SISAM', c1x + 20, c1y + 76)

  // Card Gestor
  const c2x = x + 25 + (w - 45) / 2, c2y = y + 40
  doc.roundedRect(c2x, c2y, (w - 45) / 2, 100, 6).fillColor('#1e3a5f').fill()
  doc.roundedRect(c2x, c2y, (w - 45) / 2, 100, 6).strokeColor('#22c55e').lineWidth(1).stroke()
  doc.fontSize(11).fillColor(CORES.branco).font('Helvetica-Bold')
  doc.text('Gestor Escolar', c2x + 12, c2y + 12)
  doc.fontSize(7).fillColor('#94a3b8').font('Helvetica')
  doc.text('Notas, Frequencia e Matriculas', c2x + 12, c2y + 32)
  doc.text('Turmas, Alunos e Transferencias', c2x + 12, c2y + 44)
  doc.roundedRect(c2x + 12, c2y + 70, 80, 20, 4).fillColor('#22c55e').fill()
  doc.fontSize(8).fillColor(CORES.branco).font('Helvetica-Bold')
  doc.text('Acessar Gestor', c2x + 20, c2y + 76)

  doc.restore()
  doc.y = y + 160
  doc.moveDown(0.5)
}

function mockupDashboard(doc) {
  const { x, y, w } = mockupBase(doc, 'Gestor Escolar — Dashboard', LARGURA, 200)

  doc.save()
  // KPI cards
  const kpis = [
    { label: 'Alunos', valor: '2.593', cor: CORES.primaria },
    { label: 'Turmas', valor: '245', cor: '#8b5cf6' },
    { label: 'Escolas', valor: '29', cor: CORES.verde },
    { label: 'Frequencia', valor: '87%', cor: CORES.amarelo },
  ]
  const kpiW = (w - 50) / 4
  kpis.forEach((kpi, i) => {
    const kx = x + 10 + i * (kpiW + 10)
    doc.roundedRect(kx, y + 12, kpiW, 50, 4).fillColor('#334155').fill()
    doc.fontSize(16).fillColor(kpi.cor).font('Helvetica-Bold')
    doc.text(kpi.valor, kx + 8, y + 20, { width: kpiW - 16 })
    doc.fontSize(7).fillColor('#94a3b8').font('Helvetica')
    doc.text(kpi.label, kx + 8, y + 42, { width: kpiW - 16 })
  })

  // Grafico placeholder
  doc.roundedRect(x + 10, y + 75, w - 20, 100, 4).fillColor('#334155').fill()
  doc.fontSize(9).fillColor('#64748b').font('Helvetica')
  doc.text('Grafico de Desempenho por Disciplina', x + 30, y + 115, { width: w - 60, align: 'center' })

  // Barras do grafico
  const barras = [
    { label: 'LP', h: 50, cor: '#3b82f6' },
    { label: 'MAT', h: 35, cor: '#8b5cf6' },
    { label: 'CH', h: 45, cor: '#22c55e' },
    { label: 'CN', h: 40, cor: '#f59e0b' },
  ]
  barras.forEach((b, i) => {
    const bx = x + 100 + i * 70
    const by = y + 155 - b.h
    doc.rect(bx, by, 40, b.h).fillColor(b.cor).fill()
    doc.fontSize(7).fillColor('#94a3b8')
    doc.text(b.label, bx + 10, y + 160)
  })

  doc.restore()
  doc.y = y + 210
  doc.moveDown(0.5)
}

function mockupTabelaAlunos(doc) {
  const { x, y, w } = mockupBase(doc, 'Gestor Escolar — Lista de Alunos', LARGURA, 180)

  doc.save()
  // Filtros
  doc.roundedRect(x + 10, y + 8, 120, 20, 3).fillColor('#334155').fill()
  doc.fontSize(7).fillColor('#94a3b8').text('Escola: EMEF N.S. Lourdes', x + 16, y + 14)
  doc.roundedRect(x + 140, y + 8, 80, 20, 3).fillColor('#334155').fill()
  doc.fontSize(7).fillColor('#94a3b8').text('Turma: 5o Ano A', x + 146, y + 14)

  // Header tabela
  const th = y + 38
  doc.rect(x + 10, th, w - 20, 18).fillColor(CORES.primaria).fill()
  doc.fontSize(7).fillColor(CORES.branco).font('Helvetica-Bold')
  doc.text('Nome', x + 16, th + 5)
  doc.text('Status', x + 220, th + 5)
  doc.text('Acoes', x + 350, th + 5)

  // Rows
  const alunos = [
    { nome: 'Ana Beatriz Costa', status: 'Cadastrado', cor: CORES.verde },
    { nome: 'Joao Pedro Oliveira', status: 'Sem Embedding', cor: CORES.amarelo },
    { nome: 'Maria Silva Santos', status: 'Sem Consentimento', cor: CORES.vermelho },
    { nome: 'Pedro Henrique Lima', status: 'Cadastrado', cor: CORES.verde },
  ]
  alunos.forEach((a, i) => {
    const ry = th + 18 + i * 22
    const bg = i % 2 === 0 ? '#1e293b' : '#273548'
    doc.rect(x + 10, ry, w - 20, 22).fillColor(bg).fill()
    doc.fontSize(8).fillColor(CORES.branco).font('Helvetica')
    doc.text(a.nome, x + 16, ry + 6)
    // Badge
    doc.roundedRect(x + 216, ry + 4, 80, 14, 3).fillColor(a.cor).fillOpacity(0.2).fill()
    doc.fillOpacity(1).fontSize(7).fillColor(a.cor).font('Helvetica-Bold')
    doc.text(a.status, x + 222, ry + 7)
    // Botoes
    doc.roundedRect(x + 350, ry + 3, 50, 16, 3).fillColor(CORES.primaria).fill()
    doc.fontSize(7).fillColor(CORES.branco).text('Capturar', x + 356, ry + 7)
  })

  doc.restore()
  doc.y = y + 190
  doc.moveDown(0.5)
}

function mockupNotas(doc) {
  const { x, y, w } = mockupBase(doc, 'Gestor Escolar — Lancamento de Notas', LARGURA, 200)

  doc.save()
  // Filtros
  const filtros = ['Escola: EMEF N.S. Lourdes', 'Turma: 5o Ano A', 'Disciplina: Matematica', 'Periodo: 1o Bim']
  filtros.forEach((f, i) => {
    doc.roundedRect(x + 10 + i * 120, y + 8, 115, 18, 3).fillColor('#334155').fill()
    doc.fontSize(6.5).fillColor('#94a3b8').font('Helvetica').text(f, x + 16 + i * 120, y + 14)
  })

  // Tabela notas
  const th = y + 35
  doc.rect(x + 10, th, w - 20, 18).fillColor(CORES.primaria).fill()
  doc.fontSize(7).fillColor(CORES.branco).font('Helvetica-Bold')
  doc.text('Aluno', x + 16, th + 5)
  doc.text('Nota', x + 220, th + 5)
  doc.text('Recuperacao', x + 280, th + 5)
  doc.text('Faltas', x + 370, th + 5)
  doc.text('Obs', x + 420, th + 5)

  const notas = [
    { nome: 'Ana Beatriz Costa', nota: '8.5', rec: '-', faltas: '2', obs: '' },
    { nome: 'Joao Pedro Oliveira', nota: '4.0', rec: '7.0', faltas: '8', obs: 'Recuperacao' },
    { nome: 'Maria Silva Santos', nota: '9.0', rec: '-', faltas: '0', obs: '' },
    { nome: 'Pedro Henrique Lima', nota: '6.5', rec: '-', faltas: '3', obs: '' },
    { nome: 'Lucas Ferreira', nota: '3.5', rec: '5.0', faltas: '12', obs: 'Recuperacao' },
  ]
  notas.forEach((n, i) => {
    const ry = th + 18 + i * 20
    const bg = i % 2 === 0 ? '#1e293b' : '#273548'
    doc.rect(x + 10, ry, w - 20, 20).fillColor(bg).fill()
    doc.fontSize(8).fillColor(CORES.branco).font('Helvetica')
    doc.text(n.nome, x + 16, ry + 5)

    // Nota com cor
    const notaNum = parseFloat(n.nota)
    const notaCor = notaNum >= 6 ? CORES.verde : CORES.vermelho
    doc.fillColor(notaCor).font('Helvetica-Bold').text(n.nota, x + 225, ry + 5)

    doc.fillColor(n.rec === '-' ? '#64748b' : CORES.amarelo).font('Helvetica')
    doc.text(n.rec, x + 300, ry + 5)
    doc.fillColor(CORES.branco).text(n.faltas, x + 375, ry + 5)
    doc.fillColor('#64748b').fontSize(7).text(n.obs, x + 420, ry + 6)
  })

  // Resumo
  const ry = th + 18 + notas.length * 20 + 5
  doc.roundedRect(x + 10, ry, w - 20, 22, 3).fillColor('#334155').fill()
  doc.fontSize(8).fillColor('#94a3b8').font('Helvetica')
  doc.text('Media da turma: 6.3  |  Aprovados: 3  |  Em recuperacao: 2', x + 20, ry + 6)

  // Botao salvar
  doc.roundedRect(x + w - 110, ry + 28, 90, 24, 5).fillColor(CORES.primaria).fill()
  doc.fontSize(9).fillColor(CORES.branco).font('Helvetica-Bold')
  doc.text('Salvar Notas', x + w - 100, ry + 35)

  doc.restore()
  doc.y = y + 210
  doc.moveDown(0.5)
}

function mockupFrequencia(doc) {
  const { x, y, w } = mockupBase(doc, 'Gestor Escolar — Lancamento de Frequencia', LARGURA, 170)

  doc.save()
  // Info
  doc.fontSize(8).fillColor('#94a3b8').font('Helvetica')
  doc.text('Turma: 5o Ano A  |  Periodo: 1o Bimestre  |  Dias Letivos: 50', x + 15, y + 12)

  const th = y + 32
  doc.rect(x + 10, th, w - 20, 18).fillColor(CORES.primaria).fill()
  doc.fontSize(7).fillColor(CORES.branco).font('Helvetica-Bold')
  doc.text('Aluno', x + 16, th + 5)
  doc.text('Faltas', x + 220, th + 5)
  doc.text('Justif.', x + 280, th + 5)
  doc.text('Presencas', x + 340, th + 5)
  doc.text('% Freq.', x + 420, th + 5)

  const freq = [
    { nome: 'Ana Beatriz Costa', faltas: 3, just: 1, pres: 47, pct: '94%', cor: CORES.verde },
    { nome: 'Joao Pedro Oliveira', faltas: 12, just: 0, pres: 38, pct: '76%', cor: CORES.amarelo },
    { nome: 'Maria Silva Santos', faltas: 0, just: 0, pres: 50, pct: '100%', cor: CORES.verde },
    { nome: 'Pedro Henrique Lima', faltas: 18, just: 2, pres: 32, pct: '64%', cor: CORES.vermelho },
  ]
  freq.forEach((f, i) => {
    const ry = th + 18 + i * 20
    const bg = i % 2 === 0 ? '#1e293b' : '#273548'
    doc.rect(x + 10, ry, w - 20, 20).fillColor(bg).fill()
    doc.fontSize(8).fillColor(CORES.branco).font('Helvetica')
    doc.text(f.nome, x + 16, ry + 5)
    doc.text(String(f.faltas), x + 230, ry + 5)
    doc.text(String(f.just), x + 290, ry + 5)
    doc.text(String(f.pres), x + 355, ry + 5)
    doc.fillColor(f.cor).font('Helvetica-Bold').text(f.pct, x + 425, ry + 5)
  })

  doc.restore()
  doc.y = y + 180
  doc.moveDown(0.5)
}

function mockupFacial(doc) {
  const { x, y, w } = mockupBase(doc, 'Cadastro Facial — Captura (Mobile)', LARGURA * 0.45, 260)

  const cx = x + (LARGURA * 0.45) / 2
  doc.save()

  // Camera area (escura)
  doc.rect(x, y, LARGURA * 0.45, 200).fillColor('#111').fill()

  // Oval guia
  doc.save()
  doc.ellipse(cx, y + 85, 55, 70).strokeColor('white').strokeOpacity(0.4).lineWidth(2).dash(5, { space: 5 }).stroke()
  doc.restore()

  // Texto
  doc.fontSize(8).fillColor('white').fillOpacity(0.6).font('Helvetica')
  doc.text('Posicione seu rosto', cx - 40, y + 165)
  doc.fillOpacity(1)

  // 3 circulos de pose no topo
  const poses = [
    { label: 'Frontal', active: true },
    { label: 'Esquerda', active: false },
    { label: 'Direita', active: false },
  ]
  poses.forEach((p, i) => {
    const px = cx - 60 + i * 55
    doc.circle(px, y + 20, 14)
      .fillColor(p.active ? CORES.primaria : '#333')
      .fill()
    doc.circle(px, y + 20, 14)
      .strokeColor(p.active ? 'white' : '#555')
      .lineWidth(1.5).stroke()
    doc.fontSize(6).fillColor('white').text(p.label, px - 18, y + 38, { width: 36, align: 'center' })
  })

  // Botao captura
  doc.roundedRect(x + 15, y + 210, LARGURA * 0.45 - 30, 30, 8)
    .fillColor(CORES.primaria).fill()
  doc.fontSize(9).fillColor(CORES.branco).font('Helvetica-Bold')
  doc.text('Capturar Frontal (1/3)', cx - 45, y + 220)

  doc.restore()
  doc.y = y + 270
  doc.moveDown(0.5)
}

function mockupMatriculas(doc) {
  const { x, y, w } = mockupBase(doc, 'Gestor Escolar — Assistente de Matricula', LARGURA, 180)

  doc.save()
  // Wizard steps
  const steps = ['1. Escola', '2. Serie', '3. Turma', '4. Alunos']
  const stepW = (w - 40) / 4
  steps.forEach((s, i) => {
    const sx = x + 15 + i * (stepW + 5)
    const active = i === 3
    doc.roundedRect(sx, y + 10, stepW, 22, 4)
      .fillColor(active ? CORES.primaria : '#334155').fill()
    doc.fontSize(8).fillColor(active ? CORES.branco : '#94a3b8').font('Helvetica-Bold')
    doc.text(s, sx + 8, y + 16)
  })

  // Info selecionada
  doc.fontSize(7).fillColor('#94a3b8').font('Helvetica')
  doc.text('EMEF N.S. Lourdes > 5o Ano > Turma 5A-MAT (18/30 vagas)', x + 15, y + 42)

  // Lista de alunos
  doc.roundedRect(x + 10, y + 56, w - 20, 80, 4).fillColor('#334155').fill()
  const nomes = ['Ana Beatriz Costa — CPF: 123.456.789-00', 'Joao Pedro Oliveira', 'Maria Silva Santos — PCD']
  nomes.forEach((n, i) => {
    doc.fontSize(8).fillColor(CORES.branco).font('Helvetica')
    doc.text(`${i + 1}. ${n}`, x + 20, y + 64 + i * 18)
    // Botao remover
    doc.fontSize(7).fillColor(CORES.vermelho)
    doc.text('Remover', x + w - 70, y + 64 + i * 18)
  })

  // Botao matricular
  doc.roundedRect(x + w - 150, y + 145, 140, 26, 5).fillColor(CORES.verde).fill()
  doc.fontSize(9).fillColor(CORES.branco).font('Helvetica-Bold')
  doc.text('Matricular 3 Alunos', x + w - 138, y + 152)

  doc.restore()
  doc.y = y + 190
  doc.moveDown(0.5)
}

function mockupProfessor(doc) {
  const { x, y, w } = mockupBase(doc, 'Portal do Professor — Dashboard', LARGURA, 200)

  doc.save()
  // KPIs professor
  const kpis = [
    { label: 'Minhas Turmas', valor: '4', cor: CORES.primaria },
    { label: 'Total Alunos', valor: '120', cor: '#8b5cf6' },
    { label: 'Freq. Hoje', valor: '92%', cor: CORES.verde },
    { label: 'Freq. Semana', valor: '88%', cor: CORES.amarelo },
  ]
  const kpiW = (w - 50) / 4
  kpis.forEach((kpi, i) => {
    const kx = x + 10 + i * (kpiW + 10)
    doc.roundedRect(kx, y + 10, kpiW, 45, 4).fillColor('#334155').fill()
    doc.fontSize(14).fillColor(kpi.cor).font('Helvetica-Bold')
    doc.text(kpi.valor, kx + 8, y + 17, { width: kpiW - 16 })
    doc.fontSize(6.5).fillColor('#94a3b8').font('Helvetica')
    doc.text(kpi.label, kx + 8, y + 37, { width: kpiW - 16 })
  })

  // Botoes rapidos
  doc.roundedRect(x + 15, y + 65, 110, 24, 4).fillColor(CORES.primaria).fill()
  doc.fontSize(8).fillColor(CORES.branco).font('Helvetica-Bold')
  doc.text('Lancar Frequencia', x + 25, y + 72)
  doc.roundedRect(x + 135, y + 65, 100, 24, 4).fillColor(CORES.verde).fill()
  doc.fontSize(8).fillColor(CORES.branco).font('Helvetica-Bold')
  doc.text('Lancar Notas', x + 150, y + 72)

  // Lista turmas
  doc.fontSize(9).fillColor('#94a3b8').font('Helvetica-Bold')
  doc.text('Minhas Turmas', x + 15, y + 100)

  const turmas = [
    { nome: '5o Ano A', escola: 'EMEF N.S. Lourdes', turno: 'Matutino', alunos: 28 },
    { nome: '5o Ano B', escola: 'EMEF N.S. Lourdes', turno: 'Vespertino', alunos: 30 },
    { nome: '3o Ano A', escola: 'EMEF Menino Jesus', turno: 'Matutino', alunos: 32 },
  ]
  turmas.forEach((t, i) => {
    const ty = y + 115 + i * 25
    doc.roundedRect(x + 10, ty, w - 20, 22, 3).fillColor('#334155').fill()
    doc.fontSize(8).fillColor(CORES.branco).font('Helvetica-Bold')
    doc.text(t.nome, x + 16, ty + 6)
    doc.font('Helvetica').fillColor('#94a3b8').fontSize(7)
    doc.text(`${t.escola} | ${t.turno} | ${t.alunos} alunos`, x + 100, ty + 7)
  })

  doc.restore()
  doc.y = y + 210
  doc.moveDown(0.5)
}

// ============================================================================
// MOCKUPS DETALHADOS — COM SIDEBAR E LAYOUT COMPLETO
// ============================================================================

function mockupComSidebar(doc, tituloTela, sidebarItems, conteudoFn) {
  verificarEspaco(doc, 290)
  const x = MARGEM
  const y = doc.y
  const w = LARGURA
  const h = 270
  const sideW = 110

  doc.save()
  // Container geral
  doc.roundedRect(x, y, w, h, 6).fillColor('#0f172a').fill()

  // Sidebar
  doc.rect(x, y, sideW, h).fillColor('#1e293b').fill()
  doc.roundedRect(x, y, sideW, h, 6).fillColor('#1e293b').fill()
  doc.rect(x + sideW - 6, y, 6, h).fillColor('#1e293b').fill()

  // Logo sidebar
  doc.fontSize(9).fillColor(CORES.primaria).font('Helvetica-Bold')
  doc.text('SISAM', x + 12, y + 10)
  doc.fontSize(5.5).fillColor('#64748b').font('Helvetica')
  doc.text('Gestor Escolar', x + 12, y + 22)

  // Linha separadora
  doc.moveTo(x + 8, y + 32).lineTo(x + sideW - 8, y + 32).strokeColor('#334155').lineWidth(0.5).stroke()

  // Menu items
  sidebarItems.forEach((item, i) => {
    const iy = y + 38 + i * 18
    if (item.active) {
      doc.roundedRect(x + 6, iy - 2, sideW - 12, 16, 3).fillColor(CORES.primaria).fill()
      doc.fontSize(7).fillColor(CORES.branco).font('Helvetica-Bold')
    } else {
      doc.fontSize(7).fillColor(item.group ? '#94a3b8' : '#64748b').font(item.group ? 'Helvetica-Bold' : 'Helvetica')
    }
    doc.text((item.indent ? '   ' : '') + item.label, x + 12, iy + 2)
  })

  // Area de conteudo
  const cx = x + sideW + 8
  const cy = y + 6
  const cw = w - sideW - 14
  const ch = h - 12

  // Header do conteudo
  doc.roundedRect(cx, cy, cw, 24, 4).fillColor('#1e293b').fill()
  doc.fontSize(9).fillColor(CORES.branco).font('Helvetica-Bold')
  doc.text(tituloTela, cx + 10, cy + 7)

  // Conteudo
  conteudoFn(doc, cx, cy + 28, cw, ch - 28)

  doc.restore()
  doc.y = y + h + 8
  doc.moveDown(0.3)
}

function mockupFormEscola(doc) {
  const menuItems = [
    { label: 'Dashboard', active: false },
    { label: 'Cadastros', group: true },
    { label: 'Escolas', indent: true, active: true },
    { label: 'Polos', indent: true },
    { label: 'Alunos', indent: true },
    { label: 'Turmas', indent: true },
    { label: 'Matriculas', group: true },
    { label: 'Matriculas', indent: true },
    { label: 'Transferencias', indent: true },
    { label: 'Frequencia', group: true },
    { label: 'Freq. Bimestral', indent: true },
  ]
  mockupComSidebar(doc, 'Cadastro de Escolas', menuItems, (doc, x, y, w, h) => {
    // Formulario modal
    doc.roundedRect(x + 20, y + 5, w - 40, h - 10, 6).fillColor('#334155').fill()
    const fx = x + 30, fy = y + 15, fw = w - 60

    doc.fontSize(9).fillColor(CORES.branco).font('Helvetica-Bold')
    doc.text('Nova Escola', fx, fy)

    // Campos
    const campos = [
      { label: 'Nome *', valor: 'EMEF Nossa Senhora de Lourdes', w: fw },
      { label: 'Codigo', valor: 'ESC015', w: fw * 0.4 },
      { label: 'Polo *', valor: 'Polo Sede', w: fw * 0.55 },
      { label: 'Endereco', valor: 'Rua Principal, 123', w: fw },
      { label: 'Telefone', valor: '(91) 99999-0000', w: fw * 0.45 },
      { label: 'Email', valor: 'escola@semed.gov.br', w: fw * 0.5 },
    ]
    let cy = fy + 16
    let cx = fx
    campos.forEach((c, i) => {
      if (i === 1 || i === 4) cx = fx
      if (i === 2) cx = fx + fw * 0.45
      if (i === 5) cx = fx + fw * 0.5

      doc.fontSize(6).fillColor('#94a3b8').font('Helvetica')
      doc.text(c.label, cx, cy)
      doc.roundedRect(cx, cy + 8, c.w < fw ? c.w - 5 : c.w, 16, 2).fillColor('#1e293b').fill()
      doc.roundedRect(cx, cy + 8, c.w < fw ? c.w - 5 : c.w, 16, 2).strokeColor('#475569').lineWidth(0.5).stroke()
      doc.fontSize(7).fillColor(CORES.branco).font('Helvetica')
      doc.text(c.valor, cx + 5, cy + 13)

      if (i === 0 || i === 2 || i === 3 || i === 5) cy += 30
    })

    // Checkbox gestor
    doc.roundedRect(fx, cy, 8, 8, 1).fillColor(CORES.primaria).fill()
    doc.fontSize(3).fillColor(CORES.branco).font('Helvetica-Bold').text('V', fx + 2, cy + 1.5)
    doc.fontSize(7).fillColor('#94a3b8').font('Helvetica')
    doc.text('Gestor Escolar Habilitado', fx + 14, cy + 0.5)

    // Botoes
    doc.roundedRect(fx + fw - 110, cy + 16, 50, 18, 3).fillColor('#475569').fill()
    doc.fontSize(7).fillColor(CORES.branco).font('Helvetica').text('Cancelar', fx + fw - 102, cy + 21)
    doc.roundedRect(fx + fw - 55, cy + 16, 55, 18, 3).fillColor(CORES.primaria).fill()
    doc.fontSize(7).fillColor(CORES.branco).font('Helvetica-Bold').text('Salvar', fx + fw - 40, cy + 21)
  })
}

function mockupFormTurma(doc) {
  const menuItems = [
    { label: 'Dashboard', active: false },
    { label: 'Cadastros', group: true },
    { label: 'Escolas', indent: true },
    { label: 'Turmas', indent: true, active: true },
    { label: 'Alunos', indent: true },
    { label: 'Matriculas', group: true },
    { label: 'Matriculas', indent: true },
    { label: 'Frequencia', group: true },
    { label: 'Freq. Bimestral', indent: true },
    { label: 'Avaliacoes', group: true },
    { label: 'Lancar Notas', indent: true },
  ]
  mockupComSidebar(doc, 'Cadastro de Turmas — Nova Turma', menuItems, (doc, x, y, w, h) => {
    doc.roundedRect(x + 15, y + 5, w - 30, h - 10, 6).fillColor('#334155').fill()
    const fx = x + 25, fy = y + 15, fw = w - 50

    doc.fontSize(9).fillColor(CORES.branco).font('Helvetica-Bold')
    doc.text('Nova Turma', fx, fy)

    const campos = [
      { label: 'Codigo *', valor: '5A-MAT', w: fw * 0.35 },
      { label: 'Nome *', valor: '5o Ano A — Matutino', w: fw * 0.6 },
      { label: 'Escola *', valor: 'EMEF N.S. Lourdes', w: fw },
      { label: 'Serie *', valor: '5o Ano', w: fw * 0.3 },
      { label: 'Turno *', valor: 'Matutino', w: fw * 0.3 },
      { label: 'Tipo Avaliacao *', valor: 'Bimestral', w: fw * 0.35 },
      { label: 'Capacidade', valor: '30', w: fw * 0.25 },
    ]
    let cy = fy + 16, cx = fx
    campos.forEach((c, i) => {
      if ([0, 2, 3, 6].includes(i)) cx = fx
      if (i === 1) cx = fx + fw * 0.4
      if (i === 4) cx = fx + fw * 0.35
      if (i === 5) cx = fx + fw * 0.65

      doc.fontSize(6).fillColor('#94a3b8').font('Helvetica')
      doc.text(c.label, cx, cy)
      doc.roundedRect(cx, cy + 8, c.w - 5, 16, 2).fillColor('#1e293b').fill()
      doc.roundedRect(cx, cy + 8, c.w - 5, 16, 2).strokeColor('#475569').lineWidth(0.5).stroke()
      doc.fontSize(7).fillColor(CORES.branco).font('Helvetica')
      doc.text(c.valor, cx + 5, cy + 13)

      if ([1, 2, 5, 6].includes(i)) cy += 30
    })

    // Checkboxes
    doc.rect(fx, cy, 8, 8).strokeColor('#475569').lineWidth(0.5).stroke()
    doc.fontSize(7).fillColor('#94a3b8').font('Helvetica').text('Multisseriada', fx + 14, cy + 0.5)
    doc.rect(fx + 100, cy, 8, 8).strokeColor('#475569').lineWidth(0.5).stroke()
    doc.fontSize(7).fillColor('#94a3b8').text('Multietapa', fx + 114, cy + 0.5)

    // Botoes
    doc.roundedRect(fx + fw - 55, cy + 16, 55, 18, 3).fillColor(CORES.primaria).fill()
    doc.fontSize(7).fillColor(CORES.branco).font('Helvetica-Bold').text('Salvar', fx + fw - 40, cy + 21)
  })
}

function mockupBoletim(doc) {
  const { x, y, w } = mockupBase(doc, 'Gestor Escolar — Boletim do Aluno', LARGURA, 200)

  doc.save()
  // Info aluno
  doc.roundedRect(x + 10, y + 5, w - 20, 28, 4).fillColor('#334155').fill()
  doc.fontSize(9).fillColor(CORES.branco).font('Helvetica-Bold')
  doc.text('Ana Beatriz Costa', x + 16, y + 10)
  doc.fontSize(7).fillColor('#94a3b8').font('Helvetica')
  doc.text('5o Ano A — EMEF N.S. Lourdes — 2026', x + 16, y + 22)
  // Botao imprimir
  doc.roundedRect(x + w - 75, y + 10, 55, 18, 3).fillColor('#3b82f6').fill()
  doc.fontSize(7).fillColor(CORES.branco).font('Helvetica-Bold').text('Imprimir', x + w - 62, y + 15)

  // Tabela boletim
  const th = y + 40
  doc.rect(x + 10, th, w - 20, 16).fillColor('#1e293b').fill()
  const cols = ['Disciplina', '1o Bim', '2o Bim', '3o Bim', '4o Bim', 'Media', 'Faltas', 'Situacao']
  const colWidths = [85, 42, 42, 42, 42, 42, 42, 60]
  let cx = x + 14
  cols.forEach((c, i) => {
    doc.fontSize(6).fillColor('#94a3b8').font('Helvetica-Bold')
    doc.text(c, cx, th + 4, { width: colWidths[i] })
    cx += colWidths[i]
  })

  const disciplinas = [
    { nome: 'L. Portuguesa', notas: ['8.5', '7.0', '8.0', '7.5'], media: '7.8', faltas: '5', status: 'Aprovado', cor: CORES.verde },
    { nome: 'Matematica', notas: ['6.0', '5.5', '6.5', '7.0'], media: '6.3', faltas: '8', status: 'Aprovado', cor: CORES.verde },
    { nome: 'C. Humanas', notas: ['9.0', '8.5', '8.0', '9.0'], media: '8.6', faltas: '2', status: 'Aprovado', cor: CORES.verde },
    { nome: 'C. Natureza', notas: ['4.5', '5.0', '5.5', '6.0'], media: '5.3', faltas: '12', status: 'Reprovado', cor: CORES.vermelho },
  ]

  disciplinas.forEach((d, i) => {
    const ry = th + 16 + i * 18
    const bg = i % 2 === 0 ? '#1e293b' : '#273548'
    doc.rect(x + 10, ry, w - 20, 18).fillColor(bg).fill()

    cx = x + 14
    doc.fontSize(7).fillColor(CORES.branco).font('Helvetica')
    doc.text(d.nome, cx, ry + 5, { width: 85 })
    cx += 85

    d.notas.forEach(n => {
      const nv = parseFloat(n)
      doc.fillColor(nv >= 6 ? '#94a3b8' : CORES.vermelho).text(n, cx, ry + 5, { width: 42 })
      cx += 42
    })

    doc.fillColor(parseFloat(d.media) >= 6 ? CORES.verde : CORES.vermelho).font('Helvetica-Bold')
    doc.text(d.media, cx, ry + 5, { width: 42 })
    cx += 42

    doc.fillColor('#94a3b8').font('Helvetica')
    doc.text(d.faltas, cx, ry + 5, { width: 42 })
    cx += 42

    doc.roundedRect(cx, ry + 3, 50, 12, 3).fillColor(d.cor).fillOpacity(0.2).fill()
    doc.fillOpacity(1).fontSize(6).fillColor(d.cor).font('Helvetica-Bold')
    doc.text(d.status, cx + 5, ry + 6)
  })

  // Frequencia geral
  const fy = th + 16 + disciplinas.length * 18 + 5
  doc.roundedRect(x + 10, fy, w - 20, 18, 3).fillColor('#334155').fill()
  doc.fontSize(7).fillColor('#94a3b8').font('Helvetica-Bold')
  doc.text('Frequencia Geral: 94.2%  |  Total Faltas: 27  |  Resultado Final: Aprovado (3/4 disciplinas)', x + 16, fy + 5)

  doc.restore()
  doc.y = y + 210
  doc.moveDown(0.5)
}

function mockupFrequenciaDiaria(doc) {
  const { x, y, w } = mockupBase(doc, 'Frequencia Diaria — 15/03/2026', LARGURA, 160)

  doc.save()
  doc.fontSize(8).fillColor('#94a3b8').font('Helvetica')
  doc.text('Turma: 5o Ano A — EMEF N.S. Lourdes  |  Data: 15/03/2026', x + 15, y + 10)

  const th = y + 28
  doc.rect(x + 10, th, w - 20, 16).fillColor(CORES.primaria).fill()
  doc.fontSize(7).fillColor(CORES.branco).font('Helvetica-Bold')
  doc.text('Aluno', x + 16, th + 4)
  doc.text('Presenca', x + w - 90, th + 4)

  const alunos = [
    { nome: 'Ana Beatriz Costa', status: 'P', cor: CORES.verde },
    { nome: 'Joao Pedro Oliveira', status: 'F', cor: CORES.vermelho },
    { nome: 'Maria Silva Santos', status: 'P', cor: CORES.verde },
    { nome: 'Pedro Henrique Lima', status: 'P', cor: CORES.verde },
    { nome: 'Lucas Ferreira', status: 'F', cor: CORES.vermelho },
  ]
  alunos.forEach((a, i) => {
    const ry = th + 16 + i * 18
    const bg = i % 2 === 0 ? '#1e293b' : '#273548'
    doc.rect(x + 10, ry, w - 20, 18).fillColor(bg).fill()
    doc.fontSize(8).fillColor(CORES.branco).font('Helvetica').text(a.nome, x + 16, ry + 4)

    // Botoes P e F
    const bx = x + w - 95
    doc.roundedRect(bx, ry + 2, 28, 14, 3).fillColor(a.status === 'P' ? CORES.verde : '#334155').fill()
    doc.fontSize(7).fillColor(a.status === 'P' ? CORES.branco : '#64748b').font('Helvetica-Bold').text('P', bx + 10, ry + 5)
    doc.roundedRect(bx + 33, ry + 2, 28, 14, 3).fillColor(a.status === 'F' ? CORES.vermelho : '#334155').fill()
    doc.fontSize(7).fillColor(a.status === 'F' ? CORES.branco : '#64748b').font('Helvetica-Bold').text('F', bx + 43, ry + 5)
  })

  doc.restore()
  doc.y = y + 170
  doc.moveDown(0.5)
}

function mockupSelecaoFiltros(doc, titulo, filtros) {
  verificarEspaco(doc, 75)
  const x = MARGEM, y = doc.y, w = LARGURA

  doc.save()
  doc.roundedRect(x, y, w, 65, 6).fillColor('#f8fafc').fill()
  doc.roundedRect(x, y, w, 65, 6).strokeColor('#e2e8f0').lineWidth(0.5).stroke()

  doc.fontSize(9).fillColor(CORES.cinzaEscuro).font('Helvetica-Bold')
  doc.text(titulo, x + 12, y + 8)

  const fw = (w - 30) / filtros.length
  filtros.forEach((f, i) => {
    const fx = x + 10 + i * (fw + 5)
    doc.fontSize(7).fillColor(CORES.cinzaMedio).font('Helvetica')
    doc.text(f.label, fx, y + 26)
    doc.roundedRect(fx, y + 36, fw, 20, 3).fillColor(CORES.branco).fill()
    doc.roundedRect(fx, y + 36, fw, 20, 3).strokeColor('#cbd5e1').lineWidth(0.5).stroke()
    doc.fontSize(8).fillColor(CORES.cinzaEscuro).font('Helvetica')
    doc.text(f.valor, fx + 6, y + 42)
  })

  doc.restore()
  doc.y = y + 72
  doc.moveDown(0.3)
}

function seta(doc, x1, y1, x2, y2, texto) {
  doc.save()
  doc.moveTo(x1, y1).lineTo(x2, y2).strokeColor(CORES.vermelho).lineWidth(1.5).stroke()
  // Ponta da seta
  const ang = Math.atan2(y2 - y1, x2 - x1)
  const tam = 6
  doc.moveTo(x2, y2)
    .lineTo(x2 - tam * Math.cos(ang - 0.4), y2 - tam * Math.sin(ang - 0.4))
    .lineTo(x2 - tam * Math.cos(ang + 0.4), y2 - tam * Math.sin(ang + 0.4))
    .fillColor(CORES.vermelho).fill()
  // Texto
  if (texto) {
    doc.fontSize(7).fillColor(CORES.vermelho).font('Helvetica-Bold')
    doc.text(texto, x1 - 5, y1 - 12, { width: 100 })
  }
  doc.restore()
}

function numeroPasso(doc, num, texto) {
  verificarEspaco(doc, 28)
  const x = MARGEM, y = doc.y
  // Circulo com numero
  doc.circle(x + 10, y + 9, 10).fillColor(CORES.primaria).fill()
  doc.fontSize(9).fillColor(CORES.branco).font('Helvetica-Bold')
  doc.text(String(num), x + 6, y + 4.5, { width: 8, align: 'center' })
  // Texto
  doc.fontSize(10).fillColor(CORES.cinzaEscuro).font('Helvetica')
  doc.text(texto, x + 28, y + 3, { width: LARGURA - 28 })
  doc.y = y + 24
  doc.moveDown(0.1)
}

// ============================================================================
// GERACAO DOS PDFs
// ============================================================================

function capa(doc, tituloManual, subtituloManual, numero) {
  // Fundo
  doc.rect(0, 0, 595.28, 842).fillColor(CORES.cinzaEscuro).fill()

  // Barra lateral
  doc.rect(0, 0, 8, 842).fillColor(CORES.primaria).fill()

  // Logo area
  doc.fontSize(36).fillColor(CORES.primaria).font('Helvetica-Bold')
  doc.text('SISAM', MARGEM + 10, 180)
  doc.fontSize(12).fillColor(CORES.cinzaClaro).font('Helvetica')
  doc.text('Sistema Integrado de Gestao Escolar', MARGEM + 10, 225)
  doc.text('SEMED — Sao Sebastiao da Boa Vista', MARGEM + 10, 242)

  // Titulo do manual
  doc.moveDown(3)
  doc.fontSize(28).fillColor(CORES.branco).font('Helvetica-Bold')
  doc.text(tituloManual, MARGEM + 10, 320, { width: LARGURA - 20 })

  doc.fontSize(14).fillColor(CORES.cinzaClaro).font('Helvetica')
  doc.text(subtituloManual, MARGEM + 10, 380, { width: LARGURA - 20 })

  // Numero do manual
  doc.fontSize(80).fillColor(CORES.primaria).fillOpacity(0.15).font('Helvetica-Bold')
  doc.text(String(numero).padStart(2, '0'), 380, 160)
  doc.fillOpacity(1)

  // Rodape da capa
  doc.fontSize(9).fillColor(CORES.cinzaClaro).font('Helvetica')
  doc.text('Manual do Gestor Escolar — Versao 1.0', MARGEM + 10, 750)
  doc.text('Abril 2026', MARGEM + 10, 765)

  doc.addPage()
}

// ---------------------------------------------------------------------------
// MANUAL 1: LOGIN E ACESSO
// ---------------------------------------------------------------------------
function gerarManualLogin() {
  console.log('Gerando: 01-Login-e-Acesso.pdf')
  const { doc, stream } = criarDoc('01-Login-e-Acesso.pdf')
  capa(doc, 'Acesso ao Sistema', 'Login, selecao de modulo e navegacao no sistema', 1)

  titulo(doc, '1. Acessando o Sistema')
  paragrafo(doc, 'Para acessar o SISAM, abra o navegador (Google Chrome recomendado) e acesse o endereco: educacaossbv.com.br/login')

  mockupLogin(doc)

  passo(doc, '1', 'Abra o navegador e acesse educacaossbv.com.br')
  passo(doc, '2', 'Clique em "Acessar Sistema" no canto superior direito')
  passo(doc, '3', 'Digite seu Email e Senha nos campos indicados')
  passo(doc, '4', 'Clique no botao "Entrar"')
  passo(doc, '5', 'Aguarde a sincronizacao dos dados')

  destaque(doc, 'Dica: Para ver a senha enquanto digita, clique no icone de olho ao lado do campo.')

  titulo(doc, '2. Selecionando o Modulo')
  paragrafo(doc, 'Apos o login, voce vera a tela de selecao com dois modulos disponiveis:')

  mockupModulos(doc)

  tabela(doc,
    ['Modulo', 'Descricao', 'Quando usar'],
    [
      ['SISAM (Educatec)', 'Dados, graficos, resultados', 'Consultar avaliacoes e comparativos'],
      ['Gestor Escolar', 'Notas, frequencia, matriculas', 'Cadastros e lancamentos do dia a dia'],
    ]
  )

  paragrafo(doc, 'Clique em "Acessar Gestor" para entrar no modulo Gestor Escolar.')
  destaque(doc, 'Nota: Professores sao direcionados automaticamente para o Portal do Professor.')

  titulo(doc, '3. Conhecendo o Dashboard')
  mockupDashboard(doc)
  paragrafo(doc, 'O Dashboard exibe um resumo com o total de alunos, turmas, escolas e a frequencia geral. Graficos mostram o desempenho por disciplina.')

  titulo(doc, '4. Navegacao')
  subtitulo(doc, 'No Computador')
  paragrafo(doc, 'Use o menu lateral esquerdo. Clique nas categorias para expandir as sub-opcoes: Cadastros, Matriculas, Frequencia, Avaliacoes, etc.')
  subtitulo(doc, 'No Celular')
  paragrafo(doc, 'Use a barra de navegacao na parte inferior com 5 itens: Dashboard, Alunos, Turmas, SISAM e Perfil. Para mais opcoes, toque no icone de menu no canto superior esquerdo.')

  titulo(doc, '5. Problemas Comuns')
  tabela(doc,
    ['Problema', 'Solucao'],
    [
      ['Voce esta offline', 'Verifique a conexao com a internet'],
      ['Senha incorreta', 'Verifique o Caps Lock. Contate o suporte se esqueceu'],
      ['Tela em branco', 'Limpe o cache do navegador (Ctrl+Shift+Delete)'],
      ['Gestor nao aparece', 'Contate o administrador para habilitar'],
    ]
  )

  rodape(doc)
  doc.end()
  return new Promise(resolve => stream.on('finish', resolve))
}

// ---------------------------------------------------------------------------
// MANUAL 2: CADASTRO DE ESCOLAS
// ---------------------------------------------------------------------------
function gerarManualEscolas() {
  console.log('Gerando: 02-Cadastro-Escolas.pdf')
  const { doc, stream } = criarDoc('02-Cadastro-Escolas.pdf')
  capa(doc, 'Cadastro de Escolas', 'Criar, editar e gerenciar escolas no sistema', 2)

  titulo(doc, '1. Acessando a Lista de Escolas')
  paragrafo(doc, 'No menu lateral, acesse: Gestor Escolar > Cadastros > Escolas. A lista de escolas cadastradas sera exibida com nome, codigo, polo e status.')

  subtitulo(doc, 'Localizacao no menu:')
  itemLista(doc, 'Menu lateral > Cadastros > Escolas')
  doc.moveDown(0.3)

  titulo(doc, '2. Cadastrando uma Nova Escola')
  paragrafo(doc, 'O formulario de cadastro e exibido ao clicar no botao "+". Veja a tela completa:')

  mockupFormEscola(doc)

  subtitulo(doc, 'Passo a passo:')
  numeroPasso(doc, 1, 'Clique no botao "+" (adicionar) no canto superior direito da lista')
  numeroPasso(doc, 2, 'Preencha o Nome da escola (campo obrigatorio)')
  numeroPasso(doc, 3, 'Selecione o Polo ao qual a escola pertence')
  numeroPasso(doc, 4, 'Preencha os demais campos: Codigo, Endereco, Telefone, Email')
  numeroPasso(doc, 5, 'Marque "Gestor Escolar Habilitado" para ativar notas e frequencia')
  numeroPasso(doc, 6, 'Clique em "Salvar"')
  doc.moveDown(0.3)

  tabela(doc,
    ['Campo', 'Obrigatorio', 'Descricao'],
    [
      ['Nome', 'Sim', 'Nome completo da escola (ex: EMEF N.S. Lourdes)'],
      ['Codigo', 'Nao', 'Codigo identificador (ex: ESC001)'],
      ['Polo', 'Sim', 'Selecione o polo da lista suspensa'],
      ['Endereco', 'Nao', 'Endereco completo da escola'],
      ['Telefone', 'Nao', 'Telefone de contato'],
      ['Email', 'Nao', 'Email institucional'],
    ]
  )

  titulo(doc, '3. Habilitando o Gestor Escolar')
  paragrafo(doc, 'Para que uma escola use o modulo completo (notas, frequencia, matriculas), e necessario habilitar o Gestor Escolar:')
  numeroPasso(doc, 1, 'Edite a escola desejada (icone de lapis)')
  numeroPasso(doc, 2, 'Marque a caixa "Gestor Escolar Habilitado"')
  numeroPasso(doc, 3, 'Clique em "Salvar"')
  destaque(doc, 'Importante: Sem esta opcao habilitada, o usuario tipo "Escola" nao vera o modulo Gestor na selecao de modulos.')

  titulo(doc, '4. Editando e Excluindo')
  subtitulo(doc, 'Editar:')
  paragrafo(doc, 'Clique no icone de lapis na linha da escola. O formulario sera exibido com os dados atuais. Altere e clique em "Salvar".')
  subtitulo(doc, 'Excluir:')
  paragrafo(doc, 'Clique no icone de lixeira. So e possivel excluir escolas SEM vinculos (alunos, turmas, resultados, usuarios).')
  destaque(doc, 'Alternativa: Em vez de excluir, desative a escola mudando o status para Inativo.', CORES.amarelo)

  titulo(doc, '5. Problemas Comuns')
  tabela(doc,
    ['Problema', 'Solucao'],
    [
      ['Nao consigo excluir', 'A escola tem vinculos. Transfira ou remova primeiro'],
      ['Gestor nao aparece', 'Edite a escola e marque "Gestor Escolar Habilitado"'],
      ['Polo nao aparece na lista', 'O polo precisa ser cadastrado primeiro'],
    ]
  )

  rodape(doc)
  doc.end()
  return new Promise(resolve => stream.on('finish', resolve))
}

// ---------------------------------------------------------------------------
// MANUAL 3: CADASTRO DE TURMAS
// ---------------------------------------------------------------------------
function gerarManualTurmas() {
  console.log('Gerando: 03-Cadastro-Turmas.pdf')
  const { doc, stream } = criarDoc('03-Cadastro-Turmas.pdf')
  capa(doc, 'Cadastro de Turmas', 'Criar turmas, definir series, turnos e tipo de avaliacao', 3)

  titulo(doc, '1. Acessando as Turmas')
  paragrafo(doc, 'No menu lateral, acesse: Gestor Escolar > Cadastros > Turmas. Use os filtros para localizar turmas.')

  mockupSelecaoFiltros(doc, 'Filtros de Turmas', [
    { label: 'Ano Letivo', valor: '2026' },
    { label: 'Escola', valor: 'EMEF N.S. Lourdes' },
    { label: 'Serie', valor: 'Todas' },
    { label: 'Pesquisar', valor: '' },
  ])

  titulo(doc, '2. Criando uma Nova Turma')
  paragrafo(doc, 'Clique no botao "+" para abrir o formulario. Veja a tela completa com o menu lateral:')

  mockupFormTurma(doc)

  subtitulo(doc, 'Passo a passo:')
  numeroPasso(doc, 1, 'Clique no botao "+" no canto superior direito')
  numeroPasso(doc, 2, 'Preencha o Codigo (ex: 5A-MAT) e o Nome da turma')
  numeroPasso(doc, 3, 'Selecione a Escola na lista suspensa')
  numeroPasso(doc, 4, 'Informe a Serie, o Turno e o Tipo de Avaliacao')
  numeroPasso(doc, 5, 'Se necessario, marque "Multisseriada" e informe a Capacidade')
  numeroPasso(doc, 6, 'Clique em "Salvar"')
  doc.moveDown(0.2)

  tabela(doc,
    ['Campo', 'Obrigatorio', 'Exemplo'],
    [
      ['Codigo', 'Sim', '5A-MAT (unico por escola/ano)'],
      ['Nome', 'Sim', '5o Ano A — Matutino'],
      ['Escola', 'Sim', 'Selecione da lista'],
      ['Serie', 'Sim', '5o Ano'],
      ['Turno', 'Sim', 'Matutino / Vespertino / Noturno'],
      ['Tipo Avaliacao', 'Sim', 'Bimestral / Trimestral'],
      ['Multisseriada', 'Nao', 'Marcar se aplicavel'],
      ['Capacidade', 'Nao', '30 (informativo)'],
    ]
  )

  destaque(doc, 'Turmas Multisserie: Em escolas ribeirinhas, e comum ter alunos de series diferentes na mesma turma. Marque "Multisseriada" neste caso.')

  titulo(doc, '3. Visualizando Alunos da Turma')
  paragrafo(doc, 'Clique no cartao da turma para ver a lista completa de alunos com nome, codigo, situacao e data de nascimento.')

  titulo(doc, '4. Alterando a Situacao de um Aluno')
  paragrafo(doc, 'Clique no nome do aluno para abrir o modal de Situacao. Selecione a nova situacao e a data:')
  numeroPasso(doc, 1, 'Clique no nome do aluno na lista da turma')
  numeroPasso(doc, 2, 'Selecione a nova situacao (Cursando, Aprovado, etc.)')
  numeroPasso(doc, 3, 'Informe a data da alteracao')
  numeroPasso(doc, 4, 'Adicione uma observacao (opcional)')
  numeroPasso(doc, 5, 'Clique em "Salvar"')
  doc.moveDown(0.2)

  tabela(doc,
    ['Situacao', 'Quando usar'],
    [
      ['Cursando', 'Aluno frequentando normalmente'],
      ['Aprovado', 'Aprovado ao final do periodo'],
      ['Reprovado', 'Reprovado ao final do periodo'],
      ['Transferido', 'Transferido para outra escola'],
      ['Evadido', 'Abandonou a escola'],
    ]
  )

  titulo(doc, '5. Exportando Dados')
  numeroPasso(doc, 1, 'Imprimir relacao de alunos: clique no icone de impressora')
  numeroPasso(doc, 2, 'Exportar CSV para Excel: clique no icone de download (seta para baixo)')

  rodape(doc)
  doc.end()
  return new Promise(resolve => stream.on('finish', resolve))
}

// ---------------------------------------------------------------------------
// MANUAL 4: MATRICULAS
// ---------------------------------------------------------------------------
function gerarManualMatriculas() {
  console.log('Gerando: 04-Matriculas-Alunos.pdf')
  const { doc, stream } = criarDoc('04-Matriculas-Alunos.pdf')
  capa(doc, 'Matriculas e Alunos', 'Matricular alunos, cadastrar novos e vincular a turmas', 4)

  titulo(doc, '1. Assistente de Matricula')
  paragrafo(doc, 'O processo de matricula e feito em 4 etapas guiadas:')

  mockupMatriculas(doc)

  subtitulo(doc, 'Etapa 1: Selecionar Escola')
  paragrafo(doc, 'Escolha a escola onde os alunos serao matriculados. Usuarios tipo "Escola" ja terao a escola pre-selecionada.')

  subtitulo(doc, 'Etapa 2: Selecionar Serie')
  paragrafo(doc, 'Escolha a serie (ex: 5o Ano). As series disponiveis dependem das turmas cadastradas.')

  subtitulo(doc, 'Etapa 3: Selecionar Turma')
  paragrafo(doc, 'Escolha a turma. O sistema mostra a capacidade e vagas disponiveis (ex: 18/30).')

  subtitulo(doc, 'Etapa 4: Adicionar Alunos')
  paragrafo(doc, 'Busque alunos existentes por nome/codigo/CPF ou cadastre novos alunos preenchendo nome, CPF e data de nascimento.')

  titulo(doc, '2. Confirmando a Matricula')
  passo(doc, '1', 'Revise a lista de alunos adicionados')
  passo(doc, '2', 'Verifique escola, serie e turma no topo')
  passo(doc, '3', 'Clique em "Matricular Alunos"')
  passo(doc, '4', 'O sistema exibira o resultado: matriculados com sucesso e eventuais erros')

  destaque(doc, 'Apos matricular, o aluno ja aparece disponivel para lancamento de notas e frequencia.')

  titulo(doc, '3. Transferencias')
  paragrafo(doc, 'Para transferir um aluno, acesse: Matriculas e Vagas > Transferencias. Busque o aluno e selecione o tipo: Interna (mesma escola), Externa (outra escola da rede) ou Saida (fora da rede).')

  rodape(doc)
  doc.end()
  return new Promise(resolve => stream.on('finish', resolve))
}

// ---------------------------------------------------------------------------
// MANUAL 5: LANCAMENTO DE NOTAS
// ---------------------------------------------------------------------------
function gerarManualNotas() {
  console.log('Gerando: 05-Lancamento-Notas.pdf')
  const { doc, stream } = criarDoc('05-Lancamento-Notas.pdf')
  capa(doc, 'Lancamento de Notas', 'Lancar notas por disciplina e periodo, recuperacao e boletim', 5)

  titulo(doc, '1. Configuracao de Notas')
  tabela(doc,
    ['Configuracao', 'Valor', 'Descricao'],
    [
      ['Nota maxima', '10,0', 'Maior nota possivel'],
      ['Media aprovacao', '6,0', 'Minimo para aprovacao'],
      ['Media recuperacao', '5,0', 'Minimo na recuperacao'],
      ['Peso avaliacao', '60%', 'Peso da nota regular'],
      ['Peso recuperacao', '40%', 'Peso da recuperacao'],
    ]
  )

  titulo(doc, '2. Selecionando o que Lancar')
  paragrafo(doc, 'Preencha os filtros na ordem. Cada filtro atualiza as opcoes do proximo:')

  mockupSelecaoFiltros(doc, 'Selecao — Preencha na ordem', [
    { label: 'Escola', valor: 'EMEF N.S. Lourdes' },
    { label: 'Turma', valor: '5o Ano A' },
    { label: 'Disciplina', valor: 'Matematica' },
    { label: 'Periodo', valor: '1o Bimestre' },
  ])

  numeroPasso(doc, 1, 'Selecione a Escola')
  numeroPasso(doc, 2, 'Selecione a Serie e Turma')
  numeroPasso(doc, 3, 'Selecione a Disciplina (ex: Lingua Portuguesa)')
  numeroPasso(doc, 4, 'Selecione o Periodo (ex: 1o Bimestre)')
  numeroPasso(doc, 5, 'Clique em "Lancar Notas" para abrir a tabela')

  titulo(doc, '3. Lancando as Notas')
  paragrafo(doc, 'A tabela mostra todos os alunos da turma. Preencha as notas:')
  mockupNotas(doc)

  passo(doc, '1', 'Clique no campo "Nota" do primeiro aluno')
  passo(doc, '2', 'Digite a nota (ex: 7.5) — use ponto como decimal')
  passo(doc, '3', 'Pressione Tab para ir ao proximo aluno')
  passo(doc, '4', 'Repita para todos os alunos')
  passo(doc, '5', 'Clique em "Salvar Notas"')

  destaque(doc, 'Dica: Use Tab para navegar rapidamente entre os campos sem precisar do mouse.')

  titulo(doc, '4. Recuperacao')
  paragrafo(doc, 'Quando um aluno obtem nota abaixo de 6,0, a coluna "Recuperacao" e habilitada. A media final e calculada: (Nota x 60%) + (Recuperacao x 40%)')
  paragrafo(doc, 'Exemplo: Nota 4,0 + Recuperacao 7,0 = (4,0 x 0,6) + (7,0 x 0,4) = 2,4 + 2,8 = 5,2')

  titulo(doc, '5. Boletim')
  paragrafo(doc, 'A aba "Boletim" mostra as notas consolidadas de cada aluno. Veja o exemplo:')

  mockupBoletim(doc)

  paragrafo(doc, 'O boletim exibe notas de cada periodo, media final, total de faltas e situacao (Aprovado/Reprovado). Clique em "Imprimir" para gerar versao para impressao.')

  rodape(doc)
  doc.end()
  return new Promise(resolve => stream.on('finish', resolve))
}

// ---------------------------------------------------------------------------
// MANUAL 6: FREQUENCIA
// ---------------------------------------------------------------------------
function gerarManualFrequencia() {
  console.log('Gerando: 06-Lancamento-Frequencia.pdf')
  const { doc, stream } = criarDoc('06-Lancamento-Frequencia.pdf')
  capa(doc, 'Lancamento de Frequencia', 'Registrar presencas, faltas e acompanhar infrequencia', 6)

  titulo(doc, '1. Selecionando a Turma')
  paragrafo(doc, 'Acesse: Frequencia > Frequencia Bimestral. Preencha os filtros:')

  mockupSelecaoFiltros(doc, 'Filtros de Frequencia', [
    { label: 'Ano Letivo', valor: '2026' },
    { label: 'Escola', valor: 'EMEF N.S. Lourdes' },
    { label: 'Turma', valor: '5o Ano A' },
    { label: 'Periodo', valor: '1o Bimestre' },
  ])

  titulo(doc, '2. Lancando a Frequencia Bimestral')
  paragrafo(doc, 'Apos selecionar, a tabela de alunos sera exibida com as colunas de faltas:')

  mockupFrequencia(doc)

  subtitulo(doc, 'Passo a passo:')
  numeroPasso(doc, 1, 'Verifique o numero de "Dias Letivos" do periodo (ex: 50)')
  numeroPasso(doc, 2, 'Para cada aluno, preencha o numero de faltas')
  numeroPasso(doc, 3, 'Preencha faltas justificadas quando houver (atestados)')
  numeroPasso(doc, 4, 'O sistema calcula automaticamente presencas e percentual')
  numeroPasso(doc, 5, 'Clique em "Salvar Frequencia"')

  paragrafo(doc, 'Calculo: Presencas = Dias Letivos - Faltas  |  % Frequencia = (Presencas / Dias) x 100')

  titulo(doc, '2. Indicadores de Frequencia')
  tabela(doc,
    ['Cor', 'Faixa', 'Significado'],
    [
      ['Verde', '>= 90%', 'Frequencia adequada'],
      ['Amarelo', '75% a 89%', 'Atencao — risco de infrequencia'],
      ['Vermelho', '< 75%', 'Infrequente — risco de reprovacao'],
    ]
  )

  destaque(doc, 'Regra legal: Aluno com frequencia inferior a 75% pode ser reprovado por falta, independentemente das notas.', CORES.vermelho)

  titulo(doc, '4. Frequencia Diaria')
  paragrafo(doc, 'Para controle dia a dia, acesse Frequencia > Frequencia Diaria. Selecione a data e marque P (Presente) ou F (Faltou):')

  mockupFrequenciaDiaria(doc)

  numeroPasso(doc, 1, 'Selecione a turma e a data')
  numeroPasso(doc, 2, 'Clique em "P" (verde) para presente ou "F" (vermelho) para faltou')
  numeroPasso(doc, 3, 'Clique em "Salvar"')

  titulo(doc, '4. Integracao com Reconhecimento Facial')
  paragrafo(doc, 'Escolas com reconhecimento facial tem os registros sincronizados automaticamente. Os registros faciais aparecem com icone de camera e podem ser complementados manualmente.')

  rodape(doc)
  doc.end()
  return new Promise(resolve => stream.on('finish', resolve))
}

// ---------------------------------------------------------------------------
// MANUAL 7: CADASTRO FACIAL
// ---------------------------------------------------------------------------
function gerarManualFacial() {
  console.log('Gerando: 07-Cadastro-Facial.pdf')
  const { doc, stream } = criarDoc('07-Cadastro-Facial.pdf')
  capa(doc, 'Cadastro Facial', 'Consentimento LGPD, captura do rosto e terminal de presenca', 7)

  titulo(doc, '1. Privacidade (LGPD)')
  destaque(doc, 'O sistema NAO armazena fotos. Apenas vetores matematicos (numeros) que nao permitem reconstruir a imagem do rosto. O consentimento do responsavel e obrigatorio.')

  titulo(doc, '2. Fluxo do Cadastro')
  mockupTabelaAlunos(doc)

  tabela(doc,
    ['Status', 'Cor', 'Significado'],
    [
      ['Sem Consentimento', 'Vermelho', 'Responsavel ainda nao autorizou'],
      ['Sem Embedding', 'Amarelo', 'Consentimento dado, rosto nao capturado'],
      ['Cadastrado', 'Verde', 'Pronto para usar no terminal'],
    ]
  )

  titulo(doc, '3. Registrando o Consentimento')
  passo(doc, '1', 'Clique em "Consentimento" ao lado do aluno')
  passo(doc, '2', 'Preencha o nome do responsavel legal')
  passo(doc, '3', 'Marque a caixa de autorizacao')
  passo(doc, '4', 'Clique em "Salvar Consentimento"')

  titulo(doc, '4. Capturando o Rosto')
  mockupFacial(doc)

  paragrafo(doc, 'A captura e feita em 3 angulos: Frontal, Esquerda e Direita. Para cada angulo:')
  passo(doc, '1', 'Posicione o aluno dentro do guia oval')
  passo(doc, '2', 'Aguarde os indicadores ficarem verdes (qualidade, tamanho, luz)')
  passo(doc, '3', 'A captura acontece automaticamente quando as condicoes estiverem boas')
  passo(doc, '4', 'Apos 3 poses, clique em "Salvar Cadastro Facial"')

  titulo(doc, '5. Dicas para Boa Captura')
  itemLista(doc, 'Ambiente bem iluminado (luz natural e ideal)')
  itemLista(doc, 'Rosto deve ocupar boa parte da tela — nao fique longe')
  itemLista(doc, 'Remover oculos escuros, bones ou itens que cubram o rosto')
  itemLista(doc, 'Evitar contraluz (janela atras do aluno)')
  itemLista(doc, 'Manter o celular/camera estavel')

  titulo(doc, '6. Usando o Terminal')
  paragrafo(doc, 'Apos cadastrar os alunos, abra o Terminal (menu > Reconhecimento Facial > Terminal). Posicione o dispositivo na entrada da sala. Os alunos olham para a camera e a presenca e registrada automaticamente.')
  destaque(doc, 'O terminal funciona offline! Os registros sao sincronizados quando a internet voltar.')

  rodape(doc)
  doc.end()
  return new Promise(resolve => stream.on('finish', resolve))
}

// ---------------------------------------------------------------------------
// MANUAL 8: PORTAL DO PROFESSOR
// ---------------------------------------------------------------------------
function gerarManualProfessor() {
  console.log('Gerando: 08-Portal-Professor.pdf')
  const { doc, stream } = criarDoc('08-Portal-Professor.pdf')
  capa(doc, 'Portal do Professor', 'Dashboard, lancamento de notas e frequencia pelo professor', 8)

  titulo(doc, '1. Dashboard do Professor')
  mockupProfessor(doc)

  paragrafo(doc, 'Ao fazer login, o professor ve seu painel com: total de turmas, alunos, frequencia do dia e da semana. Botoes rapidos permitem lancar frequencia e notas diretamente.')

  titulo(doc, '2. Lancando Frequencia')
  passo(doc, '1', 'No menu, acesse Frequencia > Lancar Frequencia')
  passo(doc, '2', 'Selecione a turma desejada')
  passo(doc, '3', 'Para cada aluno, marque P (Presente) ou F (Faltou)')
  passo(doc, '4', 'Clique em "Salvar"')

  destaque(doc, 'O sistema funciona offline! Em escolas sem internet, a frequencia e salva localmente e sincronizada depois.')

  titulo(doc, '3. Lancando Notas')
  passo(doc, '1', 'No menu, acesse Notas > Lancar Notas')
  passo(doc, '2', 'Selecione: Turma > Disciplina > Periodo')
  passo(doc, '3', 'Preencha as notas (0 a 10, use ponto como decimal)')
  passo(doc, '4', 'Clique em "Salvar"')

  tabela(doc,
    ['Campo', 'Descricao'],
    [
      ['Nota', 'Nota da avaliacao (0 a 10)'],
      ['Recuperacao', 'Nota de recuperacao (apenas se nota < 6,0)'],
      ['Faltas', 'Numero de faltas no periodo'],
      ['Observacao', 'Anotacao livre (opcional)'],
    ]
  )

  titulo(doc, '4. Navegacao no Celular')
  paragrafo(doc, 'O Portal do Professor e otimizado para celular com barra de navegacao inferior: Dashboard, Minhas Turmas, Frequencia e Notas.')

  itemLista(doc, 'Adicione o sistema a tela inicial do celular (funciona como app)')
  itemLista(doc, 'Funciona offline — dados sincronizam quando a internet voltar')
  itemLista(doc, 'Faca login no inicio do dia para sincronizar')

  titulo(doc, '5. Problemas Comuns')
  tabela(doc,
    ['Problema', 'Solucao'],
    [
      ['Nenhuma turma vinculada', 'O administrador precisa vincular turmas ao seu perfil'],
      ['Disciplina nao aparece', 'Verifique com o admin se esta configurada para a serie'],
      ['Notas nao salvam', 'Notas devem ser entre 0 e 10, use ponto como decimal'],
      ['Frequencia nao sincroniza', 'Verifique a internet. Dados serao sincronizados automaticamente'],
    ]
  )

  titulo(doc, '6. Dicas para o Dia a Dia')
  itemLista(doc, 'Lance a frequencia DIARIAMENTE — nao acumule')
  itemLista(doc, 'Lance notas ao corrigir as avaliacoes — nao espere o final do bimestre')
  itemLista(doc, 'Salve frequentemente — nao perca dados por fechar o navegador')
  itemLista(doc, 'Se tiver problemas, contate a secretaria da escola ou o suporte da SEMED')

  rodape(doc)
  doc.end()
  return new Promise(resolve => stream.on('finish', resolve))
}

// ============================================================================
// EXECUTAR
// ============================================================================

async function main() {
  console.log('=== Gerando Manuais em PDF ===\n')

  await gerarManualLogin()
  await gerarManualEscolas()
  await gerarManualTurmas()
  await gerarManualMatriculas()
  await gerarManualNotas()
  await gerarManualFrequencia()
  await gerarManualFacial()
  await gerarManualProfessor()

  console.log('\n=== Todos os PDFs gerados com sucesso! ===')
  console.log(`Pasta: ${OUTPUT_DIR}`)
}

main().catch(console.error)
