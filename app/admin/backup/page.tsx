'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState } from 'react'
import { HardDrive, Play, RefreshCw, CheckCircle, XCircle, Clock, FolderOpen, Settings, Info } from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface BackupLog {
  id: string
  tipo: string
  status: string
  tamanho_bytes: number
  tabelas_exportadas: number
  registros_exportados: number
  erro: string | null
  iniciado_em: string
  finalizado_em: string | null
}

interface BackupConfig {
  google_drive_folder_id: string
  manter_ultimos: number
  backup_automatico: boolean
  horario_backup: string
}

export default function BackupPage() {
  const toast = useToast()
  const [config, setConfig] = useState<BackupConfig>({
    google_drive_folder_id: '',
    manter_ultimos: 30,
    backup_automatico: false,
    horario_backup: '03:00',
  })
  const [backups, setBackups] = useState<BackupLog[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [executando, setExecutando] = useState(false)

  useEffect(() => { carregar() }, [])

  const carregar = async () => {
    setCarregando(true)
    try {
      const res = await fetch('/api/admin/backup')
      if (res.ok) {
        const data = await res.json()
        if (data.config) setConfig(data.config)
        setBackups(data.backups || [])
      }
    } catch {
      toast.error('Erro ao carregar configurações de backup')
    } finally {
      setCarregando(false)
    }
  }

  const salvarConfig = async () => {
    setSalvando(true)
    try {
      const res = await fetch('/api/admin/backup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (res.ok) {
        toast.success('Configuração salva com sucesso!')
      } else {
        const data = await res.json()
        toast.error(data.mensagem || 'Erro ao salvar')
      }
    } catch {
      toast.error('Erro ao salvar configuração')
    } finally {
      setSalvando(false)
    }
  }

  const executarBackup = async () => {
    setExecutando(true)
    try {
      const res = await fetch('/api/admin/backup', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        toast.success('Backup executado com sucesso!')
        carregar()
      } else {
        toast.error(data.mensagem || 'Erro ao executar backup')
      }
    } catch {
      toast.error('Erro ao executar backup')
    } finally {
      setExecutando(false)
    }
  }

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  if (carregando) return <ProtectedRoute tiposPermitidos={['administrador']}><LoadingSpinner centered /></ProtectedRoute>

  return (
    <ProtectedRoute tiposPermitidos={['administrador']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-xl shadow-lg p-6 text-white">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-2 rounded-lg"><HardDrive className="w-6 h-6" /></div>
              <div>
                <h1 className="text-2xl font-bold">Backup do Sistema</h1>
                <p className="text-indigo-200 text-sm mt-1">Gerenciar backups e integração Google Drive</p>
              </div>
            </div>
            <button
              onClick={executarBackup}
              disabled={executando}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {executando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {executando ? 'Executando...' : 'Backup Manual'}
            </button>
          </div>
        </div>

        {/* Configuração Google Drive */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5 text-indigo-500" />
            Configuração do Backup
          </h2>

          {/* Instruções Google Drive */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-2 mb-2">
              <Info className="w-4 h-4" />
              Como configurar o Google Drive
            </h3>
            <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1.5 list-decimal ml-5">
              <li>Acesse o <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">Google Cloud Console</a></li>
              <li>Crie um projeto (ou use um existente)</li>
              <li>Ative a <strong>Google Drive API</strong></li>
              <li>Crie uma <strong>Service Account</strong> (Conta de Serviço)</li>
              <li>Gere uma chave JSON e copie o conteúdo</li>
              <li>No Vercel, adicione a variável <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">GOOGLE_SERVICE_ACCOUNT_KEY</code> com o JSON em base64</li>
              <li>Crie uma pasta no Google Drive e compartilhe com o email da Service Account</li>
              <li>Copie o <strong>ID da pasta</strong> (parte final da URL) e cole abaixo</li>
            </ol>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                <FolderOpen className="w-3.5 h-3.5 inline mr-1" />
                ID da Pasta no Google Drive
              </label>
              <input
                type="text"
                value={config.google_drive_folder_id}
                onChange={(e) => setConfig(prev => ({ ...prev, google_drive_folder_id: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                placeholder="Ex: 1AbCdEfGhIjKlMnOpQrStUvWxYz"
              />
              <p className="text-[11px] text-gray-400 mt-1">Cole o ID da pasta do Drive (parte final da URL da pasta compartilhada)</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Manter últimos backups</label>
              <input
                type="number"
                value={config.manter_ultimos}
                onChange={(e) => setConfig(prev => ({ ...prev, manter_ultimos: parseInt(e.target.value) || 30 }))}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                min={1}
                max={365}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Horário do backup automático</label>
              <input
                type="time"
                value={config.horario_backup}
                onChange={(e) => setConfig(prev => ({ ...prev, horario_backup: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={config.backup_automatico}
                  onChange={(e) => setConfig(prev => ({ ...prev, backup_automatico: e.target.checked }))}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                Habilitar backup automático diário
              </label>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={salvarConfig}
              disabled={salvando}
              className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium text-sm transition-colors"
            >
              {salvando ? 'Salvando...' : 'Salvar Configuração'}
            </button>
          </div>
        </div>

        {/* Histórico de Backups */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-500" />
              Histórico de Backups
            </h2>
            <button onClick={carregar} className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {backups.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">Nenhum backup realizado ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-slate-700">
                    <th className="pb-2 pr-4">Data</th>
                    <th className="pb-2 pr-4">Tipo</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 pr-4">Tamanho</th>
                    <th className="pb-2 pr-4">Tabelas</th>
                    <th className="pb-2">Registros</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {backups.map((b) => (
                    <tr key={b.id} className="text-gray-700 dark:text-gray-300">
                      <td className="py-2 pr-4 whitespace-nowrap">{new Date(b.iniciado_em).toLocaleString('pt-BR')}</td>
                      <td className="py-2 pr-4">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                          {b.tipo}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        {b.status === 'sucesso' ? (
                          <span className="flex items-center gap-1 text-green-600"><CheckCircle className="w-4 h-4" /> Sucesso</span>
                        ) : b.status === 'erro' ? (
                          <span className="flex items-center gap-1 text-red-600" title={b.erro || ''}><XCircle className="w-4 h-4" /> Erro</span>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-600"><RefreshCw className="w-4 h-4 animate-spin" /> Em andamento</span>
                        )}
                      </td>
                      <td className="py-2 pr-4">{formatBytes(b.tamanho_bytes)}</td>
                      <td className="py-2 pr-4">{b.tabelas_exportadas}</td>
                      <td className="py-2">{b.registros_exportados?.toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
