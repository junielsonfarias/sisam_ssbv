'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState } from 'react'
import {
  FileText, Printer, Search, GraduationCap, Users,
  Calendar, BookOpen, ClipboardList, ChevronDown
} from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface EscolaSimples { id: string; nome: string }
interface TurmaSimples { id: string; codigo: string; serie: string }
interface AlunoSimples { id: string; nome: string; codigo: string; serie: string }

type TipoRelatorio = 'boletim' | 'historico' | 'ata_conselho'

interface BoletimData {
  aluno: any
  notas: any[]
  frequencia: any[]
  config: { nota_maxima: number; media_aprovacao: number }
}

interface AtaConselhoData {
  turma: any
  alunos: { nome: string; codigo: string; parecer: string; observacao: string }[]
  data_conselho: string
}

export default function RelatoriosPdfPage() {
  const toast = useToast()

  const [tipoUsuario, setTipoUsuario] = useState('')
  const [escolas, setEscolas] = useState<EscolaSimples[]>([])
  const [turmas, setTurmas] = useState<TurmaSimples[]>([])
  const [alunos, setAlunos] = useState<AlunoSimples[]>([])

  const [escolaId, setEscolaId] = useState('')
  const [turmaId, setTurmaId] = useState('')
  const [alunoId, setAlunoId] = useState('')
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear().toString())

  const [tipoRelatorio, setTipoRelatorio] = useState<TipoRelatorio>('boletim')
  const [carregando, setCarregando] = useState(false)
  const [dadosRelatorio, setDadosRelatorio] = useState<any>(null)
  const [escolaNome, setEscolaNome] = useState('')

  useEffect(() => {
    const u = localStorage.getItem('usuario')
    if (u) {
      const parsed = JSON.parse(u)
      setTipoUsuario(parsed.tipo_usuario)
      if (parsed.tipo_usuario === 'escola' && parsed.escola_id) {
        setEscolaId(parsed.escola_id)
      }
    }
    fetch('/api/admin/escolas')
      .then(r => r.json())
      .then(data => setEscolas(Array.isArray(data) ? data : data.dados || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (escolaId) {
      const escola = escolas.find(e => e.id === escolaId)
      setEscolaNome(escola?.nome || '')
      fetch(`/api/admin/turmas?escolas_ids=${escolaId}&mode=listagem&ano_letivo=${anoLetivo}`)
        .then(r => r.json())
        .then(data => setTurmas(Array.isArray(data) ? data : []))
        .catch(() => setTurmas([]))
    } else {
      setTurmas([])
    }
    setTurmaId('')
    setAlunoId('')
    setAlunos([])
    setDadosRelatorio(null)
  }, [escolaId, anoLetivo])

  useEffect(() => {
    if (turmaId) {
      fetch(`/api/admin/alunos?turma_id=${turmaId}&limite=200`)
        .then(r => r.json())
        .then(data => setAlunos(data.alunos || data || []))
        .catch(() => setAlunos([]))
    } else {
      setAlunos([])
    }
    setAlunoId('')
    setDadosRelatorio(null)
  }, [turmaId])

  const gerarRelatorio = async () => {
    setCarregando(true)
    setDadosRelatorio(null)
    try {
      if (tipoRelatorio === 'boletim' || tipoRelatorio === 'historico') {
        if (!alunoId) { toast.error('Selecione um aluno'); setCarregando(false); return }
        const res = await fetch(`/api/admin/historico-escolar?aluno_id=${alunoId}`)
        if (res.ok) {
          const data = await res.json()
          setDadosRelatorio({ tipo: tipoRelatorio, ...data })
        } else {
          toast.error('Erro ao gerar relatório')
        }
      } else if (tipoRelatorio === 'ata_conselho') {
        if (!turmaId) { toast.error('Selecione uma turma'); setCarregando(false); return }
        const res = await fetch(`/api/admin/conselho-classe?turma_id=${turmaId}`)
        if (res.ok) {
          const data = await res.json()
          setDadosRelatorio({ tipo: 'ata_conselho', ...data })
        } else {
          toast.error('Erro ao gerar relatório')
        }
      }
    } catch {
      toast.error('Erro de conexão')
    } finally {
      setCarregando(false)
    }
  }

  const imprimir = () => window.print()

  const parecerLabel: Record<string, string> = {
    aprovado: 'Aprovado', reprovado: 'Reprovado', recuperacao: 'Em Recuperação',
    progressao_parcial: 'Progressão Parcial', sem_parecer: 'Sem Parecer'
  }

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-xl shadow-lg p-6 text-white print:hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-lg p-2">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Relatórios em PDF</h1>
                <p className="text-sm text-gray-300">Boletim, Histórico Escolar e Ata de Conselho</p>
              </div>
            </div>
            {dadosRelatorio && (
              <button onClick={imprimir} className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm transition">
                <Printer className="w-4 h-4" /> Imprimir / Salvar PDF
              </button>
            )}
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5 space-y-4 print:hidden">
          {/* Tipo de relatório */}
          <div className="flex flex-wrap gap-2">
            {[
              { tipo: 'boletim' as TipoRelatorio, label: 'Boletim Escolar', icon: BookOpen },
              { tipo: 'historico' as TipoRelatorio, label: 'Histórico Escolar', icon: FileText },
              { tipo: 'ata_conselho' as TipoRelatorio, label: 'Ata de Conselho', icon: ClipboardList }
            ].map(r => (
              <button
                key={r.tipo}
                onClick={() => { setTipoRelatorio(r.tipo); setDadosRelatorio(null) }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                  tipoRelatorio === r.tipo
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                <r.icon className="w-4 h-4" />
                {r.label}
              </button>
            ))}
          </div>

          {/* Seletores */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ano Letivo</label>
              <select value={anoLetivo} onChange={e => setAnoLetivo(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                {[2024, 2025, 2026].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            {tipoUsuario !== 'escola' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Escola</label>
                <select value={escolaId} onChange={e => setEscolaId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                  <option value="">Selecione...</option>
                  {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Turma</label>
              <select value={turmaId} onChange={e => setTurmaId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                <option value="">Selecione...</option>
                {turmas.map(t => <option key={t.id} value={t.id}>{t.codigo} - {t.serie}</option>)}
              </select>
            </div>

            {tipoRelatorio !== 'ata_conselho' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Aluno</label>
                <select value={alunoId} onChange={e => setAlunoId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                  <option value="">Selecione...</option>
                  {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>
            )}
          </div>

          <button
            onClick={gerarRelatorio}
            disabled={carregando}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium transition"
          >
            {carregando ? 'Gerando...' : 'Gerar Relatório'}
          </button>
        </div>

        {carregando && <LoadingSpinner text="Gerando relatório..." centered />}

        {/* ==================== BOLETIM ==================== */}
        {dadosRelatorio?.tipo === 'boletim' && dadosRelatorio.aluno && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md print:shadow-none print:rounded-none">
            <div className="border-b-2 border-gray-800 p-6 print:p-4 text-center">
              <h2 className="text-lg font-bold uppercase text-gray-800 dark:text-gray-100">Boletim Escolar</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">{dadosRelatorio.aluno.escola_nome}</p>
              <p className="text-xs text-gray-500">Ano Letivo: {anoLetivo}</p>
            </div>

            <div className="p-6 print:p-4 space-y-4">
              {/* Dados do aluno */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm border-b pb-4 dark:border-slate-700">
                <div><span className="text-gray-500">Nome:</span> <p className="font-medium">{dadosRelatorio.aluno.nome}</p></div>
                <div><span className="text-gray-500">Código:</span> <p className="font-medium">{dadosRelatorio.aluno.codigo}</p></div>
                <div><span className="text-gray-500">Série:</span> <p className="font-medium">{dadosRelatorio.aluno.serie}</p></div>
                <div><span className="text-gray-500">Turma:</span> <p className="font-medium">{dadosRelatorio.aluno.turma_codigo || '—'}</p></div>
              </div>

              {/* Notas por ano */}
              {Object.entries(dadosRelatorio.notas_por_ano || {}).map(([ano, disciplinas]: [string, any]) => {
                const discs = Object.values(disciplinas).sort((a: any, b: any) => a.ordem - b.ordem) as any[]
                const mediaAprovacao = dadosRelatorio.config?.media_aprovacao || 6

                return (
                  <div key={ano}>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      <Calendar className="inline w-4 h-4 mr-1" /> {ano}
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-gray-100 dark:bg-slate-700">
                            <th className="border dark:border-slate-600 px-2 py-1.5 text-left font-semibold">Disciplina</th>
                            {[1,2,3,4].map(b => <th key={b} className="border dark:border-slate-600 px-2 py-1.5 text-center font-semibold w-14">{b}ºBim</th>)}
                            <th className="border dark:border-slate-600 px-2 py-1.5 text-center font-semibold w-14">Média</th>
                            <th className="border dark:border-slate-600 px-2 py-1.5 text-center font-semibold w-14">Faltas</th>
                            <th className="border dark:border-slate-600 px-2 py-1.5 text-center font-semibold w-20">Situação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {discs.map((d: any) => {
                            const aprovado = d.media !== null && d.media >= mediaAprovacao
                            return (
                              <tr key={d.disciplina}>
                                <td className="border dark:border-slate-600 px-2 py-1.5 font-medium">{d.abreviacao || d.disciplina}</td>
                                {[1,2,3,4].map(b => {
                                  const bim = d.bimestres?.[b]
                                  const nota = bim ? (bim.final ?? bim.nota) : null
                                  return (
                                    <td key={b} className={`border dark:border-slate-600 px-2 py-1.5 text-center ${nota !== null && nota < mediaAprovacao ? 'text-red-600' : ''}`}>
                                      {nota !== null ? nota.toFixed(1) : '—'}
                                    </td>
                                  )
                                })}
                                <td className={`border dark:border-slate-600 px-2 py-1.5 text-center font-bold ${d.media !== null && d.media < mediaAprovacao ? 'text-red-600' : 'text-emerald-600'}`}>
                                  {d.media !== null ? d.media.toFixed(1) : '—'}
                                </td>
                                <td className="border dark:border-slate-600 px-2 py-1.5 text-center">{d.total_faltas}</td>
                                <td className={`border dark:border-slate-600 px-2 py-1.5 text-center text-xs font-semibold ${d.media === null ? 'text-gray-400' : aprovado ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {d.media === null ? '—' : aprovado ? 'Aprovado' : 'Reprovado'}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })}

              {/* Frequência */}
              {Object.entries(dadosRelatorio.frequencia_por_ano || {}).map(([ano, freqs]: [string, any]) => (
                <div key={`freq-${ano}`} className="text-sm">
                  <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Frequência — {ano}</h4>
                  <div className="flex flex-wrap gap-4">
                    {(freqs as any[]).map((f: any) => (
                      <div key={f.numero} className="flex items-center gap-1">
                        <span className="text-gray-500">{f.periodo}:</span>
                        <span className={`font-medium ${f.percentual !== null && f.percentual < 75 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {f.percentual !== null ? `${f.percentual.toFixed(1)}%` : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 print:p-4 text-center text-xs text-gray-500 border-t dark:border-slate-700">
              <p>Gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
              <div className="flex justify-between items-end pt-8 print:pt-16">
                <div className="text-center"><div className="border-t border-gray-400 w-48 mb-1"></div><span>Professor(a)</span></div>
                <div className="text-center"><div className="border-t border-gray-400 w-48 mb-1"></div><span>Diretor(a)</span></div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== HISTÓRICO ESCOLAR ==================== */}
        {dadosRelatorio?.tipo === 'historico' && dadosRelatorio.aluno && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md print:shadow-none print:rounded-none">
            <div className="border-b-2 border-gray-800 p-6 print:p-4 text-center">
              <h2 className="text-lg font-bold uppercase text-gray-800 dark:text-gray-100">Histórico Escolar</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">{dadosRelatorio.aluno.escola_nome}</p>
              <p className="text-xs text-gray-500">Polo: {dadosRelatorio.aluno.polo_nome || '—'}</p>
            </div>

            <div className="p-6 print:p-4 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm border-b pb-4 dark:border-slate-700">
                <div><span className="text-gray-500">Nome:</span> <p className="font-medium">{dadosRelatorio.aluno.nome}</p></div>
                <div><span className="text-gray-500">Nascimento:</span> <p className="font-medium">{dadosRelatorio.aluno.data_nascimento || '—'}</p></div>
                <div><span className="text-gray-500">Mãe:</span> <p className="font-medium">{dadosRelatorio.aluno.nome_mae || '—'}</p></div>
                <div><span className="text-gray-500">Pai:</span> <p className="font-medium">{dadosRelatorio.aluno.nome_pai || '—'}</p></div>
                <div><span className="text-gray-500">Naturalidade:</span> <p className="font-medium">{dadosRelatorio.aluno.naturalidade || '—'}</p></div>
                <div><span className="text-gray-500">Série:</span> <p className="font-medium">{dadosRelatorio.aluno.serie}</p></div>
                <div><span className="text-gray-500">Turma:</span> <p className="font-medium">{dadosRelatorio.aluno.turma_codigo || '—'}</p></div>
                <div><span className="text-gray-500">Código:</span> <p className="font-medium">{dadosRelatorio.aluno.codigo}</p></div>
              </div>

              {Object.entries(dadosRelatorio.notas_por_ano || {}).map(([ano, disciplinas]: [string, any]) => {
                const discs = Object.values(disciplinas).sort((a: any, b: any) => a.ordem - b.ordem) as any[]
                const mediaAprovacao = dadosRelatorio.config?.media_aprovacao || 6

                return (
                  <div key={ano}>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Ano Letivo {ano}</h4>
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-slate-700">
                          <th className="border dark:border-slate-600 px-2 py-1 text-left font-semibold">Disciplina</th>
                          {[1,2,3,4].map(b => <th key={b} className="border dark:border-slate-600 px-2 py-1 text-center w-12">{b}B</th>)}
                          <th className="border dark:border-slate-600 px-2 py-1 text-center w-12">Méd</th>
                          <th className="border dark:border-slate-600 px-2 py-1 text-center w-12">Flt</th>
                          <th className="border dark:border-slate-600 px-2 py-1 text-center w-16">Res</th>
                        </tr>
                      </thead>
                      <tbody>
                        {discs.map((d: any) => (
                          <tr key={d.disciplina}>
                            <td className="border dark:border-slate-600 px-2 py-1">{d.abreviacao || d.disciplina}</td>
                            {[1,2,3,4].map(b => {
                              const bim = d.bimestres?.[b]; const nota = bim ? (bim.final ?? bim.nota) : null
                              return <td key={b} className="border dark:border-slate-600 px-2 py-1 text-center">{nota !== null ? nota.toFixed(1) : '—'}</td>
                            })}
                            <td className={`border dark:border-slate-600 px-2 py-1 text-center font-bold ${d.media !== null && d.media < mediaAprovacao ? 'text-red-600' : 'text-emerald-600'}`}>
                              {d.media !== null ? d.media.toFixed(1) : '—'}
                            </td>
                            <td className="border dark:border-slate-600 px-2 py-1 text-center">{d.total_faltas}</td>
                            <td className={`border dark:border-slate-600 px-2 py-1 text-center text-xs font-semibold ${d.media === null ? '' : d.media >= mediaAprovacao ? 'text-emerald-600' : 'text-red-600'}`}>
                              {d.media === null ? '—' : d.media >= mediaAprovacao ? 'AP' : 'RP'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              })}

              {/* Movimentações */}
              {dadosRelatorio.historico_situacao?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Movimentações</h4>
                  {dadosRelatorio.historico_situacao.map((h: any, i: number) => (
                    <div key={i} className="text-xs text-gray-600 dark:text-gray-400">
                      {h.data ? new Date(h.data).toLocaleDateString('pt-BR') : '-'} — {h.situacao_anterior} → {h.situacao}
                      {h.observacao && ` (${h.observacao})`}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 print:p-4 text-center text-xs text-gray-500 border-t dark:border-slate-700">
              <p>Documento gerado em {new Date().toLocaleDateString('pt-BR')}</p>
              <div className="flex justify-between items-end pt-8 print:pt-16">
                <div className="text-center"><div className="border-t border-gray-400 w-48 mb-1"></div><span>Secretário(a) Escolar</span></div>
                <div className="text-center"><div className="border-t border-gray-400 w-48 mb-1"></div><span>Diretor(a)</span></div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== ATA DE CONSELHO ==================== */}
        {dadosRelatorio?.tipo === 'ata_conselho' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md print:shadow-none print:rounded-none">
            <div className="border-b-2 border-gray-800 p-6 print:p-4 text-center">
              <h2 className="text-lg font-bold uppercase text-gray-800 dark:text-gray-100">Ata do Conselho de Classe</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">{escolaNome}</p>
              <p className="text-xs text-gray-500">Ano Letivo: {anoLetivo}</p>
            </div>

            <div className="p-6 print:p-4 space-y-4">
              {dadosRelatorio.turma && (
                <div className="grid grid-cols-3 gap-3 text-sm border-b pb-3 dark:border-slate-700">
                  <div><span className="text-gray-500">Turma:</span> <p className="font-medium">{dadosRelatorio.turma.codigo}</p></div>
                  <div><span className="text-gray-500">Série:</span> <p className="font-medium">{dadosRelatorio.turma.serie}</p></div>
                  <div><span className="text-gray-500">Data:</span> <p className="font-medium">{dadosRelatorio.data_conselho ? new Date(dadosRelatorio.data_conselho).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}</p></div>
                </div>
              )}

              {dadosRelatorio.alunos && dadosRelatorio.alunos.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-slate-700">
                        <th className="border dark:border-slate-600 px-3 py-2 text-center font-semibold w-10">Nº</th>
                        <th className="border dark:border-slate-600 px-3 py-2 text-left font-semibold">Aluno</th>
                        <th className="border dark:border-slate-600 px-3 py-2 text-center font-semibold w-32">Parecer</th>
                        <th className="border dark:border-slate-600 px-3 py-2 text-left font-semibold">Observação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dadosRelatorio.alunos.map((a: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                          <td className="border dark:border-slate-600 px-3 py-2 text-center text-gray-500">{i + 1}</td>
                          <td className="border dark:border-slate-600 px-3 py-2 font-medium">{a.nome || a.aluno_nome}</td>
                          <td className={`border dark:border-slate-600 px-3 py-2 text-center text-xs font-semibold ${
                            a.parecer === 'aprovado' ? 'text-emerald-600' :
                            a.parecer === 'reprovado' ? 'text-red-600' :
                            a.parecer === 'recuperacao' ? 'text-orange-600' : 'text-gray-500'
                          }`}>
                            {parecerLabel[a.parecer] || a.parecer || 'Sem parecer'}
                          </td>
                          <td className="border dark:border-slate-600 px-3 py-2 text-gray-600 dark:text-gray-400 text-xs">
                            {a.observacao || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Resumo */}
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-600 dark:text-gray-400">
                    <span>Total: <strong>{dadosRelatorio.alunos.length}</strong></span>
                    <span className="text-emerald-600">Aprovados: <strong>{dadosRelatorio.alunos.filter((a: any) => a.parecer === 'aprovado').length}</strong></span>
                    <span className="text-red-600">Reprovados: <strong>{dadosRelatorio.alunos.filter((a: any) => a.parecer === 'reprovado').length}</strong></span>
                    <span className="text-orange-600">Recuperação: <strong>{dadosRelatorio.alunos.filter((a: any) => a.parecer === 'recuperacao').length}</strong></span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 py-8 text-center">Nenhum registro de conselho encontrado para esta turma</p>
              )}
            </div>

            <div className="p-6 print:p-4 text-center text-xs text-gray-500 border-t dark:border-slate-700">
              <p>Ata gerada em {new Date().toLocaleDateString('pt-BR')}</p>
              <div className="grid grid-cols-3 gap-8 pt-8 print:pt-16">
                <div className="text-center"><div className="border-t border-gray-400 w-full mb-1"></div><span>Presidente do Conselho</span></div>
                <div className="text-center"><div className="border-t border-gray-400 w-full mb-1"></div><span>Secretário(a)</span></div>
                <div className="text-center"><div className="border-t border-gray-400 w-full mb-1"></div><span>Diretor(a)</span></div>
              </div>
            </div>
          </div>
        )}

        {/* Estado vazio */}
        {!dadosRelatorio && !carregando && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-12 text-center text-gray-500 dark:text-gray-400 print:hidden">
            <Printer className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Selecione o tipo de relatório e os filtros, depois clique em "Gerar Relatório"</p>
            <p className="text-xs mt-2 text-gray-400">Use Ctrl+P ou o botão "Imprimir" para salvar como PDF</p>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
