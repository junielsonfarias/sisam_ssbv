'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState } from 'react'
import { Shield, ShieldCheck, ShieldOff, Save, RefreshCw, AlertTriangle, Info } from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface Config2FA {
  habilitado: boolean
  atualizadoEm: string | null
  atualizadoPor: string | null
}

export default function SegurancaPage() {
  const toast = useToast()
  const [config, setConfig] = useState<Config2FA>({
    habilitado: false,
    atualizadoEm: null,
    atualizadoPor: null,
  })
  const [habilitadoLocal, setHabilitadoLocal] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => { carregar() }, [])

  const carregar = async () => {
    setCarregando(true)
    try {
      const res = await fetch('/api/admin/seguranca/2fa')
      if (res.ok) {
        const data: Config2FA = await res.json()
        setConfig(data)
        setHabilitadoLocal(data.habilitado)
      } else {
        toast.error('Erro ao carregar configuracao de seguranca')
      }
    } catch {
      toast.error('Erro ao carregar configuracao de seguranca')
    } finally {
      setCarregando(false)
    }
  }

  const salvar = async () => {
    setSalvando(true)
    try {
      const res = await fetch('/api/admin/seguranca/2fa', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habilitado: habilitadoLocal }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.mensagem || 'Configuracao salva')
        await carregar()
      } else {
        toast.error(data.mensagem || 'Erro ao salvar')
      }
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  const formatarData = (iso: string | null) => {
    if (!iso) return '—'
    try {
      return new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    } catch { return '—' }
  }

  const houveMudanca = habilitadoLocal !== config.habilitado

  if (carregando) {
    return <ProtectedRoute tiposPermitidos={['administrador']}><LoadingSpinner centered /></ProtectedRoute>
  }

  return (
    <ProtectedRoute tiposPermitidos={['administrador']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-xl shadow-lg p-6 text-white">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-2 rounded-lg"><Shield className="w-6 h-6" /></div>
              <div>
                <h1 className="text-2xl font-bold">Seguranca</h1>
                <p className="text-indigo-200 text-sm mt-1">Configuracoes globais de seguranca do sistema</p>
              </div>
            </div>
            <button
              onClick={carregar}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Atualizar
            </button>
          </div>
        </div>

        {/* Card 2FA */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${config.habilitado
              ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
              : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'}`}>
              {config.habilitado ? <ShieldCheck className="w-6 h-6" /> : <ShieldOff className="w-6 h-6" />}
            </div>

            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                  Autenticacao em Dois Fatores (2FA)
                </h2>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold w-fit ${config.habilitado
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                  {config.habilitado ? 'HABILITADO' : 'DESABILITADO'}
                </span>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Quando habilitado, usuarios que ativaram o 2FA precisam informar
                o codigo do app autenticador (Google Authenticator, Authy, 1Password)
                no login. Quando desabilitado, o codigo nao e solicitado.
              </p>

              {/* Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900/50 rounded-lg border border-gray-200 dark:border-slate-700">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-white">
                    Exigir 2FA no login
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Aplica-se a todos os usuarios com 2FA ativado
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={habilitadoLocal}
                  onClick={() => setHabilitadoLocal(v => !v)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 ${habilitadoLocal ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-slate-600'}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${habilitadoLocal ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Aviso quando vai desabilitar */}
              {houveMudanca && !habilitadoLocal && (
                <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Ao desabilitar, o sistema deixara de pedir o codigo 2FA no login,
                    mesmo para usuarios que ja configuraram. Util em ambiente de
                    desenvolvimento ou para liberar acesso durante manutencao.
                  </p>
                </div>
              )}

              {/* Aviso quando vai habilitar */}
              {houveMudanca && habilitadoLocal && (
                <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800">
                  <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-indigo-700 dark:text-indigo-300">
                    Ao habilitar, usuarios que ja ativaram 2FA serao solicitados pelo
                    codigo TOTP no proximo login. Quem nao configurou continua
                    entrando normalmente (2FA permanece opcional).
                  </p>
                </div>
              )}

              {/* Auditoria */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <p><span className="font-medium">Ultima atualizacao:</span> {formatarData(config.atualizadoEm)}</p>
              </div>

              {/* Botao salvar */}
              <div className="mt-4 flex justify-end">
                <button
                  onClick={salvar}
                  disabled={!houveMudanca || salvando}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {salvando ? 'Salvando...' : 'Salvar alteracoes'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Card explicativo */}
        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
          <h3 className="text-sm font-bold text-blue-900 dark:text-blue-300 flex items-center gap-2 mb-2">
            <Info className="w-4 h-4" /> Como funciona o 2FA no SISAM
          </h3>
          <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
            <li>Cada usuario pode ativar 2FA pelo seu perfil (opcional).</li>
            <li>O codigo TOTP usa apps padrao (Google Authenticator, Authy, 1Password).</li>
            <li>Codigos de backup sao gerados na ativacao para uso unico em emergencia.</li>
            <li>Esta flag global liga/desliga a exigencia do codigo no login do sistema inteiro.</li>
          </ul>
        </div>
      </div>
    </ProtectedRoute>
  )
}
