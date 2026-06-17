'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Rodape from '../rodape'
import * as offlineStorage from '@/lib/offline-storage'
import AlertaDivergencias from '../alerta-divergencias'
import { Header } from './header'
import { Sidebar } from './sidebar'
import { CommandPalette } from './command-palette'
import { getMenuItems, getBadgeConfig } from './menu-config'
import type { LayoutDashboardProps, MenuItem, Personalizacao } from './types'

export type { LayoutDashboardProps, MenuItem, Personalizacao }

export default function LayoutDashboard({ children, tipoUsuario }: LayoutDashboardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [usuario, setUsuario] = useState<any>(null)
  const [menuAberto, setMenuAberto] = useState(false)
  const [menuDesktopOculto, setMenuDesktopOculto] = useState(true) // Menu oculto por padrão em desktop
  const [modoOffline, setModoOffline] = useState(false)
  const [personalizacao, setPersonalizacao] = useState<Personalizacao>({})
  const [gruposExpandidos, setGruposExpandidos] = useState<Record<string, boolean>>({})
  const [moduloAtivo, setModuloAtivo] = useState<offlineStorage.ModuloAtivo>('sisam')
  const [hidratado, setHidratado] = useState(false)
  const [paletaAberta, setPaletaAberta] = useState(false)

  // Chave de persistência dos grupos expandidos — por usuário + módulo
  // (cada combinação tem seu próprio "estado de gavetas abertas")
  const storageKeyGrupos = usuario?.id
    ? `educatec_grupos_expandidos_${usuario.id}_${moduloAtivo}`
    : null

  // Atalho global Ctrl+K / Cmd+K para abrir paleta de comandos
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletaAberta((v) => !v)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // Restaurar grupos expandidos do localStorage (chave por usuário+módulo)
  useEffect(() => {
    if (!storageKeyGrupos) return
    try {
      const raw = localStorage.getItem(storageKeyGrupos)
      if (raw) setGruposExpandidos(JSON.parse(raw))
      else setGruposExpandidos({}) // reset ao trocar de módulo se não há histórico
    } catch {
      setGruposExpandidos({})
    }
  }, [storageKeyGrupos])

  // Função para verificar se o item do menu está ativo
  // Usa correspondência exata ou subrota, com proteção contra falso-positivo
  // (ex: /admin/relatorios não deve ativar /admin/relatorios-pdf)
  const isMenuItemActive = (href: string): boolean => {
    if (!pathname) return false
    if (pathname === href) return true
    // Subrota: pathname deve começar com href + '/' (não apenas href como prefix)
    if (pathname.startsWith(href + '/')) return true
    return false
  }

  // Hidratar estado do cliente (evita mismatch server/client)
  // Também detecta o módulo pela URL atual
  useEffect(() => {
    const moduloStorage = offlineStorage.getModuloAtivo()
    // Detecta o módulo pelo namespace da URL (/admin/<modulo>/...). Tem
    // precedência sobre o storage para manter o menu lateral coerente com a
    // página aberta — inclusive ao acessar uma URL diretamente ou via bookmark.
    const m = pathname?.match(/^\/admin\/(sisam|gestor|semed)\b/)
    if (m) {
      const moduloUrl = m[1] as offlineStorage.ModuloAtivo
      setModuloAtivo(moduloUrl)
      offlineStorage.saveModuloAtivo(moduloUrl)
    } else {
      setModuloAtivo(moduloStorage)
    }
    setHidratado(true)
  }, [pathname])

  // Carregar personalização do sistema
  useEffect(() => {
    const carregarPersonalizacao = async () => {
      try {
        const response = await fetch('/api/personalizacao')
        if (response.ok) {
          const data = await response.json()
          setPersonalizacao(data)
        }
      } catch (error) {
        console.error('Erro ao carregar personalização:', error)
      }
    }
    carregarPersonalizacao()
  }, [])

  useEffect(() => {
    const carregarUsuario = async () => {
      // Verificar se está online
      const online = offlineStorage.isOnline()
      setModoOffline(!online)

      if (online) {
        // Tentar carregar do servidor
        try {
          const response = await fetch('/api/auth/verificar')
          const data = await response.json()
          if (data.usuario) {
            setUsuario(data.usuario)
            // Salvar usuário para acesso offline no localStorage
            offlineStorage.saveUser({
              id: data.usuario.id?.toString() || data.usuario.usuario_id?.toString(),
              nome: data.usuario.nome,
              email: data.usuario.email,
              tipo_usuario: data.usuario.tipo_usuario,
              polo_id: data.usuario.polo_id,
              escola_id: data.usuario.escola_id,
              polo_nome: data.usuario.polo_nome,
              escola_nome: data.usuario.escola_nome,
              gestor_escolar_habilitado: data.usuario.gestor_escolar_habilitado,
              acesso_sisam: data.usuario.acesso_sisam,
              acesso_gestor: data.usuario.acesso_gestor,
              acesso_semed: data.usuario.acesso_semed,
              acesso_transparencia: data.usuario.acesso_transparencia,
              acesso_admin: data.usuario.acesso_admin,
            })
          } else {
            // Sem sessão válida, tentar usuário offline
            const offlineUser = offlineStorage.getUser()
            if (offlineUser) {
              setUsuario(offlineUser)
              setModoOffline(true)
            } else {
              router.push('/login')
            }
          }
        } catch (error) {
          // Erro de rede, tentar usuário offline
          const offlineUser = offlineStorage.getUser()
          if (offlineUser) {
            setUsuario(offlineUser)
            setModoOffline(true)
          } else {
            router.push('/login')
          }
        }
      } else {
        // Está offline, usar usuário salvo
        const offlineUser = offlineStorage.getUser()
        if (offlineUser) {
          setUsuario(offlineUser)
        } else {
          // Sem usuário offline, redirecionar para login
          router.push('/login')
        }
      }
    }

    carregarUsuario()

    // Listener para mudanças de conexão
    const handleOnline = () => setModoOffline(false)
    const handleOffline = () => setModoOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Impedir reload quando offline - aviso ao usuário
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!offlineStorage.isOnline()) {
        e.preventDefault()
        e.returnValue = 'Você está offline. Recarregar a página pode causar perda de sessão. Deseja continuar?'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [router])

  const handleLogout = () => {
    // Limpar usuario e módulo imediatamente
    offlineStorage.clearUser()
    offlineStorage.clearModuloAtivo()

    // Redirecionar imediatamente para o login
    router.push('/login')

    // Fazer logout no servidor em background (não bloqueia)
    if (offlineStorage.isOnline()) {
      fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    }

    // Limpar demais dados offline em background (não bloqueia)
    offlineStorage.clearAllOfflineData()
  }

  // Mapear tipoUsuario para o caminho correto
  const getBasePath = () => {
    if (!tipoUsuario) return 'admin'
    if (tipoUsuario === 'admin' || tipoUsuario === 'administrador') return 'admin'
    return tipoUsuario
  }

  const basePath = getBasePath()
  const tipoUsuarioReal = usuario?.tipo_usuario === 'administrador' ? 'admin' : (usuario?.tipo_usuario || tipoUsuario || 'admin')

  // Só montar menu completo após hidratação (evita mismatch SSR vs client)
  const menuItems = hidratado
    ? getMenuItems({ tipoUsuarioReal, moduloAtivo, basePath, usuario })
    : []

  // Verifica se algum filho do grupo está ativo
  const isGroupActive = (item: MenuItem): boolean => {
    if (!item.children) return false
    return item.children.some(child => child.href ? isMenuItemActive(child.href) : false)
  }

  // Verifica se o grupo está expandido (manual ou auto pelo filho ativo)
  const isGroupExpanded = (label: string, item: MenuItem): boolean => {
    if (gruposExpandidos[label] !== undefined) return gruposExpandidos[label]
    return isGroupActive(item)
  }

  const toggleGrupo = (label: string) => {
    setGruposExpandidos(prev => {
      const novo = { ...prev, [label]: !prev[label] }
      // Persiste imediatamente para sobreviver a navegações/refresh
      if (storageKeyGrupos) {
        try { localStorage.setItem(storageKeyGrupos, JSON.stringify(novo)) } catch { /* quota cheia */ }
      }
      return novo
    })
  }

  // Obter contexto do usuário (polo ou escola)
  const getContextoUsuario = () => {
    if (tipoUsuarioReal === 'polo' && usuario?.polo_nome) {
      return usuario.polo_nome
    }
    if (tipoUsuarioReal === 'escola' && usuario?.escola_nome) {
      return usuario.escola_nome
    }
    return null
  }

  const badgeConfig = getBadgeConfig(tipoUsuarioReal)
  const contextoUsuario = getContextoUsuario()

  const handleModuloChange = (novo: offlineStorage.ModuloAtivo) => {
    offlineStorage.saveModuloAtivo(novo)
    setModuloAtivo(novo)
    // Rota de destino por módulo (namespaced)
    if (novo === 'gestor') router.push('/admin/gestor/dashboard')
    else if (novo === 'semed') router.push('/admin/semed/dashboard')
    else if (novo === 'transparencia') router.push('/admin/site-institucional')
    else if (novo === 'admin') router.push('/admin/usuarios')
    else router.push(basePath === 'admin' ? '/admin/sisam/dashboard' : `/${basePath}/dashboard`)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col transition-colors duration-300">
      {/* Header - Fixo no topo com gradiente sutil (oculto na impressão) */}
      <Header
        menuAberto={menuAberto}
        setMenuAberto={setMenuAberto}
        menuDesktopOculto={menuDesktopOculto}
        setMenuDesktopOculto={setMenuDesktopOculto}
        personalizacao={personalizacao}
        modoOffline={modoOffline}
        moduloAtivo={moduloAtivo}
        setModuloAtivo={setModuloAtivo}
        tipoUsuarioReal={tipoUsuarioReal}
        basePath={basePath}
        usuario={usuario}
        badgeConfig={badgeConfig}
        contextoUsuario={contextoUsuario}
        handleLogout={handleLogout}
        onModuloChange={handleModuloChange}
      />

      {/* Alerta de Divergências Críticas (oculto na impressão) */}
      <div className="print:hidden">
        <AlertaDivergencias tipoUsuario={tipoUsuarioReal} />
      </div>

      {/* Espaçador para compensar o header fixo (oculto na impressão) */}
      <div className="h-14 sm:h-16 lg:h-[72px] flex-shrink-0 print:hidden" />

      <div className="flex flex-1">
        {/* Sidebar - Fixo na lateral (oculto na impressão) */}
        <Sidebar
          menuAberto={menuAberto}
          setMenuAberto={setMenuAberto}
          menuDesktopOculto={menuDesktopOculto}
          setMenuDesktopOculto={setMenuDesktopOculto}
          menuItems={menuItems}
          isMenuItemActive={isMenuItemActive}
          isGroupActive={isGroupActive}
          isGroupExpanded={isGroupExpanded}
          toggleGrupo={toggleGrupo}
        />

        {/* Main Content - Sem margem, menu funciona como drawer sobrepondo */}
        <main id="main-content" className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 pb-20 sm:pb-4 bg-gray-50 dark:bg-slate-900 print:p-0 print:bg-white">
          {children}
        </main>
      </div>

      {/* Rodape - Sem margem (oculto na impressão) */}
      <div className="print:hidden">
        <Rodape />
      </div>

      {/* Paleta de comandos global (Ctrl+K) */}
      <CommandPalette
        aberto={paletaAberta}
        onFechar={() => setPaletaAberta(false)}
        menuItems={menuItems}
        moduloAtivo={moduloAtivo}
        usuario={usuario}
        onTrocarModulo={handleModuloChange}
      />
    </div>
  )
}
