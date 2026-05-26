'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  LogOut,
  Menu,
  X,
  Database,
  User,
  WifiOff,
  BookOpen,
  ArrowLeftRight,
  Building2,
  Globe,
  Settings,
  Accessibility,
} from 'lucide-react'
import { OfflineSyncManager } from '../offline-sync-manager'
import { SyncStatusBadge } from '../sync-status-badge'
import * as offlineStorage from '@/lib/offline-storage'
import { ThemeToggleSimple } from '../theme-toggle'
import { NotificacoesBadge } from '../professor/notificacoes-badge'
import type { Personalizacao } from './types'

interface HeaderProps {
  menuAberto: boolean
  setMenuAberto: (v: boolean) => void
  menuDesktopOculto: boolean
  setMenuDesktopOculto: (v: boolean) => void
  personalizacao: Personalizacao
  modoOffline: boolean
  moduloAtivo: offlineStorage.ModuloAtivo
  setModuloAtivo: (v: offlineStorage.ModuloAtivo) => void
  tipoUsuarioReal: string
  basePath: string
  usuario: { id?: string; usuario_id?: string; nome?: string; foto_url?: string; email?: string; gestor_escolar_habilitado?: boolean } | null
  badgeConfig: { label: string; bgColor: string; textColor: string }
  contextoUsuario: string | null
  handleLogout: () => void
  onModuloChange: (novo: offlineStorage.ModuloAtivo) => void
}

