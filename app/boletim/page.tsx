'use client'

import { useState, useRef } from 'react'
import { Search, Loader2, GraduationCap, Printer, BookOpen, Clock, AlertCircle, UserCheck, Accessibility } from 'lucide-react'
import Link from 'next/link'

interface AlunoInfo {
  nome: string
  codigo: string
  serie: string
  turma_codigo: string
  turma_nome: string
  escola_nome: string
  ano_letivo: string
  situacao: string
  pcd: boolean
}

interface NotaItem {
  disciplina: string
  abreviacao: string
  nota_final: number | null
  nota_recuperacao: number | null
  faltas: number
}

interface FrequenciaItem {
  bimestre: number
  periodo_nome: string
  aulas_dadas: number
  faltas: number
  percentual_frequencia: number | null
}

interface BoletimData {
  aluno: AlunoInfo
  notas: Record<number, NotaItem[]>
  frequencia: FrequenciaItem[]
  frequencia_geral: number | null
  total_faltas: number
}

function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

function getNotaColor(nota: number | null): string {
  if (nota === null) return 'text-slate-400'
  if (nota >= 7) return 'text-emerald-600 bg-emerald-50'
  if (nota >= 5) return 'text-amber-600 bg-amber-50'
  return 'text-red-600 bg-red-50'
}

function getFreqColor(percentual: number | null): string {
  if (percentual === null) return 'text-slate-400'
  if (percentual >= 75) return 'text-emerald-600'
  if (percentual >= 60) return 'text-amber-600'
  return 'text-red-600'
}

function getFreqBarColor(percentual: number | null): string {
  if (percentual === null) return 'bg-slate-200'
  if (percentual >= 75) return 'bg-emerald-500'
  if (percentual >= 60) return 'bg-amber-500'
  return 'bg-red-500'
}

function getSituacaoBadge(situacao: string | null) {
  if (!situacao) return null
  const map: Record<string, { bg: string; text: string; label: string }> = {
    cursando: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Cursando' },
    aprovado: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Aprovado' },
    reprovado: { bg: 'bg-red-100', text: 'text-red-700', label: 'Reprovado' },
    transferido: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Transferido' },
    desistente: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Desistente' },
  }
  const s = map[situacao] || { bg: 'bg-slate-100', text: 'text-slate-600', label: situacao }
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  )
}

