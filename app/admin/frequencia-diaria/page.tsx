'use client'

import { useState, useEffect, useCallback } from 'react'
import ProtectedRoute from '@/components/protected-route'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import {
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Users,
  BarChart3,
  Calendar,
  Trash2,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { useSeries } from '@/lib/use-series'
import { useUserType } from '@/lib/hooks/useUserType'
import { useEscolas } from '@/lib/hooks/useEscolas'
import { useTurmas } from '@/lib/hooks/useTurmas'

interface Resumo {
  total_alunos: number
  total_presentes: number
  total_ausentes: number
  taxa_presenca: number
}

interface RegistroFrequencia {
  id: string
  aluno_nome: string
  aluno_codigo: string
  turma_codigo: string
  hora_entrada: string | null
  hora_saida: string | null
  metodo: 'facial' | 'manual' | 'qrcode'
  confianca: number | null
  dispositivo: string | null
  status: 'presente' | 'ausente'
  justificativa: string | null
}

interface Paginacao {
  pagina: number
  limite: number
  total: number
  totalPaginas: number
}

export default function FrequenciaDiariaPage() {
  const toast = useToast()
  const { formatSerie } = useSeries()

  // Filtros
  const [escolaId, setEscolaId] = useState('')
  const [turmaId, setTurmaId] = useState('')

  // Auth via hook
  const { tipoUsuario, usuario, isEscola } = useUserType({
    onUsuarioCarregado: (u) => {
      if (u.escola_id) setEscolaId(u.escola_id)
    }
  })

  // Dados via hooks
  const { escolas } = useEscolas({ desabilitado: isEscola })
  const { turmas } = useTurmas(escolaId)

  // Reset turmaId quando escola muda
  useEffect(() => { setTurmaId('') }, [escolaId])

  // Data
  const [registros, setRegistros] = useState<RegistroFrequencia[]>([])
  const [resumo, setResumo] = useState<Resumo>({
    total_alunos: 0,
    total_presentes: 0,
    total_ausentes: 0,
    taxa_presenca: 0,
  })

  const [data, setData] = useState(() => {
    const hoje = new Date()
    return hoje.toISOString().split('T')[0]
  })
  const [metodo, setMetodo] = useState('')

  // Estado
  const [carregando, setCarregando] = useState(false)
  const [carregandoResumo, setCarregandoResumo] = useState(false)
  const [lancandoFaltas, setLancandoFaltas] = useState(false)
  const [excluindoId, setExcluindoId] = useState<string | null>(null)
  const [justificandoId, setJustificandoId] = useState<string | null>(null)
  const [justificativaTexto, setJustificativaTexto] = useState('')
  const [paginacao, setPaginacao] = useState<Paginacao>({
    pagina: 1,
    limite: 50,
    total: 0,
    totalPaginas: 0
  })

  // Carregar resumo
  const carregarResumo = useCallback(async () => {
    setCarregandoResumo(true)
    try {
      const params = new URLSearchParams()
      params.set('data', data)
      if (escolaId) params.set('escola_id', escolaId)
      if (turmaId) params.set('turma_id', turmaId)

      const res = await fetch(`/api/admin/frequencia-diaria/resumo?${params.toString()}`)
      if (res.ok) {
        const d = await res.json()
        setResumo({
          total_alunos: d.total_alunos ?? 0,
          total_presentes: d.total_presentes ?? 0,
          total_ausentes: d.total_ausentes ?? 0,
          taxa_presenca: d.taxa_presenca ?? 0,
        })
      } else {
        setResumo({ total_alunos: 0, total_presentes: 0, total_ausentes: 0, taxa_presenca: 0 })
      }
    } catch {
      setResumo({ total_alunos: 0, total_presentes: 0, total_ausentes: 0, taxa_presenca: 0 })
    } finally {
      setCarregandoResumo(false)
    }
  }, [data, escolaId, turmaId])

  // Carregar registros
  const carregarRegistros = useCallback(async (pagina = 1) => {
    setCarregando(true)
    try {
      const params = new URLSearchParams()
      params.set('data', data)
      params.set('pagina', pagina.toString())
      params.set('limite', '50')

      if (escolaId) params.set('escola_id', escolaId)
      if (turmaId) params.set('turma_id', turmaId)
      if (metodo) params.set('metodo', metodo)

      const res = await fetch(`/api/admin/frequencia-diaria?${params.toString()}`)
      if (res.ok) {
        const d = await res.json()
        setRegistros(d.frequencias || d.registros || [])
        setPaginacao(d.paginacao || { pagina: 1, limite: 50, total: 0, totalPaginas: 0 })
      } else {
        toast.error('Erro ao carregar registros de frequencia')
      }
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setCarregando(false)
    }
  }, [data, escolaId, turmaId, metodo, toast])

  // Buscar ao clicar
  const handleBuscar = () => {
    carregarResumo()
    carregarRegistros(1)
  }

  // Excluir registro
  const handleExcluir = async (id: string, nomeAluno: string) => {
    if (!confirm(`Tem certeza que deseja excluir o registro de frequência de "${nomeAluno}"?`)) return

    setExcluindoId(id)
    try {
      const res = await fetch('/api/admin/frequencia-diaria', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        toast.success('Registro excluído com sucesso')
        carregarRegistros(paginacao.pagina)
        carregarResumo()
      } else {
        const d = await res.json().catch(() => null)
        toast.error(d?.mensagem || 'Erro ao excluir registro')
      }
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setExcluindoId(null)
    }
  }

  // Abrir justificativa
  const handleAbrirJustificativa = (reg: RegistroFrequencia) => {
    setJustificandoId(reg.id)
    setJustificativaTexto(reg.justificativa || '')
  }

  // Fechar justificativa
  const handleFecharJustificativa = () => {
    setJustificandoId(null)
    setJustificativaTexto('')
  }

  // Salvar justificativa
  const handleSalvarJustificativa = async () => {
    if (!justificandoId) return

    try {
      const res = await fetch('/api/admin/frequencia-diaria', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: justificandoId, justificativa: justificativaTexto }),
      })
      if (res.ok) {
        toast.success('Justificativa salva com sucesso')
        setRegistros(prev => prev.map(r =>
          r.id === justificandoId ? { ...r, justificativa: justificativaTexto || null } : r
        ))
        handleFecharJustificativa()
      } else {
        const d = await res.json().catch(() => null)
        toast.error(d?.mensagem || 'Erro ao salvar justificativa')
      }
    } catch {
      toast.error('Erro ao conectar com o servidor')
    }
  }

  // ESC para fechar modal
  useEffect(() => {
    if (!justificandoId) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleFecharJustificativa()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [justificandoId])

  // Lançar faltas
  const handleLancarFaltas = async () => {
    if (!turmaId) {
      toast.error('Selecione uma turma para lançar faltas')
      return
    }

    const turmaSelecionada = turmas.find(t => t.id === turmaId)
    const nomeTurma = turmaSelecionada ? `${turmaSelecionada.codigo}${turmaSelecionada.nome ? ` - ${turmaSelecionada.nome}` : ''}` : turmaId

    if (!confirm(`Lançar FALTA para todos os alunos da turma "${nomeTurma}" que não registraram presença em ${data}?\n\nEsta ação não pode ser desfeita automaticamente.`)) return

    setLancandoFaltas(true)
    try {
      const res = await fetch('/api/admin/frequencia-diaria/lancar-faltas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turma_id: turmaId, data }),
      })
      const d = await res.json().catch(() => null)
      if (res.ok) {
        toast.success(d?.mensagem || 'Faltas lançadas com sucesso')
        carregarRegistros(1)
        carregarResumo()
      } else {
        toast.error(d?.mensagem || 'Erro ao lançar faltas')
      }
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setLancandoFaltas(false)
    }
  }

  // Badge de metodo
  const getMetodoBadge = (m: string) => {
    const config: Record<string, { label: string; classes: string }> = {
      facial: { label: 'Facial', classes: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
      manual: { label: 'Manual', classes: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
      qrcode: { label: 'QR Code', classes: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' }
    }
    const c = config[m] || { label: m, classes: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.classes}`}>
        {c.label}
      </span>
    )
  }

  // Badge de status
  const getStatusBadge = (status: string) => {
    if (status === 'ausente') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
          <XCircle className="w-3 h-3" /> Ausente
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
        <CheckCircle className="w-3 h-3" /> Presente
      </span>
    )
  }

  // Formatar hora — lida com TIME do PostgreSQL ("HH:MM:SS") e datetime ISO
  const formatarHora = (hora: string | null) => {
    if (!hora) return '-'
    // PostgreSQL TIME retorna "HH:MM:SS" ou "HH:MM:SS.microseconds"
    const timeMatch = hora.match(/^(\d{2}):(\d{2}):(\d{2})/)
    if (timeMatch) {
      return `${timeMatch[1]}:${timeMatch[2]}:${timeMatch[3]}`
    }
    // Tentar parse como datetime ISO
    try {
      const d = new Date(hora)
      if (isNaN(d.getTime())) return hora
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    } catch {
      return hora
    }
  }

  // Formatar confiança (DB armazena 0-1, exibir como 0-100%)
  const formatarConfianca = (confianca: number | string | null | undefined) => {
    if (confianca === null || confianca === undefined) return null
    const valor = Number(confianca)
    if (isNaN(valor)) return null
    // Se valor <= 1, multiplicar por 100 (DB armazena 0-1)
    const percentual = valor <= 1 ? valor * 100 : valor
    return percentual
  }

  // Exportar CSV
  const handleExportarCSV = () => {
    if (registros.length === 0) {
      toast.error('Nenhum registro para exportar')
      return
    }

    const headers = ['Nome do Aluno', 'Codigo', 'Turma', 'Status', 'Hora Entrada', 'Hora Saida', 'Metodo', 'Confianca (%)', 'Dispositivo', 'Justificativa']
    const linhas = registros.map(r => {
      const conf = formatarConfianca(r.confianca)
      return [
        r.aluno_nome,
        r.aluno_codigo || '',
        r.turma_codigo || '',
        r.status === 'ausente' ? 'Ausente' : 'Presente',
        r.hora_entrada ? formatarHora(r.hora_entrada) : '',
        r.hora_saida ? formatarHora(r.hora_saida) : '',
        r.metodo || '',
        conf !== null ? Number(conf).toFixed(1) : '',
        r.dispositivo || '',
        r.justificativa || ''
      ]
    })

    const csvContent = [headers, ...linhas]
      .map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `frequencia-diaria-${data}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exportado com sucesso')
  }

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola']}>
      <div className="space-y-6">
        {/* Header com gradiente */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-xl p-6 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Frequencia Diaria</h1>
              <p className="mt-1 text-sm text-indigo-200">
                Acompanhamento em tempo real da presenca dos alunos
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleLancarFaltas}
                disabled={!turmaId || lancandoFaltas}
                title={!turmaId ? 'Selecione uma turma primeiro' : 'Lançar falta para alunos sem presença'}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/80 text-white rounded-lg hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {lancandoFaltas ? <LoadingSpinner /> : <AlertTriangle className="w-4 h-4" />}
                Lancar Faltas
              </button>
              <button
                onClick={handleExportarCSV}
                disabled={registros.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Exportar CSV
              </button>
              <button
                onClick={handleBuscar}
                disabled={carregando}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-indigo-700 rounded-lg hover:bg-indigo-50 transition-colors text-sm font-semibold"
              >
                <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>
          </div>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total de Alunos</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {carregandoResumo ? '-' : resumo.total_alunos}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Presentes</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {carregandoResumo ? '-' : resumo.total_presentes}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Ausentes</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {carregandoResumo ? '-' : resumo.total_ausentes}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <BarChart3 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Taxa de Presenca</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {carregandoResumo ? '-' : `${Number(resumo.taxa_presenca).toFixed(1)}%`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Data */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Data</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="date"
                  value={data}
                  onChange={e => setData(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Escola */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Escola</label>
              {tipoUsuario === 'escola' ? (
                <input
                  type="text"
                  value="Minha Escola"
                  disabled
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                />
              ) : (
                <select
                  value={escolaId}
                  onChange={e => setEscolaId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Todas</option>
                  {escolas.map(e => (
                    <option key={e.id} value={e.id}>{e.nome}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Turma */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Turma</label>
              <select
                value={turmaId}
                onChange={e => setTurmaId(e.target.value)}
                disabled={!escolaId}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Todas</option>
                {turmas.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.codigo}{t.nome ? ` - ${t.nome}` : ''} ({formatSerie(t.serie)})
                  </option>
                ))}
              </select>
            </div>

            {/* Metodo */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Metodo</label>
              <select
                value={metodo}
                onChange={e => setMetodo(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                <option value="facial">Facial</option>
                <option value="manual">Manual</option>
                <option value="qrcode">QR Code</option>
              </select>
            </div>

            {/* Botao buscar */}
            <div className="flex items-end">
              <button
                onClick={handleBuscar}
                disabled={carregando}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {carregando ? <LoadingSpinner /> : <Search className="w-4 h-4" />}
                Buscar
              </button>
            </div>
          </div>
        </div>

        {/* Modal de justificativa */}
        {justificandoId && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={handleFecharJustificativa}
          >
            <div
              className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 p-6 w-full max-w-md mx-4"
              onClick={e => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Justificativa de Falta</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Informe o motivo da ausencia do aluno
              </p>
              <textarea
                value={justificativaTexto}
                onChange={e => setJustificativaTexto(e.target.value)}
                placeholder="Ex: Atestado medico, motivo familiar..."
                rows={3}
                autoFocus
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={handleFecharJustificativa}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSalvarJustificativa}
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabela de resultados */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Registros de Frequencia
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {paginacao.total} registro(s)
            </span>
          </div>

          {carregando ? (
            <div className="flex items-center justify-center py-16">
              <LoadingSpinner />
            </div>
          ) : registros.length === 0 ? (
            <div className="text-center py-16 text-gray-500 dark:text-gray-400">
              <Users className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-sm">Nenhum registro encontrado</p>
              <p className="text-xs mt-1">Selecione os filtros e clique em Buscar</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Nome do Aluno
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Codigo
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Turma
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Hora Entrada
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Hora Saida
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Metodo
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Confianca
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Justificativa
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Acoes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700/40">
                    {registros.map((reg, idx) => {
                      const conf = formatarConfianca(reg.confianca)
                      return (
                        <tr
                          key={reg.id}
                          className={`hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors ${
                            reg.status === 'ausente'
                              ? 'bg-red-50/50 dark:bg-red-900/10'
                              : idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-gray-50/50 dark:bg-slate-800/60'
                          }`}
                        >
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                            {reg.aluno_nome}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 font-mono">
                            {reg.aluno_codigo || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {reg.turma_codigo || '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {getStatusBadge(reg.status || 'presente')}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">
                            {formatarHora(reg.hora_entrada)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">
                            {formatarHora(reg.hora_saida)}
                          </td>
                          <td className="px-4 py-3">
                            {getMetodoBadge(reg.metodo)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {conf !== null ? (
                              <span className={`text-sm font-semibold ${
                                conf >= 90 ? 'text-green-600 dark:text-green-400' :
                                conf >= 70 ? 'text-yellow-600 dark:text-yellow-400' :
                                'text-red-600 dark:text-red-400'
                              }`}>
                                {Number(conf).toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-[200px]">
                            {reg.status === 'ausente' ? (
                              reg.justificativa ? (
                                <span
                                  className="cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 truncate block"
                                  title={reg.justificativa}
                                  onClick={() => handleAbrirJustificativa(reg)}
                                >
                                  {reg.justificativa}
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleAbrirJustificativa(reg)}
                                  className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  Justificar
                                </button>
                              )
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleExcluir(reg.id, reg.aluno_nome)}
                              disabled={excluindoId === reg.id}
                              title="Excluir registro"
                              className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-40"
                            >
                              {excluindoId === reg.id ? (
                                <LoadingSpinner />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Paginacao */}
              {paginacao.totalPaginas > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-slate-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Pagina {paginacao.pagina} de {paginacao.totalPaginas}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => carregarRegistros(paginacao.pagina - 1)}
                      disabled={paginacao.pagina <= 1}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    {/* Numeros de paginas */}
                    {Array.from({ length: Math.min(5, paginacao.totalPaginas) }, (_, i) => {
                      let pg: number
                      if (paginacao.totalPaginas <= 5) {
                        pg = i + 1
                      } else if (paginacao.pagina <= 3) {
                        pg = i + 1
                      } else if (paginacao.pagina >= paginacao.totalPaginas - 2) {
                        pg = paginacao.totalPaginas - 4 + i
                      } else {
                        pg = paginacao.pagina - 2 + i
                      }
                      return (
                        <button
                          key={pg}
                          onClick={() => carregarRegistros(pg)}
                          className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                            pg === paginacao.pagina
                              ? 'bg-indigo-600 text-white'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          {pg}
                        </button>
                      )
                    })}
                    <button
                      onClick={() => carregarRegistros(paginacao.pagina + 1)}
                      disabled={paginacao.pagina >= paginacao.totalPaginas}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