export function Header({
  menuAberto,
  setMenuAberto,
  menuDesktopOculto,
  setMenuDesktopOculto,
  personalizacao,
  modoOffline,
  moduloAtivo,
  tipoUsuarioReal,
  usuario,
  badgeConfig,
  contextoUsuario,
  handleLogout,
  onModuloChange,
}: HeaderProps) {
  const router = useRouter()

  // Metadados visuais do módulo ativo (estilo "ghost": dot colorido + borda inferior do header)
  const MODULO_META: Record<offlineStorage.ModuloAtivo, { label: string; Icon: typeof Database; dot: string; borda: string }> = {
    sisam:         { label: 'SISAM',         Icon: Database,  dot: 'bg-indigo-500',  borda: 'border-indigo-500' },
    educatec:      { label: 'SISAM',         Icon: Database,  dot: 'bg-indigo-500',  borda: 'border-indigo-500' },
    gestor:        { label: 'Gestor',        Icon: BookOpen,  dot: 'bg-emerald-500', borda: 'border-emerald-500' },
    semed:         { label: 'SEMED',         Icon: Building2, dot: 'bg-amber-500',   borda: 'border-amber-500' },
    transparencia: { label: 'Transparência', Icon: Globe,     dot: 'bg-sky-500',     borda: 'border-sky-500' },
    admin:         { label: 'Admin',         Icon: Settings,  dot: 'bg-slate-500',   borda: 'border-slate-500' },
    professor:     { label: 'Professor',     Icon: BookOpen,  dot: 'bg-emerald-500', borda: 'border-emerald-500' },
    responsavel:   { label: 'Responsável',   Icon: User,      dot: 'bg-purple-500',  borda: 'border-purple-500' },
  }
  const meta = MODULO_META[moduloAtivo] || MODULO_META.sisam
  const ModIcon = meta.Icon

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 bg-white dark:bg-slate-800 shadow-sm dark:shadow-slate-900/50 border-b-[3px] ${meta.borda} flex-shrink-0 transition-colors duration-300 print:hidden`}
    >
      <div className="px-2 sm:px-4 md:px-6 lg:px-8">
        {/* Altura fixa em 64px para estabilidade entre breakpoints */}
        <div className="flex justify-between items-center h-16">
          {/* Seção esquerda: Menu mobile/desktop + Logo + Nome */}
          <div className="flex items-center min-w-0 gap-2 sm:gap-3">
            {/* Botão menu mobile */}
            <button
              onClick={() => setMenuAberto(!menuAberto)}
              className="lg:hidden p-1.5 sm:p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 flex-shrink-0 transition-all duration-200"
              aria-label="Menu"
            >
              {menuAberto ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>

            {/* Botão toggle menu desktop (gaveta) */}
            <button
              onClick={() => setMenuDesktopOculto(!menuDesktopOculto)}
              className="hidden lg:flex p-1.5 sm:p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 flex-shrink-0 transition-all duration-200"
              aria-label={menuDesktopOculto ? "Abrir menu" : "Fechar menu"}
              title={menuDesktopOculto ? "Abrir menu lateral" : "Fechar menu lateral"}
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* Logo do Sistema */}
            <div className="flex-shrink-0">
              <Image
                src="/logo.png"
                alt="Logo do Sistema"
                width={48}
                height={48}
                className="h-9 sm:h-10 lg:h-12 w-auto object-contain rounded"
                priority
              />
            </div>

            {/* Nome do Sistema + Município (compactado) */}
            <div className="flex flex-col min-w-0">
              <h1 className="text-base sm:text-xl lg:text-2xl font-bold text-gray-800 dark:text-white truncate leading-tight">
                {personalizacao.nome_sistema || 'SISAM'}
              </h1>
              <span className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 truncate leading-tight">
                SEMED · SSBV/PA
              </span>
            </div>

            {/* Botão de troca de módulo: ghost com dot colorido + hint ⌘K embutido */}
            {tipoUsuarioReal !== 'professor' && tipoUsuarioReal !== 'editor' && tipoUsuarioReal !== 'publicador' && tipoUsuarioReal !== 'responsavel' && (
              <button
                onClick={() => router.push('/modulos')}
                className="ml-2 sm:ml-3 group flex items-center gap-2 pl-2.5 sm:pl-3 pr-2 sm:pr-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-200 bg-transparent hover:bg-gray-100 dark:hover:bg-slate-700/60 border border-gray-200 dark:border-slate-700 transition-all duration-200"
                title={`Módulo ativo: ${meta.label}. Clique para trocar (ou pressione Ctrl+K).`}
              >
                <span className={`w-2 h-2 rounded-full ${meta.dot} ring-2 ring-transparent group-hover:ring-current/10`} aria-hidden="true" />
                <span>{meta.label}</span>
                <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-900/60 text-[9px] font-mono text-gray-500 dark:text-gray-400 opacity-80">
                  ⌘K
                </kbd>
                <ArrowLeftRight className="lg:hidden w-3 h-3 opacity-40" />
              </button>
            )}
          </div>

          {/* Seção direita: Status + Usuário + Ações */}
          <div className="flex items-center gap-0.5 sm:gap-2 min-w-0 flex-shrink-0">
            {/* Indicadores de status — ocultos no mobile para dar espaço */}
            <div className="hidden sm:flex items-center gap-1">
              {modoOffline && (
                <span className="flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 rounded-full text-xs font-medium animate-pulse">
                  <WifiOff className="w-3 h-3" />
                  <span className="hidden sm:inline">Offline</span>
                </span>
              )}
              {/* Sincronização offline continua rodando em background — UI escondida para um header mais limpo */}
              <OfflineSyncManager
                userId={usuario?.id?.toString() || usuario?.usuario_id?.toString() || null}
                autoSync={true}
                showStatus={false}
              />
              <SyncStatusBadge />
            </div>

            {/* Indicador offline mobile (apenas ícone) */}
            {modoOffline && (
              <span className="sm:hidden flex items-center p-1 text-orange-600 animate-pulse">
                <WifiOff className="w-4 h-4" />
              </span>
            )}

            {/* Notificacoes do professor */}
            {tipoUsuarioReal === 'professor' && <NotificacoesBadge />}

            {/* Card unificado de identidade: avatar 40px + nome + tipo/contexto */}
            <Link
              href="/perfil"
              className="flex items-center gap-2.5 sm:gap-3 p-1 sm:pr-3 sm:pl-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700/60 transition-all duration-200 group"
              title={`${usuario?.nome || 'Usuário'} — ${badgeConfig.label}${contextoUsuario ? ` · ${contextoUsuario}` : ''}`}
            >
              {usuario?.foto_url ? (
                <Image
                  src={usuario.foto_url}
                  alt="Foto do perfil"
                  width={40}
                  height={40}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover ring-2 ring-gray-200 dark:ring-slate-600 group-hover:ring-indigo-400 dark:group-hover:ring-indigo-500 transition-all"
                />
              ) : (
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/60 dark:to-indigo-800/60 flex items-center justify-center ring-2 ring-gray-200 dark:ring-slate-600 group-hover:ring-indigo-400 dark:group-hover:ring-indigo-500 transition-all">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-300" />
                </div>
              )}
              <div className="hidden sm:flex flex-col min-w-0 leading-tight">
                <span className="text-sm font-semibold text-gray-800 dark:text-white truncate max-w-[100px] md:max-w-[140px] lg:max-w-[180px]">
                  {usuario?.nome?.split(' ')[0] || 'Usuário'}
                </span>
                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 truncate max-w-[100px] md:max-w-[140px] lg:max-w-[180px]">
                  {badgeConfig.label}{contextoUsuario ? ` · ${contextoUsuario}` : ''}
                </span>
              </div>
            </Link>

            {/* Ações secundárias: acessibilidade, tema e logout — ícones discretos */}
            <button
              onClick={() => window.dispatchEvent(new Event('sisam:abrir-acessibilidade'))}
              className="flex flex-shrink-0 p-2 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200"
              aria-label="Abrir painel de acessibilidade"
              title="Acessibilidade — tamanho da fonte, contraste e movimento"
            >
              <Accessibility className="w-[18px] h-[18px]" />
            </button>
            <ThemeToggleSimple className="hidden sm:flex flex-shrink-0 p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700/60 transition-all duration-200" />
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 flex-shrink-0"
              aria-label="Sair"
              title="Sair do sistema"
            >
              <LogOut className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
