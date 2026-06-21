'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Database, BookOpen, LogOut, Building2, Globe, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Rodape from '@/components/rodape'
import * as offlineStorage from '@/lib/offline-storage'
import { ThemeToggleSimple } from '@/components/theme-toggle'

type Modulo = {
  id: offlineStorage.ModuloAtivo
  titulo: string
  subtitulo: string
  Icon: LucideIcon
  cor: string         // classe Tailwind base (ex: 'indigo')
  destaques: string[]
  rotaAdmin: string   // destino quando admin/tecnico
  habilitadoPara: (u: offlineStorage.OfflineUser) => boolean
}

const MODULOS: Modulo[] = [
  {
    id: 'sisam',
    titulo: 'SISAM',
    subtitulo: 'Avaliações & Análises',
    Icon: Database,
    cor: 'indigo',
    destaques: ['Provas, questões e cartão-resposta', 'Resultados e comparativos', 'Painel de dados e importações'],
    rotaAdmin: '/admin/sisam/dashboard',
    habilitadoPara: (u) => u.acesso_sisam !== false,
  },
  {
    id: 'gestor',
    titulo: 'Gestor Escolar',
    subtitulo: 'Gestão Acadêmica',
    Icon: BookOpen,
    cor: 'blue',
    destaques: ['Matrículas, frequência, notas', 'Turmas, alunos, transferências', 'Conselho de classe e histórico'],
    rotaAdmin: '/admin/gestor/dashboard',
    habilitadoPara: (u) => u.acesso_gestor === true,
  },
  {
    id: 'semed',
    titulo: 'SEMED',
    subtitulo: 'Programas & Recursos',
    Icon: Building2,
    cor: 'amber',
    destaques: ['FICAI, AEE, PNAE, PNATE, PNLD', 'PDDE, Bolsa Família, RH escolar', 'Patrimônio, Biblioteca, Ordens de Serviço'],
    rotaAdmin: '/admin/semed/dashboard',
    habilitadoPara: (u) => u.acesso_semed === true,
  },
  {
    id: 'transparencia',
    titulo: 'Transparência',
    subtitulo: 'Site & Comunicação',
    Icon: Globe,
    cor: 'sky',
    destaques: ['Site institucional', 'Notícias e publicações', 'Ouvidoria e eventos'],
    rotaAdmin: '/admin/transparencia/site-institucional',
    habilitadoPara: (u) => u.acesso_transparencia === true,
  },
  {
    id: 'admin',
    titulo: 'Administração',
    subtitulo: 'Sistema & Segurança',
    Icon: Settings,
    cor: 'slate',
    destaques: ['Usuários, backup, monitoramento', 'Segurança, 2FA, LGPD', 'Logs, auditoria, status page'],
    rotaAdmin: '/admin/admin/usuarios',
    habilitadoPara: (u) => u.acesso_admin === true,
  },
]

function classesCard(cor: string) {
  // Tailwind precisa de classes literais — mapa por cor
  const mapa: Record<string, { hover: string; ring: string; iconBg: string; iconShadow: string; iconText: string; bullet: string }> = {
    indigo: {
      hover: 'hover:border-indigo-500',
      ring: 'from-indigo-100 dark:from-indigo-900/30',
      iconBg: 'from-indigo-500 to-indigo-700',
      iconShadow: 'shadow-indigo-200 dark:shadow-indigo-900/50',
      iconText: 'text-indigo-600 dark:text-indigo-400',
      bullet: 'text-indigo-500',
    },
    blue: {
      hover: 'hover:border-blue-500',
      ring: 'from-blue-100 dark:from-blue-900/30',
      iconBg: 'from-blue-500 to-blue-700',
      iconShadow: 'shadow-blue-200 dark:shadow-blue-900/50',
      iconText: 'text-blue-600 dark:text-blue-400',
      bullet: 'text-blue-500',
    },
    amber: {
      hover: 'hover:border-amber-500',
      ring: 'from-amber-100 dark:from-amber-900/30',
      iconBg: 'from-amber-500 to-amber-700',
      iconShadow: 'shadow-amber-200 dark:shadow-amber-900/50',
      iconText: 'text-amber-600 dark:text-amber-400',
      bullet: 'text-amber-500',
    },
    sky: {
      hover: 'hover:border-sky-500',
      ring: 'from-sky-100 dark:from-sky-900/30',
      iconBg: 'from-sky-500 to-sky-700',
      iconShadow: 'shadow-sky-200 dark:shadow-sky-900/50',
      iconText: 'text-sky-600 dark:text-sky-400',
      bullet: 'text-sky-500',
    },
    slate: {
      hover: 'hover:border-slate-500',
      ring: 'from-slate-100 dark:from-slate-700/30',
      iconBg: 'from-slate-500 to-slate-700',
      iconShadow: 'shadow-slate-200 dark:shadow-slate-900/50',
      iconText: 'text-slate-600 dark:text-slate-400',
      bullet: 'text-slate-500',
    },
  }
  return mapa[cor] || mapa.indigo
}

