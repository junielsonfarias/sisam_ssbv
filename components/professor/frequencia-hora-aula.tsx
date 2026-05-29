'use client'

import { useState } from 'react'
import { Save, AlertCircle } from 'lucide-react'

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
  // Aulas modificadas localmente desde o ultimo onSalvar (para salvar em lote).
  const [aulasModificadas, setAulasModificadas] = useState<Set<number>>(new Set())

  const horarioAtivo = horarios.find(h => h.numero_aula === aulaAtiva)

  const marcarAluno = (alunoId: string, numeroAula: number, presente: boolean) => {
    setRegistros(prev => {
      const alunoRegs = { ...(prev[alunoId] || {}) }
      alunoRegs[numeroAula] = presente
      return { ...prev, [alunoId]: alunoRegs }
    })
    setAulasModificadas(prev => new Set(prev).add(numeroAula))
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
    setAulasModificadas(prev => new Set(prev).add(numeroAula))
  }

  const enviarAula = async (numeroAula: number): Promise<{ ok: boolean; mensagem: string }> => {
    const horario = horarios.find(h => h.numero_aula === numeroAula)
    if (!horario) return { ok: false, mensagem: `Aula ${numeroAula} sem horario` }

    const regs = alunos
      .filter(a => registros[a.id]?.[numeroAula] !== undefined)
      .map(a => ({ aluno_id: a.id, presente: registros[a.id][numeroAula] }))

    if (regs.length === 0) return { ok: false, mensagem: `Aula ${numeroAula} sem alunos marcados` }

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
    if (!res.ok) return { ok: false, mensagem: result.mensagem || `Erro na ${numeroAula}a aula` }
    return { ok: true, mensagem: result.mensagem || `${numeroAula}a aula salva` }
  }

  const salvarAula = async (numeroAula: number) => {
    setSalvando(true)
    setMensagem('')
    const r = await enviarAula(numeroAula)
    setMensagem(r.mensagem)
    if (r.ok) {
      setAulasModificadas(prev => {
        const n = new Set(prev); n.delete(numeroAula); return n
      })
      onSalvar()
    }
    setSalvando(false)
  }

  const salvarTodas = async () => {
    const aulas = Array.from(aulasModificadas).sort((a, b) => a - b)
    if (aulas.length === 0) {
      setMensagem('Nenhuma alteracao pendente')
      return
    }
    setSalvando(true)
    setMensagem('')
    const sucessos: number[] = []
    const erros: string[] = []
    for (const numero of aulas) {
      const r = await enviarAula(numero)
      if (r.ok) sucessos.push(numero)
      else erros.push(r.mensagem)
    }
    setAulasModificadas(prev => {
      const n = new Set(prev)
      sucessos.forEach(s => n.delete(s))
      return n
    })
    const partes = []
    if (sucessos.length > 0) partes.push(`${sucessos.length} aula(s) salva(s)`)
    if (erros.length > 0) partes.push(`${erros.length} falha(s): ${erros.join('; ')}`)
    setMensagem(partes.join(' — '))
    if (sucessos.length > 0) onSalvar()
    setSalvando(false)
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
        {horarios.map(h => {
          const pendente = aulasModificadas.has(h.numero_aula)
          return (
            <button
              key={h.numero_aula}
              onClick={() => setAulaAtiva(h.numero_aula)}
              className={`relative flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                aulaAtiva === h.numero_aula
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              aria-label={`${h.numero_aula}ª aula${pendente ? ' (alteracoes pendentes)' : ''}`}
            >
              <div className="text-center">
                <div>{h.numero_aula}a aula</div>
                <div className="text-xs opacity-80">{h.abreviacao || h.disciplina_nome}</div>
              </div>
              {pendente && (
                <span
                  className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-gray-800"
                  title="Alteracoes pendentes"
                />
              )}
            </button>
          )
        })}
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
              <div
                role="radiogroup"
                aria-label={`Status de ${aluno.nome} na ${aulaAtiva}a aula`}
                className="flex items-center gap-1"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={isPresente}
                  onClick={() => marcarAluno(aluno.id, aulaAtiva, true)}
                  title="Presente"
                  className={`min-w-[44px] px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
                    isPresente
                      ? 'bg-green-600 text-white shadow-sm'
                      : 'bg-white dark:bg-gray-700 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/30'
                  }`}
                >
                  P
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={isAusente}
                  onClick={() => marcarAluno(aluno.id, aulaAtiva, false)}
                  title="Falta"
                  className={`min-w-[44px] px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
                    isAusente
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30'
                  }`}
                >
                  F
                </button>
              </div>
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

      {/* Aviso de alteracoes pendentes em outras aulas */}
      {aulasModificadas.size > 1 && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-300">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>
            {aulasModificadas.size} aula(s) com alteracoes pendentes: {Array.from(aulasModificadas).sort((a, b) => a - b).map(n => `${n}ª`).join(', ')}
          </span>
        </div>
      )}

      {/* Botoes salvar */}
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          onClick={() => salvarAula(aulaAtiva)}
          disabled={salvando}
          className="w-full py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Save className="h-4 w-4" />
          {salvando ? 'Salvando...' : `Salvar ${horarioAtivo?.numero_aula}a aula`}
        </button>
        <button
          onClick={salvarTodas}
          disabled={salvando || aulasModificadas.size === 0}
          className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Save className="h-4 w-4" />
          Salvar todas{aulasModificadas.size > 0 ? ` (${aulasModificadas.size})` : ''}
        </button>
      </div>
    </div>
  )
}
