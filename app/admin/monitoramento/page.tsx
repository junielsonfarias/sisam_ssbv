'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState } from 'react'
import { HeartPulse, RefreshCw, CheckCircle, XCircle, Mail, Plus, Trash2, Save, Send, Globe } from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface SaudeStatus {
  banco: boolean
  redis: boolean
  timestamp: string
}

interface MonitorConfig {
  emails_alerta: string[]
  webhook_url: string
  intervalo_min: number
  alertar_banco: boolean
  alertar_redis: boolean
  alertar_erro: boolean
}

export default function MonitoramentoPage() {
  const toast = useToast()
  const [config, setConfig] = useState<MonitorConfig>({
    emails_alerta: [],
    webhook_url: '',
    intervalo_min: 5,
    alertar_banco: true,
    alertar_redis: true,
    alertar_erro: true,
  })
  const [saude, setSaude] = useState<SaudeStatus | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [testando, setTestando] = useState(false)
  const [novoEmail, setNovoEmail] = useState('')

  useEffect(() => { carregar() }, [])

  const carregar = async () => {
    setCarregando(true)
    try {
      const res = await fetch('/api/admin/monitoramento')
      if (res.ok) {
        const data = await res.json()
        if (data.config) setConfig(data.config)
        if (data.saude) setSaude(data.saude)
      }
    } catch {
      toast.error('Erro ao carregar monitoramento')
    } finally {
      setCarregando(false)
    }
  }

  const salvarConfig = async () => {
    setSalvando(true)
    try {
      const res = await fetch('/api/admin/monitoramento', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (res.ok) {
        toast.success('Configuração salva!')
      } else {
        const data = await res.json()
        toast.error(data.mensagem || 'Erro ao salvar')
      }
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  const testarAlerta = async () => {
    setTestando(true)
    try {
      const res = await fetch('/api/admin/monitoramento/testar', { method: 'POST' })
      if (res.ok) {
        toast.success('Email de teste enviado!')
      } else {
        toast.error('Erro ao enviar teste')
      }
    } catch {
      toast.error('Erro ao enviar teste')
    } finally {
      setTestando(false)
    }
  }

  const adicionarEmail = () => {
    if (!novoEmail || !novoEmail.includes('@')) return
    if (config.emails_alerta.includes(novoEmail)) return
    setConfig(prev => ({ ...prev, emails_alerta: [...prev.emails_alerta, novoEmail] }))
    setNovoEmail('')
  }

  const removerEmail = (email: string) => {
    setConfig(prev => ({ ...prev, emails_alerta: prev.emails_alerta.filter(e => e !== email) }))
  }

  if (carregando) return <ProtectedRoute tiposPermitidos={['administrador']}><LoadingSpinner centered /></ProtectedRoute>

  return (
    <ProtectedRoute tiposPermitidos={['administrador']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 rounded-xl shadow-lg p-6 text-white">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-2 rounded-lg"><HeartPulse className="w-6 h-6" /></div>
              <div>
                <h1 className="text-2xl font-bold">Monitoramento</h1>
                <p className="text-emerald-200 text-sm mt-1">Status do sistema e configuração de alertas</p>
              </div>
            </div>
            <button onClick={carregar} className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors">
              <RefreshCw className="w-4 h-4" /> Atualizar
            </button>
          </div>
        </div>

        {/* Status de Saúde */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className={`rounded-xl border p-5 ${saude?.banco ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Banco de Dados (PostgreSQL)</span>
              {saude?.banco ? <CheckCircle className="w-6 h-6 text-green-600" /> : <XCircle className="w-6 h-6 text-red-600" />}
            </div>
            <p className={`text-lg font-bold mt-1 ${saude?.banco ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
              {saude?.banco ? 'Online' : 'Offline'}
            </p>
          </div>
          <div className={`rounded-xl border p-5 ${saude?.redis ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Cache (Redis)</span>
              {saude?.redis ? <CheckCircle className="w-6 h-6 text-green-600" /> : <XCircle className="w-6 h-6 text-amber-600" />}
            </div>
            <p className={`text-lg font-bold mt-1 ${saude?.redis ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>
              {saude?.redis ? 'Online' : 'Indisponível'}
            </p>
          </div>
        </div>

        {/* Configuração de Alertas */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
            <Mail className="w-5 h-5 text-indigo-500" />
            Emails de Alerta
          </h2>

          <div className="flex gap-2 mb-3">
            <input
              type="email"
              value={novoEmail}
              onChange={(e) => setNovoEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && adicionarEmail()}
              className="flex-1 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
              placeholder="email@exemplo.com"
            />
            <button onClick={adicionarEmail} className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {config.emails_alerta.map((email) => (
              <span key={email} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm">
                {email}
                <button onClick={() => removerEmail(email)} className="text-indigo-400 hover:text-red-500">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
            {config.emails_alerta.length === 0 && (
              <p className="text-sm text-gray-400">Nenhum email configurado</p>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                <Globe className="w-3.5 h-3.5 inline mr-1" />
                Webhook URL (Telegram, Discord, etc.)
              </label>
              <input
                type="url"
                value={config.webhook_url}
                onChange={(e) => setConfig(prev => ({ ...prev, webhook_url: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                placeholder="https://hooks.slack.com/... ou https://api.telegram.org/..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={config.alertar_banco} onChange={(e) => setConfig(prev => ({ ...prev, alertar_banco: e.target.checked }))} className="rounded border-gray-300 text-indigo-600" />
                Alertar banco offline
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={config.alertar_redis} onChange={(e) => setConfig(prev => ({ ...prev, alertar_redis: e.target.checked }))} className="rounded border-gray-300 text-indigo-600" />
                Alertar Redis offline
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={config.alertar_erro} onChange={(e) => setConfig(prev => ({ ...prev, alertar_erro: e.target.checked }))} className="rounded border-gray-300 text-indigo-600" />
                Alertar erros críticos
              </label>
            </div>
          </div>

          <div className="flex justify-between mt-5">
            <button
              onClick={testarAlerta}
              disabled={testando || config.emails_alerta.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg hover:bg-amber-200 disabled:opacity-50 font-medium text-sm transition-colors"
            >
              <Send className="w-4 h-4" />
              {testando ? 'Enviando...' : 'Testar Alerta'}
            </button>
            <button
              onClick={salvarConfig}
              disabled={salvando}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium text-sm transition-colors"
            >
              <Save className="w-4 h-4" />
              {salvando ? 'Salvando...' : 'Salvar Configuração'}
            </button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
