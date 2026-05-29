'use client'

import { useState } from 'react'
import { Save, AlertTriangle } from 'lucide-react'

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

export default function FrequenciaDiariaComponent({ turmaId, data, alunos: alunosIniciais, onSalvar }: Props) {
  const [registros, setRegistros] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    alunosIniciais.forEach(a => {
      if (a.status) map[a.aluno_id] = a.status
    })
    return map
  })
  // Justificativa por aluno_id — evita replicar texto entre alunos.
  const [justificativas, setJustificativas] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    alunosIniciais.forEach(a => {
      if (a.justificativa) map[a.aluno_id] = a.justificativa
    })
    return map
  })
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [confirmacaoPendentes, setConfirmacaoPendentes] = useState(false)

  const setStatus = (alunoId: string, status: 'presente' | 'ausente' | 'justificado') => {
    setRegistros(prev => ({ ...prev, [alunoId]: status }))
  }

  const setJustificativaAluno = (alunoId: string, texto: string) => {
    setJustificativas(prev => ({ ...prev, [alunoId]: texto }))
  }

  const marcarTodos = (status: string) => {
    const novos: Record<string, string> = {}
    alunosIniciais.forEach(a => { novos[a.aluno_id] = status })
    setRegistros(novos)
  }

  const construirPayload = (regs: Array<{ aluno_id: string; status: string }>) =>
    regs.map(r => ({
      aluno_id: r.aluno_id,
      status: r.status,
      ...(r.status === 'justificado'
        ? { justificativa: justificativas[r.aluno_id]?.trim() || null }
        : {}),
    }))

  const enviarSalvar = async (regs: Array<{ aluno_id: string; status: string }>) => {
    setSalvando(true)
    setMensagem('')
    try {
      const res = await fetch('/api/professor/frequencia-diaria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turma_id: turmaId, data, registros: construirPayload(regs) }),
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

  const salvar = async () => {
    const regs = Object.entries(registros).map(([aluno_id, status]) => ({ aluno_id, status }))
    if (regs.length === 0) {
      setMensagem('Marque a frequência de pelo menos um aluno')
      return
    }

    const pendentes = alunosIniciais.filter(a => !registros[a.aluno_id])
    if (pendentes.length > 0) {
      setConfirmacaoPendentes(true)
      return
    }

    await enviarSalvar(regs)
  }

  const salvarComPendentesAusentes = async () => {
    setConfirmacaoPendentes(false)
    const regs = alunosIniciais.map(a => ({
      aluno_id: a.aluno_id,
      status: registros[a.aluno_id] || 'ausente',
    }))
    await enviarSalvar(regs)
  }

  const salvarSomenteMarcados = async () => {
    setConfirmacaoPendentes(false)
    const regs = Object.entries(registros).map(([aluno_id, status]) => ({ aluno_id, status }))
    await enviarSalvar(regs)
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
  const faltas = Object.values(registros).filter(s => s === 'ausente').length
  const justificadas = Object.values(registros).filter(s => s === 'justificado').length
  const semRegistro = alunosIniciais.length - Object.keys(registros).length
  const percentual = alunosIniciais.length > 0 ? Math.round((presentes / alunosIniciais.length) * 100) : 0

  return (
    <div className="space-y-4">
      {/* Barra de resumo */}
      <div className="flex flex-wrap gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-sm">
        <span className="text-green-600 dark:text-green-400 font-medium">{presentes} P</span>
        <span className="text-red-600 dark:text-red-400 font-medium">{faltas} F</span>
        <span className="text-amber-600 dark:text-amber-400 font-medium">{justificadas} FJ</span>
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
          const isFalta = status === 'ausente'
          const isJustificada = status === 'justificado'

          return (
            <div key={aluno.aluno_id}>
              <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg border transition-colors ${
                isPresente ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
                isFalta ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
                isJustificada ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' :
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
                <div
                  role="radiogroup"
                  aria-label={`Status de ${aluno.aluno_nome}`}
                  className="flex items-center gap-1 self-end sm:self-auto"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={isPresente}
                    onClick={() => setStatus(aluno.aluno_id, 'presente')}
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
                    aria-checked={isFalta}
                    onClick={() => setStatus(aluno.aluno_id, 'ausente')}
                    title="Falta"
                    className={`min-w-[44px] px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
                      isFalta
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30'
                    }`}
                  >
                    F
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={isJustificada}
                    onClick={() => setStatus(aluno.aluno_id, 'justificado')}
                    title="Falta Justificada"
                    className={`min-w-[44px] px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
                      isJustificada
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'bg-white dark:bg-gray-700 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-900/30'
                    }`}
                  >
                    FJ
                  </button>
                </div>
              </div>

              {/* Textarea de justificativa: aparece SOMENTE quando FJ esta marcado para este aluno.
                  Cada aluno tem seu proprio state em justificativas[aluno_id] — nao replica entre linhas. */}
              {isJustificada && (
                <div className="mt-1 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <label
                    htmlFor={`justificativa-${aluno.aluno_id}`}
                    className="block text-xs font-medium text-amber-800 dark:text-amber-200 mb-1"
                  >
                    Motivo da justificativa de {aluno.aluno_nome}
                  </label>
                  <textarea
                    id={`justificativa-${aluno.aluno_id}`}
                    value={justificativas[aluno.aluno_id] || ''}
                    onChange={e => setJustificativaAluno(aluno.aluno_id, e.target.value)}
                    placeholder="Ex: atestado medico, motivo familiar..."
                    rows={2}
                    maxLength={500}
                    className="w-full p-2 text-sm rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1">
                    Salvo junto com a frequência ao clicar em &quot;Salvar Frequência&quot;.
                  </p>
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

      {/* Modal de confirmacao para alunos sem registro */}
      {confirmacaoPendentes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-5 shadow-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {semRegistro} aluno(s) sem registro
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  O que fazer com os alunos que voce nao marcou ainda?
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <button
                onClick={salvarComPendentesAusentes}
                disabled={salvando}
                className="w-full py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                Marcar restantes como AUSENTES e salvar
              </button>
              <button
                onClick={salvarSomenteMarcados}
                disabled={salvando}
                className="w-full py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                Salvar somente os {Object.keys(registros).length} marcado(s)
              </button>
              <button
                onClick={() => setConfirmacaoPendentes(false)}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
              >
                Cancelar e voltar para marcar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
