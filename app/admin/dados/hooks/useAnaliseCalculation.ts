import { useCallback } from 'react'
import {
  compararSeries as compararSeriesLib,
  compararDisciplinas as compararDisciplinasLib
} from '@/lib/disciplinas-mapping'
import type { DashboardData } from '@/lib/dados/types'

export function useAnaliseCalculation() {
  const compararSeries = compararSeriesLib
  const compararDisciplinas = compararDisciplinasLib

  const calcularAnaliseDeResumos = useCallback((resumos: DashboardData['resumosPorSerie'], serie: string, disciplina?: string) => {
    if (!resumos) return null

    // Filtrar resumos pela série selecionada (se série vazia, manter todos)
    let questoesFiltradas = serie
      ? (resumos.questoes?.filter(q => compararSeries(q.serie, serie)) || [])
      : (resumos.questoes || [])
    let escolasFiltradas = serie
      ? (resumos.escolas?.filter(e => compararSeries(e.serie, serie)) || [])
      : (resumos.escolas || [])
    let turmasFiltradas = serie
      ? (resumos.turmas?.filter(t => compararSeries(t.serie, serie)) || [])
      : (resumos.turmas || [])
    let disciplinasFiltradas = serie
      ? (resumos.disciplinas?.filter(d => compararSeries(d.serie, serie)) || [])
      : (resumos.disciplinas || [])

    // Se há filtro de disciplina, aplicar também
    if (disciplina) {
      questoesFiltradas = questoesFiltradas.filter(q => compararDisciplinas(q.disciplina, disciplina))
      disciplinasFiltradas = disciplinasFiltradas.filter(d => compararDisciplinas(d.disciplina, disciplina))
      escolasFiltradas = escolasFiltradas.filter(e => compararDisciplinas(e.disciplina, disciplina))
      turmasFiltradas = turmasFiltradas.filter(t => compararDisciplinas(t.disciplina, disciplina))
    }

    // Agregar escolas
    const escolasAgregadas = new Map<string, typeof escolasFiltradas[0] & { disciplinas: Set<string> }>()
    escolasFiltradas.forEach(e => {
      const key = e.escola_id
      if (escolasAgregadas.has(key)) {
        const existing = escolasAgregadas.get(key)!
        existing.total_respostas += e.total_respostas
        existing.total_acertos += e.total_acertos
        existing.total_erros += e.total_erros
        existing.total_alunos = Math.max(existing.total_alunos, e.total_alunos)
        existing.disciplinas.add(e.disciplina)
      } else {
        escolasAgregadas.set(key, { ...e, disciplinas: new Set([e.disciplina]) })
      }
    })
    escolasFiltradas = Array.from(escolasAgregadas.values())

    // Agregar turmas
    const turmasAgregadas = new Map<string, typeof turmasFiltradas[0] & { disciplinas: Set<string> }>()
    turmasFiltradas.forEach(t => {
      const key = t.turma_id
      if (turmasAgregadas.has(key)) {
        const existing = turmasAgregadas.get(key)!
        existing.total_respostas += t.total_respostas
        existing.total_acertos += t.total_acertos
        existing.total_erros += t.total_erros
        existing.total_alunos = Math.max(existing.total_alunos, t.total_alunos)
        existing.disciplinas.add(t.disciplina)
      } else {
        turmasAgregadas.set(key, { ...t, disciplinas: new Set([t.disciplina]) })
      }
    })
    turmasFiltradas = Array.from(turmasAgregadas.values())

    // Calcular taxa geral
    const totalRespostasGeral = disciplinasFiltradas.reduce((acc, d) => acc + d.total_respostas, 0)
    const totalAcertosGeral = disciplinasFiltradas.reduce((acc, d) => acc + d.total_acertos, 0)
    const totalErrosGeral = disciplinasFiltradas.reduce((acc, d) => acc + d.total_erros, 0)

    const taxaAcertoGeral = totalRespostasGeral > 0 ? {
      total_respostas: totalRespostasGeral,
      total_acertos: totalAcertosGeral,
      total_erros: totalErrosGeral,
      taxa_acerto_geral: (totalAcertosGeral / totalRespostasGeral) * 100,
      taxa_erro_geral: (totalErrosGeral / totalRespostasGeral) * 100
    } : null

    // Taxa por disciplina
    const taxaAcertoPorDisciplina = disciplinasFiltradas.map(d => ({
      disciplina: d.disciplina,
      total_respostas: d.total_respostas,
      total_acertos: d.total_acertos,
      total_erros: d.total_erros,
      taxa_acerto: d.total_respostas > 0 ? (d.total_acertos / d.total_respostas) * 100 : 0,
      taxa_erro: d.total_respostas > 0 ? (d.total_erros / d.total_respostas) * 100 : 0
    }))

    // Agregar questões por código
    const questoesAgregadas = questoesFiltradas.reduce((acc, q) => {
      const key = q.questao_codigo
      if (!acc[key]) {
        acc[key] = {
          questao_codigo: q.questao_codigo,
          questao_descricao: q.questao_descricao,
          disciplina: q.disciplina,
          total_respostas: 0,
          total_acertos: 0,
          total_erros: 0
        }
      }
      acc[key].total_respostas += q.total_respostas
      acc[key].total_acertos += q.total_acertos
      acc[key].total_erros += q.total_erros
      return acc
    }, {} as Record<string, { questao_codigo: string; questao_descricao: string; disciplina: string; total_respostas: number; total_acertos: number; total_erros: number }>)

    const questoesAgregadasArray = Object.values(questoesAgregadas)

    // Questões com mais erros
    const questoesComMaisErros = questoesAgregadasArray
      .map(q => ({
        questao_codigo: q.questao_codigo,
        questao_descricao: q.questao_descricao,
        disciplina: q.disciplina,
        total_respostas: q.total_respostas,
        total_acertos: q.total_acertos,
        total_erros: q.total_erros,
        taxa_acerto: q.total_respostas > 0 ? (q.total_acertos / q.total_respostas) * 100 : 0,
        taxa_erro: q.total_respostas > 0 ? (q.total_erros / q.total_respostas) * 100 : 0
      }))
      .sort((a, b) => b.taxa_erro - a.taxa_erro)
      .slice(0, 20)

    // Questões com mais acertos
    const questoesComMaisAcertos = questoesAgregadasArray
      .map(q => ({
        questao_codigo: q.questao_codigo,
        questao_descricao: q.questao_descricao,
        disciplina: q.disciplina,
        total_respostas: q.total_respostas,
        total_acertos: q.total_acertos,
        total_erros: q.total_erros,
        taxa_acerto: q.total_respostas > 0 ? (q.total_acertos / q.total_respostas) * 100 : 0,
        taxa_erro: q.total_respostas > 0 ? (q.total_erros / q.total_respostas) * 100 : 0
      }))
      .sort((a, b) => b.taxa_acerto - a.taxa_acerto)
      .slice(0, 20)

    // Escolas com mais erros
    const escolasComMaisErros = escolasFiltradas
      .map(e => ({
        escola_id: e.escola_id,
        escola: e.escola,
        polo: e.polo,
        total_respostas: e.total_respostas,
        total_acertos: e.total_acertos,
        total_erros: e.total_erros,
        taxa_acerto: e.total_respostas > 0 ? (e.total_acertos / e.total_respostas) * 100 : 0,
        taxa_erro: e.total_respostas > 0 ? (e.total_erros / e.total_respostas) * 100 : 0,
        total_alunos: e.total_alunos
      }))
      .sort((a, b) => b.taxa_erro - a.taxa_erro)

    // Escolas com mais acertos
    const escolasComMaisAcertos = [...escolasComMaisErros].sort((a, b) => b.taxa_acerto - a.taxa_acerto)

    // Turmas com mais erros
    const turmasComMaisErros = turmasFiltradas
      .map(t => ({
        turma_id: t.turma_id,
        turma: t.turma,
        escola: t.escola,
        serie: serie,
        total_respostas: t.total_respostas,
        total_acertos: t.total_acertos,
        total_erros: t.total_erros,
        taxa_acerto: t.total_respostas > 0 ? (t.total_acertos / t.total_respostas) * 100 : 0,
        taxa_erro: t.total_respostas > 0 ? (t.total_erros / t.total_respostas) * 100 : 0,
        total_alunos: t.total_alunos
      }))
      .sort((a, b) => b.taxa_erro - a.taxa_erro)

    // Turmas com mais acertos
    const turmasComMaisAcertos = [...turmasComMaisErros].sort((a, b) => b.taxa_acerto - a.taxa_acerto)

    return {
      taxaAcertoGeral,
      taxaAcertoPorDisciplina,
      questoesComMaisErros,
      questoesComMaisAcertos,
      escolasComMaisErros,
      escolasComMaisAcertos,
      turmasComMaisErros,
      turmasComMaisAcertos
    }
  }, []) // compararSeries e compararDisciplinas são imports estáveis

  return { calcularAnaliseDeResumos }
}
