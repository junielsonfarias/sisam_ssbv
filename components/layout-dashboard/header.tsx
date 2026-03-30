'use client'

import Link from 'next/link'
import {
  LogOut,
  Menu,
  X,
  Database,
  User,
  WifiOff,
  BookOpen,
  ArrowLeftRight,
} from 'lucide-react'
import { OfflineSyncManager } from '../offline-sync-manager'
import { SyncStatusBadge } from '../sync-status-badge'
import * as offlineStorage from '@/lib/offline-storage'
import { ThemeToggleSimple } from '../theme-toggle'
import type { Personalizacao } from './types'

interface HeaderProps {
  menuAberto: boolean
  setMenuAberto: (v: boolean) => void
  menuDesktopOculto: boolean
  setMenuDesktopOculto: (v: boolean) => void
  personalizacao: Personalizacao
  dataAtual: string
  modoOffline: boolean
  moduloAtivo: offlineStorage.ModuloAtivo
  setModuloAtivo: (v: offlineStorage.ModuloAtivo) => void
  tipoUsuarioReal: string
  basePath: string
  usuario: any
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
  dataAtual,
  modoOffline,
  moduloAtivo,
  tipoUsuarioReal,
  usuario,
  badgeConfig,
  contextoUsuario,
  handleLogout,
  onModuloChange,
}: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-white via-white to-gray-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900 shadow-md dark:shadow-slate-700/50 border-b border-gray-200 dark:border-slate-700 flex-shrink-0 transition-colors duration-300 print:hidden">
      <div className="px-2 sm:px-4 md:px-6 lg:px-8">
        {/* Linha superior: Logo, Nome do Sistema, Data */}
        <div className="flex justify-between items-center h-14 sm:h-16 lg:h-[72px]">
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
              <img
                src="/logo.png"
                alt="Logo do Sistema"
                className="h-9 sm:h-10 lg:h-12 w-auto object-contain rounded"
              />
            </div>

            {/* Nome do Sistema + SEMED + Município */}
            <div className="flex flex-col min-w-0">
              <h1 className="text-base sm:text-xl lg:text-2xl font-bold text-gray-800 dark:text-white truncate leading-tight">
                {personalizacao.nome_sistema || 'SISAM'}
              </h1>
              <span className="text-[9px] sm:text-[10px] lg:text-xs text-gray-500 dark:text-gray-400 truncate leading-tight">
                SEMED — Castanhal/PA
              </span>
            </div>

            {/* Separador visual */}
            <div className="hidden md:block w-px h-8 bg-gray-200 dark:bg-slate-600 mx-2" />

            {/* Botão de troca de módulo - oculto para polo e escola sem gestor habilitado */}
            {tipoUsuarioReal !== 'polo' && tipoUsuarioReal !== 'professor' && tipoUsuarioReal !== 'editor' && !(tipoUsuarioReal === 'escola' && !usuario?.gestor_escolar_habilitado) && (
              <button
                onClick={() => {
                  const novo = moduloAtivo === 'educatec' ? 'gestor' as offlineStorage.ModuloAtivo : 'educatec' as offlineStorage.ModuloAtivo
                  onModuloChange(novo)
                }}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold transition-all duration-200 ${
                  moduloAtivo === 'educatec'
                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200'
                    : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200'
                }`}
                title={`Módulo ativo: ${moduloAtivo === 'educatec' ? 'SISAM' : 'Gestor Escolar'}. Clique para alternar.`}
              >
                {moduloAtivo === 'educatec' ? <Database className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                <span>{moduloAtivo === 'educatec' ? 'SISAM' : 'Gestor'}</span>
                <ArrowLeftRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 opacity-50" />
              </button>
            )}

            {/* Badge do tipo de usuário */}
            <div className="hidden md:flex items-center gap-2">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${badgeConfig.bgColor} ${badgeConfig.textColor}`}>
                {badgeConfig.label}
              </span>
              {/* Contexto do usuário (polo/escola) */}
              {contextoUsuario && (
                <span className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-[120px] sm:max-w-[150px] md:max-w-[180px] lg:max-w-[200px]" title={contextoUsuario}>
                  {contextoUsuario}
                </span>
              )}
            </div>
          </div>

          {/* Seção central: Data (apenas desktop) */}
          <div className="hidden xl:flex items-center justify-center">
            <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">
              {dataAtual}
            </span>
          </div>

          {/* Seção direita: Status + Usuário + Ações */}
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            {/* Indicadores de status */}
            <div className="flex items-center gap-1">
              {/* Indicador de modo offline */}
              {modoOffline && (
                <span className="flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 rounded-full text-xs font-medium animate-pulse">
                  <WifiOff className="w-3 h-3" />
                  <span className="hidden sm:inline">Offline</span>
                </span>
              )}

              {/* Status de sincronização offline */}
              <OfflineSyncManager
                userId={usuario?.id?.toString() || usuario?.usuario_id?.toString() || null}
                autoSync={true}
                showStatus={true}
              />

              {/* Fila de sync offline */}
              <SyncStatusBadge />
            </div>

            {/* Separador visual */}
            <div className="hidden sm:block w-px h-6 bg-gray-200 dark:bg-slate-600 mx-1" />

            {/* Badge do tipo (mobile) */}
            <span className={`md:hidden inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${badgeConfig.bgColor} ${badgeConfig.textColor}`}>
              {badgeConfig.label.substring(0, 3)}
            </span>

            {/* Link do perfil do usuário */}
            <Link
              href="/perfil"
              className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-all duration-200 group"
              title="Meu Perfil"
            >
              {usuario?.foto_url ? (
                <img
                  src={usuario.foto_url}
                  alt="Foto do perfil"
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover ring-2 ring-gray-200 dark:ring-slate-600 group-hover:ring-indigo-300 dark:group-hover:ring-indigo-500 transition-all"
                />
              ) : (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center ring-2 ring-gray-200 dark:ring-slate-600 group-hover:ring-indigo-300 dark:group-hover:ring-indigo-500 transition-all">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
              )}
              <div className="hidden sm:flex flex-col min-w-0">
                <span className="text-sm font-medium truncate max-w-[80px] md:max-w-[120px] lg:max-w-[150px]">
                  {usuario?.nome?.split(' ')[0] || 'Usuário'}
                </span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                  Ver perfil
                </span>
              </div>
            </Link>

            {/* Separador visual */}
            <div className="hidden sm:block w-px h-6 bg-gray-200 dark:bg-slate-600 mx-1" />

            {/* Toggle de Tema */}
            <ThemeToggleSimple className="flex-shrink-0 p-1.5 sm:p-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all duration-200" />

            {/* Botão de Logout */}
            <button
              onClick={handleLogout}
              className="p-1.5 sm:p-2 text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-all duration-200 flex-shrink-0"
              aria-label="Sair"
              title="Sair do sistema"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
