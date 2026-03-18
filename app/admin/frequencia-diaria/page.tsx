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
  UserX,
  BarChart3,
  Wifi,
  ScanFace,
  Hand,
  QrCode,
  Calendar
} from 'lucide-react'

interface EscolaSimples {
  id: string
  nome: string
}

interface TurmaSimples {
  id: string
  codigo: string
  nome: string | null
  serie: string
}

interface Resumo {
  total_presentes: number
  total_ausentes: number
  taxa_presenca: number
  dispositivos_online: number
  por_metodo: {
    facial: number
    manual: number
    qrcode: number
  }
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
}

interface Paginacao {
  pagina: number
  limite: number
  total: number
  totalPaginas: number
}

export default function FrequenciaDiariaPage() {
  const toast = useToast()

  // Auth
  const [tipoUsuario, setTipoUsuario] = useState('')
  const [escolaIdUsuario, setEscolaIdUsuario] = useState('')

  // Data
  const [escolas, setEscolas] = useState<EscolaSimples[]>([])
  const [turmas, setTurmas] = useState<TurmaSimples[]>([])
  const [registros, setRegistros] = useState<RegistroFrequencia[]>([])
  const [resumo, setResumo] = useState<Resumo>({
    total_presentes: 0,
    total_ausentes: 0,
    taxa_presenca: 0,
    dispositivos_online: 0,
    por_metodo: { facial: 0, manual: 0, qrcode: 0 }
  })

  // Filtros
  const [data, setData] = useState(() => {
    const hoje = new Date()
    return hoje.toISOString().split('T')[0]
  })
  const [escolaId, setEscolaId] = useState('')
  const [turmaId, setTurmaId] = useState('')
  const [metodo, setMetodo] = useState('')

  // Estado
  const [carregando, setCarregando] = useState(false)
  const [carregandoResumo, setCarregandoResumo] = useState(false)
  const [paginacao, setPaginacao] = useState<Paginacao>({
    pagina: 1,
    limite: 50,
    total: 0,
    totalPaginas: 0
  })

  // Init - verificar auth
  useEffect(() => {
    const init = async () => {
      try {
        const authRes = await fetch('/api/auth/verificar')
        if (authRes.ok) {
          const authData = await authRes.json()
          if (authData.usuario) {
            const tipo = authData.usuario.tipo_usuario === 'administrador' ? 'admin' : authData.usuario.tipo_usuario
            setTipoUsuario(tipo)
            if (authData.usuario.escola_id) {
              setEscolaIdUsuario(authData.usuario.escola_id)
              setEscolaId(authData.usuario.escola_id)
            }
          }
        }
      } catch {
        // silencioso
      }
    }
    init()
  }, [])

  // Carregar escolas
  useEffect(() => {
    if (tipoUsuario && tipoUsuario !== 'escola') {
      fetch('/api/admin/escolas')
        .then(r => r.json())
        .then(d => setEscolas(Array.isArray(d) ? d : []))
        .catch(() => setEscolas([]))
    }
  }, [tipoUsuario])

  // Carregar turmas quando escola muda
  useEffect(() => {
    if (escolaId) {
      fetch(`/api/admin/turmas?escolas_ids=${escolaId}`)
        .then(r => r.json())
        .then(d => setTurmas(Array.isArray(d) ? d : []))
        .catch(() => setTurmas([]))
    } else {
      setTurmas([])
    }
    setTurmaId('')
  }, [escolaId])

  // Carregar resumo
  const carregarResumo = useCallback(async () => {
    if (!escolaId) return
    setCarregandoResumo(true)
    try {
      const params = new URLSearchParams()
      params.set('data', data)
      params.set('escola_id', escolaId)

      const res = await fetch(`/api/admin/frequencia-diaria/resumo?${params.toString()}`)
      if (res.ok) {
        const d = await res.json()
        setResumo({
          total_presentes: d.total_presentes ?? 0,
          total_ausentes: d.total_ausentes ?? 0,
          taxa_presenca: d.taxa_presenca ?? 0,
          dispositivos_online: d.dispositivos_online ?? 0,
          por_metodo: {
            facial: d.por_metodo?.facial ?? 0,
            manual: d.por_metodo?.manual ?? 0,
            qrcode: d.por_metodo?.qrcode ?? 0
          }
        })
      }
    } catch {
      // silencioso
    } finally {
      setCarregandoResumo(false)
    }
  }, [data, escolaId])

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
        setRegistros(d.registros || [])
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

  // Formatar hora
  const formatarHora = (hora: string | null) => {
    if (!hora) return '-'
    try {
      const d = new Date(hora)
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    } catch {
      return hora
    }
  }

  // Exportar CSV
  const handleExportarCSV = () => {
    if (registros.length === 0) {
      toast.error('Nenhum registro para exportar')
      return
    }

    const headers = ['Nome do Aluno', 'Codigo', 'Turma', 'Hora Entrada', 'Hora Saida', 'Metodo', 'Confianca (%)', 'Dispositivo']
    const linhas = registros.map(r => [
      r.aluno_nome,
      r.aluno_codigo || '',
      r.turma_codigo || '',
      r.hora_entrada ? formatarHora(r.hora_entrada) : '',
      r.hora_saida ? formatarHora(r.hora_saida) : '',
      r.metodo || '',
      r.confianca !== null ? r.confianca.toString() : '',
      r.dispositivo || ''
    ])

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Presentes Hoje</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {carregandoResumo ? '-' : resumo.total_presentes}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <UserX className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Ausentes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {carregandoResumo ? '-' : resumo.total_ausentes}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Taxa de Presenca</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {carregandoResumo ? '-' : `${resumo.taxa_presenca.toFixed(1)}%`}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
                <Wifi className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Dispositivos Online</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {carregandoResumo ? '-' : resumo.dispositivos_online}
                </p>
              </div>
            </div>
          </div>

          {/* Card de metodos */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Por Metodo</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300">
                  <ScanFace className="w-3.5 h-3.5" /> Facial
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {carregandoResumo ? '-' : resumo.por_metodo.facial}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                  <Hand className="w-3.5 h-3.5" /> Manual
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {carregandoResumo ? '-' : resumo.por_metodo.manual}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-green-700 dark:text-green-300">
                  <QrCode className="w-3.5 h-3.5" /> QR Code
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {carregandoResumo ? '-' : resumo.por_metodo.qrcode}
                </span>
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
                    {t.codigo}{t.nome ? ` - ${t.nome}` : ''} ({t.serie})
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
                        Dispositivo
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700/40">
                    {registros.map((reg, idx) => (
                      <tr
                        key={reg.id}
                        className={`hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors ${
                          idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-gray-50/50 dark:bg-slate-800/60'
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
                          {reg.confianca !== null ? (
                            <span className={`text-sm font-semibold ${
                              reg.confianca >= 90 ? 'text-green-600 dark:text-green-400' :
                              reg.confianca >= 70 ? 'text-yellow-600 dark:text-yellow-400' :
                              'text-red-600 dark:text-red-400'
                            }`}>
                              {reg.confianca.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {reg.dispositivo || '-'}
                        </td>
                      </tr>
                    ))}
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
