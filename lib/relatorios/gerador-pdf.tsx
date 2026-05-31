/**
 * Componentes React-PDF para geração de relatórios.
 *
 * Decomposto em 2026-05-31 (auditoria) — antes era 1 arquivo de 1077 linhas:
 *   pdf/styles.ts         — StyleSheet compartilhado
 *   pdf/atomos.tsx        — Estatistica, Rodape (átomos reutilizáveis)
 *   pdf/secoes.tsx        — Tabelas + sections (Produção, Níveis, Comparativo, Segmento)
 *   pdf/paginas.tsx       — PaginaDadosGerais, PaginaAnosIniciais, PaginaAnosFinais
 *   pdf/relatorio-escola.tsx — RelatorioEscolaPDF (3-6 páginas)
 *   pdf/relatorio-polo.tsx   — RelatorioPoloPDF (3-6 páginas)
 *
 * Este arquivo é apenas um barrel re-export. A API pública é preservada —
 * chamadores continuam usando:
 *   import { RelatorioEscolaPDF, RelatorioPoloPDF } from '@/lib/relatorios/gerador-pdf'
 *
 * @module lib/relatorios/gerador-pdf
 */
export { RelatorioEscolaPDF } from './pdf/relatorio-escola'
export { RelatorioPoloPDF } from './pdf/relatorio-polo'
