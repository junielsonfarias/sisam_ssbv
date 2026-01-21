'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogIn, Eye, EyeOff, WifiOff, Database, CheckCircle } from 'lucide-react'
import Rodape from '@/components/rodape'
import { getPersonalizacaoLogin } from '@/lib/personalizacao'
import * as offlineStorage from '@/lib/offline-storage'
import { ThemeToggleSimple } from '@/components/theme-toggle'
import { useTheme } from '@/lib/theme-provider'
import { syncDashboardData, clearCache } from '@/lib/dashboard-cache'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [verificandoOffline, setVerificandoOffline] = useState(true)
  const [modoOffline, setModoOffline] = useState(false)
  const [sincronizando, setSincronizando] = useState(false)
  const [etapaSincronizacao, setEtapaSincronizacao] = useState('')

  // Usar valores fixos do codigo (sem chamar API)
  const personalizacao = getPersonalizacaoLogin()

  // Verificar se existe usuário offline ao carregar
  useEffect(() => {
    const verificarUsuarioOffline = () => {
      const online = offlineStorage.isOnline()
      setModoOffline(!online)

      // Verificar se existe usuário offline no localStorage
      const offlineUser = offlineStorage.getUser()

      console.log('[Login] Verificando usuário offline:', { online, hasUser: !!offlineUser })

      if (offlineUser) {
        console.log('[Login] Usuário offline encontrado, redirecionando...')
        // Se estiver offline ou online, redirecionar para o dashboard correto
        const tipoUsuario = offlineUser.tipo_usuario
        if (tipoUsuario === 'administrador') {
          router.push('/admin/dashboard')
        } else if (tipoUsuario === 'tecnico') {
          router.push('/tecnico/dashboard')
        } else if (tipoUsuario === 'polo') {
          router.push('/polo/dashboard')
        } else if (tipoUsuario === 'escola') {
          router.push('/escola/dashboard')
        } else {
          router.push('/dashboard')
        }
        return
      }

      // Sem usuário offline
      if (!online) {
        setErro('Você está offline e não há sessão salva. Conecte-se à internet para fazer login.')
      }

      setVerificandoOffline(false)
    }

    verificarUsuarioOffline()

    // Listener para mudanças de conexão
    const handleOnline = () => setModoOffline(false)
    const handleOffline = () => {
      setModoOffline(true)
      setErro('Você está offline. Conecte-se à internet para fazer login.')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')

    // Verificar se está offline
    if (!offlineStorage.isOnline()) {
      setErro('Você está offline. Conecte-se à internet para fazer login.')
      return
    }

    setCarregando(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, senha }),
        credentials: 'include', // Importante para cookies
      })

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        console.error('Erro ao parsear resposta JSON:', jsonError)
        setErro('Erro ao processar resposta do servidor')
        setCarregando(false)
        return
      }

      if (!response.ok) {
        console.error('Erro no login:', data)
        setErro(data.mensagem || data.detalhes || 'Erro ao fazer login')
        setCarregando(false)
        return
      }

      // IMPORTANTE: Salvar usuário para acesso offline no localStorage
      const userId = data.usuario.id?.toString() || data.usuario.usuario_id?.toString()
      offlineStorage.saveUser({
        id: userId,
        nome: data.usuario.nome,
        email: data.usuario.email,
        tipo_usuario: data.usuario.tipo_usuario,
        polo_id: data.usuario.polo_id,
        escola_id: data.usuario.escola_id,
        polo_nome: data.usuario.polo_nome,
        escola_nome: data.usuario.escola_nome
      })
      console.log('[Login] Usuário salvo para uso offline')

      // Limpar cache antigo e sincronizar novos dados
      setCarregando(false)
      setSincronizando(true)
      setEtapaSincronizacao('Preparando sincronização...')

      try {
        // Limpar cache antigo
        clearCache()

        // Sincronizar dados do dashboard
        setEtapaSincronizacao('Carregando dados do sistema...')
        await syncDashboardData(userId, data.usuario.tipo_usuario)

        setEtapaSincronizacao('Sincronização concluída!')
        await new Promise(resolve => setTimeout(resolve, 500)) // Mostrar mensagem por 500ms
      } catch (syncError) {
        console.error('[Login] Erro na sincronização, continuando:', syncError)
        // Não bloquear o login se a sincronização falhar
      }

      setSincronizando(false)

      // Redirecionar baseado no tipo de usuário
      if (data.usuario.tipo_usuario === 'administrador') {
        router.push('/admin/dashboard')
      } else if (data.usuario.tipo_usuario === 'tecnico') {
        router.push('/tecnico/dashboard')
      } else if (data.usuario.tipo_usuario === 'polo') {
        router.push('/polo/dashboard')
      } else if (data.usuario.tipo_usuario === 'escola') {
        router.push('/escola/dashboard')
      } else {
        router.push('/dashboard')
      }
    } catch (error) {
      setErro('Erro ao conectar com o servidor. Verifique sua conexão.')
      setCarregando(false)
      setSincronizando(false)
    }
  }

  // Mostrar loading enquanto verifica usuário offline
  if (verificandoOffline) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 transition-colors duration-300">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Verificando sessão...</p>
        </div>
      </div>
    )
  }

  // Mostrar tela de sincronização
  if (sincronizando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 transition-colors duration-300">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-xl dark:shadow-slate-900/50 max-w-md w-full mx-4 border border-gray-200 dark:border-slate-700">
          <div className="text-center">
            {/* Ícone animado */}
            <div className="relative mx-auto w-20 h-20 mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-100 dark:border-slate-700"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-600 dark:border-t-indigo-400 animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Database className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>

            {/* Título */}
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Sincronizando Dados
            </h2>

            {/* Etapa atual */}
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {etapaSincronizacao}
            </p>

            {/* Barra de progresso animada */}
            <div className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-pulse" style={{ width: '100%' }}></div>
            </div>

            {/* Mensagem */}
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
              Preparando o sistema para você...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 transition-colors duration-300">
      {/* Toggle de Tema no canto superior direito */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggleSimple />
      </div>

      {/* Indicador de modo offline */}
      {modoOffline && (
        <div className="bg-orange-500 dark:bg-orange-600 text-white py-2 px-4 text-center text-sm font-medium flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" />
          Você está offline
        </div>
      )}

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-lg shadow-xl dark:shadow-slate-900/50 w-full max-w-md border border-gray-200 dark:border-slate-700 transition-colors duration-300">
          <div className="flex items-center justify-center mb-6">
            <img
              src="/logo.png"
              alt="Logo"
              className="max-h-20 max-w-full object-contain dark:brightness-110"
            />
          </div>

          <h1 className="text-2xl font-bold text-center mb-2 dark:text-white" style={{ color: personalizacao.cor_primaria }}>
            {personalizacao.titulo}
          </h1>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-8">
            {personalizacao.subtitulo}
          </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent outline-none bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 transition-colors"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label htmlFor="senha" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Senha
            </label>
            <div className="relative">
              <input
                id="senha"
                type={mostrarSenha ? "text" : "password"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent outline-none bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 transition-colors"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none transition-colors"
                aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
              >
                {mostrarSenha ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {erro && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="w-full text-white py-2 px-4 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{
              backgroundColor: personalizacao.cor_primaria,
            } as React.CSSProperties}
            onMouseEnter={(e) => {
              const color = personalizacao.cor_primaria
              const r = parseInt(color.slice(1, 3), 16)
              const g = parseInt(color.slice(3, 5), 16)
              const b = parseInt(color.slice(5, 7), 16)
              const darker = `rgb(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)})`
              e.currentTarget.style.backgroundColor = darker
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = personalizacao.cor_primaria
            }}
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        </div>
      </div>

      {/* Rodapé */}
      <Rodape />
    </div>
  )
}

