/**
 * Helpers de normalização e detecção de série a partir de dados da
 * planilha de importação. Funções puras, sem dependências externas.
 */
import { createLogger } from '@/lib/logger'

const log = createLogger('ImportarResultados:Serie')

export interface ConfigSerieRow {
  id: number
  serie: string
  tipo_ensino: string
  qtd_itens_producao: number
  avalia_lp: boolean
  avalia_mat: boolean
  avalia_ch: boolean
  avalia_cn: boolean
  qtd_questoes_lp: number
  qtd_questoes_mat: number
  qtd_questoes_ch: number
  qtd_questoes_cn: number
  disciplinas: DisciplinaConfig[]
}

export interface DisciplinaConfig {
  serie_id: number
  disciplina: string
  sigla: string
  ordem: number
  questao_inicio: number
  questao_fim: number
  qtd_questoes: number
  valor_questao: number
}

export interface QuestaoMap {
  inicio: number
  fim: number
  area: string
  disciplina: string
  sigla: string
  valor_questao: number
  qtd_questoes?: number
}

/**
 * Extrai apenas dígitos da série (ex: "5º Ano" -> "5", "2º" -> "2").
 * Se parece ano letivo (2000-2100), retorna vazio para forçar inferência.
 */
export function normalizarSerie(serie: string): string {
  if (!serie) return ''
  const apenasDigitos = serie.toString().replace(/[^\d]/g, '').trim()
  const numero = parseInt(apenasDigitos, 10)
  if (numero >= 2000 && numero <= 2100) {
    log.warn(`Valor "${serie}" parece ano letivo, não série escolar. Ignorando.`)
    return ''
  }
  return apenasDigitos
}

/** Padroniza para formato consistente (ex: "5º" -> "5º Ano", "2" -> "2º Ano"). */
export function padronizarSerie(serie: string): string {
  const numero = normalizarSerie(serie)
  if (!numero) return ''
  return `${numero}º Ano`
}

/** Infere série da turma (ex: "2A", "2º A", "T2A" -> "2"). */
export function inferirSerieDaTurma(turma: string): string {
  if (!turma) return ''
  const match = turma.match(/(\d+)/)?.[1]
  return match || ''
}

/** Detecta série pela maior questão respondida na linha. */
export function detectarSeriePorQuestoes(linha: Record<string, unknown>): string {
  let maiorQuestao = 0
  for (let q = 1; q <= 60; q++) {
    const valor = linha[`Q${q}`]
    if (valor !== undefined && valor !== null && valor !== '') {
      maiorQuestao = q
    }
  }

  if (maiorQuestao > 0 && maiorQuestao <= 28) return '2'  // 2º ou 3º ano
  if (maiorQuestao > 28 && maiorQuestao <= 34) return '5' // 5º ano
  if (maiorQuestao > 34) return '8'                       // anos finais
  return ''
}

/**
 * Obtém mapeamento de questões baseado na série. Usa a config carregada
 * do banco; se não encontrar, usa fallback inteligente baseado no ano.
 */
export function obterQuestoesMap(
  serie: string,
  configSeriesMap: Map<string, ConfigSerieRow>
): QuestaoMap[] {
  const serieNormalizada = normalizarSerie(serie)
  let configFinal = configSeriesMap.get(serieNormalizada)

  if (!configFinal) {
    const serieNum = serie.replace(/[^\d]/g, '')
    configFinal = configSeriesMap.get(serieNum)
  }

  if (configFinal && configFinal.disciplinas && configFinal.disciplinas.length > 0) {
    return configFinal.disciplinas.map((d) => ({
      inicio: d.questao_inicio,
      fim: d.questao_fim,
      area: d.disciplina,
      disciplina: d.disciplina,
      sigla: d.sigla,
      valor_questao: parseFloat(String(d.valor_questao)) || 0.5,
      qtd_questoes: d.qtd_questoes,
    }))
  }

  // Fallback INTELIGENTE baseado na série
  const serieNum = parseInt(serie.replace(/[^\d]/g, '') || '0')

  if (serieNum === 2 || serieNum === 3) {
    log.warn(`Sem config para série "${serie}", usando padrão ANOS INICIAIS (2º/3º)`)
    return [
      { inicio: 1,  fim: 14, area: 'Língua Portuguesa', disciplina: 'Língua Portuguesa', sigla: 'LP', valor_questao: 0.714 },
      { inicio: 15, fim: 28, area: 'Matemática',        disciplina: 'Matemática',        sigla: 'MAT', valor_questao: 0.714 },
    ]
  }

  if (serieNum === 5) {
    log.warn(`Sem config para série "${serie}", usando padrão ANOS INICIAIS (5º)`)
    return [
      { inicio: 1,  fim: 14, area: 'Língua Portuguesa', disciplina: 'Língua Portuguesa', sigla: 'LP', valor_questao: 0.714 },
      { inicio: 15, fim: 34, area: 'Matemática',        disciplina: 'Matemática',        sigla: 'MAT', valor_questao: 0.5 },
    ]
  }

  log.warn(`Sem config para série "${serie}", usando padrão ANOS FINAIS`)
  return [
    { inicio: 1,  fim: 20, area: 'Língua Portuguesa',    disciplina: 'Língua Portuguesa',    sigla: 'LP',  valor_questao: 0.5 },
    { inicio: 21, fim: 30, area: 'Ciências Humanas',     disciplina: 'Ciências Humanas',     sigla: 'CH',  valor_questao: 1.0 },
    { inicio: 31, fim: 50, area: 'Matemática',           disciplina: 'Matemática',           sigla: 'MAT', valor_questao: 0.5 },
    { inicio: 51, fim: 60, area: 'Ciências da Natureza', disciplina: 'Ciências da Natureza', sigla: 'CN',  valor_questao: 1.0 },
  ]
}

export function obterConfigSerie(
  serie: string,
  configSeriesMap: Map<string, ConfigSerieRow>
): ConfigSerieRow | undefined {
  const serieNormalizada = normalizarSerie(serie)
  let config = configSeriesMap.get(serieNormalizada)
  if (!config) {
    const serieNum = serie.replace(/[^\d]/g, '')
    config = configSeriesMap.get(serieNum)
  }
  return config
}
