'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState, useRef } from 'react'
import {
  FileText, Search, Printer, GraduationCap, Calendar,
  User, MapPin
} from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useSeries } from '@/lib/use-series'
import { useUserType } from '@/lib/hooks/useUserType'
import { useEscolas } from '@/lib/hooks/useEscolas'
import { useTurmas } from '@/lib/hooks/useTurmas'

interface AlunoSimples { id: string; nome: string; codigo: string; serie: string }

interface HistoricoData {
  aluno: {
    id: string; codigo: string; nome: string; serie: string
    data_nascimento: string | null; sexo: string | null
    cpf: string | null; rg: string | null
    nome_mae: string | null; nome_pai: string | null; responsavel: string | null
    naturalidade: string | null; nacionalidade: string | null
    escola_nome: string; turma_codigo: string; polo_nome: string
  }
  notas_por_ano: Record<string, Record<string, {
    disciplina: string; abreviacao: string; ordem: number
    bimestres: Record<string, { nota: number | null; recuperacao: number | null; final: number | null; faltas: number }>
    media: number | null; total_faltas: number
  }>>
  frequencia_por_ano: Record<string, { periodo: string; numero: number; dias_letivos: number; presencas: number; faltas: number; percentual: number | null }[]>
  conselho: { parecer: string; observacao: string; turma_codigo: string; criado_em: string }[]
  historico_situacao: { situacao_anterior: string; situacao: string; observacao: string; data: string; escola_destino_nome: string; tipo_transferencia?: string; tipo_movimentacao?: string }[]
  config: { nota_maxima: number; media_aprovacao: number }
}

const parecerLabel: Record<string, string> = {
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
  recuperacao: 'Em Recuperação',
  progressao_parcial: 'Progressão Parcial',
  sem_parecer: 'Sem Parecer'
}

