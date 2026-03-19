'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Search, Users, Award, ClipboardCheck } from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useSeries } from '@/lib/use-series'

interface EscolaSimples { id: string; nome: string }

interface MediaDisciplina {
  disciplina: string
  media_anual: number | null
  periodos_com_nota: number
  periodos_total: number
}

interface ResultadoAluno {
  aluno_id: string
  aluno_nome: string
  serie: string
  turma_codigo: string
  medias: MediaDisciplina[]
  frequencia_percentual: number | null
  situacao_proposta: string
  motivo: string
  parcial: boolean
}

interface Resumo {
  total: number
  aprovados: number
  reprovados: number
  em_recuperacao: number
  parciais: number
}

export default function FechamentoAnoPage() {
  const toast = useToast()
  const { formatSerie } = useSeries()

  const [escolas, setEscolas] = useState<EscolaSimples[]>([])
  const [escolaId, setEscolaId] = useState('')
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear().toString())

  const [resultados, setResultados] = useState<ResultadoAluno[]>([])
  const [resumo, setResumo] = useState<Resumo>({ total: 0, aprovados: 0, reprovados: 0, em_recuperacao: 0, parciais: 0 })
  const [carregando, setCarregando] = useState(false)
  const [aplicando, setAplicando] = useState(false)
  const [calculado, setCalculado] = useState(false)
  const [confirmarDialog, setConfirmarDialog] = useState(false)

  // Carregar escolas
  useEffect(() => {
    fetch('/api/admin/escolas')
      .then(r => r.json())
      .then(data => setEscolas(Array.isArray(data) ? data : []))
      .catch(() => setEscolas([]))
  }, [])

  const calcularResultados = async () => {
    if (!escolaId) {
      toast.info('Selecione uma escola')
      return
    }

    setCarregando(true)
    setCalculado(false)
    setResultados([])

    try {
      const params = new URLSearchParams({ escola_id: escolaId, ano_letivo: anoLetivo })
      const res = await fetch(`/api/admin/fechamento-ano?${params}`)

      if (res.ok) {
        const data = await res.json()
        setResultados(data.resultados || [])
        setResumo(data.resumo || { total: 0, aprovados: 0, reprovados: 0, em_recuperacao: 0, parciais: 0 })
        setCalculado(true)
        if (data.resultados?.length === 0) {
          toast.info('Nenhum aluno cursando encontrado para esta escola/ano')
        }
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.mensagem || 'Erro ao calcular resultados')
      }
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setCarregando(false)
    }
  }

  const aplicarResultados = async () => {
    setConfirmarDialog(false)

    // Filtrar apenas aprovados e reprovados (excluir parciais)
    const resultadosParaAplicar = resultados
      .filter(r => r.situacao_proposta === 'aprovado' || r.situacao_proposta === 'reprovado')
      .map(r => ({ aluno_id: r.aluno_id, situacao: r.situacao_proposta as 'aprovado' | 'reprovado' }))

    if (resultadosParaAplicar.length === 0) {
      toast.info('Nenhum resultado definitivo para aplicar (todos são parciais)')
      return
    }

    setAplicando(true)
    try {
      const res = await fetch('/api/admin/fechamento-ano', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          escola_id: escolaId,
          ano_letivo: anoLetivo,
          resultados: resultadosParaAplicar,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(data.mensagem || 'Resultados aplicados com sucesso')
        // Recalcular para atualizar estado
        await calcularResultados()
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.mensagem || 'Erro ao aplicar resultados')
      }
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setAplicando(false)
    }
  }

  const corSituacao = (situacao: string) => {
    switch (situacao) {
      case 'aprovado': return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
      case 'reprovado': return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
      case 'em_recuperacao': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
      case 'parcial': return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  const labelSituacao = (situacao: string) => {
    switch (situacao) {
      case 'aprovado': return 'Aprovado'
      case 'reprovado': return 'Reprovado'
      case 'em_recuperacao': return 'Em Recuperacao'
      case 'parcial': return 'Parcial'
      default: return situacao
    }
  }

  const totalDefinitivos = resultados.filter(r => r.situacao_proposta === 'aprovado' || r.situacao_proposta === 'reprovado').length

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-lg p-2">
              <ClipboardCheck className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Fechamento do Ano Letivo</h1>
              <p className="text-sm opacity-90">Calcular e aplicar resultados finais dos alunos</p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Filtros</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Escola</label>
              <select
                value={escolaId}
                onChange={e => { setEscolaId(e.target.value); setCalculado(false); setResultados([]) }}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                <option value="">Selecione uma escola...</option>
                {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ano Letivo</label>
              <select
                value={anoLetivo}
                onChange={e => { setAnoLetivo(e.target.value); setCalculado(false); setResultados([]) }}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={calcularResultados}
                disabled={!escolaId || carregando}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  escolaId && !carregando
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-200 dark:bg-slate-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Search className="w-4 h-4" />
                Calcular Resultados
              </button>
            </div>
          </div>
        </div>

        {carregando ? (
          <LoadingSpinner text="Calculando resultados..." centered />
        ) : calculado && resultados.length > 0 ? (
          <>
            {/* Cards Resumo */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-100 dark:bg-indigo-900/40 rounded-lg p-2">
                    <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{resumo.total}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 dark:bg-green-900/40 rounded-lg p-2">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{resumo.aprovados}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Aprovados</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5">
                <div className="flex items-center gap-3">
                  <div className="bg-red-100 dark:bg-red-900/40 rounded-lg p-2">
                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{resumo.reprovados}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Reprovados</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5">
                <div className="flex items-center gap-3">
                  <div className="bg-yellow-100 dark:bg-yellow-900/40 rounded-lg p-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{resumo.em_recuperacao}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Recuperacao</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5">
                <div className="flex items-center gap-3">
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-2">
                    <AlertTriangle className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-500 dark:text-gray-400">{resumo.parciais}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Parciais</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabela de resultados */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200 dark:divide-slate-700">
                  <thead className="bg-gray-50 dark:bg-slate-700">
                    <tr>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase w-8">#</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Aluno</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Serie</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Turma</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Medias</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Freq. %</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Situacao</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Motivo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {resultados.map((aluno, idx) => (
                      <tr key={aluno.aluno_id} className={`hover:bg-gray-50 dark:hover:bg-slate-700/50 ${idx % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-slate-800/50'}`}>
                        <td className="py-3 px-3 text-sm text-gray-500">{idx + 1}</td>
                        <td className="py-3 px-3">
                          <span className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">{aluno.aluno_nome}</span>
                        </td>
                        <td className="py-3 px-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {formatSerie(aluno.serie)}
                        </td>
                        <td className="py-3 px-3 text-center text-sm text-gray-700 dark:text-gray-300">{aluno.turma_codigo}</td>
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1">
                            {aluno.medias.length > 0 ? aluno.medias.map((m, mi) => (
                              <span
                                key={mi}
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                  m.media_anual === null
                                    ? 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                                    : m.media_anual >= 6
                                      ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                      : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                }`}
                                title={`${m.disciplina}: ${m.media_anual?.toFixed(1) ?? '-'} (${m.periodos_com_nota}/${m.periodos_total} periodos)`}
                              >
                                {m.disciplina.substring(0, 3).toUpperCase()}
                                <span className="font-bold">{m.media_anual?.toFixed(1) ?? '-'}</span>
                              </span>
                            )) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {aluno.frequencia_percentual !== null ? (
                            <span className={`text-sm font-semibold ${
                              aluno.frequencia_percentual >= 75
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {aluno.frequencia_percentual.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${corSituacao(aluno.situacao_proposta)}`}>
                            {labelSituacao(aluno.situacao_proposta)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-xs text-gray-500 dark:text-gray-400 max-w-xs truncate" title={aluno.motivo}>
                          {aluno.motivo}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer com botão de aplicar */}
              <div className="px-4 py-4 border-t border-gray-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
                <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-4">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span> Aprovado
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span> Reprovado
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block"></span> Em Recuperacao
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-gray-400 inline-block"></span> Parcial (nao sera aplicado)
                  </span>
                </div>

                <button
                  onClick={() => setConfirmarDialog(true)}
                  disabled={aplicando || totalDefinitivos === 0}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    !aplicando && totalDefinitivos > 0
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-gray-200 dark:bg-slate-700 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Award className="w-4 h-4" />
                  {aplicando ? 'Aplicando...' : `Aplicar Resultados (${totalDefinitivos} alunos)`}
                </button>
              </div>
            </div>
          </>
        ) : calculado ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-12 text-center">
            <ClipboardCheck className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">Nenhum aluno cursando encontrado</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Verifique a escola e o ano letivo selecionados</p>
          </div>
        ) : null}

        {/* Dialog de confirmacao */}
        {confirmarDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 max-w-md mx-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-100 dark:bg-yellow-900/40 rounded-full p-2">
                  <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Confirmar Fechamento</h3>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-300">
                Voce esta prestes a aplicar o fechamento do ano letivo <strong>{anoLetivo}</strong> para <strong>{totalDefinitivos}</strong> aluno(s).
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <strong>{resumo.aprovados}</strong> serao aprovados e <strong>{resumo.reprovados}</strong> serao reprovados.
              </p>
              {resumo.parciais > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {resumo.parciais} aluno(s) com situacao parcial nao serao processados.
                </p>
              )}
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                Esta acao nao pode ser desfeita facilmente. Confirme apenas se os resultados estao corretos.
              </p>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setConfirmarDialog(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={aplicarResultados}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Confirmar e Aplicar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
