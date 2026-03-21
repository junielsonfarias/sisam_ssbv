'use client'

import { useState, useEffect, useCallback } from 'react'
import { FileText, AlertTriangle, Save } from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'

interface Turma { turma_id: string; turma_nome: string; serie: string; turno: string; tipo_vinculo: string; disciplina_nome: string | null }
interface Disciplina { id: string; nome: string; abreviacao: string }
interface Periodo { id: string; nome: string; numero: number }
interface AlunoNota {
  aluno_id: string; aluno_nome: string; aluno_codigo: string
  nota_id: string | null; nota: number | null; nota_recuperacao: number | null
  nota_final: number | null; faltas: number | null; observacao: string | null
}

function LancarNotas() {
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [alunos, setAlunos] = useState<AlunoNota[]>([])
  const [config, setConfig] = useState({ nota_maxima: 10, media_aprovacao: 6 })

  const [turmaId, setTurmaId] = useState('')
  const [disciplinaId, setDisciplinaId] = useState('')
  const [periodoId, setPeriodoId] = useState('')

  const [carregando, setCarregando] = useState(true)
  const [carregandoNotas, setCarregandoNotas] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')

  // Edição local
  const [notasEditadas, setNotasEditadas] = useState<Record<string, { nota: string; nota_recuperacao: string; faltas: string; observacao: string }>>({})

  // Carregar turmas
  useEffect(() => {
    Promise.all([
      fetch('/api/professor/turmas').then(r => r.json()),
      fetch('/api/professor/periodos').then(r => r.json()),
    ]).then(([turmasData, periodosData]) => {
      setTurmas(turmasData.turmas || [])
      setPeriodos(periodosData.periodos || [])
    }).catch(() => setErro('Erro ao carregar dados'))
      .finally(() => setCarregando(false))
  }, [])

  // Carregar disciplinas ao selecionar turma
  useEffect(() => {
    if (!turmaId) { setDisciplinas([]); setDisciplinaId(''); return }
    fetch(`/api/professor/disciplinas?turma_id=${turmaId}`)
      .then(r => r.json())
      .then(data => {
        setDisciplinas(data.disciplinas || [])
        setDisciplinaId('')
      })
      .catch(() => {})
  }, [turmaId])

  // Carregar notas ao selecionar tudo
  const fetchNotas = useCallback(async () => {
    if (!turmaId || !disciplinaId || !periodoId) return
    setCarregandoNotas(true)
    setMensagem('')
    setErro('')
    try {
      const res = await fetch(`/api/professor/notas?turma_id=${turmaId}&disciplina_id=${disciplinaId}&periodo_id=${periodoId}`)
      if (!res.ok) throw new Error('Erro ao carregar notas')
      const data = await res.json()
      setAlunos(data.alunos || [])
      setConfig(data.config || { nota_maxima: 10, media_aprovacao: 6 })
      // Inicializar edição com valores existentes
      const edits: Record<string, any> = {}
      for (const a of data.alunos || []) {
        edits[a.aluno_id] = {
          nota: a.nota !== null ? String(a.nota) : '',
          nota_recuperacao: a.nota_recuperacao !== null ? String(a.nota_recuperacao) : '',
          faltas: a.faltas !== null ? String(a.faltas) : '0',
          observacao: a.observacao || '',
        }
      }
      setNotasEditadas(edits)
    } catch (err: any) {
      setErro(err.message)
    } finally {
      setCarregandoNotas(false)
    }
  }, [turmaId, disciplinaId, periodoId])

  useEffect(() => { fetchNotas() }, [fetchNotas])

  const updateNota = (alunoId: string, campo: string, valor: string) => {
    setNotasEditadas(prev => ({
      ...prev,
      [alunoId]: { ...prev[alunoId], [campo]: valor }
    }))
  }

  const salvar = async () => {
    const notas = Object.entries(notasEditadas).map(([aluno_id, vals]) => ({
      aluno_id,
      nota: vals.nota ? parseFloat(vals.nota) : null,
      nota_recuperacao: vals.nota_recuperacao ? parseFloat(vals.nota_recuperacao) : null,
      faltas: vals.faltas ? parseInt(vals.faltas) : 0,
      observacao: vals.observacao || null,
    })).filter(n => n.nota !== null || n.nota_recuperacao !== null || n.faltas > 0)

    if (notas.length === 0) {
      setErro('Preencha pelo menos uma nota')
      return
    }

    setSalvando(true)
    setMensagem('')
    setErro('')
    try {
      const res = await fetch('/api/professor/notas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turma_id: turmaId, disciplina_id: disciplinaId, periodo_id: periodoId, notas }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.mensagem)
      setMensagem(data.mensagem)
      fetchNotas()
    } catch (err: any) {
      setErro(err.message)
    } finally {
      setSalvando(false)
    }
  }

  // Resumo
  const notasPreenchidas = Object.values(notasEditadas).filter(n => n.nota).length
  const mediasTurma = Object.values(notasEditadas)
    .filter(n => n.nota)
    .map(n => parseFloat(n.nota))
    .filter(n => !isNaN(n))
  const mediaTurma = mediasTurma.length > 0 ? (mediasTurma.reduce((a, b) => a + b, 0) / mediasTurma.length).toFixed(1) : '-'
  const aprovados = mediasTurma.filter(n => n >= config.media_aprovacao).length

  if (carregando) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lançar Notas</h1>
        <div className="h-40 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lançar Notas</h1>

      {/* Seletores */}
      <div className="grid gap-3 sm:grid-cols-3">
        <select value={turmaId} onChange={e => setTurmaId(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white">
          <option value="">Selecione a turma</option>
          {turmas.map(t => <option key={t.turma_id} value={t.turma_id}>{t.turma_nome} ({t.serie} - {t.turno})</option>)}
        </select>
        <select value={disciplinaId} onChange={e => setDisciplinaId(e.target.value)} disabled={!turmaId}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white disabled:opacity-50">
          <option value="">Selecione a disciplina</option>
          {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
        </select>
        <select value={periodoId} onChange={e => setPeriodoId(e.target.value)} disabled={!disciplinaId}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white disabled:opacity-50">
          <option value="">Selecione o período</option>
          {periodos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
      </div>

      {/* Resumo */}
      {alunos.length > 0 && (
        <div className="flex flex-wrap gap-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-sm">
          <span>{notasPreenchidas}/{alunos.length} notas</span>
          <span>Média: <strong>{mediaTurma}</strong></span>
          <span className="text-green-600">{aprovados} aprovados</span>
          <span className="text-red-600">{mediasTurma.length - aprovados} abaixo</span>
        </div>
      )}

      {/* Tabela de notas */}
      {carregandoNotas ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />)}
        </div>
      ) : alunos.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">#</th>
                <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">Aluno</th>
                <th className="text-center p-3 font-medium text-gray-700 dark:text-gray-300 w-20">Nota</th>
                <th className="text-center p-3 font-medium text-gray-700 dark:text-gray-300 w-20">Recup.</th>
                <th className="text-center p-3 font-medium text-gray-700 dark:text-gray-300 w-16">Faltas</th>
                <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">Obs.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {alunos.map((aluno, i) => {
                const edit = notasEditadas[aluno.aluno_id] || { nota: '', nota_recuperacao: '', faltas: '0', observacao: '' }
                const notaNum = edit.nota ? parseFloat(edit.nota) : null
                const abaixo = notaNum !== null && notaNum < config.media_aprovacao
                return (
                  <tr key={aluno.aluno_id} className={abaixo ? 'bg-red-50/50 dark:bg-red-900/10' : ''}>
                    <td className="p-3 text-gray-400">{i + 1}</td>
                    <td className="p-3 text-gray-900 dark:text-white font-medium">{aluno.aluno_nome}</td>
                    <td className="p-2">
                      <input type="number" step="0.1" min="0" max={config.nota_maxima} value={edit.nota}
                        onChange={e => updateNota(aluno.aluno_id, 'nota', e.target.value)}
                        className={`w-full px-2 py-1.5 rounded border text-center text-sm ${
                          abaixo ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                        } text-gray-900 dark:text-white`} />
                    </td>
                    <td className="p-2">
                      <input type="number" step="0.1" min="0" max={config.nota_maxima} value={edit.nota_recuperacao}
                        onChange={e => updateNota(aluno.aluno_id, 'nota_recuperacao', e.target.value)}
                        className="w-full px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-center text-sm text-gray-900 dark:text-white" />
                    </td>
                    <td className="p-2">
                      <input type="number" min="0" value={edit.faltas}
                        onChange={e => updateNota(aluno.aluno_id, 'faltas', e.target.value)}
                        className="w-full px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-center text-sm text-gray-900 dark:text-white" />
                    </td>
                    <td className="p-2">
                      <input type="text" value={edit.observacao} maxLength={500}
                        onChange={e => updateNota(aluno.aluno_id, 'observacao', e.target.value)}
                        placeholder="..."
                        className="w-full px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : turmaId && disciplinaId && periodoId ? (
        <div className="text-center py-8 text-gray-500">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-2" />
          Nenhum aluno encontrado
        </div>
      ) : null}

      {/* Mensagens */}
      {mensagem && <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm">{mensagem}</div>}
      {erro && <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">{erro}</div>}

      {/* Salvar */}
      {alunos.length > 0 && (
        <button onClick={salvar} disabled={salvando}
          className="w-full py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">
          <Save className="h-4 w-4" />
          {salvando ? 'Salvando...' : 'Salvar Notas'}
        </button>
      )}
    </div>
  )
}

export default function NotasProfessorPage() {
  return (
    <ProtectedRoute tiposPermitidos={['professor']}>
      <LancarNotas />
    </ProtectedRoute>
  )
}
