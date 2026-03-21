'use client'

import { useState } from 'react'
import { Check, X, Save } from 'lucide-react'

interface Horario {
  numero_aula: number
  disciplina_id: string
  disciplina_nome: string
  abreviacao: string
}

interface Aluno {
  id: string
  nome: string
  codigo: string
}

interface Frequencia {
  id: string
  aluno_id: string
  numero_aula: number
  disciplina_id: string
  presente: boolean
}

interface Props {
  turmaId: string
  data: string
  horarios: Horario[]
  alunos: Aluno[]
  frequencias: Frequencia[]
  onSalvar: () => void
}

export default function FrequenciaHoraAulaComponent({ turmaId, data, horarios, alunos, frequencias, onSalvar }: Props) {
  const [aulaAtiva, setAulaAtiva] = useState(horarios.length > 0 ? horarios[0].numero_aula : 1)
  const [registros, setRegistros] = useState<Record<string, Record<number, boolean>>>(() => {
    const map: Record<string, Record<number, boolean>> = {}
    frequencias.forEach(f => {
      if (!map[f.aluno_id]) map[f.aluno_id] = {}
      map[f.aluno_id][f.numero_aula] = f.presente
    })
    return map
  })
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')

  const horarioAtivo = horarios.find(h => h.numero_aula === aulaAtiva)

  const togglePresenca = (alunoId: string, numeroAula: number) => {
    setRegistros(prev => {
      const alunoRegs = { ...(prev[alunoId] || {}) }
      alunoRegs[numeroAula] = !alunoRegs[numeroAula]
      return { ...prev, [alunoId]: alunoRegs }
    })
  }

  const marcarTodosAula = (numeroAula: number, presente: boolean) => {
    setRegistros(prev => {
      const novos = { ...prev }
      alunos.forEach(a => {
        if (!novos[a.id]) novos[a.id] = {}
        novos[a.id] = { ...novos[a.id], [numeroAula]: presente }
      })
      return novos
    })
  }

  const salvarAula = async (numeroAula: number) => {
    const horario = horarios.find(h => h.numero_aula === numeroAula)
    if (!horario) return

    const regs = alunos
      .filter(a => registros[a.id]?.[numeroAula] !== undefined)
      .map(a => ({ aluno_id: a.id, presente: registros[a.id][numeroAula] }))

    if (regs.length === 0) {
      setMensagem('Marque a frequência de pelo menos um aluno')
      return
    }

    setSalvando(true)
    setMensagem('')
    try {
      const res = await fetch('/api/professor/frequencia-hora-aula', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turma_id: turmaId,
          data,
          numero_aula: numeroAula,
          disciplina_id: horario.disciplina_id,
          registros: regs,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.mensagem)
      setMensagem(result.mensagem)
      onSalvar()
    } catch (err: any) {
      setMensagem(err.message || 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  // Contagem para aula ativa
  const presentesAula = alunos.filter(a => registros[a.id]?.[aulaAtiva] === true).length
  const ausentesAula = alunos.filter(a => registros[a.id]?.[aulaAtiva] === false).length

  if (horarios.length === 0) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800 text-center">
        <p className="text-amber-700 dark:text-amber-300">
          Nenhum horário cadastrado para esta turma neste dia.
        </p>
        <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
          Solicite ao administrador para configurar os horários de aula.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Tabs de aulas */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {horarios.map(h => (
          <button
            key={h.numero_aula}
            onClick={() => setAulaAtiva(h.numero_aula)}
            className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              aulaAtiva === h.numero_aula
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <div className="text-center">
              <div>{h.numero_aula}a aula</div>
              <div className="text-xs opacity-80">{h.abreviacao || h.disciplina_nome}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Info da aula ativa */}
      {horarioAtivo && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <span className="font-medium text-gray-900 dark:text-white">
                {horarioAtivo.numero_aula}a Aula — {horarioAtivo.disciplina_nome}
              </span>
            </div>
            <div className="flex gap-3 text-sm">
              <span className="text-green-600">{presentesAula} P</span>
              <span className="text-red-600">{ausentesAula} F</span>
            </div>
          </div>
        </div>
      )}

      {/* Ações rápidas */}
      <div className="flex gap-2">
        <button
          onClick={() => marcarTodosAula(aulaAtiva, true)}
          className="px-3 py-1.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200"
        >
          Todos Presentes
        </button>
        <button
          onClick={() => marcarTodosAula(aulaAtiva, false)}
          className="px-3 py-1.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200"
        >
          Todos Ausentes
        </button>
      </div>

      {/* Lista de alunos para aula ativa */}
      <div className="space-y-1">
        {alunos.map((aluno, i) => {
          const presente = registros[aluno.id]?.[aulaAtiva]
          const isPresente = presente === true
          const isAusente = presente === false

          return (
            <div
              key={aluno.id}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                isPresente ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
                isAusente ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
                'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs text-gray-400 w-6 text-right">{i + 1}</span>
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{aluno.nome}</p>
              </div>
              <button
                onClick={() => togglePresenca(aluno.id, aulaAtiva)}
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
          )
        })}
      </div>

      {/* Mensagem */}
      {mensagem && (
        <div className={`p-3 rounded-lg text-sm ${
          mensagem.includes('sucesso') || mensagem.includes('registrada') ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
          'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
        }`}>
          {mensagem}
        </div>
      )}

      {/* Botão salvar aula */}
      <button
        onClick={() => salvarAula(aulaAtiva)}
        disabled={salvando}
        className="w-full py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Save className="h-4 w-4" />
        {salvando ? 'Salvando...' : `Salvar ${horarioAtivo?.numero_aula}a Aula`}
      </button>
    </div>
  )
}