function rotaPorTipoUsuario(tipo: string | undefined, fallback: string): string {
  if (tipo === 'tecnico') return '/tecnico/dashboard'
  if (tipo === 'escola') return '/escola/dashboard'
  if (tipo === 'polo') return '/polo/dashboard'
  return fallback
}

export default function ModulosPage() {
  const router = useRouter()
  const [usuario, setUsuario] = useState<offlineStorage.OfflineUser | null>(null)
  const [carregando, setCarregando] = useState(true)

  // Lista de módulos disponíveis para o usuário atual
  const modulosDisponiveis = useMemo(() => {
    if (!usuario) return []
    return MODULOS.filter((m) => m.habilitadoPara(usuario))
  }, [usuario])

  useEffect(() => {
    const user = offlineStorage.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUsuario(user)

    const disponiveis = MODULOS.filter((m) => m.habilitadoPara(user))

    // Sem nenhum módulo → fallback para SISAM (mantém compat com instalações antigas)
    if (disponiveis.length === 0) {
      offlineStorage.saveModuloAtivo('sisam')
      router.push(rotaPorTipoUsuario(user.tipo_usuario, '/admin/sisam/dashboard'))
      return
    }

    // Único módulo → entra direto
    if (disponiveis.length === 1) {
      const unico = disponiveis[0]
      offlineStorage.saveModuloAtivo(unico.id)
      // Para SISAM, prefere rota do tipo do usuário se existir
      const rota = unico.id === 'sisam'
        ? rotaPorTipoUsuario(user.tipo_usuario, unico.rotaAdmin)
        : unico.rotaAdmin
      router.push(rota)
      return
    }

    // 2+ módulos — mostrar seleção
    setCarregando(false)
  }, [router])

  function selecionarModulo(modulo: Modulo) {
    offlineStorage.saveModuloAtivo(modulo.id)
    const tipo = usuario?.tipo_usuario
    const rota = modulo.id === 'sisam'
      ? rotaPorTipoUsuario(tipo, modulo.rotaAdmin)
      : modulo.rotaAdmin
    router.push(rota)
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (err) {
      console.warn('[Modulos] Falha no logout:', (err as Error).message)
    }
    offlineStorage.clearUser()
    offlineStorage.clearModuloAtivo()
    router.push('/login')
  }

  if (carregando) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 dark:from-slate-900 dark:via-indigo-950/30 dark:to-purple-950/20 flex flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 rounded-xl p-2">
            <Database className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">SISAM</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Sistema de Gestão Escolar — SEMED SSBV</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggleSimple />
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition"
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="max-w-5xl w-full">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Olá, {usuario?.nome?.split(' ')[0]}!
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Selecione o módulo que deseja acessar
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {modulosDisponiveis.map((m) => {
              const c = classesCard(m.cor)
              const Icon = m.Icon
              return (
                <button
                  key={m.id}
                  onClick={() => selecionarModulo(m)}
                  className={`group relative bg-white dark:bg-slate-800 rounded-2xl shadow-lg hover:shadow-xl border-2 border-transparent ${c.hover} transition-all duration-300 p-6 text-left overflow-hidden`}
                >
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${c.ring} to-transparent rounded-bl-full opacity-60 group-hover:opacity-100 transition`} />

                  <div className="relative">
                    <div className={`bg-gradient-to-br ${c.iconBg} rounded-xl p-3 w-fit mb-4 shadow-lg ${c.iconShadow} group-hover:scale-110 transition-transform`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{m.titulo}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{m.subtitulo}</p>

                    <ul className="space-y-1.5">
                      {m.destaques.map((d, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                          <span className={`mt-1 w-1 h-1 rounded-full ${c.bullet.replace('text-', 'bg-')} flex-shrink-0`} />
                          {d}
                        </li>
                      ))}
                    </ul>

                    <div className={`mt-5 text-sm font-semibold ${c.iconText} group-hover:translate-x-1 transition-transform`}>
                      Acessar →
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </main>
      <Rodape />
    </div>
  )
}
