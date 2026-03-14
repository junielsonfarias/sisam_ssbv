'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState } from 'react'
import {
  Calendar, Plus, Edit3, Play, Square, CheckCircle, Clock,
  X, Save, Users, GraduationCap, BookOpen, AlertTriangle, RefreshCw
} from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner, ButtonSpinner } from '@/components/ui/loading-spinner'

interface AnoLetivo {
  id: string; ano: string; status: 'planejamento' | 'ativo' | 'finalizado'
  data_inicio: string | null; data_fim: string | null
  dias_letivos_total: number; observacao: string | null
  total_turmas: number; total_alunos: number; total_periodos: number
}

interface Bimestre {
  id?: string; nome: string; numero: number; ano_letivo: string
  data_inicio: string; data_fim: string; dias_letivos: number
}

const statusConfig: Record<string, { cor: string; icon: any; label: string }> = {
  planejamento: { cor: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock, label: 'Planejamento' },
  ativo: { cor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: Play, label: 'Ativo' },
  finalizado: { cor: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', icon: Square, label: 'Finalizado' },
}

export default function AnosLetivosPage() {
  const toast = useToast()
  const [anos, setAnos] = useState<AnoLetivo[]>([])
  const [carregando, setCarregando] = useState(true)

  // Modal criar/editar
  const [mostrarModal, setMostrarModal] = useState(false)
  const [editando, setEditando] = useState<AnoLetivo | null>(null)
  const [formAno, setFormAno] = useState('')
  const [formDataInicio, setFormDataInicio] = useState('')
  const [formDataFim, setFormDataFim] = useState('')
  const [formDias, setFormDias] = useState(200)
  const [formObs, setFormObs] = useState('')
  const [bimestres, setBimestres] = useState<Bimestre[]>([
    { nome: '1º Bimestre', numero: 1, ano_letivo: '', data_inicio: '', data_fim: '', dias_letivos: 50 },
    { nome: '2º Bimestre', numero: 2, ano_letivo: '', data_inicio: '', data_fim: '', dias_letivos: 50 },
    { nome: '3º Bimestre', numero: 3, ano_letivo: '', data_inicio: '', data_fim: '', dias_letivos: 50 },
    { nome: '4º Bimestre', numero: 4, ano_letivo: '', data_inicio: '', data_fim: '', dias_letivos: 50 },
  ])
  const [salvando, setSalvando] = useState(false)

  // Confirmações
  const [confirmando, setConfirmando] = useState<{ id: string; acao: string } | null>(null)

  useEffect(() => { carregarAnos() }, [])

  const carregarAnos = async () => {
    setCarregando(true)
    try {
      const res = await fetch('/api/admin/anos-letivos')
      if (res.ok) setAnos(await res.json())
    } catch { toast.error('Erro ao carregar') }
    finally { setCarregando(false) }
  }

  const abrirCriar = () => {
    const proximo = (Math.max(...anos.map(a => parseInt(a.ano)), new Date().getFullYear()) + 1).toString()
    setEditando(null)
    setFormAno(anos.length === 0 ? new Date().getFullYear().toString() : proximo)
    setFormDataInicio('')
    setFormDataFim('')
    setFormDias(200)
    setFormObs('')
    setBimestres([
      { nome: '1º Bimestre', numero: 1, ano_letivo: '', data_inicio: '', data_fim: '', dias_letivos: 50 },
      { nome: '2º Bimestre', numero: 2, ano_letivo: '', data_inicio: '', data_fim: '', dias_letivos: 50 },
      { nome: '3º Bimestre', numero: 3, ano_letivo: '', data_inicio: '', data_fim: '', dias_letivos: 50 },
      { nome: '4º Bimestre', numero: 4, ano_letivo: '', data_inicio: '', data_fim: '', dias_letivos: 50 },
    ])
    setMostrarModal(true)
  }

  const abrirEditar = async (ano: AnoLetivo) => {
    setEditando(ano)
    setFormAno(ano.ano)
    setFormDataInicio(ano.data_inicio?.split('T')[0] || '')
    setFormDataFim(ano.data_fim?.split('T')[0] || '')
    setFormDias(ano.dias_letivos_total)
    setFormObs(ano.observacao || '')

    // Carregar bimestres
    try {
      const res = await fetch('/api/admin/anos-letivos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ano: ano.ano })
      })
      if (res.ok) {
        const bims = await res.json()
        if (bims.length > 0) {
          setBimestres(bims.map((b: any) => ({
            ...b,
            data_inicio: b.data_inicio?.split('T')[0] || '',
            data_fim: b.data_fim?.split('T')[0] || '',
            dias_letivos: b.dias_letivos || 50,
          })))
        }
      }
    } catch { /* usa padrão */ }

    setMostrarModal(true)
  }

  const salvar = async () => {
    if (!formAno.match(/^\d{4}$/)) { toast.error('Ano deve ter 4 dígitos'); return }
    setSalvando(true)
    try {
      const body = {
        ...(editando ? { id: editando.id, ano: editando.ano } : { ano: formAno }),
        data_inicio: formDataInicio || null,
        data_fim: formDataFim || null,
        dias_letivos_total: formDias,
        observacao: formObs || null,
        bimestres: bimestres.map(b => ({
          numero: b.numero,
          nome: b.nome,
          data_inicio: b.data_inicio || null,
          data_fim: b.data_fim || null,
          dias_letivos: b.dias_letivos,
        })),
      }
      const res = await fetch('/api/admin/anos-letivos', {
        method: editando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.mensagem || 'Salvo!')
        setMostrarModal(false)
        carregarAnos()
      } else {
        toast.error(data.mensagem || 'Erro ao salvar')
      }
    } catch { toast.error('Erro de conexão') }
    finally { setSalvando(false) }
  }

  const alterarStatus = async (ano: AnoLetivo, novoStatus: string) => {
    try {
      const res = await fetch('/api/admin/anos-letivos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ano.id, ano: ano.ano, status: novoStatus }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(novoStatus === 'ativo' ? `Ano ${ano.ano} está ativo!` : `Ano ${ano.ano} finalizado`)
        setConfirmando(null)
        carregarAnos()
      } else {
        toast.error(data.mensagem || 'Erro')
      }
    } catch { toast.error('Erro de conexão') }
  }

  const updateBimestre = (idx: number, campo: string, valor: any) => {
    setBimestres(prev => prev.map((b, i) => i === idx ? { ...b, [campo]: valor } : b))
  }

  const anoAtivo = anos.find(a => a.status === 'ativo')

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-xl shadow-lg p-6 text-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-lg p-2"><Calendar className="w-6 h-6" /></div>
              <div>
                <h1 className="text-xl font-bold">Gestão de Anos Letivos</h1>
                <p className="text-sm text-gray-300">
                  {anoAtivo ? `Ano ativo: ${anoAtivo.ano}` : 'Nenhum ano letivo ativo'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={carregarAnos} className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition">
                <RefreshCw className="w-4 h-4" />
              </button>
              <button onClick={abrirCriar}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition">
                <Plus className="w-4 h-4" /> Novo Ano Letivo
              </button>
            </div>
          </div>
        </div>

        {carregando ? (
          <LoadingSpinner text="Carregando anos letivos..." centered />
        ) : anos.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhum ano letivo cadastrado</p>
            <button onClick={abrirCriar} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
              Criar Primeiro Ano Letivo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {anos.map(ano => {
              const cfg = statusConfig[ano.status]
              const StatusIcon = cfg.icon
              return (
                <div key={ano.id} className={`bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden border-l-4 ${
                  ano.status === 'ativo' ? 'border-l-emerald-500' : ano.status === 'planejamento' ? 'border-l-yellow-500' : 'border-l-gray-300'
                }`}>
                  <div className="p-5">
                    {/* Cabeçalho */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{ano.ano}</h2>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.cor}`}>
                          <StatusIcon className="w-3 h-3" /> {cfg.label}
                        </span>
                      </div>
                      <button onClick={() => abrirEditar(ano)} className="text-indigo-600 hover:text-indigo-700 p-1" title="Editar">
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Datas */}
                    {(ano.data_inicio || ano.data_fim) && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        {ano.data_inicio ? new Date(ano.data_inicio).toLocaleDateString('pt-BR') : '?'}
                        {' — '}
                        {ano.data_fim ? new Date(ano.data_fim).toLocaleDateString('pt-BR') : '?'}
                      </p>
                    )}

                    {/* Métricas */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="bg-gray-50 dark:bg-slate-700/40 rounded-lg px-3 py-2 text-center">
                        <Users className="w-4 h-4 text-blue-500 mx-auto mb-0.5" />
                        <p className="text-lg font-bold text-gray-800 dark:text-gray-200">{ano.total_alunos}</p>
                        <p className="text-[10px] text-gray-500">Alunos</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-700/40 rounded-lg px-3 py-2 text-center">
                        <GraduationCap className="w-4 h-4 text-indigo-500 mx-auto mb-0.5" />
                        <p className="text-lg font-bold text-gray-800 dark:text-gray-200">{ano.total_turmas}</p>
                        <p className="text-[10px] text-gray-500">Turmas</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-700/40 rounded-lg px-3 py-2 text-center">
                        <BookOpen className="w-4 h-4 text-emerald-500 mx-auto mb-0.5" />
                        <p className="text-lg font-bold text-gray-800 dark:text-gray-200">{ano.total_periodos}</p>
                        <p className="text-[10px] text-gray-500">Períodos</p>
                      </div>
                    </div>

                    {ano.dias_letivos_total && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        {ano.dias_letivos_total} dias letivos previstos
                      </p>
                    )}

                    {/* Ações de status */}
                    <div className="flex gap-2">
                      {ano.status === 'planejamento' && (
                        confirmando?.id === ano.id && confirmando?.acao === 'ativar' ? (
                          <div className="flex items-center gap-2 w-full">
                            <span className="text-xs text-gray-600 dark:text-gray-400">Iniciar ano letivo?</span>
                            <button onClick={() => alterarStatus(ano, 'ativo')}
                              className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700">
                              Sim, iniciar
                            </button>
                            <button onClick={() => setConfirmando(null)}
                              className="px-3 py-1.5 text-gray-500 text-xs hover:text-gray-700">
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmando({ id: ano.id, acao: 'ativar' })}
                            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition w-full justify-center">
                            <Play className="w-3.5 h-3.5" /> Iniciar Ano Letivo
                          </button>
                        )
                      )}
                      {ano.status === 'ativo' && (
                        confirmando?.id === ano.id && confirmando?.acao === 'finalizar' ? (
                          <div className="flex items-center gap-2 w-full">
                            <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                            <span className="text-xs text-gray-600 dark:text-gray-400">Finalizar?</span>
                            <button onClick={() => alterarStatus(ano, 'finalizado')}
                              className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700">
                              Confirmar
                            </button>
                            <button onClick={() => setConfirmando(null)}
                              className="px-3 py-1.5 text-gray-500 text-xs">
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmando({ id: ano.id, acao: 'finalizar' })}
                            className="flex items-center gap-1.5 px-4 py-2 bg-gray-600 text-white rounded-lg text-xs font-medium hover:bg-gray-700 transition w-full justify-center">
                            <Square className="w-3.5 h-3.5" /> Finalizar Ano Letivo
                          </button>
                        )
                      )}
                      {ano.status === 'finalizado' && (
                        <div className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-500 rounded-lg text-xs w-full justify-center">
                          <CheckCircle className="w-3.5 h-3.5" /> Ano Finalizado
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Modal criar/editar */}
        {mostrarModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setMostrarModal(false)}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-4 rounded-t-2xl flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <Calendar className="w-6 h-6 text-white" />
                  <h2 className="text-lg font-bold text-white">{editando ? `Editar ${editando.ano}` : 'Novo Ano Letivo'}</h2>
                </div>
                <button onClick={() => setMostrarModal(false)} className="text-white/80 hover:text-white"><X className="w-5 h-5" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Dados gerais */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Ano *</label>
                    <input type="text" value={formAno} onChange={e => setFormAno(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      disabled={!!editando} maxLength={4} placeholder="2026"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm dark:bg-slate-700 dark:text-white disabled:opacity-50" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Início</label>
                    <input type="date" value={formDataInicio} onChange={e => setFormDataInicio(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm dark:bg-slate-700 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Fim</label>
                    <input type="date" value={formDataFim} onChange={e => setFormDataFim(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm dark:bg-slate-700 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Dias Letivos</label>
                    <input type="number" value={formDias} onChange={e => setFormDias(parseInt(e.target.value) || 200)}
                      min={100} max={250}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm dark:bg-slate-700 dark:text-white" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Observação</label>
                  <input type="text" value={formObs} onChange={e => setFormObs(e.target.value)} placeholder="Informações adicionais..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm dark:bg-slate-700 dark:text-white" />
                </div>

                {/* Bimestres */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" /> Bimestres
                  </h3>
                  <div className="space-y-3">
                    {bimestres.map((bim, idx) => (
                      <div key={idx} className="bg-gray-50 dark:bg-slate-700/40 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                            {bim.numero}
                          </span>
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{bim.nome}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[10px] text-gray-500 mb-0.5">Início</label>
                            <input type="date" value={bim.data_inicio || ''} onChange={e => updateBimestre(idx, 'data_inicio', e.target.value)}
                              className="w-full px-2 py-1.5 border border-gray-300 dark:border-slate-600 rounded text-xs dark:bg-slate-700 dark:text-white" />
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-500 mb-0.5">Fim</label>
                            <input type="date" value={bim.data_fim || ''} onChange={e => updateBimestre(idx, 'data_fim', e.target.value)}
                              className="w-full px-2 py-1.5 border border-gray-300 dark:border-slate-600 rounded text-xs dark:bg-slate-700 dark:text-white" />
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-500 mb-0.5">Dias Letivos</label>
                            <input type="number" value={bim.dias_letivos} onChange={e => updateBimestre(idx, 'dias_letivos', parseInt(e.target.value) || 0)}
                              min={0} max={80}
                              className="w-full px-2 py-1.5 border border-gray-300 dark:border-slate-600 rounded text-xs dark:bg-slate-700 dark:text-white" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t dark:border-slate-700 px-6 py-4 flex justify-end gap-3 flex-shrink-0">
                <button onClick={() => setMostrarModal(false)}
                  className="px-4 py-2.5 text-sm text-gray-600 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">
                  Cancelar
                </button>
                <button onClick={salvar} disabled={salvando}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {salvando ? <><ButtonSpinner /> Salvando...</> : <><Save className="w-4 h-4" /> {editando ? 'Atualizar' : 'Criar'}</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
