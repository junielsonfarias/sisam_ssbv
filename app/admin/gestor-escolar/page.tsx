'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState } from 'react'
import { BookOpen, Calendar, Settings } from 'lucide-react'
import { useToast } from '@/components/toast'
import { AbaDisciplinas } from './components/aba-disciplinas'
import { AbaPeriodos } from './components/aba-periodos'
import { AbaConfiguracaoNotas } from './components/aba-configuracao-notas'
import type { Aba } from './components/types'

export default function GestorEscolarPage() {
  const toast = useToast()
  const [abaAtiva, setAbaAtiva] = useState<Aba>('disciplinas')
  const [tipoUsuario, setTipoUsuario] = useState<string>('')
  const [escolaIdUsuario, setEscolaIdUsuario] = useState<string>('')

  useEffect(() => {
    fetch('/api/auth/verificar')
      .then(r => r.json())
      .then(data => {
        if (data.usuario) {
          const tipo = data.usuario.tipo_usuario === 'administrador' ? 'admin' : data.usuario.tipo_usuario
          setTipoUsuario(tipo)
          if (data.usuario.escola_id) setEscolaIdUsuario(data.usuario.escola_id)
        }
      })
      .catch(() => {})
  }, [])

  const abas: { id: Aba; label: string; icon: any }[] = [
    { id: 'disciplinas', label: 'Disciplinas', icon: BookOpen },
    { id: 'periodos', label: 'Períodos Letivos', icon: Calendar },
    { id: 'configuracao', label: 'Configuração de Notas', icon: Settings },
  ]

  const podeEditar = tipoUsuario === 'admin' || tipoUsuario === 'tecnico'

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-lg p-2">
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Gestor Escolar</h1>
              <p className="text-sm opacity-90">Disciplinas, períodos letivos e configuração de notas</p>
            </div>
          </div>
        </div>

        {/* Abas */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
          <div className="flex border-b border-gray-200 dark:border-slate-700">
            {abas.map(aba => {
              const Icon = aba.icon
              return (
                <button
                  key={aba.id}
                  onClick={() => setAbaAtiva(aba.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors
                    ${abaAtiva === aba.id
                      ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{aba.label}</span>
                </button>
              )
            })}
          </div>

          <div className="p-4 sm:p-6">
            {abaAtiva === 'disciplinas' && (
              <AbaDisciplinas podeEditar={podeEditar} toast={toast} />
            )}
            {abaAtiva === 'periodos' && (
              <AbaPeriodos podeEditar={podeEditar} toast={toast} />
            )}
            {abaAtiva === 'configuracao' && (
              <AbaConfiguracaoNotas
                podeEditar={podeEditar || tipoUsuario === 'escola'}
                tipoUsuario={tipoUsuario}
                escolaIdUsuario={escolaIdUsuario}
                toast={toast}
              />
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
