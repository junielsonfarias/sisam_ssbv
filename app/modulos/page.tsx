'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Database, BookOpen, LogOut, BarChart3, GraduationCap, Users, FileText, CalendarCheck } from 'lucide-react'
import * as offlineStorage from '@/lib/offline-storage'
import { ThemeToggleSimple } from '@/components/theme-toggle'

export default function ModulosPage() {
  const router = useRouter()
  const [usuario, setUsuario] = useState<offlineStorage.OfflineUser | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const user = offlineStorage.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUsuario(user)

    // Polo não tem Gestor Escolar — redirecionar direto
    if (user.tipo_usuario === 'polo') {
      offlineStorage.saveModuloAtivo('sisam')
      router.push('/polo/dashboard')
      return
    }

    setCarregando(false)
  }, [router])

  const selecionarModulo = (modulo: offlineStorage.ModuloAtivo) => {
    offlineStorage.saveModuloAtivo(modulo)

    const tipo = usuario?.tipo_usuario
    if (modulo === 'gestor') {
      router.push('/admin/dashboard-gestor')
    } else {
      // SISAM — redirecionar ao dashboard do tipo
      if (tipo === 'administrador') router.push('/admin/dashboard')
      else if (tipo === 'tecnico') router.push('/tecnico/dashboard')
      else if (tipo === 'escola') router.push('/escola/dashboard')
      else router.push('/admin/dashboard')
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch { /* silencia */ }
    offlineStorage.clearUser()
    offlineStorage.clearModuloAtivo()
    router.push('/login')
  }

  if (carregando) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 dark:from-slate-900 dark:via-indigo-950/30 dark:to-purple-950/20 flex flex-col">
      {/* Header simples */}
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 rounded-xl p-2">
            <Database className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">SISAM</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Sistema de Avaliacao Municipal</p>
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

      {/* Conteúdo centralizado */}
      <main className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="max-w-3xl w-full">
          {/* Saudação */}
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Olá, {usuario?.nome?.split(' ')[0]}!
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Selecione o módulo que deseja acessar
            </p>
          </div>

          {/* Cards de módulo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Card SISAM */}
            <button
              onClick={() => selecionarModulo('sisam')}
              className="group relative bg-white dark:bg-slate-800 rounded-2xl shadow-lg hover:shadow-xl border-2 border-transparent hover:border-indigo-500 transition-all duration-300 p-8 text-left overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-100 dark:from-indigo-900/30 to-transparent rounded-bl-full opacity-60 group-hover:opacity-100 transition" />

              <div className="relative">
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl p-3 w-fit mb-5 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50 group-hover:scale-110 transition-transform">
                  <Database className="w-8 h-8 text-white" />
                </div>

                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">SISAM</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                  Sistema de Avaliacao Municipal
                </p>

                <div className="space-y-2">
                  {[
                    { icon: BarChart3, text: 'Painel de Dados e Gráficos' },
                    { icon: FileText, text: 'Resultados e Comparativos' },
                    { icon: Database, text: 'Importações e Análises' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <item.icon className="w-3.5 h-3.5 text-indigo-500" />
                      {item.text}
                    </div>
                  ))}
                </div>

                <div className="mt-6 text-sm font-semibold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
                  Acessar SISAM →
                </div>
              </div>
            </button>

            {/* Card Gestor Escolar */}
            <button
              onClick={() => selecionarModulo('gestor')}
              className="group relative bg-white dark:bg-slate-800 rounded-2xl shadow-lg hover:shadow-xl border-2 border-transparent hover:border-emerald-500 transition-all duration-300 p-8 text-left overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-100 dark:from-emerald-900/30 to-transparent rounded-bl-full opacity-60 group-hover:opacity-100 transition" />

              <div className="relative">
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl p-3 w-fit mb-5 shadow-lg shadow-emerald-200 dark:shadow-emerald-900/50 group-hover:scale-110 transition-transform">
                  <BookOpen className="w-8 h-8 text-white" />
                </div>

                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Gestor Escolar</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                  Gestão Acadêmica Completa
                </p>

                <div className="space-y-2">
                  {[
                    { icon: GraduationCap, text: 'Notas, Frequência e Matrículas' },
                    { icon: Users, text: 'Turmas, Alunos e Transferências' },
                    { icon: CalendarCheck, text: 'Anos Letivos e Conselho' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <item.icon className="w-3.5 h-3.5 text-emerald-500" />
                      {item.text}
                    </div>
                  ))}
                </div>

                <div className="mt-6 text-sm font-semibold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">
                  Acessar Gestor →
                </div>
              </div>
            </button>
          </div>

          {/* Rodapé */}
          <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-8">
            {usuario?.escola_nome || usuario?.polo_nome || 'Administração Municipal'}
          </p>
        </div>
      </main>
    </div>
  )
}
