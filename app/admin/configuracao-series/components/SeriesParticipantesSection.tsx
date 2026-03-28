'use client'

import { useEffect, useState, useCallback } from 'react'
import { Calendar, Check, Save, Printer, Users, BookOpen } from 'lucide-react'
import { useSeries } from '@/lib/use-series'

interface SerieParticipante {
  id: string
  ano_letivo: string
  serie: string
  ativo: boolean
  serie_nome: string | null
  etapa: string | null
}

const TODAS_SERIES = [
  { codigo: '1', nome: '1º Ano', etapa: 'Anos Iniciais', cor: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700' },
  { codigo: '2', nome: '2º Ano', etapa: 'Anos Iniciais', cor: 'bg-cyan-100 text-cyan-700 border-cyan-300 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-700' },
  { codigo: '3', nome: '3º Ano', etapa: 'Anos Iniciais', cor: 'bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-700' },
  { codigo: '4', nome: '4º Ano', etapa: 'Anos Iniciais', cor: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700' },
  { codigo: '5', nome: '5º Ano', etapa: 'Anos Iniciais', cor: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700' },
  { codigo: '6', nome: '6º Ano', etapa: 'Anos Finais', cor: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700' },
  { codigo: '7', nome: '7º Ano', etapa: 'Anos Finais', cor: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700' },
  { codigo: '8', nome: '8º Ano', etapa: 'Anos Finais', cor: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700' },
  { codigo: '9', nome: '9º Ano', etapa: 'Anos Finais', cor: 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700' },
]

export default function SeriesParticipantesSection() {
  const anoAtual = new Date().getFullYear()
  const anosDisponiveis = [`${anoAtual - 1}`, `${anoAtual}`, `${anoAtual + 1}`]

  const [anoSelecionado, setAnoSelecionado] = useState(anoAtual.toString())
  const [seriesSelecionadas, setSeriesSelecionadas] = useState<Set<string>>(new Set())
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)
  const [totalAlunosPorSerie, setTotalAlunosPorSerie] = useState<Record<string, number>>({})

  const carregarDados = useCallback(async () => {
    setCarregando(true)
    setMensagem(null)
    try {
      const [seriesRes, alunosRes] = await Promise.all([
        fetch(`/api/admin/sisam-series-participantes?ano_letivo=${anoSelecionado}`),
        fetch(`/api/admin/sisam-series-participantes?ano_letivo=${anoSelecionado}&contagem=true`)
      ])

      if (seriesRes.ok) {
        const data: SerieParticipante[] = await seriesRes.json()
        setSeriesSelecionadas(new Set(data.filter(s => s.ativo).map(s => s.serie)))
      }

      if (alunosRes.ok) {
        const data = await alunosRes.json()
        if (data.contagem) setTotalAlunosPorSerie(data.contagem)
      }
    } catch {
      setMensagem({ tipo: 'erro', texto: 'Erro ao carregar dados' })
    } finally {
      setCarregando(false)
    }
  }, [anoSelecionado])

  useEffect(() => { carregarDados() }, [carregarDados])

  const toggleSerie = (codigo: string) => {
    setSeriesSelecionadas(prev => {
      const next = new Set(prev)
      if (next.has(codigo)) next.delete(codigo)
      else next.add(codigo)
      return next
    })
  }

  const handleSalvar = async () => {
    setSalvando(true)
    setMensagem(null)
    try {
      const res = await fetch('/api/admin/sisam-series-participantes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ano_letivo: anoSelecionado, series: [...seriesSelecionadas] })
      })
      if (res.ok) {
        setMensagem({ tipo: 'sucesso', texto: `Séries ${anoSelecionado} salvas com sucesso!` })
      } else {
        setMensagem({ tipo: 'erro', texto: 'Erro ao salvar' })
      }
    } catch {
      setMensagem({ tipo: 'erro', texto: 'Erro de conexão' })
    } finally {
      setSalvando(false)
    }
  }

  const handleImprimir = () => {
    const iniciais = TODAS_SERIES.filter(s => s.etapa === 'Anos Iniciais' && seriesSelecionadas.has(s.codigo))
    const finais = TODAS_SERIES.filter(s => s.etapa === 'Anos Finais' && seriesSelecionadas.has(s.codigo))
    const totalAlunos = [...seriesSelecionadas].reduce((acc, s) => acc + (totalAlunosPorSerie[s] || 0), 0)

    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Séries Participantes SISAM ${anoSelecionado}</title>
      <style>
        body{font-family:Arial,sans-serif;margin:30px;color:#333}
        h1{font-size:20px;margin-bottom:4px}
        .subtitle{font-size:13px;color:#555;margin-bottom:20px}
        .section{margin-bottom:24px}
        .section-title{font-size:15px;font-weight:700;margin-bottom:10px;padding-bottom:4px;border-bottom:2px solid}
        .iniciais .section-title{color:#059669;border-color:#a7f3d0}
        .finais .section-title{color:#d97706;border-color:#fde68a}
        table{width:100%;border-collapse:collapse;font-size:13px}
        th,td{border:1px solid #ccc;padding:8px 12px;text-align:left}
        th{background:#f3f4f6;font-weight:600}
        .badge{display:inline-block;padding:2px 10px;border-radius:4px;font-size:11px;font-weight:600}
        .badge-sim{background:#d1fae5;color:#065f46}
        .badge-nao{background:#fee2e2;color:#991b1b}
        .total{margin-top:16px;font-size:14px;font-weight:700;border-top:2px solid #333;padding-top:8px}
        @media print{body{margin:10mm}}
      </style></head><body>
      <h1>Séries Participantes da Avaliação SISAM — ${anoSelecionado}</h1>
      <div class="subtitle">SEMED — São Sebastião da Boa Vista</div>
      <div class="section iniciais">
        <div class="section-title">Anos Iniciais (1º ao 5º Ano)</div>
        <table><thead><tr><th style="width:140px">Série</th><th style="width:100px;text-align:center">Participa</th><th style="width:100px;text-align:center">Alunos</th></tr></thead><tbody>
        ${TODAS_SERIES.filter(s => s.etapa === 'Anos Iniciais').map(s => `<tr><td>${s.nome}</td><td style="text-align:center"><span class="badge ${seriesSelecionadas.has(s.codigo) ? 'badge-sim' : 'badge-nao'}">${seriesSelecionadas.has(s.codigo) ? 'SIM' : 'NÃO'}</span></td><td style="text-align:center">${totalAlunosPorSerie[s.codigo] || 0}</td></tr>`).join('')}
        </tbody></table>
      </div>
      <div class="section finais">
        <div class="section-title">Anos Finais (6º ao 9º Ano)</div>
        <table><thead><tr><th style="width:140px">Série</th><th style="width:100px;text-align:center">Participa</th><th style="width:100px;text-align:center">Alunos</th></tr></thead><tbody>
        ${TODAS_SERIES.filter(s => s.etapa === 'Anos Finais').map(s => `<tr><td>${s.nome}</td><td style="text-align:center"><span class="badge ${seriesSelecionadas.has(s.codigo) ? 'badge-sim' : 'badge-nao'}">${seriesSelecionadas.has(s.codigo) ? 'SIM' : 'NÃO'}</span></td><td style="text-align:center">${totalAlunosPorSerie[s.codigo] || 0}</td></tr>`).join('')}
        </tbody></table>
      </div>
      <div class="total">
        Séries participantes: ${seriesSelecionadas.size} |
        Anos Iniciais: ${iniciais.length} |
        Anos Finais: ${finais.length} |
        Total de alunos: ${totalAlunos}
      </div>
      <script>window.onload=function(){window.print()}</script></body></html>`)
    printWindow.document.close()
  }

  const iniciais = TODAS_SERIES.filter(s => s.etapa === 'Anos Iniciais')
  const finais = TODAS_SERIES.filter(s => s.etapa === 'Anos Finais')
  const totalSelecionadas = seriesSelecionadas.size
  const totalAlunos = [...seriesSelecionadas].reduce((acc, s) => acc + (totalAlunosPorSerie[s] || 0), 0)

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-700 dark:to-violet-700 px-6 py-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Séries Participantes do SISAM</h2>
              <p className="text-sm text-white/70">Selecione as séries que farão a avaliação municipal em cada ano</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {anosDisponiveis.map(ano => (
              <button
                key={ano}
                onClick={() => setAnoSelecionado(ano)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  anoSelecionado === ano
                    ? 'bg-white text-indigo-700 shadow-md'
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                {ano}
              </button>
            ))}
          </div>
        </div>

        {/* Resumo */}
        <div className="flex gap-3 mt-4 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 text-xs font-medium text-white">
            <BookOpen className="w-3.5 h-3.5" />
            {totalSelecionadas} série{totalSelecionadas !== 1 ? 's' : ''} participante{totalSelecionadas !== 1 ? 's' : ''}
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 text-xs font-medium text-white">
            <Users className="w-3.5 h-3.5" />
            {totalAlunos.toLocaleString('pt-BR')} alunos matriculados
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-6">
        {mensagem && (
          <div className={`p-3 rounded-lg text-sm font-medium ${
            mensagem.tipo === 'sucesso' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
          }`}>{mensagem.texto}</div>
        )}

        {/* Anos Iniciais */}
        <div>
          <h3 className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Anos Iniciais (1º ao 5º Ano)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {iniciais.map(s => {
              const selecionada = seriesSelecionadas.has(s.codigo)
              const alunos = totalAlunosPorSerie[s.codigo] || 0
              return (
                <button
                  key={s.codigo}
                  onClick={() => toggleSerie(s.codigo)}
                  disabled={carregando}
                  className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                    selecionada
                      ? `${s.cor} border-current shadow-sm`
                      : 'bg-gray-50 dark:bg-slate-700/50 border-gray-200 dark:border-slate-600 text-gray-400 dark:text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {selecionada && (
                    <div className="absolute top-2 right-2">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                  <p className="text-lg font-bold">{s.nome}</p>
                  {alunos > 0 && (
                    <p className={`text-xs mt-1 ${selecionada ? 'opacity-80' : 'text-gray-400'}`}>
                      {alunos} alunos
                    </p>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Anos Finais */}
        <div>
          <h3 className="text-sm font-bold text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Anos Finais (6º ao 9º Ano)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {finais.map(s => {
              const selecionada = seriesSelecionadas.has(s.codigo)
              const alunos = totalAlunosPorSerie[s.codigo] || 0
              return (
                <button
                  key={s.codigo}
                  onClick={() => toggleSerie(s.codigo)}
                  disabled={carregando}
                  className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                    selecionada
                      ? `${s.cor} border-current shadow-sm`
                      : 'bg-gray-50 dark:bg-slate-700/50 border-gray-200 dark:border-slate-600 text-gray-400 dark:text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {selecionada && (
                    <div className="absolute top-2 right-2">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                  <p className="text-lg font-bold">{s.nome}</p>
                  {alunos > 0 && (
                    <p className={`text-xs mt-1 ${selecionada ? 'opacity-80' : 'text-gray-400'}`}>
                      {alunos} alunos
                    </p>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50/80 dark:bg-slate-800/80 flex items-center justify-between flex-wrap gap-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {totalSelecionadas} séries selecionadas para {anoSelecionado} | {totalAlunos.toLocaleString('pt-BR')} alunos
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={handleImprimir}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir
          </button>
          <button
            onClick={handleSalvar}
            disabled={salvando}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
