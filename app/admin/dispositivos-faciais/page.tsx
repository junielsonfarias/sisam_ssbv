'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import ProtectedRoute from '@/components/protected-route'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import {
  Plus,
  Edit,
  RefreshCw,
  Smartphone,
  Wifi,
  WifiOff,
  ShieldAlert,
  Copy,
  Check,
  X,
  Key,
  Ban,
  MapPin,
  AlertTriangle,
  QrCode,
  BarChart3,
  Clock,
  Users,
  Activity,
  Search,
} from 'lucide-react'

// ==================== Types ====================

interface Dispositivo {
  id: string
  nome: string
  escola_id: string
  escola_nome: string
  localizacao: string | null
  status: 'ativo' | 'inativo' | 'bloqueado'
  api_key?: string
  ultimo_ping: string | null
  criado_em: string
}

interface Escola {
  id: string
  nome: string
}

interface Estatisticas {
  total_hoje: number
  scans_por_hora: { hora: number; total: number }[]
  ultimos_7_dias: { data: string; total: number }[]
  taxa_sucesso: number
  total_erros_semana: number
  logs_recentes: { evento: string; detalhes: string; criado_em: string }[]
}

interface QrCodeData {
  qr_data: string
  dispositivo: { id: string; nome: string; escola_nome: string }
  aviso: string
}

interface ResumoFrequencia {
  presenca: { total_presentes: number }
}

// ==================== Helper Functions ====================

function isOnline(ultimoPing: string | null): boolean {
  if (!ultimoPing) return false
  const agora = new Date()
  const ping = new Date(ultimoPing)
  const diffMs = agora.getTime() - ping.getTime()
  return diffMs < 5 * 60 * 1000
}

function tempoRelativo(data: string | null): string {
  if (!data) return 'Nunca'
  const agora = new Date()
  const alvo = new Date(data)
  const diffMs = agora.getTime() - alvo.getTime()

  if (diffMs < 0) return 'agora'

  const segundos = Math.floor(diffMs / 1000)
  const minutos = Math.floor(segundos / 60)
  const horas = Math.floor(minutos / 60)
  const dias = Math.floor(horas / 24)

  if (segundos < 60) return 'agora'
  if (minutos < 60) return `ha ${minutos} min`
  if (horas < 24) return `ha ${horas}h`
  if (dias === 1) return 'ha 1 dia'
  return `ha ${dias} dias`
}

