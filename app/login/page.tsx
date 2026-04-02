'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogIn, Eye, EyeOff, WifiOff, Database, CheckCircle, GraduationCap, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import Rodape from '@/components/rodape'
import { getPersonalizacaoLogin } from '@/lib/personalizacao'
import * as offlineStorage from '@/lib/offline-storage'
import { ThemeToggleSimple } from '@/components/theme-toggle'
import { useTheme } from '@/lib/theme-provider'
import { syncDashboardData, clearCache } from '@/lib/cache'

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


      if (offlineUser) {
        // Polo vai direto ao dashboard (sem tela de módulos)
        if (offlineUser.tipo_usuario === 'polo') {
          router.push('/polo/dashboard')
          return
        }
        // Professor vai direto ao seu portal
        if (offlineUser.tipo_usuario === 'professor') {
          router.push('/professor/dashboard')
          return
        }
        // Editor vai direto ao portal de notícias
        if (offlineUser.tipo_usuario === 'editor') {
          router.push('/editor/noticias')
          return
        }
        // Responsavel vai direto ao portal dos pais
        if (offlineUser.tipo_usuario === 'responsavel') {
          router.push('/responsavel/dashboard')
          return
        }
        // Se já tem módulo selecionado, ir direto ao dashboard correto
        if (offlineStorage.hasModuloAtivo()) {
          const modulo = offlineStorage.getModuloAtivo()
          if (modulo === 'gestor') {
            router.push('/admin/dashboard-gestor')
          } else {
            const tipoUsuario = offlineUser.tipo_usuario
            if (tipoUsuario === 'administrador') router.push('/admin/dashboard')
            else if (tipoUsuario === 'tecnico') router.push('/tecnico/dashboard')
            else if (tipoUsuario === 'escola') router.push('/escola/dashboard')
            else router.push('/admin/dashboard')
          }
        } else {
          // Sem módulo selecionado — ir para tela de escolha
          router.push('/modulos')
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
        setErro('Erro ao processar resposta do servidor')
        setCarregando(false)
        return
      }

      if (!response.ok) {
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
        escola_nome: data.usuario.escola_nome,
        gestor_escolar_habilitado: data.usuario.gestor_escolar_habilitado
      })

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
        // Não bloquear o login se a sincronização falhar
      }

      setSincronizando(false)

      // Polo vai direto (sem tela de módulos)
      if (data.usuario.tipo_usuario === 'polo') {
        offlineStorage.saveModuloAtivo('educatec')
        router.push('/polo/dashboard')
      } else if (data.usuario.tipo_usuario === 'professor') {
        // Professor vai direto ao seu portal
        offlineStorage.saveModuloAtivo('professor')
        router.push('/professor/dashboard')
      } else if (data.usuario.tipo_usuario === 'responsavel') {
        offlineStorage.saveModuloAtivo('responsavel')
        router.push('/responsavel/dashboard')
      } else if (data.usuario.tipo_usuario === 'editor') {
        // Editor vai direto ao portal de notícias
        router.push('/editor/noticias')
      } else {
        // Limpar módulo anterior para forçar nova escolha
        offlineStorage.clearModuloAtivo()
        router.push('/modulos')
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
        <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-xl shadow-xl dark:shadow-slate-900/50 max-w-md w-full mx-4 border border-gray-200 dark:border-slate-700">
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
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-900 transition-colors duration-300">
      {/* Topo institucional azul com voltar + tema */}
      <div className="bg-blue-900 text-white">
        <div className="flex items-center justify-between px-4 py-2.5 max-w-md mx-auto w-full">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-100 hover:text-white transition-colors min-h-[44px] active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao site
          </Link>
          <ThemeToggleSimple className="text-blue-200 hover:text-white" />
        </div>
      </div>

      {/* Indicador de modo offline */}
      {modoOffline && (
        <div className="bg-orange-500 text-white py-2 px-4 text-center text-sm font-medium flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" />
          Você está offline
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 sm:p-6">
        <div className="w-full max-w-md">
          {/* Logos centralizadas */}
          <div className="flex items-center justify-center gap-6 mb-6">
            <img
              src="/logo-semed.png"
              alt="SEMED"
              className="h-20 sm:h-24 w-auto object-contain"
            />
            <div className="w-px h-16 bg-slate-200 dark:bg-slate-600 flex-shrink-0" />
            <img
              src="/logo-prefeitura.png"
              alt="Prefeitura de São Sebastião da Boa Vista"
              className="h-20 sm:h-24 w-auto object-contain"
            />
          </div>

          {/* Título */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-blue-900 dark:text-white">
              {personalizacao.titulo}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {personalizacao.subtitulo}
            </p>
          </div>

          {/* Card do formulário */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg dark:shadow-slate-900/50 border border-slate-200 dark:border-slate-700 px-5 py-6 sm:px-8 sm:py-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 outline-none bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-base transition-colors"
                  placeholder="seu@email.com"
                />
              </div>

              <div>
                <label htmlFor="senha" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  Senha
                </label>
                <div className="relative">
                  <input
                    id="senha"
                    type={mostrarSenha ? "text" : "password"}
                    autoComplete="current-password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                    className="w-full px-4 py-3 pr-10 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 outline-none bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-base transition-colors"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 focus:outline-none transition-colors active:scale-95 transition-transform"
                    aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {mostrarSenha ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {erro && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-sm">
                  {erro}
                </div>
              )}

              <button
                type="submit"
                disabled={carregando}
                className="w-full bg-blue-800 hover:bg-blue-900 text-white py-3.5 px-4 rounded-xl font-bold text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-800/20 hover:shadow-blue-900/30 active:scale-[0.98]"
              >
                {carregando ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Entrando...
                  </span>
                ) : 'Entrar'}
              </button>
            </form>

            {/* Link cadastro professor */}
            <div className="text-center mt-5 pt-4 border-t border-slate-100 dark:border-slate-700">
              <Link
                href="/cadastro-professor"
                className="inline-flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400 hover:underline font-medium min-h-[44px] active:scale-95 transition-transform"
              >
                <GraduationCap className="h-4 w-4" />
                Sou professor — Criar minha conta
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Rodape />
    </div>
  )
}

