'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState, useCallback } from 'react'
import { Save, Search, Calendar, Clock, ArrowLeft } from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface Escola { id: string; nome: string }
interface Turma { id: string; codigo: string; nome: string | null; serie: string }
interface Disciplina { id: string; nome: string; codigo: string }
interface HorarioSlot { dia_semana: number; numero_aula: number; disciplina_id: string }

const DIAS = [
  { valor: 1, nome: 'Segunda', abrev: 'Seg' },
  { valor: 2, nome: 'Terça', abrev: 'Ter' },
  { valor: 3, nome: 'Quarta', abrev: 'Qua' },
  { valor: 4, nome: 'Quinta', abrev: 'Qui' },
  { valor: 5, nome: 'Sexta', abrev: 'Sex' },
]
const AULAS = [1, 2, 3, 4, 5, 6]

export default function HorariosAulaPage() {
  const toast = useToast()
  const [tipoUsuario, setTipoUsuario] = useState('')
  const [escolaIdUsuario, setEscolaIdUsuario] = useState('')

  const [escolas, setEscolas] = useState<Escola[]>([])
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [escolaId, setEscolaId] = useState('')
  const [turmaId, setTurmaId] = useState('')
  const [grade, setGrade] = useState<Record<string, string>>({})
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [turmaCarregada, setTurmaCarregada] = useState(false)

  // Init
  useEffect(() => {
    const init = async () => {
      try {
        const authRes = await fetch('/api/auth/verificar')
        if (authRes.ok) {
          const data = await authRes.json()
          if (data.usuario) {
            const tipo = data.usuario.tipo_usuario === 'administrador' ? 'admin' : data.usuario.tipo_usuario
            setTipoUsuario(tipo)
            if (data.usuario.escola_id) {
              setEscolaIdUsuario(data.usuario.escola_id)
              setEscolaId(data.usuario.escola_id)
            }
          }
        }
      } catch {}
    }
    init()
  }, [])

  // Carregar escolas
  useEffect(() => {
    if (tipoUsuario && tipoUsuario !== 'escola') {
      fetch('/api/admin/escolas')
        .then(r => r.json())
        .then(data => setEscolas(Array.isArray(data) ? data : []))
        .catch(() => setEscolas([]))
    }
  }, [tipoUsuario])

  // Carregar turmas (somente 6º-9º)
  useEffect(() => {
    if (escolaId) {
      const ano = new Date().getFullYear()
      fetch(`/api/admin/turmas?escolas_ids=${escolaId}&ano_letivo=${ano}`)
        .then(r => r.json())
        .then(data => {
          const todas = Array.isArray(data) ? data : []
          const finais = todas.filter((t: any) => {
            const num = t.serie?.match(/(\d+)/)?.[1]
            return ['6', '7', '8', '9'].includes(num || '')
          })
          setTurmas(finais)
        })
        .catch(() => setTurmas([]))
    } else {
      setTurmas([])
    }
    setTurmaId('')
    setTurmaCarregada(false)
  }, [escolaId])

  // Carregar disciplinas
  useEffect(() => {
    fetch('/api/admin/disciplinas-escolares')
      .then(r => r.json())
      .then(data => setDisciplinas(Array.isArray(data) ? data : data.disciplinas || []))
      .catch(() => setDisciplinas([]))
  }, [])

  // Carregar grade horária existente
  const carregarGrade = useCallback(async () => {
    if (!turmaId) return
    setCarregando(true)
    try {
      const res = await fetch(`/api/admin/horarios-aula?turma_id=${turmaId}`)
      if (!res.ok) {
        toast.error('Erro ao carregar grade horária')
        return
      }
      const data = await res.json()
      const novaGrade: Record<string, string> = {}
      for (const h of data.horarios || []) {
        novaGrade[`${h.dia_semana}-${h.numero_aula}`] = h.disciplina_id
      }
      setGrade(novaGrade)
      setTurmaCarregada(true)
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setCarregando(false)
    }
  }, [turmaId, toast])

  useEffect(() => {
    if (turmaId) carregarGrade()
  }, [turmaId, carregarGrade])

  // Salvar
  const handleSalvar = async () => {
    setSalvando(true)
    try {
      const horarios: HorarioSlot[] = []
      for (const [key, disciplinaId] of Object.entries(grade)) {
        if (!disciplinaId) continue
        const [dia, aula] = key.split('-').map(Number)
        horarios.push({ dia_semana: dia, numero_aula: aula, disciplina_id: disciplinaId })
      }

      if (horarios.length === 0) {
        toast.error('Preencha pelo menos uma aula')
        setSalvando(false)
        return
      }

      const res = await fetch('/api/admin/horarios-aula', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turma_id: turmaId, horarios }),
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.mensagem || 'Erro ao salvar')
        return
      }

      toast.success(data.mensagem || 'Grade horária salva!')
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setSalvando(false)
    }
  }

  const setSlot = (dia: number, aula: number, disciplinaId: string) => {
    setGrade(prev => ({ ...prev, [`${dia}-${aula}`]: disciplinaId }))
  }

  const turmaSelecionada = turmas.find(t => t.id === turmaId)
  const totalPreenchidos = Object.values(grade).filter(v => v).length

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola']}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Horários de Aula</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configure a grade horária semanal para turmas do 6º ao 9º Ano
          </p>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {tipoUsuario !== 'escola' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Escola</label>
                <select
                  value={escolaId}
                  onChange={e => setEscolaId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                >
                  <option value="">Selecione</option>
                  {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Turma (6º-9º Ano)</label>
              <select
                value={turmaId}
                onChange={e => setTurmaId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                disabled={!escolaId}
              >
                <option value="">Selecione</option>
                {turmas.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.codigo}{t.nome ? ` - ${t.nome}` : ''} ({t.serie})
                  </option>
                ))}
              </select>
            </div>
          </div>
          {turmas.length === 0 && escolaId && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-3">
              Nenhuma turma do 6º ao 9º Ano encontrada para esta escola.
            </p>
          )}
        </div>

        {/* Grade Horária */}
        {turmaCarregada && turmaId && (
          <>
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800 p-4">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                  {turmaSelecionada?.codigo}{turmaSelecionada?.nome ? ` - ${turmaSelecionada.nome}` : ''} ({turmaSelecionada?.serie})
                </span>
                <span className="w-px h-4 bg-indigo-300 dark:bg-indigo-600" />
                <span className="text-indigo-600 dark:text-indigo-400">
                  {totalPreenchidos}/30 aulas preenchidas
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
              {carregando ? (
                <div className="p-12 flex justify-center"><LoadingSpinner /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase w-20">
                          <Clock className="w-4 h-4 inline mr-1" />Aula
                        </th>
                        {DIAS.map(dia => (
                          <th key={dia.valor} className="text-center px-2 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                            {dia.nome}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {AULAS.map(aula => (
                        <tr key={aula} className="border-b border-gray-100 dark:border-slate-700/40">
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-sm font-bold text-indigo-600 dark:text-indigo-400">
                              {aula}ª
                            </span>
                          </td>
                          {DIAS.map(dia => (
                            <td key={dia.valor} className="px-2 py-3 text-center">
                              <select
                                value={grade[`${dia.valor}-${aula}`] || ''}
                                onChange={e => setSlot(dia.valor, aula, e.target.value)}
                                className={`w-full px-2 py-2 text-xs border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                                  grade[`${dia.valor}-${aula}`]
                                    ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                                    : 'border-gray-300 dark:border-slate-600'
                                }`}
                              >
                                <option value="">—</option>
                                {disciplinas.map(d => (
                                  <option key={d.id} value={d.id}>{d.nome}</option>
                                ))}
                              </select>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50/80 dark:bg-slate-800/80 flex justify-end">
                <button
                  onClick={handleSalvar}
                  disabled={salvando || totalPreenchidos === 0}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {salvando ? <LoadingSpinner /> : <Save className="w-4 h-4" />}
                  {salvando ? 'Salvando...' : 'Salvar Grade'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  )
}