function formatarData(dataISO: string | null): string {
  if (!dataISO) return 'Nunca'
  const data = new Date(dataISO)
  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isOfflineLongo(ultimoPing: string | null): boolean {
  if (!ultimoPing) return true
  const agora = new Date()
  const ping = new Date(ultimoPing)
  const diffMs = agora.getTime() - ping.getTime()
  return diffMs > 60 * 60 * 1000
}

// ==================== Component ====================

export default function DispositivosFaciaisPage() {
  const toast = useToast()
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([])
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [presencasHoje, setPresencasHoje] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Modal states
  const [mostrarModalCadastro, setMostrarModalCadastro] = useState(false)
  const [mostrarModalEditar, setMostrarModalEditar] = useState(false)
  const [mostrarModalChave, setMostrarModalChave] = useState(false)
  const [mostrarModalBloquear, setMostrarModalBloquear] = useState(false)
  const [mostrarModalRegenerarChave, setMostrarModalRegenerarChave] = useState(false)
  const [mostrarModalQrCode, setMostrarModalQrCode] = useState(false)
  const [mostrarModalEstatisticas, setMostrarModalEstatisticas] = useState(false)

  // Form states
  const [formData, setFormData] = useState({
    nome: '',
    escola_id: '',
    localizacao: '',
    status: 'ativo' as 'ativo' | 'inativo' | 'bloqueado',
  })
  const [salvando, setSalvando] = useState(false)
  const [dispositivoSelecionado, setDispositivoSelecionado] = useState<Dispositivo | null>(null)
  const [apiKeyGerada, setApiKeyGerada] = useState('')
  const [copiado, setCopiado] = useState(false)

  // QR Code state
  const [qrCodeData, setQrCodeData] = useState<QrCodeData | null>(null)
  const [carregandoQr, setCarregandoQr] = useState(false)
  const [copiadoQr, setCopiadoQr] = useState(false)

  // Estatisticas state
  const [estatisticas, setEstatisticas] = useState<Estatisticas | null>(null)
  const [carregandoEstatisticas, setCarregandoEstatisticas] = useState(false)

  // ==================== Data Loading ====================

  const carregarDispositivos = useCallback(async (silencioso = false) => {
    if (!silencioso) setCarregando(true)
    try {
      const response = await fetch('/api/admin/dispositivos-faciais')
      const data = await response.json()
      if (response.ok) {
        setDispositivos(Array.isArray(data) ? data : data.dispositivos || [])
      } else {
        if (!silencioso) toast.error('Erro ao carregar dispositivos')
      }
    } catch (error) {
      console.error('Erro ao carregar dispositivos:', error)
      if (!silencioso) toast.error('Erro ao carregar dispositivos')
    } finally {
      if (!silencioso) setCarregando(false)
    }
  }, [])

  const carregarEscolas = async () => {
    try {
      const response = await fetch('/api/admin/escolas')
      const data = await response.json()
      setEscolas(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Erro ao carregar escolas:', error)
    }
  }

  const carregarPresencasHoje = async () => {
    try {
      const response = await fetch('/api/admin/frequencia-diaria/resumo')
      const data: ResumoFrequencia = await response.json()
      if (response.ok) {
        setPresencasHoje(data.presenca?.total_presentes || 0)
      }
    } catch (error) {
      console.error('Erro ao carregar presencas:', error)
    }
  }

  useEffect(() => {
    carregarDispositivos()
    carregarEscolas()
    carregarPresencasHoje()

    // Auto-refresh every 30 seconds (com jitter para evitar thundering herd)
    const jitter = Math.floor(Math.random() * 5000)
    intervalRef.current = setInterval(() => {
      carregarDispositivos(true)
      carregarPresencasHoje()
    }, 30000 + jitter)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [carregarDispositivos])

  // ==================== Dashboard Stats ====================

  const totalDispositivos = dispositivos.length
  const onlineAgora = dispositivos.filter(d => d.status === 'ativo' && isOnline(d.ultimo_ping)).length
  const offlineAgora = dispositivos.filter(d => d.status === 'ativo' && !isOnline(d.ultimo_ping)).length

  // Dispositivos ativos offline ha mais de 1 hora
  const dispositivosOfflineLongo = dispositivos.filter(
    d => d.status === 'ativo' && isOfflineLongo(d.ultimo_ping)
  )

  // Filtered devices
  const dispositivosFiltrados = dispositivos.filter(d => {
    if (!busca.trim()) return true
    const termo = busca.toLowerCase()
    return (
      d.nome.toLowerCase().includes(termo) ||
      (d.escola_nome || '').toLowerCase().includes(termo) ||
      (d.localizacao || '').toLowerCase().includes(termo)
    )
  })

  // ==================== Status Helpers ====================

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      ativo: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
      inativo: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200',
      bloqueado: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
    }
    return badges[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      ativo: 'Ativo',
      inativo: 'Inativo',
      bloqueado: 'Bloqueado',
    }
    return labels[status] || status
  }

  // ==================== Handlers ====================

  const abrirModalCadastro = () => {
    setFormData({ nome: '', escola_id: '', localizacao: '', status: 'ativo' })
    setMostrarModalCadastro(true)
  }

  const handleCadastrar = async () => {
    if (!formData.nome.trim()) {
      toast.error('Informe o nome do dispositivo')
      return
    }
    if (!formData.escola_id) {
      toast.error('Selecione a escola')
      return
    }

    setSalvando(true)
    try {
      const response = await fetch('/api/admin/dispositivos-faciais', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: formData.nome.trim(),
          escola_id: formData.escola_id,
          localizacao: formData.localizacao.trim() || null,
        }),
      })
      const data = await response.json()

      if (response.ok) {
        toast.success('Dispositivo cadastrado com sucesso')
        setMostrarModalCadastro(false)
        if (data.api_key) {
          setApiKeyGerada(data.api_key)
          setMostrarModalChave(true)
        }
        carregarDispositivos()
      } else {
        toast.error(data.mensagem || data.error || 'Erro ao cadastrar dispositivo')
      }
    } catch (error) {
      console.error('Erro ao cadastrar dispositivo:', error)
      toast.error('Erro ao cadastrar dispositivo')
    } finally {
      setSalvando(false)
    }
  }

  const abrirModalEditar = (dispositivo: Dispositivo) => {
    setDispositivoSelecionado(dispositivo)
    setFormData({
      nome: dispositivo.nome,
      escola_id: dispositivo.escola_id,
      localizacao: dispositivo.localizacao || '',
      status: dispositivo.status,
    })
    setMostrarModalEditar(true)
  }

  const handleEditar = async () => {
    if (!dispositivoSelecionado) return
    if (!formData.nome.trim()) {
      toast.error('Informe o nome do dispositivo')
      return
    }

    setSalvando(true)
    try {
      const response = await fetch(`/api/admin/dispositivos-faciais/${dispositivoSelecionado.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: formData.nome.trim(),
          localizacao: formData.localizacao.trim() || null,
          status: formData.status,
        }),
      })
      const data = await response.json()

      if (response.ok) {
        toast.success('Dispositivo atualizado com sucesso')
        setMostrarModalEditar(false)
        setDispositivoSelecionado(null)
        carregarDispositivos()
      } else {
        toast.error(data.mensagem || data.error || 'Erro ao atualizar dispositivo')
      }
    } catch (error) {
      console.error('Erro ao atualizar dispositivo:', error)
      toast.error('Erro ao atualizar dispositivo')
    } finally {
      setSalvando(false)
    }
  }

  const abrirModalRegenerarChave = (dispositivo: Dispositivo) => {
    setDispositivoSelecionado(dispositivo)
    setMostrarModalRegenerarChave(true)
  }

  const handleRegenerarChave = async () => {
    if (!dispositivoSelecionado) return

    setSalvando(true)
    try {
      const response = await fetch(`/api/admin/dispositivos-faciais/${dispositivoSelecionado.id}/regenerar-chave`, {
        method: 'POST',
      })
      const data = await response.json()

      if (response.ok) {
        toast.success('Chave regenerada com sucesso')
        setMostrarModalRegenerarChave(false)
        if (data.api_key) {
          setApiKeyGerada(data.api_key)
          setMostrarModalChave(true)
        }
      } else {
        toast.error(data.mensagem || data.error || 'Erro ao regenerar chave')
      }
    } catch (error) {
      console.error('Erro ao regenerar chave:', error)
      toast.error('Erro ao regenerar chave')
    } finally {
      setSalvando(false)
    }
  }

  const abrirModalBloquear = (dispositivo: Dispositivo) => {
    setDispositivoSelecionado(dispositivo)
    setMostrarModalBloquear(true)
  }

  const handleBloquear = async () => {
    if (!dispositivoSelecionado) return

    setSalvando(true)
    try {
      const response = await fetch(`/api/admin/dispositivos-faciais/${dispositivoSelecionado.id}`, {
        method: 'DELETE',
      })
      const data = await response.json()

      if (response.ok) {
        toast.success('Dispositivo bloqueado com sucesso')
        setMostrarModalBloquear(false)
        setDispositivoSelecionado(null)
        carregarDispositivos()
      } else {
        toast.error(data.mensagem || data.error || 'Erro ao bloquear dispositivo')
      }
    } catch (error) {
      console.error('Erro ao bloquear dispositivo:', error)
      toast.error('Erro ao bloquear dispositivo')
    } finally {
      setSalvando(false)
    }
  }

  const abrirModalQrCode = async (dispositivo: Dispositivo) => {
    setDispositivoSelecionado(dispositivo)
    setMostrarModalQrCode(true)
    setCarregandoQr(true)
    setQrCodeData(null)
    setCopiadoQr(false)

    try {
      const response = await fetch(`/api/admin/dispositivos-faciais/${dispositivo.id}/qrcode`)
      const data = await response.json()

      if (response.ok) {
        setQrCodeData(data)
      } else {
        toast.error(data.mensagem || 'Erro ao gerar QR Code')
        setMostrarModalQrCode(false)
      }
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error)
      toast.error('Erro ao gerar QR Code')
      setMostrarModalQrCode(false)
    } finally {
      setCarregandoQr(false)
    }
  }

  const copiarQrData = async () => {
    if (!qrCodeData) return
    try {
      await navigator.clipboard.writeText(qrCodeData.qr_data)
      setCopiadoQr(true)
      toast.success('Dados copiados para a area de transferencia')
      setTimeout(() => setCopiadoQr(false), 2000)
    } catch {
      toast.error('Erro ao copiar dados')
    }
  }

  const abrirModalEstatisticas = async (dispositivo: Dispositivo) => {
    setDispositivoSelecionado(dispositivo)
    setMostrarModalEstatisticas(true)
    setCarregandoEstatisticas(true)
    setEstatisticas(null)

    try {
      const response = await fetch(`/api/admin/dispositivos-faciais/${dispositivo.id}/estatisticas`)
      const data = await response.json()

      if (response.ok) {
        setEstatisticas(data)
      } else {
        toast.error(data.mensagem || 'Erro ao carregar estatisticas')
        setMostrarModalEstatisticas(false)
      }
    } catch (error) {
      console.error('Erro ao carregar estatisticas:', error)
      toast.error('Erro ao carregar estatisticas')
      setMostrarModalEstatisticas(false)
    } finally {
      setCarregandoEstatisticas(false)
    }
  }

  const copiarChave = async () => {
    try {
      await navigator.clipboard.writeText(apiKeyGerada)
      setCopiado(true)
      toast.success('Chave copiada para a area de transferencia')
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      toast.error('Erro ao copiar chave')
    }
  }

  // ==================== Render ====================

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Alert Banner - Dispositivos offline ha mais de 1 hora */}
        {dispositivosOfflineLongo.length > 0 && (
          <div className="mb-6 flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              {dispositivosOfflineLongo.length} dispositivo(s) offline ha mais de 1 hora
            </p>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Dispositivos Faciais
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Gerencie os dispositivos de reconhecimento facial cadastrados
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => carregarDispositivos()}
              className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            <button
              onClick={abrirModalCadastro}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo Dispositivo
            </button>
          </div>
        </div>

        {/* Dashboard Cards - 4 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Dispositivos */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border-l-4 border-blue-500">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Dispositivos</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {totalDispositivos}
                </p>
              </div>
            </div>
          </div>

          {/* Online Agora */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border-l-4 border-green-500">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                <Wifi className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Online Agora</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {onlineAgora}
                </p>
              </div>
            </div>
          </div>

          {/* Offline */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border-l-4 border-red-500">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg">
                <WifiOff className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Offline</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {offlineAgora}
                </p>
              </div>
            </div>
          </div>

          {/* Presencas Hoje */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border-l-4 border-purple-500">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Presencas Hoje</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {presencasHoje}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, escola ou localizacao..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Device Cards Grid */}
        {carregando ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : dispositivosFiltrados.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Smartphone className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{busca.trim() ? 'Nenhum dispositivo encontrado para a busca' : 'Nenhum dispositivo cadastrado'}</p>
            {!busca.trim() && (
              <p className="text-sm mt-1">Clique em &quot;Novo Dispositivo&quot; para cadastrar</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {dispositivosFiltrados.map((dispositivo) => {
              const online = isOnline(dispositivo.ultimo_ping) && dispositivo.status === 'ativo'

              return (
                <div
                  key={dispositivo.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Card Header */}
                  <div className="px-4 pt-4 pb-3">
                    <div className="flex items-start justify-between">
                      <button
                        onClick={() => abrirModalEstatisticas(dispositivo)}
                        className="flex items-center gap-2 group text-left"
                      >
                        <span
                          className={`w-3 h-3 rounded-full flex-shrink-0 ${
                            online
                              ? 'bg-green-500 animate-pulse'
                              : dispositivo.status === 'bloqueado'
                                ? 'bg-red-500'
                                : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                        />
                        <span className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {dispositivo.nome}
                        </span>
                      </button>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(dispositivo.status)}`}
                      >
                        {getStatusLabel(dispositivo.status)}
                      </span>
                    </div>

                    {/* Info rows */}
                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Smartphone className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{dispositivo.escola_nome || '-'}</span>
                      </div>

                      {dispositivo.localizacao && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{dispositivo.localizacao}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>
                          Ultimo ping:{' '}
                          <span className={online ? 'text-green-600 dark:text-green-400 font-medium' : ''}>
                            {tempoRelativo(dispositivo.ultimo_ping)}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer - Actions */}
                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => abrirModalEditar(dispositivo)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          Editar
                        </button>
                        <button
                          onClick={() => abrirModalQrCode(dispositivo)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="QR Code"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          QR Code
                        </button>
                        <button
                          onClick={() => abrirModalRegenerarChave(dispositivo)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded-lg transition-colors"
                          title="Regenerar Chave"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {dispositivo.status !== 'bloqueado' && (
                        <button
                          onClick={() => abrirModalBloquear(dispositivo)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title="Bloquear"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          Bloquear
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Auto-refresh indicator */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-gray-500">
          <Activity className="w-3 h-3" />
          <span>Atualizado automaticamente a cada 30 segundos</span>
        </div>
      </div>

      {/* ==================== MODALS ==================== */}

      {/* Modal: Cadastrar Dispositivo */}
      {mostrarModalCadastro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Novo Dispositivo
              </h3>
              <button
                onClick={() => setMostrarModalCadastro(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome do Dispositivo *
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Dispositivo Entrada Principal"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Escola *
                </label>
                <select
                  value={formData.escola_id}
                  onChange={(e) => setFormData({ ...formData, escola_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Selecione a escola</option>
                  {escolas.map((escola) => (
                    <option key={escola.id} value={escola.id}>
                      {escola.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Localizacao
                </label>
                <input
                  type="text"
                  value={formData.localizacao}
                  onChange={(e) => setFormData({ ...formData, localizacao: e.target.value })}
                  placeholder="Ex: Portaria principal"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setMostrarModalCadastro(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCadastrar}
                disabled={salvando}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {salvando && <LoadingSpinner />}
                Cadastrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar Dispositivo */}
      {mostrarModalEditar && dispositivoSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Editar Dispositivo
              </h3>
              <button
                onClick={() => { setMostrarModalEditar(false); setDispositivoSelecionado(null) }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome do Dispositivo *
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Localizacao
                </label>
                <input
                  type="text"
                  value={formData.localizacao}
                  onChange={(e) => setFormData({ ...formData, localizacao: e.target.value })}
                  placeholder="Ex: Portaria principal"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'ativo' | 'inativo' | 'bloqueado' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                  <option value="bloqueado">Bloqueado</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => { setMostrarModalEditar(false); setDispositivoSelecionado(null) }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleEditar}
                disabled={salvando}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {salvando && <LoadingSpinner />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Exibir Chave API */}
      {mostrarModalChave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Chave API do Dispositivo
              </h3>
              <button
                onClick={() => { setMostrarModalChave(false); setApiKeyGerada('') }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Esta chave sera exibida apenas uma vez. Copie e armazene-a em um local seguro.
                  Ela sera necessaria para autenticar o dispositivo.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Chave API
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={apiKeyGerada}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white font-mono text-sm"
                  />
                  <button
                    onClick={copiarChave}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiado ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => { setMostrarModalChave(false); setApiKeyGerada('') }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Regeneracao de Chave */}
      {mostrarModalRegenerarChave && dispositivoSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Regenerar Chave API
              </h3>
              <button
                onClick={() => { setMostrarModalRegenerarChave(false); setDispositivoSelecionado(null) }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4">
              <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  <p className="font-medium">Atencao!</p>
                  <p className="mt-1">
                    Ao regenerar a chave do dispositivo <strong>{dispositivoSelecionado.nome}</strong>,
                    a chave anterior sera invalidada e o dispositivo perdera acesso ate que a nova
                    chave seja configurada.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => { setMostrarModalRegenerarChave(false); setDispositivoSelecionado(null) }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegenerarChave}
                disabled={salvando}
                className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {salvando && <LoadingSpinner />}
                Regenerar Chave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Bloqueio */}
      {mostrarModalBloquear && dispositivoSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Bloquear Dispositivo
              </h3>
              <button
                onClick={() => { setMostrarModalBloquear(false); setDispositivoSelecionado(null) }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4">
              <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-800 dark:text-red-200">
                  <p className="font-medium">Tem certeza que deseja bloquear este dispositivo?</p>
                  <p className="mt-1">
                    O dispositivo <strong>{dispositivoSelecionado.nome}</strong> sera bloqueado
                    e perdera acesso ao sistema imediatamente. Sua chave API sera invalidada.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => { setMostrarModalBloquear(false); setDispositivoSelecionado(null) }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleBloquear}
                disabled={salvando}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {salvando && <LoadingSpinner />}
                Bloquear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: QR Code */}
      {mostrarModalQrCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                QR Code de Configuracao
              </h3>
              <button
                onClick={() => { setMostrarModalQrCode(false); setQrCodeData(null); setDispositivoSelecionado(null) }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {carregandoQr ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : qrCodeData ? (
                <>
                  {/* Warning */}
                  <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800 dark:text-yellow-200">
                      <p className="font-medium">Atencao!</p>
                      <p className="mt-1">{qrCodeData.aviso}</p>
                    </div>
                  </div>

                  {/* Device info */}
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      <strong>Dispositivo:</strong> {qrCodeData.dispositivo.nome}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      <strong>Escola:</strong> {qrCodeData.dispositivo.escola_nome}
                    </p>
                  </div>

                  {/* QR Data display */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Dados de Configuracao (JSON)
                      </label>
                      <button
                        onClick={copiarQrData}
                        className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        {copiadoQr ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiadoQr ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                    <pre className="p-3 bg-gray-900 dark:bg-gray-950 text-green-400 rounded-lg text-xs font-mono overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap break-all">
                      {(() => { try { return JSON.stringify(JSON.parse(qrCodeData.qr_data), null, 2) } catch { return qrCodeData.qr_data || '{}' } })()}
                    </pre>
                  </div>

                  {/* Instructions */}
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Instrucoes:</strong> Copie os dados acima e configure no dispositivo de reconhecimento facial.
                      O dispositivo usara esses dados para se conectar ao SISAM automaticamente.
                    </p>
                  </div>
                </>
              ) : null}
            </div>

            <div className="flex items-center justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => { setMostrarModalQrCode(false); setQrCodeData(null); setDispositivoSelecionado(null) }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Estatisticas */}
      {mostrarModalEstatisticas && dispositivoSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Estatisticas - {dispositivoSelecionado.nome}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{dispositivoSelecionado.escola_nome}</p>
              </div>
              <button
                onClick={() => { setMostrarModalEstatisticas(false); setEstatisticas(null); setDispositivoSelecionado(null) }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-6 overflow-y-auto flex-1">
              {carregandoEstatisticas ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner />
                </div>
              ) : estatisticas ? (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{estatisticas.total_hoje}</p>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">Presencas Hoje</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400">{estatisticas.taxa_sucesso}%</p>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">Taxa de Sucesso</p>
                    </div>
                  </div>

                  {/* Scans por Hora - Bar Chart */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Registros por Hora (Hoje)
                    </h4>
                    <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
                      {(() => {
                        const maxVal = Math.max(...estatisticas.scans_por_hora.map(s => s.total), 1)
                        const horasAtivas = estatisticas.scans_por_hora.filter(s => s.total > 0)

                        if (horasAtivas.length === 0) {
                          return (
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                              Nenhum registro hoje
                            </p>
                          )
                        }

                        return (
                          <div className="flex items-end gap-1 h-32">
                            {estatisticas.scans_por_hora.map((s) => {
                              const heightPercent = maxVal > 0 ? (s.total / maxVal) * 100 : 0
                              return (
                                <div
                                  key={s.hora}
                                  className="flex-1 flex flex-col items-center justify-end group relative"
                                >
                                  {s.total > 0 && (
                                    <span className="text-[10px] text-gray-600 dark:text-gray-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      {s.total}
                                    </span>
                                  )}
                                  <div
                                    className={`w-full rounded-t transition-all ${
                                      s.total > 0
                                        ? 'bg-indigo-500 dark:bg-indigo-400 group-hover:bg-indigo-600 dark:group-hover:bg-indigo-300'
                                        : 'bg-gray-200 dark:bg-gray-600'
                                    }`}
                                    style={{ height: `${Math.max(heightPercent, 2)}%`, minHeight: '2px' }}
                                  />
                                  <span className="text-[9px] text-gray-400 mt-1">{s.hora}</span>
                                </div>
                              )
                            })}
                          </div>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Ultimos 7 dias */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      Ultimos 7 Dias
                    </h4>
                    {estatisticas.ultimos_7_dias.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum registro nos ultimos 7 dias</p>
                    ) : (
                      <div className="space-y-2">
                        {estatisticas.ultimos_7_dias.map((dia) => {
                          const maxDia = Math.max(...estatisticas.ultimos_7_dias.map(d => d.total), 1)
                          const widthPercent = (dia.total / maxDia) * 100
                          return (
                            <div key={dia.data} className="flex items-center gap-3">
                              <span className="text-xs text-gray-500 dark:text-gray-400 w-20 flex-shrink-0">
                                {new Date(dia.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', weekday: 'short' })}
                              </span>
                              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                                <div
                                  className="bg-indigo-500 dark:bg-indigo-400 h-full rounded-full transition-all"
                                  style={{ width: `${widthPercent}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-10 text-right">
                                {dia.total}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Logs Recentes */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      Logs Recentes
                    </h4>
                    {estatisticas.logs_recentes.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum log recente</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                              <th className="py-2 px-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Evento</th>
                              <th className="py-2 px-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Detalhes</th>
                              <th className="py-2 px-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Data</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {estatisticas.logs_recentes.slice(0, 10).map((log, i) => (
                              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="py-2 px-3">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                    log.evento === 'erro'
                                      ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                                      : log.evento === 'presenca' || log.evento === 'presenca_lote'
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                  }`}>
                                    {log.evento}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-gray-600 dark:text-gray-400 max-w-[200px] truncate">
                                  {log.detalhes || '-'}
                                </td>
                                <td className="py-2 px-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                  {formatarData(log.criado_em)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            <div className="flex items-center justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <button
                onClick={() => { setMostrarModalEstatisticas(false); setEstatisticas(null); setDispositivoSelecionado(null) }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  )
}
