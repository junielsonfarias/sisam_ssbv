'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Grid3X3, Loader2, CheckCircle, Users, ChevronRight, Save, RotateCcw
} from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'

interface Escola { id: string; nome: string }
interface Turma { id: string; codigo: string; serie: string; escola_id: string }
interface Avaliacao { id: string; nome: string; ano_letivo: string }
interface Aluno { id: string; nome: string; codigo: string }
interface AlunoRespostas { respostas: Record<string, string>; presenca: 'P' | 'F' }

const ALTERNATIVAS = ['A', 'B', 'C', 'D']

function CartaoRespostaContent() {
  const [etapa, setEtapa] = useState(1)
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')

  // Seleções
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([])
  const [escolaId, setEscolaId] = useState('')
  const [turmaId, setTurmaId] = useState('')
  const [avaliacaoId, setAvaliacaoId] = useState('')

  // Dados do cartão
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [totalQuestoes, setTotalQuestoes] = useState(20)
  const [respostas, setRespostas] = useState<Record<string, AlunoRespostas>>({})
  const [alunoAtivo, setAlunoAtivo] = useState<string | null>(null)

  // Carregar escolas
  useEffect(() => {
    fetch('/api/offline/escolas')
      .then(r => r.json())
      .then(data => setEscolas(Array.isArray(data) ? data : data.escolas || []))
      .catch(() => {})
  }, [])

  // Carregar turmas quando escola muda
  useEffect(() => {
    if (!escolaId) { setTurmas([]); return }
    fetch(`/api/offline/turmas?escola_id=${escolaId}`)
      .then(r => r.json())
      .then(data => setTurmas(Array.isArray(data) ? data : data.turmas || []))
      .catch(() => {})
  }, [escolaId])

  // Carregar avaliações
  useEffect(() => {
    fetch(`/api/offline/avaliacoes?ano_letivo=${new Date().getFullYear()}`)
      .then(r => r.json())
      .then(data => setAvaliacoes(Array.isArray(data) ? data : data.avaliacoes || []))
      .catch(() => {})
  }, [])

  // Carregar alunos da turma
  const carregarAlunos = useCallback(async () => {
    if (!turmaId || !avaliacaoId) return
    setCarregando(true)
    try {
      const params = new URLSearchParams({ turma_id: turmaId, avaliacao_id: avaliacaoId })
      const res = await fetch(`/api/admin/cartao-resposta?${params}`)
      const data = await res.json()
      setAlunos(data.alunos || [])
      setTotalQuestoes(data.totalQuestoes || 20)

      // Inicializar respostas
      const respostasIniciais: Record<string, AlunoRespostas> = {}
      for (const aluno of (data.alunos || [])) {
        const existente = data.respostasExistentes?.[aluno.id]
        respostasIniciais[aluno.id] = existente || {
          respostas: {},
          presenca: 'P',
        }
      }
      setRespostas(respostasIniciais)
      if (data.alunos?.length > 0) setAlunoAtivo(data.alunos[0].id)
      setEtapa(3)
    } catch {
      setMensagem('Erro ao carregar alunos.')
    } finally {
      setCarregando(false)
    }
  }, [turmaId, avaliacaoId])

  const marcarResposta = (alunoId: string, questao: string, alternativa: string) => {
    setRespostas(prev => ({
      ...prev,
      [alunoId]: {
        ...prev[alunoId],
        respostas: {
          ...(prev[alunoId]?.respostas || {}),
          [questao]: prev[alunoId]?.respostas?.[questao] === alternativa ? '' : alternativa,
        },
      },
    }))
  }

  const togglePresenca = (alunoId: string) => {
    setRespostas(prev => ({
      ...prev,
      [alunoId]: {
        ...prev[alunoId],
        presenca: prev[alunoId]?.presenca === 'P' ? 'F' : 'P',
      },
    }))
  }

  const salvar = async () => {
    setSalvando(true)
    setMensagem('')
    try {
      const dados = alunos.map(a => ({
        aluno_id: a.id,
        respostas: respostas[a.id]?.respostas || {},
        presenca: respostas[a.id]?.presenca || 'P',
      }))

      const res = await fetch('/api/admin/cartao-resposta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turma_id: turmaId,
          avaliacao_id: avaliacaoId,
          ano_letivo: String(new Date().getFullYear()),
          dados,
        }),
      })
      const data = await res.json()
      setMensagem(data.mensagem || (res.ok ? 'Salvo com sucesso!' : 'Erro ao salvar.'))
    } catch {
      setMensagem('Erro de conexão.')
    } finally {
      setSalvando(false)
    }
  }

  const selectClass = 'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center gap-3">
          <Grid3X3 className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">Cartão-Resposta Digital</h1>
            <p className="text-purple-100 text-sm">Lançamento visual de respostas por turma</p>
          </div>
        </div>
      </div>

      {/* Etapa 1-2: Seleção */}
      {etapa < 3 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 max-w-lg mx-auto space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${etapa >= 1 ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-400'}`}>1</div>
            <div className="w-8 h-0.5 bg-gray-200" />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${etapa >= 2 ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-400'}`}>2</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Escola</label>
            <select value={escolaId} onChange={e => { setEscolaId(e.target.value); setTurmaId('') }} className={selectClass}>
              <option value="">Selecione a escola</option>
              {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Turma</label>
            <select value={turmaId} onChange={e => setTurmaId(e.target.value)} className={selectClass} disabled={!escolaId}>
              <option value="">Selecione a turma</option>
              {turmas.map(t => <option key={t.id} value={t.id}>{t.codigo} - {t.serie}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Avaliação</label>
            <select value={avaliacaoId} onChange={e => setAvaliacaoId(e.target.value)} className={selectClass}>
              <option value="">Selecione a avaliação</option>
              {avaliacoes.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>

          <button onClick={carregarAlunos} disabled={!turmaId || !avaliacaoId || carregando}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/25 disabled:opacity-50 flex items-center justify-center gap-2">
            {carregando ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ChevronRight className="w-5 h-5" /> Carregar Alunos</>}
          </button>
        </div>
      )}

      {/* Etapa 3: Grid de Respostas */}
      {etapa === 3 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button onClick={() => setEtapa(1)}
              className="text-sm text-slate-500 hover:text-purple-600 flex items-center gap-1">
              <RotateCcw className="w-4 h-4" /> Mudar turma
            </button>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-500">{alunos.length} alunos</span>
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto">
            {/* Lista de Alunos */}
            <div className="w-56 flex-shrink-0 bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-3 bg-slate-50 border-b text-sm font-semibold text-slate-700">Alunos</div>
              <div className="max-h-[600px] overflow-y-auto">
                {alunos.map(aluno => {
                  const r = respostas[aluno.id]
                  const totalResp = Object.values(r?.respostas || {}).filter(v => v).length
                  const isActive = alunoAtivo === aluno.id
                  return (
                    <button key={aluno.id} onClick={() => setAlunoAtivo(aluno.id)}
                      className={`w-full text-left px-3 py-2.5 border-b border-gray-50 text-sm transition-all ${
                        isActive ? 'bg-purple-50 text-purple-700 font-medium' : 'hover:bg-gray-50 text-slate-700'
                      }`}>
                      <div className="flex items-center justify-between">
                        <span className="truncate">{aluno.nome}</span>
                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                            r?.presenca === 'F' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                          }`}>{r?.presenca || 'P'}</span>
                          <span className="text-[10px] text-slate-400">{totalResp}/{totalQuestoes}</span>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Grid de Respostas */}
            {alunoAtivo && (
              <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-3 bg-slate-50 border-b flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">
                    {alunos.find(a => a.id === alunoAtivo)?.nome}
                  </span>
                  <button onClick={() => togglePresenca(alunoAtivo)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                      respostas[alunoAtivo]?.presenca === 'F'
                        ? 'bg-red-100 text-red-600 hover:bg-red-200'
                        : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                    }`}>
                    {respostas[alunoAtivo]?.presenca === 'F' ? 'Faltou' : 'Presente'}
                  </button>
                </div>
                <div className="p-4 max-h-[600px] overflow-y-auto">
                  {respostas[alunoAtivo]?.presenca === 'F' ? (
                    <div className="text-center py-8 text-slate-400">
                      <p className="text-lg font-semibold">Aluno ausente</p>
                      <p className="text-sm">Clique em "Faltou" para marcar como presente</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      {Array.from({ length: totalQuestoes }, (_, i) => {
                        const q = `Q${i + 1}`
                        const respAluno = respostas[alunoAtivo]?.respostas?.[q] || ''
                        return (
                          <div key={q} className="flex items-center gap-2 p-1.5 rounded-lg border border-gray-100">
                            <span className="text-xs font-mono text-slate-500 w-7">{q}</span>
                            <div className="flex gap-1">
                              {ALTERNATIVAS.map(alt => (
                                <button key={alt} onClick={() => marcarResposta(alunoAtivo, q, alt)}
                                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                                    respAluno === alt
                                      ? 'bg-purple-500 text-white shadow-md shadow-purple-500/30'
                                      : 'bg-gray-100 text-slate-600 hover:bg-purple-100 hover:text-purple-600'
                                  }`}>
                                  {alt}
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Salvar */}
          <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4">
            {mensagem && (
              <div className={`flex items-center gap-2 text-sm ${mensagem.includes('sucesso') || mensagem.includes('Salvo') ? 'text-emerald-600' : 'text-red-600'}`}>
                <CheckCircle className="w-4 h-4" /> {mensagem}
              </div>
            )}
            {!mensagem && <div />}
            <button onClick={salvar} disabled={salvando}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/25 disabled:opacity-50 flex items-center gap-2">
              {salvando ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Salvar Respostas</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CartaoRespostaPage() {
  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
      <CartaoRespostaContent />
    </ProtectedRoute>
  )
}