export default function HistoricoEscolarPage() {
  const toast = useToast()
  const { formatSerie } = useSeries()
  const printRef = useRef<HTMLDivElement>(null)

  const { tipoUsuario, isEscola } = useUserType({
    onUsuarioCarregado: (u) => {
      if (u.escola_id) setEscolaId(u.escola_id)
    }
  })
  const { escolas } = useEscolas()
  const [escolaId, setEscolaId] = useState('')
  const { turmas } = useTurmas(escolaId)
  const [alunos, setAlunos] = useState<AlunoSimples[]>([])

  const [turmaId, setTurmaId] = useState('')
  const [alunoId, setAlunoId] = useState('')
  const [busca, setBusca] = useState('')

  const [historico, setHistorico] = useState<HistoricoData | null>(null)
  const [carregando, setCarregando] = useState(false)

  // Reset when escola changes
  useEffect(() => {
    setTurmaId('')
    setAlunoId('')
    setAlunos([])
  }, [escolaId])

  useEffect(() => {
    if (turmaId) {
      fetch(`/api/admin/alunos?turma_id=${turmaId}`)
        .then(r => r.json())
        .then(data => {
          const lista = Array.isArray(data) ? data : data.dados || []
          setAlunos(lista)
        })
        .catch(() => setAlunos([]))
    } else {
      setAlunos([])
    }
    setAlunoId('')
  }, [turmaId])

  const carregarHistorico = async (id: string) => {
    setAlunoId(id)
    setCarregando(true)
    try {
      const res = await fetch(`/api/admin/historico-escolar?aluno_id=${id}`)
      if (res.ok) {
        const data = await res.json()
        setHistorico(data)
      } else {
        toast.error('Erro ao carregar histórico')
      }
    } catch {
      toast.error('Erro de conexão')
    } finally {
      setCarregando(false)
    }
  }

  const imprimir = () => {
    window.print()
  }

  const alunosFiltrados = busca
    ? alunos.filter(a => a.nome.toLowerCase().includes(busca.toLowerCase()) || a.codigo.includes(busca))
    : alunos

  const anosOrdenados = historico ? Object.keys(historico.notas_por_ano).sort() : []

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola']}>
      <div className="space-y-6">
        {/* Header - oculto na impressão */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-xl shadow-lg p-6 text-white print:hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-lg p-2">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Histórico Escolar</h1>
                <p className="text-sm text-gray-300">Documento formal com notas, frequência e pareceres</p>
              </div>
            </div>
            {historico && (
              <button
                onClick={imprimir}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm transition"
              >
                <Printer className="w-4 h-4" />
                Imprimir
              </button>
            )}
          </div>
        </div>

        {/* Filtros - ocultos na impressão */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5 space-y-4 print:hidden">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {tipoUsuario !== 'escola' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Escola</label>
                <select
                  value={escolaId}
                  onChange={e => setEscolaId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                >
                  <option value="">Selecione...</option>
                  {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Turma</label>
              <select
                value={turmaId}
                onChange={e => setTurmaId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              >
                <option value="">Selecione...</option>
                {turmas.map(t => <option key={t.id} value={t.id}>{t.codigo} - {formatSerie(t.serie)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Buscar Aluno</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  placeholder="Nome ou código..."
                  className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Lista de alunos */}
          {turmaId && alunosFiltrados.length > 0 && (
            <div className="border dark:border-slate-600 rounded-lg max-h-48 overflow-y-auto">
              {alunosFiltrados.map(a => (
                <button
                  key={a.id}
                  onClick={() => carregarHistorico(a.id)}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border-b dark:border-slate-600 last:border-b-0 transition flex justify-between items-center ${
                    alunoId === a.id ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span>{a.nome}</span>
                  <span className="text-xs text-gray-500">{a.codigo} | {formatSerie(a.serie)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Loading */}
        {carregando && <LoadingSpinner text="Carregando histórico..." centered />}

        {/* Documento do Histórico Escolar */}
        {historico && !carregando && (
          <div ref={printRef} className="bg-white dark:bg-slate-800 rounded-xl shadow-md print:shadow-none print:rounded-none">
            {/* Cabeçalho do documento */}
            <div className="border-b-2 border-gray-800 dark:border-gray-300 p-6 print:p-4">
              <div className="text-center space-y-1">
                <h2 className="text-lg font-bold uppercase text-gray-800 dark:text-gray-100">
                  Histórico Escolar
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {historico.aluno.escola_nome}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Polo: {historico.aluno.polo_nome || '—'}
                </p>
              </div>
            </div>

            {/* Dados pessoais */}
            <div className="p-6 print:p-4 border-b dark:border-slate-700 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4" /> Dados do Aluno
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Nome:</span>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{historico.aluno.nome}</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Código:</span>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{historico.aluno.codigo}</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Data de Nascimento:</span>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{historico.aluno.data_nascimento || '—'}</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Sexo:</span>
                  <p className="font-medium text-gray-800 dark:text-gray-200">
                    {historico.aluno.sexo === 'M' ? 'Masculino' : historico.aluno.sexo === 'F' ? 'Feminino' : '—'}
                  </p>
                </div>
                {historico.aluno.nome_mae && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Mãe:</span>
                    <p className="font-medium text-gray-800 dark:text-gray-200">{historico.aluno.nome_mae}</p>
                  </div>
                )}
                {historico.aluno.nome_pai && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Pai:</span>
                    <p className="font-medium text-gray-800 dark:text-gray-200">{historico.aluno.nome_pai}</p>
                  </div>
                )}
                {historico.aluno.naturalidade && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Naturalidade:</span>
                    <p className="font-medium text-gray-800 dark:text-gray-200">{historico.aluno.naturalidade}</p>
                  </div>
                )}
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Série/Ano:</span>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{historico.aluno.serie}</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Turma:</span>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{historico.aluno.turma_codigo || '—'}</p>
                </div>
              </div>
            </div>

            {/* Notas por ano */}
            {anosOrdenados.map(ano => {
              const disciplinas = Object.values(historico.notas_por_ano[ano]).sort((a, b) => a.ordem - b.ordem)
              const bimestres = [1, 2, 3, 4]
              const mediaAprovacao = historico.config.media_aprovacao

              return (
                <div key={ano} className="p-6 print:p-4 border-b dark:border-slate-700">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2 mb-3">
                    <Calendar className="w-4 h-4" /> Ano Letivo {ano}
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-slate-700">
                          <th className="border dark:border-slate-600 px-2 py-1.5 text-left font-semibold text-gray-700 dark:text-gray-300">Disciplina</th>
                          {bimestres.map(b => (
                            <th key={b} className="border dark:border-slate-600 px-2 py-1.5 text-center font-semibold text-gray-700 dark:text-gray-300 w-16">{b}B</th>
                          ))}
                          <th className="border dark:border-slate-600 px-2 py-1.5 text-center font-semibold text-gray-700 dark:text-gray-300 w-16">Média</th>
                          <th className="border dark:border-slate-600 px-2 py-1.5 text-center font-semibold text-gray-700 dark:text-gray-300 w-16">Faltas</th>
                          <th className="border dark:border-slate-600 px-2 py-1.5 text-center font-semibold text-gray-700 dark:text-gray-300 w-20">Resultado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {disciplinas.map(d => {
                          const aprovado = d.media !== null && d.media >= mediaAprovacao
                          return (
                            <tr key={d.disciplina} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                              <td className="border dark:border-slate-600 px-2 py-1.5 font-medium text-gray-800 dark:text-gray-200">
                                {d.abreviacao || d.disciplina}
                              </td>
                              {bimestres.map(b => {
                                const bim = d.bimestres[b]
                                const nota = bim ? (bim.final ?? bim.nota) : null
                                const temRec = bim?.recuperacao !== null && bim?.recuperacao !== undefined
                                return (
                                  <td key={b} className={`border dark:border-slate-600 px-2 py-1.5 text-center ${
                                    nota !== null && nota < mediaAprovacao ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'
                                  }`}>
                                    {nota !== null ? nota.toFixed(1) : '—'}
                                    {temRec && <span className="text-xs text-blue-500 ml-0.5">*</span>}
                                  </td>
                                )
                              })}
                              <td className={`border dark:border-slate-600 px-2 py-1.5 text-center font-bold ${
                                d.media !== null && d.media < mediaAprovacao ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                              }`}>
                                {d.media !== null ? d.media.toFixed(1) : '—'}
                              </td>
                              <td className="border dark:border-slate-600 px-2 py-1.5 text-center text-gray-700 dark:text-gray-300">
                                {d.total_faltas}
                              </td>
                              <td className={`border dark:border-slate-600 px-2 py-1.5 text-center text-xs font-semibold ${
                                d.media === null ? 'text-gray-400' : aprovado ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                              }`}>
                                {d.media === null ? '—' : aprovado ? 'Aprovado' : 'Reprovado'}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    * Nota com recuperação | Média de aprovação: {mediaAprovacao.toFixed(1)}
                  </p>

                  {/* Frequência do ano */}
                  {historico.frequencia_por_ano[ano] && historico.frequencia_por_ano[ano].length > 0 && (
                    <div className="mt-3">
                      <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Frequência</h4>
                      <div className="flex flex-wrap gap-4 text-xs">
                        {historico.frequencia_por_ano[ano].map(f => (
                          <div key={f.numero} className="flex items-center gap-1">
                            <span className="text-gray-500">{f.periodo}:</span>
                            <span className={`font-medium ${
                              f.percentual !== null && f.percentual < 75 ? 'text-red-600' : 'text-emerald-600'
                            }`}>
                              {f.percentual !== null ? `${f.percentual.toFixed(1)}%` : '—'}
                            </span>
                            <span className="text-gray-400">({f.faltas} faltas)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Conselho de Classe */}
            {historico.conselho.length > 0 && (
              <div className="p-6 print:p-4 border-b dark:border-slate-700">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2 mb-3">
                  <GraduationCap className="w-4 h-4" /> Conselho de Classe
                </h3>
                <div className="space-y-2">
                  {historico.conselho.map((c, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        c.parecer === 'aprovado' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        c.parecer === 'reprovado' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                      }`}>
                        {parecerLabel[c.parecer] || c.parecer}
                      </span>
                      {c.observacao && <span className="text-gray-600 dark:text-gray-400">{c.observacao}</span>}
                      <span className="text-xs text-gray-400 ml-auto">{c.turma_codigo}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Histórico de situação */}
            {historico.historico_situacao.length > 0 && (
              <div className="p-6 print:p-4 border-b dark:border-slate-700">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4" /> Movimentações
                </h3>
                <div className="space-y-2">
                  {historico.historico_situacao.map((h, i) => (
                    <div key={i} className="text-sm flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <span className="text-xs text-gray-400 w-24">{h.data ? new Date(h.data).toLocaleDateString('pt-BR') : '-'}</span>
                      <span className="capitalize">{h.situacao_anterior}</span>
                      <span className="text-gray-400">&rarr;</span>
                      <span className="capitalize font-medium">{h.situacao}</span>
                      {h.observacao && <span className="text-gray-500">({h.observacao})</span>}
                      {h.escola_destino_nome && <span className="text-gray-500">- {h.escola_destino_nome}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rodapé do documento */}
            <div className="p-6 print:p-4 text-center text-xs text-gray-500 dark:text-gray-400 space-y-2">
              <p>Documento gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
              <div className="flex justify-between items-end pt-8 print:pt-16">
                <div className="text-center">
                  <div className="border-t border-gray-400 w-48 mb-1"></div>
                  <span>Secretário(a) Escolar</span>
                </div>
                <div className="text-center">
                  <div className="border-t border-gray-400 w-48 mb-1"></div>
                  <span>Diretor(a)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Estado vazio */}
        {!historico && !carregando && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-12 text-center text-gray-500 dark:text-gray-400 print:hidden">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Selecione um aluno para visualizar o histórico escolar</p>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