export default function BoletimPage() {
  const [searchMode, setSearchMode] = useState<'codigo' | 'cpf'>('codigo')
  const [codigo, setCodigo] = useState('')
  const [cpf, setCpf] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<BoletimData | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setData(null)
    setLoading(true)

    try {
      const params = new URLSearchParams()
      if (searchMode === 'codigo') {
        if (!codigo.trim()) {
          setError('Informe o codigo do aluno.')
          setLoading(false)
          return
        }
        params.set('codigo', codigo.trim())
      } else {
        const cpfDigits = cpf.replace(/\D/g, '')
        if (!cpfDigits || cpfDigits.length < 11) {
          setError('Informe um CPF valido com 11 digitos.')
          setLoading(false)
          return
        }
        if (!dataNascimento) {
          setError('Informe a data de nascimento.')
          setLoading(false)
          return
        }
        params.set('cpf', cpfDigits)
        params.set('data_nascimento', dataNascimento)
      }

      const res = await fetch(`/api/boletim?${params.toString()}`)
      const json = await res.json()

      if (!res.ok) {
        setError(json.mensagem || 'Erro ao consultar boletim.')
        return
      }

      setData(json)
    } catch {
      setError('Erro de conexao. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  // Extrair lista de periodos e disciplinas das notas
  const periodos = data ? Object.keys(data.notas).map(Number).sort((a, b) => a - b) : []
  const disciplinas = data && periodos.length > 0
    ? data.notas[periodos[0]]?.map(n => n.disciplina) || []
    : []

  // Construir mapa disciplina -> periodo -> nota
  const notasMap: Record<string, Record<number, NotaItem>> = {}
  if (data) {
    for (const [per, notas] of Object.entries(data.notas)) {
      for (const nota of notas) {
        if (!notasMap[nota.disciplina]) notasMap[nota.disciplina] = {}
        notasMap[nota.disciplina][Number(per)] = nota
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 print:border-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/25">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-emerald-600">SEMED</span>
              <p className="text-[11px] font-medium text-slate-400 hidden sm:block leading-tight">
                Sao Sebastiao da Boa Vista
              </p>
            </div>
          </Link>
          <h1 className="text-sm sm:text-base font-bold text-slate-600 print:text-lg">
            Consulta de Boletim Escolar
          </h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Search Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 mb-8 print:hidden">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-emerald-50">
              <Search className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Consultar Boletim</h2>
              <p className="text-sm text-slate-500">Busque pelo codigo do aluno ou CPF + data de nascimento</p>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => { setSearchMode('codigo'); setError(''); setData(null) }}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                searchMode === 'codigo'
                  ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              Buscar por Codigo
            </button>
            <button
              type="button"
              onClick={() => { setSearchMode('cpf'); setError(''); setData(null) }}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                searchMode === 'cpf'
                  ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              Buscar por CPF
            </button>
          </div>

          <form onSubmit={handleSearch} className="space-y-4">
            {searchMode === 'codigo' ? (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Codigo do Aluno
                </label>
                <input
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  placeholder="Ex: ALU001"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                />
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">CPF</label>
                  <input
                    type="text"
                    value={cpf}
                    onChange={(e) => setCpf(formatCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Data de Nascimento
                  </label>
                  <input
                    type="date"
                    value={dataNascimento}
                    onChange={(e) => setDataNascimento(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm font-medium">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold rounded-xl text-sm hover:from-emerald-600 hover:to-emerald-700 transition-all duration-300 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Consultando...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Consultar Boletim
                </>
              )}
            </button>
          </form>
        </div>

        {/* Results */}
        {data && (
          <div ref={printRef} className="space-y-6">
            {/* Student Header Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-xl bg-emerald-50">
                      <UserCheck className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800">
                      {data.aluno.nome}
                    </h2>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-slate-400 font-medium">Escola</span>
                      <p className="font-semibold text-slate-700">{data.aluno.escola_nome}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Serie</span>
                      <p className="font-semibold text-slate-700">{data.aluno.serie}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Turma</span>
                      <p className="font-semibold text-slate-700">
                        {data.aluno.turma_codigo}
                        {data.aluno.turma_nome ? ` - ${data.aluno.turma_nome}` : ''}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Codigo</span>
                      <p className="font-semibold text-slate-700">{data.aluno.codigo}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Ano Letivo</span>
                      <p className="font-semibold text-slate-700">{data.aluno.ano_letivo}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                  {getSituacaoBadge(data.aluno.situacao)}
                  {data.aluno.pcd && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                      <Accessibility className="w-3.5 h-3.5" />
                      PCD
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Grades Table */}
            {periodos.length > 0 && disciplinas.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-lg font-bold text-slate-800">Notas por Disciplina</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="text-left px-4 py-3 font-bold text-slate-600 border-b border-slate-200 min-w-[180px]">
                          Disciplina
                        </th>
                        {periodos.map((p) => (
                          <th key={p} className="text-center px-3 py-3 font-bold text-slate-600 border-b border-slate-200 min-w-[80px]">
                            {p}o Bim
                          </th>
                        ))}
                        <th className="text-center px-3 py-3 font-bold text-slate-600 border-b border-slate-200 min-w-[80px]">
                          Media
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(notasMap).sort().map((disc) => {
                        const notas = notasMap[disc]
                        const valores = periodos
                          .map(p => notas[p]?.nota_final)
                          .filter((v): v is number => v !== null && v !== undefined)
                        const media = valores.length > 0
                          ? Math.round((valores.reduce((s, v) => s + v, 0) / valores.length) * 100) / 100
                          : null

                        return (
                          <tr key={disc} className="border-b border-slate-100 hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-semibold text-slate-700">
                              {disc}
                            </td>
                            {periodos.map((p) => {
                              const nota = notas[p]
                              return (
                                <td key={p} className="text-center px-3 py-3">
                                  {nota ? (
                                    <div>
                                      <span className={`inline-flex items-center justify-center w-10 h-7 rounded-lg text-xs font-bold ${getNotaColor(nota.nota_final)}`}>
                                        {nota.nota_final !== null ? nota.nota_final.toFixed(1) : '-'}
                                      </span>
                                      {nota.nota_recuperacao !== null && (
                                        <div className="text-[10px] text-blue-500 font-medium mt-0.5">
                                          Rec: {nota.nota_recuperacao.toFixed(1)}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>
                              )
                            })}
                            <td className="text-center px-3 py-3">
                              <span className={`inline-flex items-center justify-center w-12 h-7 rounded-lg text-xs font-extrabold ${getNotaColor(media)}`}>
                                {media !== null ? media.toFixed(1) : '-'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {periodos.length === 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">Nenhuma nota registrada para este ano letivo.</p>
              </div>
            )}

            {/* Attendance Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                <Clock className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-slate-800">Frequencia</h3>
              </div>
              <div className="p-6">
                {/* Overall */}
                <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-400 mb-1">Frequencia Geral</p>
                    <p className={`text-4xl sm:text-5xl font-extrabold ${getFreqColor(data.frequencia_geral)}`}>
                      {data.frequencia_geral !== null ? `${data.frequencia_geral.toFixed(1)}%` : '--'}
                    </p>
                  </div>
                  <div className="text-center sm:border-l sm:border-slate-200 sm:pl-6">
                    <p className="text-sm font-medium text-slate-400 mb-1">Total de Faltas</p>
                    <p className="text-3xl sm:text-4xl font-extrabold text-slate-700">{data.total_faltas}</p>
                  </div>
                </div>

                {/* Per bimester */}
                {data.frequencia.length > 0 ? (
                  <div className="space-y-4">
                    {data.frequencia.map((f) => (
                      <div key={f.bimestre}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-semibold text-slate-600">
                            {f.periodo_nome || `${f.bimestre}o Bimestre`}
                          </span>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-slate-400">
                              {f.faltas} falta{f.faltas !== 1 ? 's' : ''} / {f.aulas_dadas} aulas
                            </span>
                            <span className={`font-bold ${getFreqColor(f.percentual_frequencia)}`}>
                              {f.percentual_frequencia !== null ? `${f.percentual_frequencia.toFixed(1)}%` : '--'}
                            </span>
                          </div>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${getFreqBarColor(f.percentual_frequencia)}`}
                            style={{ width: `${Math.min(f.percentual_frequencia || 0, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm text-center">
                    Nenhum registro de frequencia encontrado.
                  </p>
                )}
              </div>
            </div>

            {/* Print Button */}
            <div className="flex justify-center print:hidden">
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 text-white font-bold rounded-xl text-sm hover:bg-slate-700 transition-all duration-200 shadow-lg"
              >
                <Printer className="w-4 h-4" />
                Imprimir Boletim
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-slate-400 print:hidden">
          <p>SEMED - Secretaria Municipal de Educacao</p>
          <p>Sao Sebastiao da Boa Vista - PA</p>
        </footer>
      </main>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:border-0 { border: none !important; }
          .print\\:text-lg { font-size: 1.125rem !important; }
          main { padding: 0 !important; }
          .shadow-sm, .shadow-lg { box-shadow: none !important; }
          .rounded-2xl { border-radius: 0 !important; }
        }
      `}</style>
    </div>
  )
}
