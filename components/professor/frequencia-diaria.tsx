'use client'

import { useState } from 'react'
import { Check, X, Save, AlertTriangle, FileText } from 'lucide-react'

interface Aluno {
  aluno_id: string
  aluno_nome: string
  aluno_codigo: string
  frequencia_id: string | null
  status: string | null
  justificativa: string | null
  hora_entrada: string | null
  hora_saida: string | null
  metodo: string | null
}

interface Resumo {
  total: number
  presentes: number
  ausentes: number
  sem_registro: number
  percentual: number
}

interface Props {
  turmaId: string
  data: string
  alunos: Aluno[]
  resumo: Resumo
  onSalvar: () => void
}

export default function FrequenciaDiariaComponent({ turmaId, data, alunos: alunosIniciais, resumo: resumoInicial, onSalvar }: Props) {
  const [registros, setRegistros] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    alunosIniciais.forEach(a => {
      if (a.status) map[a.aluno_id] = a.status
    })
    return map
  })
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [justificando, setJustificando] = useState<string | null>(null)
  const [textoJustificativa, setTextoJustificativa] = useState('')

  const toggleStatus = (alunoId: string) => {
    setRegistros(prev => {
      const atual = prev[alunoId]
      if (!atual || atual === 'ausente' || atual === 'justificado') return { ...prev, [alunoId]: 'presente' }
      return { ...prev, [alunoId]: 'ausente' }
    })
  }

  const marcarTodos = (status: string) => {
    const novos: Record<string, string> = {}
    alunosIniciais.forEach(a => { novos[a.aluno_id] = status })
    setRegistros(novos)
  }

  const salvar = async () => {
    const regs = Object.entries(registros).map(([aluno_id, status]) => ({ aluno_id, status }))
    if (regs.length === 0) {
      setMensagem('Marque a frequência de pelo menos um aluno')
      return
    }

    setSalvando(true)
    setMensagem('')
    try {
      const res = await fetch('/api/professor/frequencia-diaria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turma_id: turmaId, data, registros: regs }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.mensagem)
      setMensagem(`${result.salvos} registro(s) salvo(s) com sucesso`)
      onSalvar()
    } catch (err: any) {
      setMensagem(err.message || 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  const justificar = async (frequenciaId: string) => {
    if (!textoJustificativa.trim()) return
    try {
      const res = await fetch('/api/professor/frequencia-diaria/justificar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frequencia_id: frequenciaId, justificativa: textoJustificativa }),
      })
      if (!res.ok) throw new Error('Erro ao justificar')
      setJustificando(null)
      setTextoJustificativa('')
      onSalvar()
    } catch (err: any) {
      setMensagem(err.message)
    }
  }

  const lancarFaltas = async () => {
    setSalvando(true)
    try {
      const res = await fetch('/api/professor/frequencia-diaria/lancar-faltas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turma_id: turmaId, data }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.mensagem)
      setMensagem(result.mensagem)
      onSalvar()
    } catch (err: any) {
      setMensagem(err.message)
    } finally {
      setSalvando(false)
    }
  }

  // Contagem atual
  const presentes = Object.values(registros).filter(s => s === 'presente').length
  const ausentes = Object.values(registros).filter(s => s === 'ausente' || s === 'justificado').length
  const semRegistro = alunosIniciais.length - Object.keys(registros).length
  const percentual = alunosIniciais.length > 0 ? Math.round((presentes / alunosIniciais.length) * 100) : 0

  return (
    <div className="space-y-4">
      {/* Barra de resumo */}
      <div className="flex flex-wrap gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-sm">
        <span className="text-green-600 dark:text-green-400 font-medium">{presentes} presentes</span>
        <span className="text-red-600 dark:text-red-400 font-medium">{ausentes} ausentes</span>
        {semRegistro > 0 && <span className="text-gray-400">{semRegistro} sem registro</span>}
        <span className={`font-bold ml-auto ${percentual >= 75 ? 'text-green-600' : 'text-red-600'}`}>
          {percentual}%
        </span>
      </div>

      {/* Ações rápidas */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => marcarTodos('presente')} className="px-3 py-1.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200">
          Todos Presentes
        </button>
        <button onClick={lancarFaltas} disabled={salvando} className="px-3 py-1.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200">
          Lançar Faltas (sem registro)
        </button>
      </div>

      {/* Lista de alunos */}
      <div className="space-y-1">
        {alunosIniciais.map((aluno, i) => {
          const status = registros[aluno.aluno_id]
          const isPresente = status === 'presente'
          const isAusente = status === 'ausente' || status === 'justificado'

          return (
            <div key={aluno.aluno_id}>
              <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                isPresente ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
                isAusente ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
                'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              }`}>
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs text-gray-400 w-6 text-right">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{aluno.aluno_nome}</p>
                    {aluno.metodo && aluno.metodo !== 'manual' && (
                      <p className="text-xs text-gray-400">{aluno.metodo}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {aluno.frequencia_id && isAusente && (
                    <button
                      onClick={() => { setJustificando(aluno.frequencia_id); setTextoJustificativa(aluno.justificativa || '') }}
                      className="p-1.5 text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded"
                      title="Justificar"
                    >
                      <FileText className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => toggleStatus(aluno.aluno_id)}
                    className={`p-2 rounded-lg transition-colors ${
                      isPresente ? 'bg-green-500 text-white' :
                      isAusente ? 'bg-red-500 text-white' :
                      'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {isPresente ? <Check className="h-4 w-4" /> :
                     isAusente ? <X className="h-4 w-4" /> :
                     <Check className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Modal justificativa inline */}
              {justificando === aluno.frequencia_id && (
                <div className="mt-1 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <textarea
                    value={textoJustificativa}
                    onChange={e => setTextoJustificativa(e.target.value)}
                    placeholder="Motivo da justificativa..."
                    rows={2}
                    className="w-full p-2 text-sm rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => justificar(aluno.frequencia_id!)} className="px-3 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600">
                      Salvar Justificativa
                    </button>
                    <button onClick={() => setJustificando(null)} className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Mensagem */}
      {mensagem && (
        <div className={`p-3 rounded-lg text-sm ${
          mensagem.includes('sucesso') ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
          'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
        }`}>
          {mensagem}
        </div>
      )}

      {/* Botão salvar */}
      <button
        onClick={salvar}
        disabled={salvando}
        className="w-full py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Save className="h-4 w-4" />
        {salvando ? 'Salvando...' : 'Salvar Frequência'}
      </button>
    </div>
  )
}
