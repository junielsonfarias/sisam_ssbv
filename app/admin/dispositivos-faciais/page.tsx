'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import ProtectedRoute from '@/components/protected-route'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import {
  Plus,
  RefreshCw,
  Smartphone,
  AlertTriangle,
  Search,
  Activity,
} from 'lucide-react'

import {
  Dispositivo,
  Escola,
  Estatisticas,
  QrCodeData,
  ResumoFrequencia,
  FormData,
  isOnline,
  isOfflineLongo,
} from './components/types'
import { DashboardCards } from './components/DashboardCards'
import { DeviceCard } from './components/DeviceCard'
import { ModalCadastro } from './components/ModalCadastro'
import { ModalEditar } from './components/ModalEditar'
import { ModalChaveApi } from './components/ModalChaveApi'
import { ModalRegenerarChave } from './components/ModalRegenerarChave'
import { ModalBloquear } from './components/ModalBloquear'
import { ModalQrCode } from './components/ModalQrCode'
import { ModalEstatisticas } from './components/ModalEstatisticas'

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
  const [formData, setFormData] = useState<FormData>({
    nome: '',
    escola_id: '',
    localizacao: '',
    status: 'ativo',
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
      toast.error('Erro ao bloquear dispositivo')
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluirPermanente = async (dispositivo: Dispositivo) => {
    if (!confirm(`Excluir permanentemente o dispositivo "${dispositivo.nome}"?\n\nEsta ação remove o dispositivo e todos os seus logs. Não pode ser desfeita.`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/dispositivos-faciais/${dispositivo.id}?permanente=true`, {
        method: 'DELETE',
      })
      const data = await response.json()

      if (response.ok) {
        toast.success('Dispositivo excluído permanentemente')
        carregarDispositivos()
      } else {
        toast.error(data.mensagem || 'Erro ao excluir dispositivo')
      }
    } catch {
      toast.error('Erro ao excluir dispositivo')
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

        {/* Dashboard Cards */}
        <DashboardCards
          totalDispositivos={totalDispositivos}
          onlineAgora={onlineAgora}
          offlineAgora={offlineAgora}
          presencasHoje={presencasHoje}
        />

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
            {dispositivosFiltrados.map((dispositivo) => (
              <DeviceCard
                key={dispositivo.id}
                dispositivo={dispositivo}
                onEditar={abrirModalEditar}
                onQrCode={abrirModalQrCode}
                onRegenerarChave={abrirModalRegenerarChave}
                onBloquear={abrirModalBloquear}
                onExcluir={handleExcluirPermanente}
                onEstatisticas={abrirModalEstatisticas}
              />
            ))}
          </div>
        )}

        {/* Auto-refresh indicator */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-gray-500">
          <Activity className="w-3 h-3" />
          <span>Atualizado automaticamente a cada 30 segundos</span>
        </div>
      </div>

      {/* ==================== MODALS ==================== */}

      {mostrarModalCadastro && (
        <ModalCadastro
          formData={formData}
          setFormData={setFormData}
          escolas={escolas}
          salvando={salvando}
          onCadastrar={handleCadastrar}
          onClose={() => setMostrarModalCadastro(false)}
        />
      )}

      {mostrarModalEditar && dispositivoSelecionado && (
        <ModalEditar
          dispositivo={dispositivoSelecionado}
          formData={formData}
          setFormData={setFormData}
          salvando={salvando}
          onEditar={handleEditar}
          onClose={() => { setMostrarModalEditar(false); setDispositivoSelecionado(null) }}
        />
      )}

      {mostrarModalChave && (
        <ModalChaveApi
          apiKey={apiKeyGerada}
          copiado={copiado}
          onCopiar={copiarChave}
          onClose={() => { setMostrarModalChave(false); setApiKeyGerada('') }}
        />
      )}

      {mostrarModalRegenerarChave && dispositivoSelecionado && (
        <ModalRegenerarChave
          dispositivo={dispositivoSelecionado}
          salvando={salvando}
          onConfirmar={handleRegenerarChave}
          onClose={() => { setMostrarModalRegenerarChave(false); setDispositivoSelecionado(null) }}
        />
      )}

      {mostrarModalBloquear && dispositivoSelecionado && (
        <ModalBloquear
          dispositivo={dispositivoSelecionado}
          salvando={salvando}
          onConfirmar={handleBloquear}
          onClose={() => { setMostrarModalBloquear(false); setDispositivoSelecionado(null) }}
        />
      )}

      {mostrarModalQrCode && (
        <ModalQrCode
          qrCodeData={qrCodeData}
          carregando={carregandoQr}
          copiado={copiadoQr}
          onCopiar={copiarQrData}
          onClose={() => { setMostrarModalQrCode(false); setQrCodeData(null); setDispositivoSelecionado(null) }}
        />
      )}

      {mostrarModalEstatisticas && dispositivoSelecionado && (
        <ModalEstatisticas
          dispositivo={dispositivoSelecionado}
          estatisticas={estatisticas}
          carregando={carregandoEstatisticas}
          onClose={() => { setMostrarModalEstatisticas(false); setEstatisticas(null); setDispositivoSelecionado(null) }}
        />
      )}
    </ProtectedRoute>
  )
}
